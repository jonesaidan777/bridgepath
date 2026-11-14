"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, CalendarClock, Check, CheckCircle2, ChevronRight, CircleDashed, Code2, FolderKanban, GraduationCap, Handshake, PlayCircle, TrendingUp, UserRoundSearch, Users } from "lucide-react";
import { useStudentProfile } from "./profile-provider";
import { useStartProject } from "./use-start-project";
import { RoleDialog, roleVerdict } from "./role-dialog";
import { ProjectDialog, projectKindLabel, projectStartHref } from "./project-dialog";
import { JourneyCrumbs } from "./journey-crumbs";
import { AnalyzingScreen, takeAnalyzingIntro } from "./analyzing-screen";
import { toCareerContext } from "@/lib/student-profile";
import { buildReadiness, gradeCandidate } from "@/lib/readiness";
import { projectDisplayTitle, recommendProjects, type ProjectRecommendation } from "@/lib/project-recommendations";
import { estimateJobs, formatJobCount } from "@/lib/job-estimates";
import { learningLinks } from "@/lib/learning-resources";
import { transferableSkills } from "@/lib/transferable-skills";
import { display } from "@/lib/data";
import { careerFieldLabel as careerFieldName } from "@/lib/profile-options";
import { workbook as snapshot } from "@/lib/workbook";
import type { WorkbookDataset } from "@/lib/workbook-types";

const data = snapshot as WorkbookDataset;
const classificationLabel = { required: "Required", preferred: "Preferred", unspecified: "Mentioned" } as const;
const skillName = (id: string) => data.Skills.find(skill => skill.skill_id === id)?.skill_name || id;

type ReasonAction =
  | { label: string; kind: "route"; href: string; stage?: "profile" }
  | { label: string; kind: "external"; href: string }
  | { label: string; kind: "scroll"; target: string };
interface Reason { id: string; icon: React.ReactNode; title: string; detail: string; source?: number; action: ReasonAction }
const TECH_FIELDS = ["software_engineering", "data_science_ai_ml", "hardware_engineering"];
const list = (items: string[], max = 3) =>
  items.length > max ? `${items.slice(0, max).join(", ")} and ${items.length - max} more` : items.join(", ");

/** Personal reasons the student would be passed over today, strongest first. */
/**
 * The unwritten rules of the internship search: things students with family in
 * the industry tend to hear early, and first-generation students often don’t.
 */
function hiddenTips(readiness: ReturnType<typeof buildReadiness>, college: string): Reason[] {
  const tech = readiness.roles.some(role => TECH_FIELDS.includes(role.match.internship.career_field || ""));
  const school = college || "your college";
  const search = (query: string) => `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const tips: Reason[] = [
    {
      id: "timing", icon: <CalendarClock size={20}/>,
      title: "Recruiting starts early",
      detail: "Many summer internships open in August–October of the year before and fill on a rolling basis.",
      source: 2,
      action: { label: "See open roles", kind: "route", href: "/discover-opportunities" },
    },
    {
      id: "career-center", icon: <Users size={20}/>,
      title: "Your career center reviews resumes for free",
      detail: `Book a review at the ${school} career center before you apply.`,
      action: { label: "Find your career center", kind: "external", href: search(`${school} career center resume review`) },
    },
    {
      id: "early-programs", icon: <GraduationCap size={20}/>,
      title: "Some programs are only for freshmen and sophomores",
      detail: "Fewer applicants, and they’re built for students without experience yet.",
      action: { label: "Find freshman programs", kind: "external", href: search(`internship programs for freshmen and sophomores ${tech ? "computer science" : ""}`.trim()) },
    },
    {
      id: "community", icon: <Handshake size={20}/>,
      title: "You don’t have to do this alone",
      detail: "First-gen offices and groups like ColorStack, SHPE, NSBE, and SWE offer mentors and recruiter access.",
      action: { label: "Find your community", kind: "external", href: search(`${school} first-generation student support program`) },
    },
    {
      id: "profiles", icon: <UserRoundSearch size={20}/>,
      title: "Recruiters search Handshake and LinkedIn",
      detail: "A complete profile gets you found, even for roles you didn’t apply to.",
      action: { label: "Finish your profiles", kind: "external", href: search(`${school} Handshake`) },
    },
  ];
  if (tech) tips.push({
    id: "hackathon", icon: <Code2 size={20}/>,
    title: "Hackathons count as experience",
    detail: "Free, beginner-friendly, and you leave with a project and recruiter contacts.",
    action: { label: "Find a hackathon", kind: "external", href: "https://mlh.io/" },
  });
  return tips;
}

export function CandidateReadiness() {
  const { profile, ready, setJourneyStage, saveProfile, journeyStage } = useStudentProfile();
  const router = useRouter();
  const startProject = useStartProject();
  // "unknown" until mounted so server and first client render match; then read the one-time flag.
  const [intro, setIntro] = useState<"unknown" | "show" | "skip">("unknown");
  useEffect(() => { setIntro(takeAnalyzingIntro() ? "show" : "skip"); }, []);
  // Reaching this screen completes discovery, which unlocks the sidebar pages.
  useEffect(() => {
    if (ready && journeyStage === "discovery") setJourneyStage("complete");
  }, [ready, journeyStage, setJourneyStage]);
  const context = useMemo(() => toCareerContext(profile), [profile]);
  const readiness = useMemo(
    () => buildReadiness(context, data, context.interestedInternshipIds),
    [context],
  );
  const projects = useMemo(() => recommendProjects(context, data).slice(0, 6), [context]);
  const [openRoleId, setOpenRoleId] = useState<string | null>(null);
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  if (!ready || intro === "unknown") return <p className="profile-loading" role="status">Building your plan…</p>;
  if (intro === "show") return <AnalyzingScreen roleCount={readiness.roles.length} onDone={() => setIntro("skip")}/>;

  const { roles, strengths, gaps, strongNow, strongAfter, scoreNow, scoreAfter } = readiness;
  type TodoAction = { label: string; icon: React.ReactNode } & ({ kind: "external"; href: string } | { kind: "button"; run: () => void });
  type Todo = { id: string; kind: "learn" | "build" | "profile" | "apply"; title: string; detail: string; tag?: string; tagClass?: string; actions: TodoAction[] };
  // Skills the picked roles ask for, gaps, and what the student already shows.
  const asked = new Set(roles.flatMap(role => role.match.qualifications.flatMap(group => group.skillIds)));
  const gapIds = new Set(gaps.map(gap => gap.skillId));
  const askedAndMissing = (ids: string[]) => ids.some(id => asked.has(id) && gapIds.has(id));
  const editProfile = () => { setJourneyStage("profile"); router.push("/onboarding?edit=1&step=3"); };
  const openProjectFor = (ids: string[]) => {
    const project = projects.find(row => row.skillIds.some(id => ids.includes(id)));
    return project
      ? () => setOpenProjectId(project.id)
      : () => document.getElementById("readiness-projects-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const button = (label: string, run: () => void, icon: React.ReactNode = <ArrowRight size={15} aria-hidden="true"/>): TodoAction =>
    ({ kind: "button", label, run, icon });
  const todos: Todo[] = [];
  if (askedAndMissing(["sql", "databases", "nosql"])) todos.push({
    id: "database", kind: "build",
    title: "Your target roles ask for SQL. Your resume doesn’t show database experience yet.",
    detail: "Build a small database for something you care about, write queries that answer useful questions, and document the results.",
    actions: [button("Start a database project", openProjectFor(["sql", "databases"]), <FolderKanban size={15} aria-hidden="true"/>),
      { kind: "external", href: learningLinks("sql", "SQL").course!.url, label: "Learn SQL first", icon: <BookOpen size={15} aria-hidden="true"/> }],
  });
  if (askedAndMissing(["rest_apis", "api_design", "system_integrations"])) todos.push({
    id: "api", kind: "build",
    title: "These internships ask for API experience. Your resume doesn’t demonstrate it yet.",
    detail: "Add an API integration to a project you already have. Handle a successful response, missing data, and a failed request.",
    actions: [button("Add an API feature", profile.projects.length ? editProfile : openProjectFor(["rest_apis", "api_design"])),
      { kind: "external", href: learningLinks("rest_apis", "REST APIs").course!.url, label: "Learn APIs first", icon: <BookOpen size={15} aria-hidden="true"/> }],
  });
  if (askedAndMissing(["software_testing"])) todos.push({
    id: "testing", kind: "build",
    title: "Your chosen internship involves testing software. Your projects don’t show testing yet.",
    detail: "Add tests to an existing project, including an edge case and an error case. Document a bug you caught or behavior you verified.",
    actions: [button("Improve an existing project", editProfile)],
  });
  if (askedAndMissing(["vulnerability_research", "threat_intelligence", "systems_security", "penetration_testing", "security_automation", "cloud_security", "threat_modeling"])) todos.push({
    id: "security", kind: "build",
    title: "You’re targeting cybersecurity, but your experience mostly shows software development.",
    detail: "Use your programming experience to investigate simulated login logs. Build an analyzer and write a short explanation of suspicious activity you found.",
    actions: [button("Build security experience", openProjectFor(["threat_intelligence", "vulnerability_research", "systems_security"]), <FolderKanban size={15} aria-hidden="true"/>)],
  });
  if (askedAndMissing(["git", "ci_cd"]) || (asked.has("git") && !profile.experiences.some(row => /team|club|open.source/i.test(`${row.title} ${row.organization} ${row.description}`)))) todos.push({
    id: "team", kind: "profile",
    title: "These roles involve team development. Your resume only shows individual work.",
    detail: "Make a small contribution to a student or open-source project. Fix a documented issue, submit a pull request, and record how you responded to feedback.",
    actions: [{ kind: "external", href: "https://goodfirstissue.dev/", label: "Plan a contribution", icon: <ArrowUpRight size={15} aria-hidden="true"/> }],
  });
  // Numbers in a bullet ("40+", "30%") are the simplest sign of a result.
  if (![...profile.experiences, ...profile.projects].some(row => /\d/.test(`${row.description} ${row.accomplishments ?? ""}`))) todos.push({
    id: "results", kind: "profile",
    title: "Your resume says what your job was, not what you did.",
    detail: "Instead of “Library assistant,” try “Helped 40+ students a shift find resources.”",
    actions: [button("Rewrite your bullets", editProfile)],
  });
  if (roles.some(role => TECH_FIELDS.includes(role.match.internship.career_field || "")) && !profile.projects.some(row => row.url.trim())) todos.push({
    id: "portfolio", kind: "profile",
    title: "Tech reviewers want to see your code. You haven’t linked any.",
    detail: "Put a project on GitHub (or a simple portfolio site) and add the link to your profile.",
    actions: [button("Add a link", editProfile), { kind: "external", href: "https://docs.github.com/en/get-started/start-your-journey/hello-world", label: "How to use GitHub", icon: <BookOpen size={15} aria-hidden="true"/> }],
  });
  if (profile.projects.some(row => !row.accomplishments?.trim() || !(row.skillIds ?? []).length)) todos.push({
    id: "describe", kind: "profile",
    title: "You already built something relevant, but employers can’t see what you contributed.",
    detail: "Walk through your class or personal project. Note your contribution, the tools you used, and what worked, then turn those facts into a resume entry.",
    actions: [button("Describe my project", editProfile)],
  });
  const unlinked = profile.experiences.filter(row => !(row.skillIds ?? []).some(id => asked.has(id)));
  if (unlinked.length) todos.push({
    id: "connect", kind: "profile",
    title: `Your ${unlinked[0].title || "work"} experience could support these roles.`,
    detail: "Describe a real situation where you diagnosed a problem, explained a solution, or helped someone use a tool.",
    actions: [button("Connect my experience", editProfile)],
  });
  // Skills to learn: top gaps not already covered by a project item above.
  const covered = new Set<string>([
    ...(todos.some(todo => todo.id === "database") ? ["sql", "databases", "nosql"] : []),
    ...(todos.some(todo => todo.id === "api") ? ["rest_apis", "api_design", "system_integrations"] : []),
    ...(todos.some(todo => todo.id === "testing") ? ["software_testing"] : []),
    ...(todos.some(todo => todo.id === "team") ? ["git", "ci_cd"] : []),
  ]);
  const toLearn = gaps.filter(gap => !covered.has(gap.skillId));
  const learnTodos: Todo[] = toLearn.slice(0, 3).map((gap, index) => {
    const links = learningLinks(gap.skillId, gap.label);
    return {
      id: `learn-${gap.skillId}`, kind: "learn",
      title: `Learn ${gap.label}`,
      detail: `${classificationLabel[gap.classification]} by ${gap.roles} of your ${roles.length} roles. Learn the basics, then use it in a project.`,
      tag: index === 0 && gap.classification === "required" ? "Required" : undefined, tagClass: "is-required",
      actions: [
        { kind: "external", href: links.video.url, label: links.video.label, icon: <PlayCircle size={15} aria-hidden="true"/> },
        ...(links.course ? [{ kind: "external" as const, href: links.course.url, label: links.course.label, icon: <BookOpen size={15} aria-hidden="true"/> }] : []),
      ],
    };
  });
  // Lead with the strongest project item, then the skills, then profile fixes.
  const firstProfileFix = todos.findIndex(todo => todo.kind === "profile");
  todos.splice(firstProfileFix === -1 ? todos.length : firstProfileFix, 0, ...learnTodos);
  const laterSkills = toLearn.slice(3).map(gap => gap.label);

  // Everything the student already brings, grouped for "What you already have".
  const roleFields = new Set(roles.map(role => role.match.internship.career_field || ""));
  const fieldMatches = profile.careerInterests.filter(field => roleFields.has(field));
  const eduFit = roles.filter(role =>
    !role.match.eligibility.some(check => check.status === "unmet") &&
    role.match.eligibility.some(check => ["major", "degree", "enrollment", "academic_year", "graduation"].includes(check.kind) && check.status === "confirmed"),
  ).length;
  const askedSkillIds = new Set(strengths.map(skill => skill.skillId));
  const otherSkills = [
    ...profile.skills.canonicalIds.filter(id => !askedSkillIds.has(id)).map(id => data.Skills.find(skill => skill.skill_id === id)?.skill_name || id),
    ...profile.skills.additional,
  ];
  const skillLabel = (id: string) => data.Skills.find(skill => skill.skill_id === id)?.skill_name || id;
  const enrollment = profile.education.enrollmentStatus === "full_time" ? "Full-time" : profile.education.enrollmentStatus === "part_time" ? "Part-time" : "";


  const tips = hiddenTips(readiness, profile.education.college);
  const doneTips = new Set(profile.completedTips ?? []);
  const doneCount = tips.filter(tip => doneTips.has(tip.id)).length;
  function toggleTip(id: string) {
    const next = doneTips.has(id) ? [...doneTips].filter(value => value !== id) : [...doneTips, id];
    saveProfile({ ...profile, completedTips: next });
  }
  function runAction(action: ReasonAction) {
    if (action.kind === "scroll") {
      document.getElementById(action.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action.kind === "route") {
      if (action.stage) setJourneyStage(action.stage);
      router.push(action.href);
    }
  }
  // Starting a project finishes onboarding so the project pages are reachable.
  const grade = gradeCandidate(scoreNow);
  const now = formatJobCount(estimateJobs(strongNow));
  const gained = estimateJobs(Math.max(strongAfter - strongNow, 0));

  if (!roles.length) return <div className="onboarding-content readiness-page">
    <header className="page-heading">
      <h1>Pick a few roles first</h1>
      <p>Select the internships that interest you, and we’ll show what you already bring and what to build next.</p>
    </header>
    <div className="onboarding-actions">
      <Link href="/discover-opportunities" className="plain-button"><ArrowLeft size={18}/>Back to opportunities</Link>
      <span/>
    </div>
  </div>;

  return <div className="onboarding-content readiness-page">
    <JourneyCrumbs current="direction"/>
    <div className="readiness-top">
      <header className="page-heading">
        <h1>Where you stand</h1>
        <p>An honest look at how you compare for the {roles.length === 1 ? "role" : `${roles.length} roles`} you picked, and what it takes to become a strong candidate.</p>
      </header>
      <aside className="readiness-score" aria-label="Jobs you are a strong candidate for">
        <div>
          <p className="readiness-score-label">Jobs you qualify for today</p>
          <p className="readiness-score-value">{now}</p>
          <p className="readiness-score-unit">jobs</p>
        </div>
        <TrendingUp size={22} className="readiness-score-arrow" aria-hidden="true"/>
        <div>
          <p className="readiness-score-label">After these changes</p>
          <p className="readiness-score-value is-after">+{formatJobCount(gained).replace(/\+$/, "")}</p>
          <p className="readiness-score-unit">more jobs</p>
        </div>
      </aside>
    </div>

    <section className={`readiness-grade is-${grade.tone}`} aria-label="Your candidate rating">
      <div className="readiness-grade-dial" style={{ ["--score" as string]: scoreNow }}>
        <span className="readiness-grade-number">{scoreNow}</span>
        <span className="readiness-grade-out">/100</span>
      </div>
      <div className="readiness-grade-text">
        <p className="readiness-grade-label"><AlertTriangle size={18} aria-hidden="true"/>Candidate rating: {grade.label}</p>
        <p className="readiness-grade-message">{grade.message}</p>
        <p className="readiness-grade-after">Close the gaps below and your rating rises to <strong>{Math.max(scoreAfter, scoreNow)}/100</strong>.</p>
      </div>
    </section>

    <section className="readiness-reasons" aria-labelledby="readiness-reasons-title">
      <div className="readiness-reasons-head">
        <h2 id="readiness-reasons-title" className="readiness-heading">What most students don’t know</h2>
        <p className="readiness-reasons-progress" aria-live="polite">{doneCount} of {tips.length} done</p>
      </div>
      <div className="readiness-reasons-bar" aria-hidden="true"><span style={{ width: `${(doneCount / tips.length) * 100}%` }}/></div>
      <ol>
        {tips.map(tip => {
          const done = doneTips.has(tip.id);
          return <li key={tip.id} className={done ? "is-done" : ""}>
            <span className="readiness-reason-icon" aria-hidden="true">{done ? <Check size={20} strokeWidth={3}/> : tip.icon}</span>
            <div>
              <p className="readiness-reason-title">{tip.title}</p>
              <p className="readiness-reason-detail">{tip.detail}{tip.source && <sup><a href={`#source-${tip.source}`}>{tip.source}</a></sup>}</p>
              <div className="readiness-reason-actions">
                {tip.action.kind === "external"
                  ? <a className="readiness-reason-fix" href={tip.action.href} target="_blank" rel="noopener noreferrer">{tip.action.label}<ArrowUpRight size={15} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a>
                  : <button type="button" className="readiness-reason-fix" onClick={() => runAction(tip.action)}>{tip.action.label}<ArrowRight size={15} aria-hidden="true"/></button>}
                <label className="readiness-reason-done">
                  <input type="checkbox" checked={done} onChange={() => toggleTip(tip.id)}/>
                  Done<span className="sr-only">: {tip.title}</span>
                </label>
              </div>
            </div>
          </li>;
        })}
      </ol>
    </section>

    <section className="readiness-roles" aria-labelledby="readiness-roles-title">
      <h2 id="readiness-roles-title" className="readiness-heading">How you compare, role by role</h2>
      <ul>
        {roles.map(({ match, score, have, missingRequired, missingPreferred }) => {
          const tone = gradeCandidate(score).tone;
          return <li key={match.internship.internship_id} className="readiness-role is-clickable">
            <button type="button" className="readiness-role-open" onClick={() => setOpenRoleId(match.internship.internship_id)}>
              <span className="sr-only">View details for {display(match.internship.job_title)} at {display(match.internship.company)}</span>
            </button>
            <div className="readiness-role-main">
              <div className="readiness-role-text">
                <p className="readiness-role-company">{display(match.internship.company)}</p>
                <p className="readiness-role-title">{display(match.internship.job_title)}<ChevronRight size={18} aria-hidden="true" className="readiness-role-chevron"/></p>
                <p className={`readiness-role-verdict is-${tone}`}>{roleVerdict(score, missingRequired.length)}</p>
              </div>
              <div className="readiness-role-meter">
                <p className={`readiness-role-score is-${tone}`}>{score}<span>/100</span></p>
                <div className="readiness-bar" role="img" aria-label={`Role strength ${score} out of 100`}>
                  <span className={`is-${tone}`} style={{ width: `${score}%` }}/>
                </div>
              </div>
            </div>
            <div className="readiness-role-skills">
              {have.length > 0 && <p><span className="readiness-role-skills-label">You show</span>{have.map(label => <span key={label} className="readiness-chip is-have">{label}</span>)}</p>}
              {missingRequired.length > 0 && <p><span className="readiness-role-skills-label">Missing (required)</span>{missingRequired.map(label => <span key={label} className="readiness-chip is-required">{label}</span>)}</p>}
              {missingPreferred.length > 0 && <p><span className="readiness-role-skills-label">Missing (preferred)</span>{missingPreferred.map(label => <span key={label} className="readiness-chip">{label}</span>)}</p>}
            </div>
          </li>;
        })}
      </ul>
    </section>

    <div className="readiness-columns">
      <section className="readiness-panel" aria-labelledby="readiness-have-title">
        <h2 id="readiness-have-title" className="readiness-heading"><CheckCircle2 size={20} aria-hidden="true"/>What you already have</h2>
        <div className="have-groups">
          <div className="have-group">
            <h3>Skills these roles want</h3>
            {strengths.length ? <ul className="readiness-list">
              {strengths.map(skill => <li key={skill.skillId}>
                <div className="readiness-item-head">
                  <strong>{skill.label}</strong>
                  <span className="readiness-chip is-have">{skill.roles} of {roles.length} roles</span>
                </div>
                <p className="readiness-item-detail">From {skill.sources.join(", ")}</p>
              </li>)}
            </ul> : <p className="supporting-text">None yet. Add coursework, projects, or work where you used them.</p>}
          </div>

          <div className="have-group">
            <h3>Education</h3>
            <ul className="readiness-list">
              <li>
                <strong>{[profile.education.major, profile.education.college].filter(Boolean).join(" at ") || "Your college program"}</strong>
                <p className="readiness-item-detail">{[enrollment && `${enrollment} student`, profile.education.academicYear && `year ${profile.education.academicYear}`, profile.education.gpa && `GPA ${profile.education.gpa}`].filter(Boolean).join(" · ")}</p>
              </li>
              {eduFit > 0 && <li>
                <strong>Meets the education requirements for {eduFit} of {roles.length} roles</strong>
                <p className="readiness-item-detail">Your degree, major, and enrollment line up with what these postings list.</p>
              </li>}
              {fieldMatches.length > 0 && <li>
                <strong>Your interests match these roles</strong>
                <p className="readiness-item-detail">You chose {fieldMatches.map(careerFieldName).join(" and ")}, the same field as your picks.</p>
              </li>}
            </ul>
          </div>

          {profile.experiences.length > 0 && <div className="have-group">
            <h3>Experience</h3>
            <ul className="readiness-list">
              {profile.experiences.map(row => <li key={row.id}>
                <strong>{row.title}{row.organization ? ` · ${row.organization}` : ""}</strong>
                <p className="readiness-item-detail">Shows: {[...transferableSkills(row), ...(row.skillIds ?? []).map(skillLabel)].join(", ") || "work experience"}</p>
              </li>)}
            </ul>
          </div>}

          {profile.projects.length > 0 && <div className="have-group">
            <h3>Projects</h3>
            <ul className="readiness-list">
              {profile.projects.map(row => <li key={row.id}>
                <strong>{row.title}</strong>
                <p className="readiness-item-detail">{row.kind === "academic" ? "Class project" : "Personal project"}{(row.skillIds ?? []).length ? ` · Uses ${(row.skillIds ?? []).map(skillLabel).join(", ")}` : ""}</p>
              </li>)}
            </ul>
          </div>}

          {(otherSkills.length > 0 || profile.certifications.length > 0) && <div className="have-group">
            <h3>More on your profile</h3>
            <ul className="readiness-list">
              {otherSkills.length > 0 && <li>
                <strong>Other skills</strong>
                <p className="readiness-item-detail">{otherSkills.join(", ")}. Useful, even if these roles don’t list them.</p>
              </li>}
              {profile.certifications.map(cert => <li key={cert}>
                <strong>{cert}</strong>
                <p className="readiness-item-detail">Certification</p>
              </li>)}
            </ul>
          </div>}
        </div>
      </section>

      <section className="readiness-panel" aria-labelledby="readiness-need-title">
        <h2 id="readiness-need-title" className="readiness-heading"><CircleDashed size={20} aria-hidden="true"/>What to do next</h2>
        <ol className="todo-list">
          {todos.map((todo, index) => <li key={todo.id} className={`todo-item is-${todo.kind}`}>
            <span className="todo-step" aria-hidden="true">{index + 1}</span>
            <div className="todo-body">
              <div className="readiness-item-head">
                <strong>{todo.title}</strong>
                {todo.tag && <span className={`readiness-chip ${todo.tagClass ?? ""}`}>{todo.tag}</span>}
              </div>
              <p className="readiness-item-detail">{todo.detail}</p>
              {todo.actions.length > 0 && <p className="todo-actions">
                {todo.actions.map(action => action.kind === "external"
                  ? <a key={action.label} href={action.href} target="_blank" rel="noopener noreferrer" className="todo-link">
                      {action.icon}{action.label}<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  : <button key={action.label} type="button" className="todo-link" onClick={action.run}>{action.icon}{action.label}</button>)}
              </p>}
            </div>
          </li>)}
        </ol>
        {laterSkills.length > 0 && <p className="todo-later">Also worth learning later: {laterSkills.join(", ")}</p>}
      </section>
    </div>

    {projects.length > 0 && <section className="readiness-projects" aria-labelledby="readiness-projects-title">
      <h2 id="readiness-projects-title" className="readiness-heading"><FolderKanban size={20} aria-hidden="true"/>Projects that close your gaps</h2>
      <div className="readiness-project-grid">
        {projects.map(project => <article key={project.id} className="readiness-project is-clickable">
          <button type="button" className="readiness-role-open" onClick={() => setOpenProjectId(project.id)}>
            <span className="sr-only">View details for {projectDisplayTitle(project)}</span>
          </button>
          <p className="readiness-project-kind">{projectKindLabel(project.kind)}</p>
          <h3>{projectDisplayTitle(project)}</h3>
          <p className="readiness-project-objective">{project.objective}</p>
          <p className="readiness-project-skills"><span className="readiness-role-skills-label">Builds</span>{project.missingSkillIds.map(id => <span key={id} className="readiness-chip is-impact-soft">{skillName(id)}</span>)}</p>
          <p className="readiness-project-roles">Helps with {project.internshipIds.length} of your {roles.length} roles<span className="readiness-project-more">View project<ChevronRight size={16} aria-hidden="true"/></span></p>
        </article>)}
      </div>
    </section>}

    <footer className="readiness-sources">
      <p>Job counts are estimates: each matching role in BridgePath’s sample stands for about 700 U.S. listings, based on roughly 5,000 software engineering internship openings on Indeed<sup><a href="#source-1">1</a></sup>.</p>
      <ol>
        <li id="source-1"><a href="https://www.indeed.com/q-software-engineering-internship-jobs.html" target="_blank" rel="noopener noreferrer">Indeed: software engineering internship listings (snapshot)</a></li>
        <li id="source-2"><a href="https://career.cornell.edu/resources/recruiting-timeline-by-career-pathways/" target="_blank" rel="noopener noreferrer">Cornell Career Services: recruiting timeline by career pathway</a></li>
      </ol>
    </footer>

    <ProjectDialog
      project={projects.find(project => project.id === openProjectId) ?? null}
      onClose={() => setOpenProjectId(null)}
      onStart={startProject}
    />
    <RoleDialog
      role={roles.find(role => role.match.internship.internship_id === openRoleId) ?? null}
      onClose={() => setOpenRoleId(null)}
    />

    <div className="onboarding-actions">
      <Link href="/discover-opportunities" className="plain-button"><ArrowLeft size={18}/>Back to opportunities</Link>
      <button type="button" className="button" onClick={() => router.push("/your-resume")}>See your future resume<ArrowRight size={18}/></button>
    </div>
  </div>;
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Award, BookOpen, Briefcase, CheckCircle2, FileText, FolderKanban, GraduationCap,
  MapPin, Pencil, Sparkles, Target, UserRound,
} from "lucide-react";
import { useStudentProfile } from "./profile-provider";
import { toCareerContext } from "@/lib/student-profile";
import { buildReadiness, gradeCandidate } from "@/lib/readiness";
import { careerFieldLabel } from "@/lib/profile-options";
import { transferableSkills } from "@/lib/transferable-skills";
import { display } from "@/lib/data";
import { workbook } from "@/lib/workbook";

const degreeLabels: Record<string, string> = { associate: "Associate’s", bachelor: "Bachelor’s", master: "Master’s", doctoral: "Doctoral" };
const yearLabels: Record<string, string> = { "1": "First year", "2": "Second year", "3": "Third year", "4": "Fourth year", "5+": "Fifth year+" };
const kindLabels: Record<string, string> = { work: "Work", internship: "Internship", research: "Research", extracurricular: "Activity" };

function monthLabel(value?: string) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return "";
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1).toLocaleString("en-US", { month: "short", year: "numeric" });
}
function range(start?: string, end?: string, ongoing?: boolean) {
  return [monthLabel(start), ongoing ? "Present" : monthLabel(end)].filter(Boolean).join(" – ");
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2)).toUpperCase();
}

function Section({ icon, title, editStep, children }: { icon: React.ReactNode; title: string; editStep?: number; children: React.ReactNode }) {
  return <section className="profile-card">
    <div className="profile-card-head">
      <h2>{icon}{title}</h2>
      {editStep && <Link href={`/onboarding?edit=1&step=${editStep}`} className="opp-link"><Pencil size={14} aria-hidden="true"/>Edit</Link>}
    </div>
    {children}
  </section>;
}

export function StudentProfilePage() {
  const { profile, ready, saveProfile, deleteProfile, canonicalSkills, setJourneyStage } = useStudentProfile();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const context = useMemo(() => toCareerContext(profile), [profile]);
  const readiness = useMemo(() => buildReadiness(context, workbook, context.interestedInternshipIds), [context]);
  if (!ready) return <p role="status" className="profile-loading">Loading your profile…</p>;

  const skillName = (id: string) => canonicalSkills.find(skill => skill.skill_id === id)?.skill_name || workbook.Skills.find(skill => skill.skill_id === id)?.skill_name || id;
  const asked = new Set(readiness.roles.flatMap(role => role.match.qualifications.flatMap(group => group.skillIds)));
  const skills = [
    ...profile.skills.canonicalIds.map(id => ({ label: skillName(id), wanted: asked.has(id) })),
    ...profile.skills.additional.map(label => ({ label, wanted: false })),
  ];
  const { education, personal } = profile;
  const grade = readiness.roles.length ? gradeCandidate(readiness.scoreNow) : null;
  const startedTitles = (profile.startedProjects ?? []).map(id => workbook.Projects.find(project => project.project_id === id)?.title || "Suggested project");
  const name = personal.preferredName || "Your name";

  function removeDemographics() {
    if (saveProfile({ ...profile, consent: { saveDemographics: false }, demographics: null }))
      setNotice("Optional demographic answers have been removed from your profile.");
  }
  function edit(step: number) {
    setJourneyStage("profile");
    router.push(`/onboarding?edit=1&step=${step}`);
  }

  return <div className="page-content profile-page profile-v2">
    {!profile.onboarding.completed && <p className="profile-inline-notice">
      Setup is incomplete. <Link href="/onboarding">Continue setup</Link> to explore internships.
    </p>}
    {notice && <p role="status" className="profile-inline-notice">{notice}</p>}

    <header className="profile-hero">
      <span className="profile-avatar" aria-hidden="true">{initials(name)}</span>
      <div className="profile-hero-text">
        <h1>{name}</h1>
        <p className="profile-hero-sub">
          {[education.major, education.college].filter(Boolean).join(" · ") || "Add your school and major"}
        </p>
        <ul className="discovery-tags profile-hero-tags">
          {personal.cityState && <li><MapPin size={14} aria-hidden="true"/>{personal.cityState}</li>}
          {education.academicYear && <li><GraduationCap size={14} aria-hidden="true"/>{yearLabels[education.academicYear]}</li>}
          {profile.careerInterests.map(field => <li key={field}><Target size={14} aria-hidden="true"/>{careerFieldLabel(field)}</li>)}
        </ul>
      </div>
      <button type="button" className="button profile-hero-edit" onClick={() => edit(1)}><Pencil size={16} aria-hidden="true"/>Edit profile</button>
    </header>

    <ul className="profile-stats" aria-label="Your progress">
      <li className={grade ? `is-${grade.tone}` : ""}>
        <strong>{grade ? `${readiness.scoreNow}/100` : "—"}</strong>
        <span>Candidate rating{grade ? ` · ${grade.label}` : ""}</span>
        <Link href="/your-fit" className="opp-link">See where you stand<ArrowRight size={14} aria-hidden="true"/></Link>
      </li>
      <li>
        <strong>{readiness.roles.length}</strong>
        <span>Saved roles</span>
        <Link href="/career-insights" className="opp-link">Browse roles<ArrowRight size={14} aria-hidden="true"/></Link>
      </li>
      <li>
        <strong>{(profile.startedProjects ?? []).length}</strong>
        <span>Projects in progress</span>
        <Link href="/my-projects" className="opp-link">My projects<ArrowRight size={14} aria-hidden="true"/></Link>
      </li>
      <li>
        <strong>{(profile.completedTips ?? []).length}</strong>
        <span>Job-search tips done</span>
        <Link href="/your-fit#readiness-reasons-title" className="opp-link">See tips<ArrowRight size={14} aria-hidden="true"/></Link>
      </li>
    </ul>

    <div className="profile-grid">
      <Section icon={<GraduationCap size={18} aria-hidden="true"/>} title="Education" editStep={2}>
        <dl className="profile-dl">
          <div><dt>School</dt><dd>{education.college || "Not provided"}</dd></div>
          <div><dt>Major</dt><dd>{education.major || "Not provided"}</dd></div>
          <div><dt>Degree</dt><dd>{degreeLabels[education.degreeLevel] || "Not provided"}</dd></div>
          <div><dt>Year</dt><dd>{yearLabels[education.academicYear] || "Not provided"}</dd></div>
          <div><dt>Graduation</dt><dd>{monthLabel(education.expectedGraduation) || "Not provided"}</dd></div>
          <div><dt>Enrollment</dt><dd>{education.enrollmentStatus === "full_time" ? "Full-time" : education.enrollmentStatus === "part_time" ? "Part-time" : "Not confirmed"}</dd></div>
          {education.gpa && <div><dt>GPA</dt><dd>{education.gpa} / {education.gpaScale || "4"}</dd></div>}
        </dl>
      </Section>

      <Section icon={<Sparkles size={18} aria-hidden="true"/>} title="Skills" editStep={3}>
        {skills.length ? <>
          <p className="profile-chips">{skills.map(skill => <span key={skill.label} className={`readiness-chip${skill.wanted ? " is-have" : ""}`}>{skill.label}</span>)}</p>
          {readiness.roles.length > 0 && <p className="profile-note">Green skills are asked for by your saved roles.</p>}
        </> : <p className="supporting-text">No skills listed yet.</p>}
        {readiness.gaps.length > 0 && <div className="profile-subblock">
          <h3>Skills to add next</h3>
          <p className="profile-chips">{readiness.gaps.slice(0, 6).map(gap => <span key={gap.skillId} className={`readiness-chip${gap.classification === "required" ? " is-required" : ""}`}>{gap.label}</span>)}</p>
        </div>}
      </Section>

      <Section icon={<Briefcase size={18} aria-hidden="true"/>} title="Experience" editStep={3}>
        {profile.experiences.length ? <ul className="profile-entries">
          {profile.experiences.map(row => <li key={row.id}>
            <div className="profile-entry-head">
              <strong>{row.title || "Untitled experience"}</strong>
              <span className="readiness-chip">{kindLabels[row.kind] ?? "Experience"}</span>
            </div>
            <p className="profile-entry-meta">{[row.organization, range(row.startMonth, row.endMonth, row.ongoing)].filter(Boolean).join(" · ")}</p>
            {row.description && <p>{row.description}</p>}
            {row.accomplishments && <p className="profile-entry-accomplish"><CheckCircle2 size={14} aria-hidden="true"/>{row.accomplishments}</p>}
            <p className="profile-chips">{[...transferableSkills(row), ...(row.skillIds ?? []).map(skillName)].map(label => <span key={label} className="readiness-chip">{label}</span>)}</p>
          </li>)}
        </ul> : <p className="supporting-text">No experience yet. Jobs, research, clubs, and volunteering all count.</p>}
      </Section>

      <Section icon={<FolderKanban size={18} aria-hidden="true"/>} title="Projects" editStep={3}>
        {profile.projects.length || startedTitles.length ? <ul className="profile-entries">
          {startedTitles.map((title, index) => <li key={`started-${index}`}>
            <div className="profile-entry-head"><strong>{title}</strong><span className="readiness-chip is-impact">In progress</span></div>
            <p className="profile-entry-meta">Started from your BridgePath plan</p>
          </li>)}
          {profile.projects.map(row => <li key={row.id}>
            <div className="profile-entry-head">
              <strong>{row.title}</strong>
              <span className="readiness-chip is-have">{row.kind === "academic" ? "Class project" : "Personal project"}</span>
            </div>
            <p className="profile-entry-meta">{[row.organization, range(row.startMonth, row.endMonth)].filter(Boolean).join(" · ")}</p>
            {row.description && <p>{row.description}</p>}
            {row.accomplishments && <p className="profile-entry-accomplish"><CheckCircle2 size={14} aria-hidden="true"/>{row.accomplishments}</p>}
            {(row.skillIds ?? []).length > 0 && <p className="profile-chips">{(row.skillIds ?? []).map(id => <span key={id} className="readiness-chip">{skillName(id)}</span>)}</p>}
            {row.url
              ? <a href={row.url} className="opp-link" target="_blank" rel="noopener noreferrer">View project<ArrowRight size={14} aria-hidden="true"/></a>
              : <p className="profile-note">No link yet. Add a GitHub or portfolio link so reviewers can see your work.</p>}
          </li>)}
        </ul> : <p className="supporting-text">No projects yet. <Link href="/my-projects">Find one that closes your gaps.</Link></p>}
      </Section>

      <Section icon={<Award size={18} aria-hidden="true"/>} title="Certifications" editStep={3}>
        {profile.certifications.length
          ? <ul className="profile-entries">{profile.certifications.map(cert => <li key={cert}><strong>{cert}</strong></li>)}</ul>
          : <p className="supporting-text">No certifications listed.</p>}
      </Section>

      <Section icon={<FileText size={18} aria-hidden="true"/>} title="Resume" editStep={5}>
        <p>{profile.resume.reviewedLocally ? "You reviewed a resume on this device. The file itself is never saved." : "No resume reviewed yet."}</p>
        <Link href="/your-resume" className="opp-link">Preview and download your resume<ArrowRight size={14} aria-hidden="true"/></Link>
      </Section>

      {readiness.roles.length > 0 && <Section icon={<BookOpen size={18} aria-hidden="true"/>} title="Saved roles">
        <ul className="profile-entries">
          {readiness.roles.map(role => {
            const tone = gradeCandidate(role.score).tone;
            return <li key={role.match.internship.internship_id}>
              <div className="profile-entry-head">
                <Link href={`/career-insights/${encodeURIComponent(role.match.internship.internship_id)}`} className="profile-role-link"><strong>{display(role.match.internship.job_title)}</strong></Link>
                <span className={`opp-score is-${tone}`}>{role.score}<span>/100</span></span>
              </div>
              <p className="profile-entry-meta">{display(role.match.internship.company)} · {display(role.match.internship.location)}</p>
            </li>;
          })}
        </ul>
      </Section>}

      <Section icon={<UserRound size={18} aria-hidden="true"/>} title="About you" editStep={1}>
        <dl className="profile-dl">
          <div><dt>Preferred name</dt><dd>{personal.preferredName || "Not provided"}</dd></div>
          <div><dt>Location</dt><dd>{personal.cityState || "Not provided"}</dd></div>
          <div><dt>Career interests</dt><dd>{profile.careerInterests.map(careerFieldLabel).join(", ") || "Not provided"}</dd></div>
          {profile.consent.saveDemographics && profile.demographics && <>
            <div><dt>Age range</dt><dd>{profile.demographics.ageRange || "Not shared"}</dd></div>
            <div><dt>Race / ethnicity</dt><dd>{profile.demographics.raceEthnicity || "Not shared"}</dd></div>
          </>}
        </dl>
        {profile.consent.saveDemographics && <p className="profile-note">Demographic answers are saved with your consent and never used for matching.</p>}
      </Section>
    </div>

    <section className="profile-data-controls profile-card">
      <h2>Your data</h2>
      <p>Your information stays in this browser. It is local-device storage, not a secure cloud account. Raw resume documents are never saved.</p>
      <div className="profile-data-actions">
        {profile.consent.saveDemographics && <button className="plain-button" type="button" onClick={removeDemographics}>Remove optional demographic answers</button>}
        {!confirmDelete
          ? <button className="plain-button delete-profile-button" type="button" onClick={() => setConfirmDelete(true)}>Delete locally saved profile</button>
          : <div className="delete-confirmation">
              <p>This will remove your saved profile and setup progress from this browser.</p>
              <button type="button" className="text-button" onClick={() => { if (deleteProfile()) router.replace("/onboarding"); }}>Delete profile from this browser</button>
              <button type="button" className="plain-button" onClick={() => setConfirmDelete(false)}>Keep my profile</button>
            </div>}
      </div>
    </section>
  </div>;
}

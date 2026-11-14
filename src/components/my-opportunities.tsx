"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bookmark, BookmarkCheck, Briefcase, CalendarDays, MapPin, Search } from "lucide-react";
import { useStudentProfile } from "./profile-provider";
import { toCareerContext } from "@/lib/student-profile";
import { matchInternship, rankInternships, type InternshipMatch } from "@/lib/matching";
import { gradeCandidate, toRoleReadiness, type ScoreSignals } from "@/lib/readiness";
import { careerFieldLabel } from "@/lib/profile-options";
import { display } from "@/lib/data";
import { workbook } from "@/lib/workbook";

const data = workbook;

function companyInitials(name: string) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}
/** Short term label like "Summer 2027" pulled from the title or program details. */
function termLabel(match: InternshipMatch) {
  const text = `${match.internship.job_title || ""} ${match.internship.program_details || ""}`;
  const season = text.match(/\b(spring|summer|fall|winter)\b/i)?.[1];
  const year = text.match(/\b20\d{2}\b/)?.[0];
  return season || year ? [season && season[0].toUpperCase() + season.slice(1).toLowerCase(), year].filter(Boolean).join(" ") : "";
}
const isRemote = (match: InternshipMatch) => /remote/i.test(match.internship.location || "");

function JobRow({ match, saved, onOpen, onToggle, signals }: {
  match: InternshipMatch;
  signals: ScoreSignals;
  saved: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const job = match.internship;
  const { score } = toRoleReadiness(match, data, signals);
  const tone = gradeCandidate(score).tone;
  const term = termLabel(match);
  return <li className={`job-row${saved ? " is-saved" : ""}`}>
    <button type="button" className="job-row-open" onClick={onOpen}>
      <span className="sr-only">Open {display(job.job_title)} at {display(job.company)}</span>
    </button>
    <span className="job-logo" aria-hidden="true">{companyInitials(display(job.company))}</span>
    <div className="job-main">
      <p className="job-title">{display(job.job_title)}</p>
      <p className="job-company">{display(job.company)}</p>
      <ul className="job-meta" aria-label="Job details">
        <li><MapPin size={14} aria-hidden="true"/>{display(job.location)}</li>
        <li><Briefcase size={14} aria-hidden="true"/>{careerFieldLabel(job.career_field || "")}</li>
        {term && <li><CalendarDays size={14} aria-hidden="true"/>{term}</li>}
        <li className="job-tag">Internship</li>
        {isRemote(match) && <li className="job-tag">Remote</li>}
      </ul>
    </div>
    <div className="job-side">
      <p className={`job-match is-${tone}`}><strong>{score}%</strong> match</p>
      <button type="button" className={`job-save${saved ? " is-on" : ""}`} aria-pressed={saved} onClick={onToggle}>
        {saved ? <BookmarkCheck size={16} aria-hidden="true"/> : <Bookmark size={16} aria-hidden="true"/>}
        {saved ? "Saved" : "Save"}
        <span className="sr-only">: {display(job.job_title)} at {display(job.company)}</span>
      </button>
    </div>
  </li>;
}

export function MyOpportunities() {
  const { profile, ready, saveProfile } = useStudentProfile();
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "recommended" | "saved">("all");
  const [query, setQuery] = useState("");
  const [field, setField] = useState("all");
  const [sort, setSort] = useState<"match" | "company">("match");
  const context = useMemo(() => toCareerContext(profile), [profile]);
  const savedIds = context.interestedInternshipIds;
  const recommended = useMemo(
    () => profile.onboarding.completed ? rankInternships(context, data, 15) : [],
    [context, profile.onboarding.completed],
  );
  // Every internship in the dataset, scored against this student.
  const everyJob = useMemo(
    () => data.Internships.map(job => matchInternship(context, job, data)),
    [context],
  );
  const saved = useMemo(
    () => data.Internships.filter(job => savedIds.includes(job.internship_id)).map(job => matchInternship(context, job, data)),
    [context, savedIds],
  );
  if (!ready)
    return <p role="status" className="profile-loading">Finding your opportunities…</p>;
  if (!profile.onboarding.completed)
    return <div className="page-content">
      <header className="page-heading">
        <h1>Finish your student profile</h1>
        <p>Complete setup so we can show a focused, evidence-based shortlist.</p>
        <Link href="/onboarding" className="button">Continue setup<ArrowRight size={18}/></Link>
      </header>
    </div>;

  const signals: ScoreSignals = { hasInternship: profile.experiences.some(row => row.kind === "internship") };
  function toggle(id: string) {
    const ids = profile.interestedInternshipIds ?? [];
    saveProfile({ ...profile, interestedInternshipIds: ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id] });
  }
  // Recommended tab keeps saved roles in place too, so the board doesn't jump around.
  const source = tab === "all"
    ? everyJob
    : tab === "saved"
      ? saved
      : [...recommended, ...saved.filter(match => !recommended.some(row => row.internship.internship_id === match.internship.internship_id))];
  const fields = [...new Set(source.map(match => match.internship.career_field || "").filter(Boolean))];
  const needle = query.trim().toLowerCase();
  const rows = source
    .filter(match => field === "all" || match.internship.career_field === field)
    .filter(match => !needle || `${match.internship.job_title} ${match.internship.company} ${match.internship.location}`.toLowerCase().includes(needle))
    .sort((a, b) => sort === "company"
      ? (a.internship.company || "").localeCompare(b.internship.company || "")
      : toRoleReadiness(b, data, signals).score - toRoleReadiness(a, data, signals).score);

  return <div className="page-content opportunities-page job-board">
    <header className="page-heading job-board-head">
      <div>
        <h1>Career Insights</h1>
        <p>Every internship in BridgePath, scored against your profile. Save the ones you want to go after.</p>
      </div>
    </header>

    <div className="job-tabs" role="tablist" aria-label="Opportunity lists">
      <button type="button" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "is-active" : ""} onClick={() => setTab("all")}>
        All jobs <span>{everyJob.length}</span>
      </button>
      <button type="button" role="tab" aria-selected={tab === "recommended"} className={tab === "recommended" ? "is-active" : ""} onClick={() => setTab("recommended")}>
        Recommended <span>{recommended.length}</span>
      </button>
      <button type="button" role="tab" aria-selected={tab === "saved"} className={tab === "saved" ? "is-active" : ""} onClick={() => setTab("saved")}>
        Saved <span>{saved.length}</span>
      </button>
    </div>

    <div className="job-filters">
      <label className="job-search">
        <Search size={16} aria-hidden="true"/>
        <span className="sr-only">Search jobs</span>
        <input type="search" placeholder="Search title, company, or location" value={query} onChange={event => setQuery(event.target.value)}/>
      </label>
      <label className="job-select">
        <span className="sr-only">Career field</span>
        <select value={field} onChange={event => setField(event.target.value)}>
          <option value="all">All fields</option>
          {fields.map(value => <option key={value} value={value}>{careerFieldLabel(value)}</option>)}
        </select>
      </label>
      <label className="job-select">
        <span className="sr-only">Sort by</span>
        <select value={sort} onChange={event => setSort(event.target.value as "match" | "company")}>
          <option value="match">Best match</option>
          <option value="company">Company A–Z</option>
        </select>
      </label>
    </div>

    <p className="job-count" aria-live="polite">{rows.length} {rows.length === 1 ? "internship" : "internships"}</p>
    {rows.length
      ? <ul className="job-list">{rows.map(match => <JobRow
          key={match.internship.internship_id}
          match={match}
          saved={savedIds.includes(match.internship.internship_id)}
          onOpen={() => router.push(`/career-insights/${encodeURIComponent(match.internship.internship_id)}`)}
          onToggle={() => toggle(match.internship.internship_id)}
          signals={signals}
        />)}</ul>
      : <div className="empty-state">
          <h2>{tab === "saved" && !saved.length ? "No saved internships yet" : "No internships match these filters"}</h2>
          <p>{tab === "saved" && !saved.length ? "Save roles from the Recommended tab to keep them here." : "Try a different search or field."}</p>
        </div>}

    <details className="disclosure secondary-information">
      <summary>How these are chosen</summary>
      <div className="disclosure-content">
        <p>All jobs lists every internship in the dataset. Recommended roles exclude explicit, unmet required eligibility conditions and recorded closed postings, then favor your career fields and the skills you already document. Match % weighs what recruiters screen for: required and preferred skills you show, relevant work experience, projects that use those skills, a portfolio link, and internship experience.</p>
        <p>Age, race/ethnicity, school prestige, and resume contents never influence this ordering. Source: {data.metadata.source}. Posting status is not verified current availability.</p>
        <Link href="/profile">Review your saved profile</Link>
      </div>
    </details>

  </div>;
}

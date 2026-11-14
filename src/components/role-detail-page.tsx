"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, ArrowUpRight, Bookmark, BookmarkCheck, Check, X } from "lucide-react";
import { useStudentProfile } from "./profile-provider";
import { roleVerdict } from "./role-dialog";
import { toCareerContext } from "@/lib/student-profile";
import { matchInternship } from "@/lib/matching";
import { gradeCandidate, toRoleReadiness } from "@/lib/readiness";
import { careerFieldLabel } from "@/lib/profile-options";
import { display, safeWebUrl } from "@/lib/data";
import { workbook } from "@/lib/workbook";

const classificationLabel = { required: "Required", preferred: "Preferred", unspecified: "Mentioned" } as const;
const order = { required: 0, preferred: 1, unspecified: 2 } as const;

/**
 * Career Insights role page: the original page layout, showing the same
 * details as the Where you stand popup (score, verdict, what they ask for).
 */
export function RoleDetailPage({ internshipId, backTo = "/career-insights" }: { internshipId: string; backTo?: string }) {
  const { profile, ready, saveProfile } = useStudentProfile();
  const role = useMemo(() => {
    const job = workbook.Internships.find(row => row.internship_id === internshipId);
    if (!job) return null;
    const match = matchInternship(toCareerContext(profile), job, workbook);
    return toRoleReadiness(match, workbook, { hasInternship: profile.experiences.some(row => row.kind === "internship") });
  }, [profile, internshipId]);
  if (!ready) return <p role="status" className="profile-loading">Loading this role…</p>;
  if (!role) return <div className="page-content"><p>This internship is not in the dataset.</p><Link href={backTo}>Back to Career Insights</Link></div>;

  const job = role.match.internship;
  const tone = gradeCandidate(role.score).tone;
  const posting = safeWebUrl(job.employer_posting_url);
  const saved = (profile.interestedInternshipIds ?? []).includes(internshipId);
  const groups = [...role.match.qualifications].sort((a, b) => order[a.classification] - order[b.classification]);
  function toggle() {
    const ids = profile.interestedInternshipIds ?? [];
    saveProfile({ ...profile, interestedInternshipIds: saved ? ids.filter(id => id !== internshipId) : [...ids, internshipId] });
  }

  return <div className="page-content detail-page">
    <Link href={backTo} className="back-link"><ArrowLeft size={18}/>Back to Career Insights</Link>
    <header className="page-heading">
      <p className="company-name">{display(job.company)}</p>
      <h1>{display(job.job_title)}</h1>
      <p>{display(job.location)} · {careerFieldLabel(job.career_field || "")}</p>
    </header>
    {job.job_description_summary && <p className="role-overview">{job.job_description_summary}</p>}
    {posting
      ? <a href={posting} target="_blank" rel="noopener noreferrer" className="text-link">
          Original employer posting<ArrowUpRight size={18}/><span className="sr-only"> (opens in a new tab)</span>
        </a>
      : <p>Original posting URL unavailable.</p>}
    <p className="availability-note">
      Retrieved {display(job.retrieved_on)}. Recorded status: {display(job.posting_status)} — current availability unverified.
    </p>

    <div className={`role-dialog-score role-page-score is-${tone}`}>
      <p className={`readiness-role-score is-${tone}`}>{role.score}<span>/100</span></p>
      <p className={`readiness-role-verdict is-${tone}`}>{roleVerdict(role.score, role.missingRequired.length)}</p>
    </div>

    <section className="brief-section" aria-labelledby="role-asks-heading">
      <h2 id="role-asks-heading">What they ask for</h2>
      <p className="section-description">A ✓ means your profile shows it. Preferred and mentioned skills aren’t mandatory, but they break ties.</p>
      {groups.length ? <ul className="role-dialog-reqs role-page-reqs">
        {groups.map((group, index) => <li key={index} className={group.satisfied ? "is-met" : "is-missing"}>
          <span className="role-dialog-req-icon" aria-hidden="true">{group.satisfied ? <Check size={14} strokeWidth={3}/> : <X size={14} strokeWidth={3}/>}</span>
          <span className="role-dialog-req-text">
            <strong>{group.labels.join(group.mode === "any" ? " or " : ", ")}</strong>
            <span className={`readiness-chip is-${group.classification}`}>{classificationLabel[group.classification]}</span>
            <span className="sr-only">{group.satisfied ? " — you show this" : " — missing"}</span>
          </span>
        </li>)}
      </ul> : <p>This posting does not list specific skills.</p>}
    </section>

    {job.program_details && <section className="brief-section">
      <h2>Program details</h2>
      <p>{job.program_details}</p>
    </section>}

    <section className="next-step">
      <h2>Your next step</h2>
      <p>{saved ? "This role is saved. See how you compare across all your saved roles." : "Save this role to compare it with your others and get a plan to close the gaps."}</p>
      <div className="role-page-actions">
        <button type="button" className={`job-save role-page-save${saved ? " is-on" : ""}`} aria-pressed={saved} onClick={toggle}>
          {saved ? <BookmarkCheck size={16} aria-hidden="true"/> : <Bookmark size={16} aria-hidden="true"/>}
          {saved ? "Saved to your roles" : "Save this role"}
        </button>
        {posting && <a href={posting} className="button" target="_blank" rel="noopener noreferrer">
          View the job posting<ArrowUpRight size={18}/><span className="sr-only"> (opens in a new tab)</span>
        </a>}
      </div>
    </section>
  </div>;
}

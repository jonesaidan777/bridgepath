"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight, Briefcase, Check, MapPin, X } from "lucide-react";
import { gradeCandidate, type RoleReadiness } from "@/lib/readiness";
import { display, safeWebUrl } from "@/lib/data";
import { careerFieldLabel } from "@/lib/profile-options";

const classificationLabel = { required: "Required", preferred: "Preferred", unspecified: "Mentioned" } as const;

export function roleVerdict(score: number, missingRequired: number) {
  if (missingRequired > 1) return `Missing ${missingRequired} required skills. Most screeners would pass on this application.`;
  if (missingRequired === 1) return "Missing 1 required skill. That alone can get an application filtered out.";
  if (score < 90) return "Meets the basics, but stronger applicants also show the preferred skills.";
  return "You show what this role asks for.";
}

/**
 * The one job-details view used everywhere: the Where you stand popup,
 * Discover, and the Career Insights role page.
 */
export function RoleDetails({ role, titleId, actions, onClose }: {
  role: RoleReadiness;
  titleId: string;
  actions?: React.ReactNode;
  onClose?: () => void;
}) {
  const job = role.match.internship;
  const tone = gradeCandidate(role.score).tone;
  const posting = safeWebUrl(job.employer_posting_url);
  const order = { required: 0, preferred: 1, unspecified: 2 } as const;
  return <div className="role-dialog-body">
    <header className="role-dialog-head">
      <div>
        <p className="readiness-role-company">{display(job.company)}</p>
        <h2 id={titleId}>{display(job.job_title)}</h2>
        <ul className="discovery-tags">
          <li><Briefcase size={14} aria-hidden="true"/>{careerFieldLabel(job.career_field || "")}</li>
          <li><MapPin size={14} aria-hidden="true"/>{display(job.location)}</li>
        </ul>
        {posting && <a href={posting} className="role-dialog-posting" target="_blank" rel="noopener noreferrer">
          View the original job posting<ArrowUpRight size={15} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span>
        </a>}
      </div>
      {onClose && <button type="button" className="role-dialog-close" onClick={onClose} aria-label="Close"><X size={20}/></button>}
    </header>
    <div className={`role-dialog-score is-${tone}`}>
      <p className={`readiness-role-score is-${tone}`}>{role.score}<span>/100</span></p>
      <p className={`readiness-role-verdict is-${tone}`}>{roleVerdict(role.score, role.missingRequired.length)}</p>
    </div>
    {job.job_description_summary && <section>
      <h3>About the role</h3>
      <p>{job.job_description_summary}</p>
    </section>}
    <section>
      <h3>What they ask for</h3>
      {role.match.qualifications.length ? <ul className="role-dialog-reqs">
        {[...role.match.qualifications]
          .sort((a, b) => order[a.classification] - order[b.classification])
          .map((group, index) => <li key={index} className={group.satisfied ? "is-met" : "is-missing"}>
            <span className="role-dialog-req-icon" aria-hidden="true">{group.satisfied ? <Check size={14} strokeWidth={3}/> : <X size={14} strokeWidth={3}/>}</span>
            <span className="role-dialog-req-text">
              <strong>{group.labels.join(group.mode === "any" ? " or " : ", ")}</strong>
              <span className={`readiness-chip is-${group.classification}`}>{classificationLabel[group.classification]}</span>
              <span className="sr-only">{group.satisfied ? " — you show this" : " — missing"}</span>
            </span>
          </li>)}
      </ul> : <p className="supporting-text">This posting does not list specific skills.</p>}
    </section>
    {job.program_details && <section>
      <h3>Program details</h3>
      <p>{job.program_details}</p>
    </section>}
    <div className="role-details-actions">
      {posting && <a href={posting} className="button role-dialog-link" target="_blank" rel="noopener noreferrer">
        View the job posting<ArrowUpRight size={18} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span>
      </a>}
      {actions}
    </div>
  </div>;
}

export function RoleDialog({ role, onClose, actions }: { role: RoleReadiness | null; onClose: () => void; actions?: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (role && !dialog.open) dialog.showModal();
    if (!role && dialog.open) dialog.close();
  }, [role]);
  return <dialog
    ref={ref}
    className="role-dialog"
    aria-labelledby="role-dialog-title"
    onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
  >
    {role && <RoleDetails role={role} titleId="role-dialog-title" onClose={onClose} actions={actions}/>}
  </dialog>;
}

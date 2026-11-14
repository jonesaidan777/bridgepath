"use client";

import { useEffect, useRef } from "react";
import { Play, X } from "lucide-react";
import { display, safeWebUrl } from "@/lib/data";
import { projectDisplayTitle, type ProjectRecommendation } from "@/lib/project-recommendations";
import { workbook } from "@/lib/workbook";

const data = workbook;
const skillName = (id: string) => data.Skills.find(skill => skill.skill_id === id)?.skill_name || id;

export const projectKindLabel = (kind: ProjectRecommendation["kind"]) =>
  kind === "guided" ? "Guided project" : kind === "workbook_brief" ? "Project brief" : "Suggested project";
// Concepts have no recorded milestones; these steps are BridgePath's generic outline.
const conceptSteps = [
  { title: "Scope it", detail: "Pick a small, realistic example and write down what “done” looks like in a few sentences." },
  { title: "Build the core", detail: "Get the simplest working version running end to end using the skills listed above." },
  { title: "Check your work", detail: "Add tests or validation checks and fix what they catch." },
  { title: "Write it up", detail: "Add a README covering the problem, your approach, how to run it, and its limits. Link it on your resume." },
];

export function ProjectDialog({ project, onClose, onStart }: { project: ProjectRecommendation | null; onClose: () => void; onStart: (project: ProjectRecommendation) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (project && !dialog.open) dialog.showModal();
    if (!project && dialog.open) dialog.close();
  }, [project]);
  const milestones = project
    ? data.Milestones.filter(step => step.project_id === project.id).sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0))
    : [];
  const roles = project
    ? project.internshipIds.map(id => {
        const job = data.Internships.find(row => row.internship_id === id);
        const asks = project.connections.filter(row => row.internship_id === id);
        return { id, job, required: asks.some(row => row.requirement_type === "required") };
      })
    : [];
  return <dialog
    ref={ref}
    className="role-dialog"
    aria-labelledby="project-dialog-title"
    onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
  >
    {project && <div className="role-dialog-body">
      <header className="role-dialog-head">
        <div>
          <p className="readiness-project-kind">{projectKindLabel(project.kind)}</p>
          <h2 id="project-dialog-title">{projectDisplayTitle(project)}</h2>
        </div>
        <button type="button" className="role-dialog-close" onClick={onClose} aria-label="Close"><X size={20}/></button>
      </header>
      <section>
        <h3>What you’ll make</h3>
        <p>{project.objective}</p>
      </section>
      <section>
        <h3>Final deliverable</h3>
        <p>{project.deliverable}</p>
      </section>
      <section>
        <h3>Skills you’ll build</h3>
        <p className="readiness-project-skills">{project.skillIds.map(id => <span key={id} className={`readiness-chip${project.missingSkillIds.includes(id) ? " is-impact-soft" : ""}`}>{skillName(id)}</span>)}</p>
        <p className="role-dialog-note">Highlighted skills are ones your profile is missing.</p>
      </section>
      <section>
        <h3>Roles it helps with</h3>
        <ul className="role-dialog-reqs">
          {roles.map(({ id, job, required }) => <li key={id} className="is-met">
            <span className="role-dialog-req-text">
              <strong>{job ? `${display(job.company)} — ${display(job.job_title)}` : id}</strong>
              {required && <span className="readiness-chip is-required">Closes a required skill</span>}
            </span>
          </li>)}
        </ul>
      </section>
      <section>
        <h3>{milestones.length ? "Steps" : "Suggested steps"}</h3>
        <ol className="project-dialog-steps">
          {milestones.length
            ? milestones.map(step => <li key={step.milestone_id}>
                <strong>{step.title}</strong>
                {step.instructions && <p>{step.instructions}</p>}
                {step.deliverable && <p className="role-dialog-note">Deliverable: {step.deliverable}</p>}
                {step.resource_url && safeWebUrl(step.resource_url) && <a href={safeWebUrl(step.resource_url)!} target="_blank" rel="noopener noreferrer" className="text-link">{step.resource_title || "Resource"}<span className="sr-only"> (opens in a new tab)</span></a>}
              </li>)
            : conceptSteps.map(step => <li key={step.title}><strong>{step.title}</strong><p>{step.detail}</p></li>)}
        </ol>
      </section>
      <div className="project-dialog-actions">
        <button type="button" className="button" onClick={() => onStart(project)}><Play size={16} aria-hidden="true"/>Start this project</button>
        <button type="button" className="plain-button" onClick={onClose}>Maybe later</button>
      </div>
    </div>}
  </dialog>;
}

/** Project page for a recommendation; concepts need their internship for context. */
export function projectStartHref(project: ProjectRecommendation) {
  const internship = project.kind === "concept" ? project.internshipIds[0] : project.selectedInternshipId;
  return `/my-projects/${encodeURIComponent(project.id)}${internship ? `?internship=${encodeURIComponent(internship)}` : ""}`;
}

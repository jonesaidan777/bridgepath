import Link from "next/link";
import { PersonalizedProjectContext } from "./project-recommendations";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import {
  display,
  getInternships,
  getMilestones,
  getProjectSkills,
  getRequirementsForProject,
  getSkill,
  projectHref,
  researchHref,
  safeWebUrl,
} from "@/lib/data";
import type { Project } from "@/lib/workbook-types";

export function ProjectDetails({
  project,
  activeMilestoneId,
  internshipId,
}: {
  project: Project;
  activeMilestoneId?: string;
  internshipId?: string;
}) {
  const skills = getProjectSkills(project);
  const milestones = getMilestones(project.project_id);
  const connections = getRequirementsForProject(project.project_id);
  const internshipIds = [
    ...new Set(connections.map((row) => row.internship_id)),
  ];
  const internships = getInternships();
  const first = milestones[0];
  const activeStepMissing =
    activeMilestoneId &&
    !milestones.some((step) => step.milestone_id === activeMilestoneId);
  return (
    <div className="page-content detail-page">
      <Link href="/my-projects" className="back-link">
        <ArrowLeft size={18} />
        Back to projects
      </Link>
      <header className="page-heading">
        <h1>{display(project.title)}</h1>
        <p>{display(project.description)}</p>
      </header>
      <p className="match-category">{milestones.length ? "Guided workbook project" : "Workbook brief · not guided"}</p>
      <section className="project-outcome">
        <h2>What you’ll produce</h2>
        <p>{display(project.final_deliverable)}</p>
      </section>
      {first ? (
        <Link
          href={`${projectHref(project.project_id)}?${new URLSearchParams({ step: first.milestone_id, ...(internshipId ? { internship: internshipId } : {}) })}#guided-path`}
          className="button"
        >
          Start the guided project
          <ArrowRight size={18} />
        </Link>
      ) : (
        <div className="unguided-note">
          <h2>Workbook brief · no guided steps</h2>
          <p>
            The project brief is available, but no milestones or learning
            resources are recorded yet.
          </p>
          <Link href="/onboarding?edit=1&step=4" className="button">
            Add this brief to your profile
            <ArrowRight size={18} />
          </Link>
          <p className="supporting-text">Add a planned project entry manually; no work is marked complete.</p>
        </div>
      )}
      {milestones.length > 0 && (
        <section
          id="guided-path"
          className="guided-section"
          aria-labelledby="guided-heading"
        >
          <h2 id="guided-heading">Your guided steps</h2>
          {activeStepMissing && (
            <p role="status" className="supporting-text">
              That milestone is unavailable. Choose one of the recorded steps
              below.
            </p>
          )}
          <p className="section-description">
            Open a step when you’re ready. Completion is not tracked.
          </p>
          <ol className="guided-milestones">
            {milestones.map((milestone) => {
              const resource = safeWebUrl(milestone.resource_url);
              return (
                <li key={milestone.milestone_id}>
                  <details
                    className="disclosure"
                    open={milestone.milestone_id === activeMilestoneId}
                  >
                    <summary>
                      <span className="step-number">
                        {milestone.step_number ?? "—"}.
                      </span>
                      {display(milestone.title)}
                    </summary>
                    <div className="disclosure-content">
                      <p>{display(milestone.instructions)}</p>
                      <h3>Deliverable</h3>
                      <p>{display(milestone.deliverable)}</p>
                      <details className="resource-disclosure">
                        <summary>Learning resource</summary>
                        <div>
                          {resource ? (
                            <a
                              className="text-link"
                              href={resource}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {display(milestone.resource_title)}
                              <ArrowUpRight size={18} />
                              <span className="sr-only">
                                {" "}
                                (opens in a new tab)
                              </span>
                            </a>
                          ) : (
                            <p>
                              Resource link unavailable
                              {milestone.resource_title
                                ? `: ${milestone.resource_title}`
                                : "."}
                            </p>
                          )}
                        </div>
                      </details>
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        </section>
      )}
      <PersonalizedProjectContext projectId={project.project_id} internshipId={internshipId} />
      <div className="secondary-information">
        <details className="disclosure">
          <summary>Skills you’ll practice</summary>
          <div className="disclosure-content">
            <div className="skill-tokens">
              {skills.length ? (
                skills.map((skill) => (
                  <Link
                    key={skill.skill_id}
                    href={researchHref({
                      careerField: project.career_field ?? undefined,
                      skillId: skill.skill_id,
                    })}
                  >
                    {display(skill.skill_name)}
                    <ArrowUpRight size={16} />
                  </Link>
                ))
              ) : (
                <p>No target skills recorded.</p>
              )}
            </div>
          </div>
        </details>
        <details id="project-evidence" className="disclosure">
          <summary>Why this project is relevant to employers</summary>
          <div className="disclosure-content">
            <p className="supporting-text">
              Connected through shared skill IDs, not an employer endorsement or
              proof of meeting every qualification. Posting availability is
              unverified.
            </p>
            {internshipIds.length ? (
              internshipIds.map((id) => {
                const job = internships.find((job) => job.internship_id === id);
                const rows = connections.filter(
                  (row) => row.internship_id === id,
                );
                return (
                  <details key={id} className="employer-disclosure">
                    <summary>
                      {display(job?.company)} — {display(job?.job_title)}
                    </summary>
                    <div className="connection-evidence">
                      {rows.map((row, index) => (
                        <div key={index}>
                          <h3>
                            {display(getSkill(row.skill_id)?.skill_name)}{" "}
                            <span className="requirement-type">
                              {row.requirement_type ?? "unspecified"}
                            </span>
                          </h3>
                          {row.evidence_excerpt ? (
                            <blockquote>{row.evidence_excerpt}</blockquote>
                          ) : (
                            <p>Supporting evidence unavailable.</p>
                          )}
                        </div>
                      ))}
                      <Link
                        href={researchHref({ internshipId: id })}
                        className="text-link"
                      >
                        Explore this internship
                        <ArrowRight size={18} />
                      </Link>
                    </div>
                  </details>
                );
              })
            ) : (
              <p>No matching employer requirements recorded.</p>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

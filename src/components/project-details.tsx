import Link from "next/link";
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
}: {
  project: Project;
  activeMilestoneId?: string;
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
      <section className="project-outcome">
        <h2>What you’ll produce</h2>
        <p>{display(project.final_deliverable)}</p>
      </section>
      {first ? (
        <Link
          href={`${projectHref(project.project_id)}?${new URLSearchParams({ step: first.milestone_id })}#guided-path`}
          className="button"
        >
          Start the guided project
          <ArrowRight size={18} />
        </Link>
      ) : (
        <div className="unguided-note">
          <h2>Guided path coming soon</h2>
          <p>
            The project brief is available, but no milestones or learning
            resources are recorded yet.
          </p>
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

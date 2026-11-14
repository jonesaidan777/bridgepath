import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  display,
  getInternships,
  getProjects,
  getProjectsForInternship,
  projectHref,
} from "@/lib/data";

export function WorkbookProjects({ internshipId }: { internshipId?: string }) {
  const internship = internshipId
    ? getInternships().find((job) => job.internship_id === internshipId)
    : undefined;
  const projects = internshipId
    ? getProjectsForInternship(internshipId)
    : getProjects();
  return (
    <div className="page-content">
      <header className="page-heading">
        <h1>Choose a project to build</h1>
        <p>
          Make something practical, with a clear deliverable and a connection to
          employer-requested skills.
        </p>
      </header>
      {internshipId && (
        <div className="filter-context">
          <p>
            {internship ? (
              <>
                Projects connected to{" "}
                <strong>
                  {display(internship.company)} —{" "}
                  {display(internship.job_title)}
                </strong>
                .
              </>
            ) : (
              "This internship is not in the dataset."
            )}
          </p>
          <Link href="/my-projects">View all projects</Link>
        </div>
      )}
      <section
        className="readable-list project-list"
        aria-label="Project options"
      >
        {projects.length ? (
          projects.map((project) => (
            <article key={project.project_id} className="listing">
              <div>
                <h2>{display(project.title)}</h2>
                <p className="project-description">
                  {display(project.description)}
                </p>
              </div>
              <Link
                href={projectHref(project.project_id)}
                className="listing-action"
                aria-label={`Explore ${display(project.title)}`}
              >
                Explore project
                <ArrowRight size={18} />
              </Link>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h2>No connected projects recorded</h2>
            <p>There may be other projects in the library.</p>
            <Link href="/my-projects" className="text-link">
              View all projects
              <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

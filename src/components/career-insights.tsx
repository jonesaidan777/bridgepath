import { careerFieldLabel } from "@/lib/profile-options";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  display,
  getCareerFields,
  getExplorerState,
  researchHref,
} from "@/lib/data";
import { DataNotice, SkillTable } from "./research-data";
import { SkillDemand } from "./skill-demand";

export function CareerInsights({
  careerField,
  skillId,
}: {
  careerField?: string;
  skillId?: string;
}) {
  const fields = getCareerFields();
  const state = getExplorerState({ careerField, skillId });
  return (
    <div className="page-content">
      <header className="page-heading">
        <h1>Career opportunities</h1>
        <p>Choose an internship to understand what the employer asks for.</p>
      </header>
      {fields.length > 1 && (
        <form action="/career-insights" method="get" className="field-filter">
          <label htmlFor="career-field">Career field</label>
          <select
            name="field"
            id="career-field"
            defaultValue={careerField ?? ""}
          >
            <option value="">All fields</option>
            {fields.map((field) => (
              <option value={field} key={field}>
                {careerFieldLabel(field)}
              </option>
            ))}
          </select>
          <button className="text-button" type="submit">
            Apply
          </button>
        </form>
      )}
      {skillId && (
        <div className="filter-context" role="status">
          <p>
            {state.selectedSkill ? (
              <>
                Showing internships that mention{" "}
                <strong>{display(state.selectedSkill.skill.skill_name)}</strong>
                .
              </>
            ) : (
              "No internships mention this skill in the selected sample."
            )}
          </p>
          <Link href={researchHref({ careerField })}>Clear skill filter</Link>
        </div>
      )}
      <p className="availability-note">
        These are recorded opportunities. Current application availability is
        unverified.
      </p>
      <section
        id="opportunities"
        aria-label="Internships"
        className="readable-list"
      >
        {state.visibleInternships.length ? (
          state.visibleInternships.map((job) => (
            <article className="listing" key={job.internship_id}>
              <div>
                <p className="company-name">{display(job.company)}</p>
                <h2>{display(job.job_title)}</h2>
                <p className="location">{display(job.location)}</p>
              </div>
              <Link
                className="listing-action"
                href={researchHref({
                  careerField,
                  skillId,
                  internshipId: job.internship_id,
                })}
                aria-label={`Explore requirements for ${display(job.job_title)} at ${display(job.company)}`}
              >
                Explore requirements
                <ArrowRight size={18} />
              </Link>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h2>No internships in this selection</h2>
            <p>Try the full list of recorded opportunities.</p>
            <Link href="/career-insights" className="text-link">
              View all opportunities
              <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </section>
      <div className="secondary-information">
        <details className="disclosure" open={Boolean(skillId)}>
          <summary>Explore skill patterns across these roles</summary>
          <div className="disclosure-content">
            <p>
              Choose a skill to see which internships mention it. Counts
              describe this sample, not the whole industry.
            </p>
            <SkillDemand
              rows={state.frequencies}
              selectedSkillId={skillId}
              careerField={careerField}
            />
          </div>
        </details>
        <details className="disclosure">
          <summary>View the complete skill-frequency table</summary>
          <div className="disclosure-content">
            <SkillTable rows={state.frequencies} />
          </div>
        </details>
        <DataNotice />
      </div>
    </div>
  );
}

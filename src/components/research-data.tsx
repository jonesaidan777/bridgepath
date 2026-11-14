import { ArrowUpRight } from "lucide-react";
import {
  display,
  getRequirements,
  getSkill,
  metadata,
  safeWebUrl,
} from "@/lib/data";
import type { Internship, SkillFrequency } from "@/lib/workbook-types";

export function DataNotice() {
  return (
    <details className="disclosure research-notice">
      <summary>Research source and limitations</summary>
      <div className="disclosure-content">
        <p>
          Source: {metadata.source}. Imported: {metadata.imported_at}. Original
          retrieval dates are shown on internship detail pages.
        </p>
        <p>
          Posting availability has not been independently verified. Check the
          employer’s source before applying. A recorded status is not
          confirmation that applications are open.
        </p>
        <p>
          Skill counts describe this sample, not the industry. Some excerpts
          list alternative qualifications; read the evidence for context.
        </p>
        {metadata.warnings.length > 0 && (
          <ul>
            {metadata.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export function SkillTable({ rows }: { rows: SkillFrequency[] }) {
  if (!rows.length)
    return (
      <p className="data-empty">
        No skill requirements recorded for this selection.
      </p>
    );
  return (
    <>
      <div className="table-scroll">
        <table className="research-table">
          <caption>
            Distinct internships mentioning each skill in this workbook sample
          </caption>
          <thead>
            <tr>
              <th scope="col">Canonical skill</th>
              <th scope="col">Internships</th>
              <th scope="col">Required</th>
              <th scope="col">Preferred</th>
              <th scope="col">Unspecified</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.skill.skill_id}>
                <th scope="row">
                  {display(row.skill.skill_name)}
                  <span className="sr-only"> ({row.skill.skill_id})</span>
                </th>
                <td>
                  {row.count} / {row.total}
                </td>
                <td>{row.required}</td>
                <td>{row.preferred}</td>
                <td>{row.unspecified}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="method-note">
        Each skill counts once per internship. Classification columns may
        overlap when a posting has multiple classifications. These counts
        describe this workbook sample, not the industry. “Unspecified” is not a
        required qualification.
      </p>
    </>
  );
}

export function InternshipList({
  internships,
  compact = false,
}: {
  internships: Internship[];
  compact?: boolean;
}) {
  if (!internships.length)
    return (
      <p className="data-empty">No internships recorded for this selection.</p>
    );
  return (
    <div className="internship-list">
      {internships.map((job) => {
        const source = safeWebUrl(job.employer_posting_url);
        const requirements = getRequirements(job.internship_id);
        return (
          <article
            className="internship-entry"
            id={job.internship_id}
            key={job.internship_id}
          >
            <div className="entry-heading">
              <div>
                <p className="mono-label">
                  {job.internship_id} / {display(job.career_field)}
                </p>
                <h3>{display(job.job_title)}</h3>
                <p className="company-line">
                  {display(job.company)}
                  <span> / </span>
                  {display(job.location)}
                </p>
              </div>
              {source ? (
                <a
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-link"
                  aria-label={`Employer source for ${display(job.job_title)} (opens in new tab)`}
                >
                  Employer source
                  <ArrowUpRight size={15} />
                </a>
              ) : (
                <span className="mono-label">Source link unavailable</span>
              )}
            </div>
            <div className="posting-metadata">
              <span>RETRIEVED / {display(job.retrieved_on)}</span>
              <span>
                RECORDED STATUS / {display(job.posting_status)} — NOT VERIFIED
              </span>
            </div>
            {!compact && (
              <>
                <p className="job-summary">
                  {display(job.job_description_summary)}
                </p>
                <details className="requirement-details">
                  <summary>
                    Employer requirements · {requirements.length} recorded rows
                  </summary>
                  {requirements.length ? (
                    <div className="requirement-list">
                      {requirements.map((requirement, index) => (
                        <div
                          className="requirement-row"
                          key={`${job.internship_id}-${index}`}
                        >
                          <div>
                            <strong>
                              {display(
                                getSkill(requirement.skill_id)?.skill_name,
                              )}
                            </strong>
                            <span className="requirement-type">
                              {requirement.requirement_type ?? "unspecified"}
                            </span>
                          </div>
                          {requirement.evidence_excerpt ? (
                            <blockquote>
                              {requirement.evidence_excerpt}
                            </blockquote>
                          ) : (
                            <p>
                              Supporting evidence not provided in the workbook.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="data-empty">No requirements recorded.</p>
                  )}
                </details>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}

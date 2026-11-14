import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import {
  display,
  getRequirements,
  getSkill,
  getProjectsForInternship,
  researchHref,
  safeWebUrl,
} from "@/lib/data";
import type { Internship, RequirementType } from "@/lib/workbook-types";
import { DataNotice } from "./research-data";

const groups: { type: RequirementType; title: string; explanation: string }[] =
  [
    {
      type: "required",
      title: "Required qualifications",
      explanation:
        "Recorded as required. Read the evidence for alternatives and context.",
    },
    {
      type: "preferred",
      title: "Preferred qualifications",
      explanation: "Recorded as helpful or preferred, rather than mandatory.",
    },
    {
      type: "unspecified",
      title: "Other skills mentioned",
      explanation:
        "Mentioned in the posting without a clear required or preferred classification.",
    },
  ];

export function InternshipDetails({
  internship,
  careerField,
  skillId,
}: {
  internship: Internship;
  careerField?: string;
  skillId?: string;
}) {
  const requirements = getRequirements(internship.internship_id);
  const related = getProjectsForInternship(internship.internship_id);
  const source = safeWebUrl(internship.employer_posting_url);
  return (
    <div className="page-content detail-page">
      <Link href={researchHref({ careerField, skillId })} className="back-link">
        <ArrowLeft size={18} />
        Back to opportunities
      </Link>
      <header className="page-heading">
        <p className="company-name">{display(internship.company)}</p>
        <h1>{display(internship.job_title)}</h1>
        <p>{display(internship.location)}</p>
      </header>
      <section
        className="requirements-section"
        aria-labelledby="requirements-heading"
      >
        <h2 id="requirements-heading">What this employer asks for</h2>
        <p className="section-description">
          Expand a skill to read the supporting excerpt from the posting.
        </p>
        {requirements.length ? (
          groups.map((group) => {
            const rows = requirements.filter(
              (row) => (row.requirement_type ?? "unspecified") === group.type,
            );
            if (!rows.length) return null;
            return (
              <section
                className="requirement-group"
                key={group.type}
                aria-labelledby={`group-${group.type}`}
              >
                <h3 id={`group-${group.type}`}>{group.title}</h3>
                <p className="supporting-text">{group.explanation}</p>
                {rows.map((row, index) => (
                  <details
                    className="evidence-disclosure"
                    key={`${group.type}-${index}`}
                    open={row.skill_id === skillId}
                  >
                    <summary>
                      {display(getSkill(row.skill_id)?.skill_name)}
                    </summary>
                    <div className="disclosure-content">
                      {row.evidence_excerpt ? (
                        <blockquote>{row.evidence_excerpt}</blockquote>
                      ) : (
                        <p>
                          Supporting evidence was not provided in the workbook.
                        </p>
                      )}
                    </div>
                  </details>
                ))}
              </section>
            );
          })
        ) : (
          <p className="empty-state">
            No requirements were recorded for this internship.
          </p>
        )}
      </section>
      <section className="next-step">
        <h2>Put these skills into practice</h2>
        {related.length ? (
          <>
            <p>
              Explore projects connected to this internship through shared
              skills.
            </p>
            <Link
              href={`/my-projects?${new URLSearchParams({ internship: internship.internship_id })}`}
              className="button"
            >
              Explore relevant projects
              <ArrowRight size={18} />
            </Link>
          </>
        ) : (
          <>
            <p>
              No project currently targets this internship’s recorded
              requirements.
            </p>
            <Link href="/my-projects" className="button">
              Explore the project library
              <ArrowRight size={18} />
            </Link>
          </>
        )}
      </section>
      <div className="secondary-information">
        <details className="disclosure">
          <summary>About this internship</summary>
          <div className="disclosure-content">
            <p>{display(internship.job_description_summary)}</p>
            <p>Career field: {display(internship.career_field)}</p>
          </div>
        </details>
        <details className="disclosure">
          <summary>Posting source and recorded status</summary>
          <div className="disclosure-content">
            {source ? (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Original employer posting
                <ArrowUpRight size={18} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <p>Source link unavailable.</p>
            )}
            <dl className="source-facts">
              <div>
                <dt>Retrieved</dt>
                <dd>{display(internship.retrieved_on)}</dd>
              </div>
              <div>
                <dt>Recorded status</dt>
                <dd>
                  {display(internship.posting_status)} — not independently
                  verified
                </dd>
              </div>
            </dl>
            <p className="supporting-text">
              A recorded “open” status does not confirm the employer is
              currently accepting applications.
            </p>
          </div>
        </details>
        <DataNotice />
      </div>
    </div>
  );
}

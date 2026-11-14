"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useStudentProfile } from "./profile-provider";
import { toCareerContext } from "@/lib/student-profile";
import { matchInternship, type QualificationGroup } from "@/lib/matching";
import { display, safeWebUrl } from "@/lib/data";
import { careerFieldLabel } from "@/lib/profile-options";
import snapshot from "@/data/bridgepath-workbook.json";
import type { WorkbookDataset } from "@/lib/workbook-types";

function Qualification({
  group,
  evidenceOnly = false,
  documented = false,
}: {
  group: QualificationGroup;
  evidenceOnly?: boolean;
  documented?: boolean;
}) {
  return (
    <details className="evidence-disclosure">
      <summary>
        {group.mode === "any" ? "One source-listed alternative: " : ""}
        {(documented
          ? [...new Set(group.demonstrated.map((item) => item.label))]
          : group.labels
        ).join(group.mode === "any" ? " / " : ", ")}
        {!evidenceOnly && (
          <span className="requirement-type">{group.classification}</span>
        )}
      </summary>
      <div className="disclosure-content">
        {group.evidence ? (
          <blockquote>{group.evidence}</blockquote>
        ) : (
          <p>Supporting excerpt unavailable.</p>
        )}
        {group.demonstrated.length > 0 && (
          <>
            <h3>Your profile evidence</h3>
            <ul>
              {group.demonstrated.map((evidence, index) => (
                <li key={index}>
                  <strong>
                    {evidence.label}: {evidence.title}
                  </strong>
                  <p>{evidence.detail}</p>
                  {evidence.url && (
                    <a
                      href={evidence.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Student-provided evidence
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {group.notDocumented.length > 0 && (
          <p className="supporting-text">
            Not yet documented:{" "}
            {group.labels
              .filter((_, index) =>
                group.notDocumented.includes(group.skillIds[index]),
              )
              .join(", ")}
            . This is not proof that you lack these skills.
          </p>
        )}
      </div>
    </details>
  );
}
export function PersonalizedRole({
  internshipId,
  backTo = "/my-opportunities",
  reviewRequirements = false,
}: {
  internshipId: string;
  backTo?: string;
  reviewRequirements?: boolean;
}) {
  const { profile, ready } = useStudentProfile();
  const job = snapshot.Internships.find(
    (job) => job.internship_id === internshipId,
  );
  const match = useMemo(
    () =>
      job
        ? matchInternship(
            toCareerContext(profile),
            job,
            snapshot as WorkbookDataset,
          )
        : null,
    [profile, job],
  );
  if (!ready)
    return (
      <p role="status" className="profile-loading">
        Opening the role…
      </p>
    );
  if (!job || !match)
    return (
      <div className="page-content">
        <h1>Role not available</h1>
        <Link href="/my-opportunities">Back to My Opportunities</Link>
      </div>
    );
  const source = safeWebUrl(job.employer_posting_url);
  const demonstrated = match.qualifications.filter(
    (group) => group.demonstrated.length > 0,
  );
  const missing = match.qualifications.filter((group) => !group.satisfied);
  const questions = match.eligibility.filter(
    (check) => check.status !== "confirmed",
  );
  const actionExternal = /^https?:/.test(match.nextAction.href);
  return (
    <div className="page-content detail-page">
      <Link href={backTo} className="back-link">
        <ArrowLeft size={18} />
        {backTo === "/my-opportunities"
          ? "Back to My Opportunities"
          : "Back to Career Insights"}
      </Link>
      <header className="page-heading">
        <p className="company-name">{display(job.company)}</p>
        <h1>{display(job.job_title)}</h1>
        <p>
          {display(job.location)} · {careerFieldLabel(job.career_field || "")}
        </p>
      </header>
      <p className="role-overview">{display(job.job_description_summary)}</p>
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
        <p>Original posting URL unavailable.</p>
      )}
      <p className="availability-note">
        Retrieved {display(job.retrieved_on)}. Recorded status:{" "}
        {display(job.posting_status)} — current availability unverified.
      </p>
      <p className="profile-inline-notice">
        {match.eligibilityStatus === "unmet"
          ? "An explicit required eligibility condition is outside your recorded profile. This role is excluded from your shortlist."
          : match.type === "strong_current"
            ? "Strong current match on the recorded evidence. This is not a guarantee of eligibility or selection."
            : match.type === "not_aligned"
              ? "This role is outside your recorded interests; you can still investigate it."
              : "An interest-aligned stretch opportunity. Review the evidence and verification questions."}
      </p>
      <section aria-labelledby="profile-evidence-heading">
        <h2 id="profile-evidence-heading">What your profile documents</h2>
        <p className="section-description">
          Student-confirmed information, not independently verified
          qualifications.
        </p>
        {demonstrated.length ? (
          demonstrated.map((group, index) => (
            <Qualification group={group} key={index} documented />
          ))
        ) : (
          <p className="data-empty">
            No source-requested skill is documented yet. Work experience is not
            required to begin; coursework and personal projects can provide
            evidence.
          </p>
        )}
      </section>
      <section className="brief-section">
        <h2>Not yet documented</h2>
        {missing.length ? (
          <>
            <p className="section-description">
              Read each classification carefully. Preferred and unspecified
              mentions are not mandatory qualifications.
            </p>
            {missing.map((group, index) => (
              <Qualification group={group} key={index} />
            ))}
          </>
        ) : (
          <p>
            Your profile addresses the recorded skill groups. Review the full
            source for conditions not captured by structured skill rows.
          </p>
        )}
      </section>
      <section className="brief-section">
        <h2>Eligibility questions</h2>
        {questions.length ? (
          questions.map((check, index) => (
            <details className="evidence-disclosure" key={index}>
              <summary>
                {check.status === "unmet"
                  ? "Outside recorded eligibility"
                  : "Needs verification"}{" "}
                · {check.kind.replace("_", " ")}
                <span className="requirement-type">{check.classification}</span>
              </summary>
              <div className="disclosure-content">
                <p>{check.explanation}</p>
                <blockquote>{check.evidence}</blockquote>
                <p className="supporting-text">
                  Source field: {check.sourceField}
                </p>
              </div>
            </details>
          ))
        ) : (
          <p>
            Your education meets the source conditions this matcher can check.
            It does not verify employment authorization, current availability,
            or every qualification.
          </p>
        )}
      </section>
      <section className="next-step">
        <h2>Your next step</h2>
        <p>{match.nextAction.explanation}</p>
        {actionExternal ? (
          <a
            href={match.nextAction.href}
            className="button"
            target="_blank"
            rel="noopener noreferrer"
          >
            {match.nextAction.title}
            <ArrowUpRight size={18} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <Link href={match.nextAction.href} className="button">
            {match.nextAction.title}
            <ArrowRight size={18} />
          </Link>
        )}
      </section>
      <div className="secondary-information">
        <p><Link href={`/my-projects?internship=${encodeURIComponent(internshipId)}`} className="text-link">Explore projects for this role <ArrowRight size={18} /></Link></p>
        <details
          id="source-requirements"
          className="disclosure"
          open={reviewRequirements}
        >
          <summary>Required qualifications from the workbook</summary>
          <div className="disclosure-content">
            {match.qualifications
              .filter((group) => group.classification === "required")
              .map((group, index) => (
                <Qualification key={index} group={group} evidenceOnly />
              ))}
            <p className="source-prose">
              {job.requirements ||
                "Detailed required qualifications unavailable."}
            </p>
          </div>
        </details>
        <details className="disclosure">
          <summary>Preferred qualifications from the workbook</summary>
          <div className="disclosure-content">
            {match.qualifications
              .filter((group) => group.classification === "preferred")
              .map((group, index) => (
                <Qualification key={index} group={group} evidenceOnly />
              ))}
            <p className="source-prose">
              {job.preferred ||
                "Detailed preferred qualifications unavailable."}
            </p>
          </div>
        </details>
        <details className="disclosure">
          <summary>Why this role appears and how preferences compare</summary>
          <div className="disclosure-content">
            <ul>
              {match.reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
            {match.preferences.map((signal) => (
              <p key={signal.kind}>
                <strong>
                  {signal.kind.replace("_", " ")}: {signal.status}.
                </strong>{" "}
                {signal.explanation}
              </p>
            ))}
          </div>
        </details>
        <details className="disclosure">
          <summary>
            Source overview, responsibilities, and program details
          </summary>
          <div className="disclosure-content">
            {(
              [
                "overview",
                "responsibilities",
                "program_details",
                "what_we_offer",
              ] as const
            ).map((field) =>
              job[field] ? (
                <section key={field}>
                  <h3>{field.replace(/_/g, " ")}</h3>
                  <p className="source-prose">{job[field]}</p>
                </section>
              ) : null,
            )}
            <p className="supporting-text">
              Source: {snapshot.metadata.source}. Descriptions and eligibility
              checks come from this cached workbook. Source wording may be
              incomplete or ambiguous; review it with the employer. Demographic
              answers are excluded from this analysis.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}

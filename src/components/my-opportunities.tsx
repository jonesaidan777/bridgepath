"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { useStudentProfile } from "./profile-provider";
import { toCareerContext } from "@/lib/student-profile";
import { rankInternships } from "@/lib/matching";
import { careerFieldLabel } from "@/lib/profile-options";
import { display } from "@/lib/data";
import snapshot from "@/data/bridgepath-workbook.json";
import type { WorkbookDataset } from "@/lib/workbook-types";

export function MyOpportunities() {
  const { profile, ready } = useStudentProfile();
  const matches = useMemo(
    () =>
      profile.onboarding.completed
        ? rankInternships(toCareerContext(profile), snapshot as WorkbookDataset)
        : [],
    [profile],
  );
  if (!ready)
    return (
      <p role="status" className="profile-loading">
        Finding your opportunities…
      </p>
    );
  if (!profile.onboarding.completed)
    return (
      <div className="page-content">
        <header className="page-heading">
          <h1>Finish your student profile</h1>
          <p>
            Complete setup so we can show a focused, evidence-based shortlist.
          </p>
          <Link href="/onboarding" className="button">
            Continue setup
            <ArrowRight size={18} />
          </Link>
        </header>
      </div>
    );
  return (
    <div className="page-content opportunities-page">
      <header className="page-heading">
        <h1>My Opportunities</h1>
        <p>
          A focused shortlist based on your education, interests, documented
          skills, and preferences.
        </p>
      </header>
      <p className="availability-note">
        Source: {snapshot.metadata.source}. Recorded posting status is not
        verified current availability. These are explanations, not compatibility
        scores or eligibility guarantees.
      </p>
      {!profile.skills.canonicalIds.length &&
        !profile.skills.additional.length && (
          <p className="profile-inline-notice">
            You can explore with no prior internship experience. Add skills or
            link skills used in coursework and projects to make the
            qualification evidence more specific.
          </p>
        )}
      {matches.length ? (
        <section aria-label="Recommended internships" className="readable-list">
          {matches.map((match) => (
            <article
              key={match.internship.internship_id}
              className="listing opportunity-match"
            >
              <p className="match-category">
                {match.type === "strong_current"
                  ? "Strong current match · based on available evidence"
                  : "Interest-aligned stretch opportunity"}
              </p>
              <p className="company-name">
                {display(match.internship.company)}
              </p>
              <h2>{display(match.internship.job_title)}</h2>
              <p className="location">
                {display(match.internship.location)} ·{" "}
                {careerFieldLabel(match.internship.career_field || "")}
              </p>
              <p className="project-description role-preview">
                {display(match.internship.job_description_summary)}
              </p>
              <div className="recommendation-reason">
                <h3>Why it’s here</h3>
                <p>{match.reasons.slice(0, 2).join(" ")}</p>
                {match.eligibilityStatus === "uncertain" && (
                  <p className="supporting-text">
                    An eligibility condition needs verification.
                  </p>
                )}
              </div>
              <Link
                href={`/my-opportunities/${encodeURIComponent(match.internship.internship_id)}`}
                className="listing-action"
              >
                Explore role
                <ArrowRight size={18} />
                <span className="sr-only">
                  : {display(match.internship.job_title)} at{" "}
                  {display(match.internship.company)}
                </span>
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <h2>No suitable shortlist from this sample yet</h2>
          <p>
            Your interests may not overlap this dataset, or an explicit source
            eligibility condition may differ from your profile. We won’t fill
            the list with unrelated roles.
          </p>
          <Link href="/onboarding?edit=1" className="button">
            Review career interests and education
            <ArrowRight size={18} />
          </Link>
          <p>
            <Link href="/career-insights">
              Explore all recorded internships
            </Link>
          </p>
        </section>
      )}
      <details className="disclosure secondary-information">
        <summary>How this shortlist is ordered</summary>
        <div className="disclosure-content">
          <p>
            We exclude explicit, unmet required eligibility conditions and
            recorded closed postings. Relevant strong-current matches precede
            stretch opportunities. We then compare career-field alignment, known
            preference differences, required skill gaps, documented
            required/preferred skills, relevant experience, target-role terms,
            checked education conditions, and aligned preferences. Internship ID
            breaks ties.
          </p>
          <p>
            Missing information stays uncertain. Custom skills count only when
            they match a canonical skill or a source-named alternative. Age,
            race/ethnicity, school prestige, and resume contents never influence
            this ordering. No live availability check is performed.
          </p>
          <Link href="/profile">Review your saved profile</Link>
        </div>
      </details>
    </div>
  );
}

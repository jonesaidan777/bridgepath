import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { display, getInternships, researchHref } from "@/lib/data";

export default function Dashboard() {
  const seen = new Set<string>();
  // Keep a small source-order preview with distinct organizations, not a ranking.
  const previews = getInternships()
    .filter((job) => {
      const company = job.company ?? job.internship_id;
      if (seen.has(company)) return false;
      seen.add(company);
      return true;
    })
    .slice(0, 2);
  return (
    <div className="page-content dashboard-page">
      <header className="page-heading">
        <h1>
          Discover the opportunity.
          <br />
          <em>Build the experience.</em>
        </h1>
        <p>
          Understand what employers ask for, then explore practical projects
          that help you build those skills.
        </p>
        <Link href="/career-insights" className="button">
          Explore career opportunities
          <ArrowRight size={20} />
        </Link>
      </header>
      <section
        className="opportunity-preview"
        aria-labelledby="preview-heading"
      >
        <h2 id="preview-heading">A look at the opportunities</h2>
        <p className="supporting-text">
          From the research workbook. Current availability is unverified.
        </p>
        <div className="preview-list">
          {previews.length ? (
            previews.map((job) => (
              <article className="preview-entry" key={job.internship_id}>
                <p className="company-name">{display(job.company)}</p>
                <h3>
                  <Link
                    href={researchHref({ internshipId: job.internship_id })}
                  >
                    {display(job.job_title)}
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </h3>
                <p className="location">{display(job.location)}</p>
              </article>
            ))
          ) : (
            <p className="empty-state">
              No opportunities have been recorded yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

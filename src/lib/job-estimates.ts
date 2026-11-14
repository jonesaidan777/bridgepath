// PLACEHOLDER: market-wide job counts are not in the workbook yet. These helpers
// scale real workbook counts into illustrative "Xk+" figures until live data exists.
//
// Basis: Indeed listed about 5,000 U.S. software engineering internship openings
// (https://www.indeed.com/q-software-engineering-internship-jobs.html, undated
// snapshot), and the workbook holds 7 software engineering postings, so each
// workbook posting stands in for roughly 5,000 / 7 ≈ 700 real listings.
export const PLACEHOLDER_JOBS_PER_ROLE = 700;

export function estimateJobs(workbookCount: number) {
  return workbookCount * PLACEHOLDER_JOBS_PER_ROLE;
}

export function formatJobCount(count: number) {
  if (count <= 0) return "0";
  return count >= 1000
    ? `${(Math.floor(count / 100) / 10).toFixed(1).replace(/\.0$/, "")}k+`
    : `${count}+`;
}

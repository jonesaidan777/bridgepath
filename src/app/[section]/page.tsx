import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MyOpportunities } from "@/components/my-opportunities";
import { WorkbookProjects } from "@/components/workbook-projects";
import { researchHref, projectHref } from "@/lib/data";
import { StudentProfilePage } from "@/components/profile-page";
import { navigation } from "@/lib/navigation";

// Preserve the research routes while Profile becomes a browser-local student view.
export function generateStaticParams() {
  return navigation
    // These have their own route folders.
    .filter((item) => !["/your-fit", "/your-resume"].includes(item.href))
    .map((item) => ({ section: item.href.slice(1) }));
}

export default async function PlaceholderPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  // My Opportunities became the Career Insights job board; keep old links working.
  if (section === "my-opportunities") redirect("/career-insights");
  const item = navigation.find((item) => item.href === `/${section}`);
  if (!item) notFound();
  if (section === "profile") return <StudentProfilePage />;
  if (section === "career-insights" || section === "my-projects") {
    const query = await searchParams;
    const value = (key: string) =>
      typeof query[key] === "string" ? (query[key] as string) : undefined;
    if (section === "career-insights") {
      // Keep previously shared exploration URLs working after the route refinement.
      if (value("internship"))
        redirect(
          researchHref({
            internshipId: value("internship"),
            careerField: value("field"),
            skillId: value("skill"),
          }),
        );
      return <MyOpportunities />;
    }
    if (value("project")) redirect(projectHref(value("project")!));
    return <WorkbookProjects internshipId={value("internship")} />;
  }
  return (
    <div className="page-content">
      <header className="page-heading">
        <h1>{item.label}</h1>
      </header>
      <section className="placeholder-panel">
        <h2>This section is in preparation.</h2>
        <p>
          {item.label} is a placeholder in this foundation edition. Its tools
          will be introduced in a later milestone.
        </p>
        <Link href="/" className="button">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
      </section>
    </div>
  );
}

import { notFound } from "next/navigation";
import { getInternships, getProjects } from "@/lib/data";
import { RoleDetailPage } from "@/components/role-detail-page";
import { ProjectConceptDetails } from "@/components/project-recommendations";
import { ProjectDetails } from "@/components/project-details";

export default async function DetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section, id } = await params;
  const query = await searchParams;
  const value = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : undefined;
  if (section === "career-insights" || section === "my-opportunities") {
    const internship = getInternships().find((job) => job.internship_id === id);
    if (!internship) notFound();
    // Same job details as the Where you stand popup.
    return <RoleDetailPage internshipId={internship.internship_id} />;
  }
  if (section === "my-projects") {
    if (id.startsWith("concept-")) {
      return <ProjectConceptDetails conceptId={id} internshipId={value("internship")} />;
    }
    const project = getProjects().find((project) => project.project_id === id);
    if (!project) notFound();
    return (
      <ProjectDetails project={project} activeMilestoneId={value("step")} internshipId={value("internship")} />
    );
  }
  notFound();
}

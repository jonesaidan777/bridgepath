import { notFound } from "next/navigation";
import { getInternships, getProjects } from "@/lib/data";
import { InternshipDetails } from "@/components/internship-details";
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
  if (section === "career-insights") {
    const internship = getInternships().find((job) => job.internship_id === id);
    if (!internship) notFound();
    return (
      <InternshipDetails
        internship={internship}
        careerField={value("field")}
        skillId={value("skill")}
      />
    );
  }
  if (section === "my-projects") {
    const project = getProjects().find((project) => project.project_id === id);
    if (!project) notFound();
    return (
      <ProjectDetails project={project} activeMilestoneId={value("step")} />
    );
  }
  notFound();
}

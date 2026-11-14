"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useStudentProfile } from "./profile-provider";
import { toCareerContext } from "@/lib/student-profile";
import { recommendProjects, type ProjectRecommendation } from "@/lib/project-recommendations";
import { careerFieldLabel } from "@/lib/profile-options";
import { safeWebUrl } from "@/lib/data";
import snapshot from "@/data/bridgepath-workbook.json";
import type { WorkbookDataset } from "@/lib/workbook-types";
const data = snapshot as WorkbookDataset;
const kindLabel = (kind: ProjectRecommendation["kind"]) => kind === "guided" ? "Guided workbook project" : kind === "workbook_brief" ? "Workbook brief · not guided" : "Suggested concept · not guided";
function projectLink(project: ProjectRecommendation) {
    return `/my-projects/${encodeURIComponent(project.id)}${project.selectedInternshipId ? `?internship=${encodeURIComponent(project.selectedInternshipId)}` : ""}`;
}
function Evidence({ project }: {
    project: ProjectRecommendation;
}) {
    return <details className="disclosure project-recommendation-evidence">
    <summary>Employer requirements this could help demonstrate</summary>
    <div className="disclosure-content">
      <p className="supporting-text">Connections use recorded skill IDs, not employer endorsement. Required, preferred, and unspecified classifications retain their source meaning. Alternatives in a quotation are not all mandatory. Availability is unverified.</p>
      {project.internshipIds.map(id => {
            const job = data.Internships.find(job => job.internship_id === id);
            const url = safeWebUrl(job?.employer_posting_url ?? null);
            const rows = project.connections.filter(row => row.internship_id === id);
            // Repeated mentions remain in the dataset but do not repeat identical evidence in the UI.
            const unique = rows.filter((row, index) => rows.findIndex(other => other.skill_id === row.skill_id && other.requirement_type === row.requirement_type && other.evidence_excerpt === row.evidence_excerpt) === index);
            return <details className="employer-disclosure" key={id}>
          <summary>{job?.company || "Employer unavailable"} — {job?.job_title || "Role unavailable"}</summary>
          <div className="connection-evidence">
            {unique.map((row, index) => <div key={index}>
              <h3>{data.Skills.find(skill => skill.skill_id === row.skill_id)?.skill_name || row.skill_id} <span className="requirement-type">{row.requirement_type || "unspecified"}</span></h3>
              {row.evidence_excerpt ? <blockquote>{row.evidence_excerpt}</blockquote> : <p>Supporting quotation unavailable.</p>}
            </div>)}
            <Link href={`/my-opportunities/${encodeURIComponent(id)}`} className="text-link">Explore role <ArrowRight size={18}/></Link>
            {url && <p><a href={url} target="_blank" rel="noopener noreferrer" className="text-link">Original employer posting <ArrowUpRight size={18}/><span className="sr-only"> (opens in a new tab)</span></a></p>}
          </div>
        </details>;
        })}
    </div>
  </details>;
}
export function PersonalizedProjects({ internshipId }: {
    internshipId?: string;
}) {
    const { profile, ready } = useStudentProfile();
    if (!ready)
        return <p role="status">Loading your project recommendations…</p>;
    const recommendations = recommendProjects(toCareerContext(profile), data, internshipId).slice(0, 5);
    const selected = data.Internships.find(job => job.internship_id === internshipId);
    return <div className="page-content">
    <header className="page-heading"><h1>Choose your next project</h1><p>Turn a relevant employer requirement into work you can show. These suggestions focus on skills not yet documented in your profile.</p></header>
    {internshipId && <div className="filter-context"><p>{selected ? `Focused on ${selected.company} — ${selected.job_title}.` : "This internship is not in the dataset."}</p><Link href="/my-projects">Return to your recommendations</Link></div>}
    <section className="readable-list project-list" aria-label="Personalized project recommendations">
      {recommendations.length ? recommendations.map(project => <article key={project.id} className="listing personalized-project">
        <p className="match-category">{kindLabel(project.kind)}</p>
        <h2>{project.title}</h2><p className="project-description">{project.objective}</p>
        <p className="project-fit">{project.reasons[0]}</p>
        <p className="supporting-text">Practice: {project.skillIds.map(id => data.Skills.find(skill => skill.skill_id === id)?.skill_name || id).join(", ")}</p>
        <details className="disclosure"><summary>Employer connections & expected evidence</summary><div className="disclosure-content"><p>{project.internshipIds.map(id => data.Internships.find(job => job.internship_id === id)?.company || "Employer unavailable").filter((name, index, all) => all.indexOf(name) === index).join(", ")}</p><p>{project.deliverable}</p></div></details>
        <Link href={projectLink(project)} className="listing-action">Explore project <ArrowRight size={18}/><span className="sr-only">: {project.title}</span></Link>
      </article>) : <div className="empty-state"><h2>No relevant project gaps found in this sample</h2><p>Your current evidence may already cover the recorded skills, or this dataset may not support your goals. We won’t substitute unrelated projects.</p><Link href="/my-opportunities" className="button">Review your opportunities <ArrowRight size={18}/></Link><p><Link href="/onboarding?edit=1">Review your profile</Link></p></div>}
    </section>
    <details className="disclosure secondary-information"><summary>How suggestions are chosen</summary><div className="disclosure-content"><p>We use your internship shortlist, or the role you explicitly selected. Projects must address recorded employer skills not yet documented in your profile. Required gaps come first, followed by the number of targeted gaps and connected roles, recorded guidance, and stable IDs. Concepts are suggested briefs, not workbook projects or employer assignments. No compatibility score is calculated.</p><p>The workbook has only {data.Projects.length} project templates. Only those with recorded milestones are labeled guided.</p></div></details>
  </div>;
}
export function PersonalizedProjectContext({ projectId, internshipId }: {
    projectId: string;
    internshipId?: string;
}) {
    const { profile, ready } = useStudentProfile();
    if (!ready)
        return <p role="status">Loading your career relevance…</p>;
    const project = recommendProjects(toCareerContext(profile), data, internshipId).find(item => item.id === projectId);
    if (!project)
        return <section className="project-personal-context"><h2>How this fits your goals</h2><p>This workbook project is available to explore, but it does not currently address a gap in your relevant internship requirements.</p><Link href="/my-projects">View personalized suggestions</Link></section>;
    return <section className="project-personal-context"><h2>Why this project fits</h2><p>{project.reasons[0]}</p><p className="supporting-text">Career context: {careerFieldLabel(project.careerField)}</p><Evidence project={project}/></section>;
}
export function ProjectConceptDetails({ conceptId, internshipId }: {
    conceptId: string;
    internshipId?: string;
}) {
    const { profile, ready } = useStudentProfile();
    if (!ready)
        return <p role="status">Loading the suggested concept…</p>;
    const project = recommendProjects(toCareerContext(profile), data, internshipId).find(project => project.id === conceptId && project.kind === "concept");
    if (!project)
        return <div className="page-content"><header className="page-heading"><h1>This concept no longer fits your profile</h1><p>Concepts are recalculated from your current internship requirements. Your updated profile may support different suggestions.</p><Link href="/my-projects" className="button">View current projects <ArrowRight size={18}/></Link></header></div>;
    return <div className="page-content detail-page">
    <Link href={internshipId ? `/my-projects?internship=${encodeURIComponent(internshipId)}` : "/my-projects"} className="back-link"><ArrowLeft size={18}/>Back to projects</Link>
    <header className="page-heading"><p className="match-category">{kindLabel(project.kind)}</p><h1>{project.title}</h1><p>{project.objective}</p></header>
    <section className="project-outcome" id="concept-brief"><h2>Your project brief</h2><p>{project.deliverable}</p><p className="project-fit">Practice: {project.skillIds.map(id => data.Skills.find(skill => skill.skill_id === id)?.skill_name || id).join(", ")}</p></section>
    <section className="project-personal-context"><h2>Career relevance</h2><p>{project.reasons[0]}</p><p>{careerFieldLabel(project.careerField)} · No guided steps or learning resources are recorded for this suggested concept.</p></section>
    <Link href="/onboarding?edit=1&step=4" className="button">Add this idea to your profile <ArrowRight size={18}/></Link>
    <p className="supporting-text project-action-note">Create a project entry manually. Describe it as planned or in progress until you have evidence; no work is marked complete.</p>
    <div className="secondary-information"><Evidence project={project}/></div>
  </div>;
}

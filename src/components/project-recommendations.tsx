"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { ProjectDialog, projectKindLabel, projectStartHref } from "./project-dialog";
import { useStudentProfile } from "./profile-provider";
import { useStartProject } from "./use-start-project";
import { toCareerContext } from "@/lib/student-profile";
import { projectDisplayTitle, recommendProjects, type ProjectRecommendation } from "@/lib/project-recommendations";
import { careerFieldLabel } from "@/lib/profile-options";
import { safeWebUrl } from "@/lib/data";
import { workbook as snapshot } from "@/lib/workbook";
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
            <Link href={`/career-insights/${encodeURIComponent(id)}`} className="text-link">Explore role <ArrowRight size={18}/></Link>
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
    const startProject = useStartProject();
    const [openId, setOpenId] = useState<string | null>(null);
    if (!ready)
        return <p role="status">Loading your project recommendations…</p>;
    // Same recommendations and cards as the onboarding "Where you stand" screen.
    const allRecommendations = recommendProjects(toCareerContext(profile), data, internshipId);
    const startedIds = profile.startedProjects ?? [];
    const recommendations = allRecommendations.filter(project => !startedIds.includes(project.id)).slice(0, 6);
    // Started projects: look up workbook projects directly; concepts via the recommendations.
    const started = startedIds.map(id => {
        const rec = allRecommendations.find(project => project.id === id);
        const workbookProject = data.Projects.find(project => project.project_id === id);
        const title = rec ? projectDisplayTitle(rec) : workbookProject?.title || "Suggested project";
        const href = rec ? projectStartHref(rec) : `/my-projects/${encodeURIComponent(id)}`;
        const steps = data.Milestones.filter(step => step.project_id === id).length;
        return { id, title, href, steps, description: rec?.objective || workbookProject?.description || "" };
    });
    const selected = data.Internships.find(job => job.internship_id === internshipId);
    const skillName = (id: string) => data.Skills.find(skill => skill.skill_id === id)?.skill_name || id;
    return <div className="page-content">
    <header className="page-heading"><h1>My Projects</h1><p>Track the projects you’re working on, and pick up new ones that close your gaps.</p></header>
    {internshipId && <div className="filter-context"><p>{selected ? `Focused on ${selected.company} — ${selected.job_title}.` : "This internship is not in the dataset."}</p><Link href="/my-projects">Return to your recommendations</Link></div>}

    <section className="opp-section" aria-labelledby="your-projects-title">
      <div className="opp-section-head"><h2 id="your-projects-title">Your projects</h2></div>
      {started.length || profile.projects.length ? <div className="opp-grid">
        {started.map(project => <article key={project.id} className="opp-card is-selected">
          <span className="readiness-chip is-impact my-project-status">In progress</span>
          <h3>{project.title}</h3>
          {project.description && <p className="readiness-project-objective">{project.description}</p>}
          <div className="opp-card-actions">
            <span className="supporting-text">{project.steps ? `${project.steps} guided steps` : "Self-guided"}</span>
            <Link href={project.href} className="opp-link">Continue<ArrowRight size={15} aria-hidden="true"/></Link>
          </div>
        </article>)}
        {profile.projects.map(project => <article key={project.id} className="opp-card">
          <span className="readiness-chip is-have my-project-status">On your resume</span>
          <h3>{project.title}</h3>
          {project.organization && <p className="discovery-company">{project.organization}</p>}
          {project.description && <p className="readiness-project-objective">{project.description}</p>}
          <div className="opp-card-actions">
            <span className="supporting-text">{project.kind === "academic" ? "Class project" : "Personal project"}</span>
            <Link href="/onboarding?edit=1&step=3" className="opp-link">Edit<ArrowRight size={15} aria-hidden="true"/></Link>
          </div>
        </article>)}
      </div> : <p className="supporting-text">No projects yet. Start one from the recommendations below.</p>}
    </section>

    <section className="opp-section" aria-labelledby="recommended-projects-title">
      <div className="opp-section-head"><h2 id="recommended-projects-title">Recommended projects</h2></div>
    {recommendations.length ? <div className="readiness-project-grid my-projects-grid">
      {recommendations.map(project => <article key={project.id} className="readiness-project is-clickable">
        <button type="button" className="readiness-role-open" onClick={() => setOpenId(project.id)}>
          <span className="sr-only">View details for {projectDisplayTitle(project)}</span>
        </button>
        <p className="readiness-project-kind">{projectKindLabel(project.kind)}</p>
        <h3>{projectDisplayTitle(project)}</h3>
        <p className="readiness-project-objective">{project.objective}</p>
        <p className="readiness-project-skills"><span className="readiness-role-skills-label">Builds</span>{project.missingSkillIds.map(id => <span key={id} className="readiness-chip is-impact-soft">{skillName(id)}</span>)}</p>
        <p className="readiness-project-roles">Helps with {project.internshipIds.length} {project.internshipIds.length === 1 ? "role" : "roles"}<span className="readiness-project-more">View project<ChevronRight size={16} aria-hidden="true"/></span></p>
      </article>)}
    </div> : <div className="empty-state"><h2>No relevant project gaps found in this sample</h2><p>Your current evidence may already cover the recorded skills, or this dataset may not support your goals. We won’t substitute unrelated projects.</p><Link href="/career-insights" className="button">Review your opportunities <ArrowRight size={18}/></Link><p><Link href="/onboarding?edit=1">Review your profile</Link></p></div>}
    </section>
    <ProjectDialog project={recommendations.find(project => project.id === openId) ?? null} onClose={() => setOpenId(null)} onStart={startProject}/>
    <details className="disclosure secondary-information"><summary>How suggestions are chosen</summary><div className="disclosure-content"><p>We use the roles you selected, or the role you explicitly chose. Projects must address recorded employer skills not yet documented in your profile. Required gaps come first, followed by the number of targeted gaps and connected roles. Suggested projects are BridgePath briefs, not employer assignments.</p></div></details>
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

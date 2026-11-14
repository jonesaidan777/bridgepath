import type { CareerContext } from "./student-profile";
import type { Requirement, WorkbookDataset } from "./workbook-types";
import { matchInternship, rankInternships, type InternshipMatch } from "./matching";
export interface ProjectRecommendation {
    id: string;
    kind: "guided" | "workbook_brief" | "concept";
    title: string;
    objective: string;
    deliverable: string;
    careerField: string;
    skillIds: string[];
    missingSkillIds: string[];
    reasons: string[];
    connections: Requirement[];
    internshipIds: string[];
    selectedInternshipId?: string;
}
const ids = (value: string | null) => (value || "").split("|").map(s => s.trim()).filter(Boolean);
/** Concepts are BridgePath suggestions, never source projects or employer assignments. */
function conceptBrief(labels: string[], field: string) {
    const focus = labels.join(" + ");
    const formats: Record<string, {
        artifact: string;
        deliverable: string;
    }> = {
        software_engineering: { artifact: "prototype", deliverable: "A small repository or technical artifact with a reproducible example, checks of the behavior, and a README explaining the design and limitations." },
        data_science_ai_ml: { artifact: "analysis study", deliverable: "A reproducible analysis or notebook using synthetic or openly licensed inputs, with methods, findings, validation checks, and limitations." },
        product_management: { artifact: "product decision brief", deliverable: "A concise decision brief with a problem statement, a worked example, supporting analysis, and explicit tradeoffs and limitations." },
        quant_finance: { artifact: "research study", deliverable: "A reproducible research artifact using synthetic or openly licensed inputs, with assumptions, validation, findings, and limitations. No live trading is needed." },
        hardware_engineering: { artifact: "design study", deliverable: "A design report and a safe simulation or technical artifact, with assumptions, verification checks, and limitations." },
    };
    const format = formats[field] || { artifact: "evidence study", deliverable: "A worked example and a short report explaining your approach, checks, and limitations." };
    return {
        title: `${focus}: ${format.artifact}`,
        objective: `Create a small ${format.artifact} that demonstrates ${labels.join(", ")}. Choose a manageable example and explain how your work illustrates the linked employer requirement. This is a suggested scope, not an employer assignment.`,
        deliverable: format.deliverable,
    };
}
/** Reuse internship relevance/eligibility and alternative-aware skill evidence. No scores or AI. */
export function recommendProjects(context: CareerContext, data: WorkbookDataset, selectedInternshipId?: string): ProjectRecommendation[] {
    let matches: InternshipMatch[];
    if (selectedInternshipId) {
        const job = data.Internships.find(job => job.internship_id === selectedInternshipId);
        // An explicit selection supplies relevance; do not substitute unrelated roles for a bad ID.
        matches = job ? [matchInternship(context, job, data)] : [];
    }
    else if (context.interestedInternshipIds.length) {
        // Interest selections guide projects without changing the discovery ranking.
        matches = data.Internships
            .filter(job => context.interestedInternshipIds.includes(job.internship_id))
            .map(job => matchInternship(context, job, data))
            .filter(match => match.type !== "explicitly_unmet" && !/^(closed|expired|withdrawn)$/i.test(match.internship.posting_status || ""));
    } else
        matches = rankInternships(context, data);
    const skillName = (id: string) => data.Skills.find(skill => skill.skill_id === id)?.skill_name || id;
    const gapsByRole = new Map(matches.map(match => [match.internship.internship_id, new Set(match.qualifications.flatMap(group => group.notDocumented))]));

    const relevantIds = new Set(matches.map(match => match.internship.internship_id));
    const rows = data.Requirements.filter(row => relevantIds.has(row.internship_id));
    const candidates: ProjectRecommendation[] = [];
    for (const project of data.Projects) {
        const skills = ids(project.target_skill_ids);
        const connections = rows.filter(row => skills.includes(row.skill_id) && matches.some(match => match.internship.internship_id === row.internship_id && match.internship.career_field === project.career_field));
        if (!connections.length)
            continue;
        const targetedGaps = [...new Set(connections.filter(row => gapsByRole.get(row.internship_id)?.has(row.skill_id)).map(row => row.skill_id))];
        // A shared career label alone is not a meaningful recommendation.
        if (!targetedGaps.length)
            continue;
        const guided = data.Milestones.some(step => step.project_id === project.project_id);
        candidates.push({
            id: project.project_id, kind: guided ? "guided" : "workbook_brief",
            title: project.title || "Untitled workbook project",
            objective: project.description || "No objective recorded.",
            deliverable: project.final_deliverable || "No deliverable recorded.",
            careerField: project.career_field || "", skillIds: skills, missingSkillIds: targetedGaps,
            connections, internshipIds: [...new Set(connections.map(row => row.internship_id))], selectedInternshipId,
            reasons: [`This workbook project targets ${targetedGaps.map(skillName).join(", ")}, requested by your ${selectedInternshipId ? "selected internship" : context.interestedInternshipIds.length ? "selected internships" : "recommended internships"} and not yet documented in your profile.`, guided ? "Recorded guided milestones are available." : "The workbook contains a brief only; no guided milestones are recorded."],
        });
    }
    for (const match of matches) {
        // Prioritize required gaps, but keep preferred and unspecified evidence labeled in the UI.
        const gaps = [...match.qualifications].sort((a, b) => ["required", "unspecified", "preferred"].indexOf(a.classification) - ["required", "unspecified", "preferred"].indexOf(b.classification)).flatMap(group => group.notDocumented);
        const focus = [...new Set(gaps)].slice(0, 3);
        if (!focus.length || candidates.some(project => project.kind !== "concept" && focus.every(id => project.missingSkillIds.includes(id))))
            continue;
        const connections = rows.filter(row => row.internship_id === match.internship.internship_id && focus.includes(row.skill_id));
        if (!connections.length)
            continue;
        const brief = conceptBrief(focus.map(skillName), match.internship.career_field || "");
        candidates.push({ id: `concept-${match.internship.internship_id}`, kind: "concept", ...brief,
            careerField: match.internship.career_field || "", skillIds: focus, missingSkillIds: focus,
            connections, internshipIds: [match.internship.internship_id], selectedInternshipId,
            reasons: [`Suggested from ${match.internship.company || "this employer"}'s recorded requirements for ${match.internship.job_title || "this role"}. These skills are not yet documented in your profile.`, "Unguided BridgePath concept: no recorded milestones or learning resources. For source-listed alternatives, practicing one alternative does not imply all are mandatory."],
        });
    }
    const tuple = (project: ProjectRecommendation) => [
        -new Set(project.connections.filter(row => row.requirement_type === "required" && gapsByRole.get(row.internship_id)?.has(row.skill_id)).map(row => row.skill_id)).size,
        -project.missingSkillIds.length,
        -project.internshipIds.length,
        project.kind === "guided" ? 0 : project.kind === "workbook_brief" ? 1 : 2,
    ];
    return candidates.sort((a, b) => {
        const left = tuple(a), right = tuple(b);
        for (let i = 0; i < left.length; i++)
            if (left[i] !== right[i])
                return left[i] - right[i];
        return a.id.localeCompare(b.id);
    });
}

import snapshot from "../data/bridgepath-workbook.json";
import type {
  Project,
  StudentReportedSkills,
  WorkbookDataset,
  SkillFrequency,
} from "./workbook-types";

const normalize = (value: string) => value.trim().toLowerCase();

/** The importer validates the JSON at the boundary; pages never open Excel. */
export function createDataLayer(data: WorkbookDataset) {
  function getInternships(careerField?: string) {
    return data.Internships.filter(
      (job) =>
        !careerField ||
        normalize(job.career_field ?? "") === normalize(careerField),
    );
  }
  function getCareerFields() {
    return [
      ...new Set(
        data.Internships.flatMap((job) =>
          job.career_field ? [job.career_field] : [],
        ),
      ),
    ].sort();
  }
  function getRequirements(internshipId: string) {
    return data.Requirements.filter(
      (row) => row.internship_id === internshipId,
    );
  }
  function getSkill(skillId: string) {
    return data.Skills.find((skill) => skill.skill_id === skillId);
  }
  function getSkills() {
    return data.Skills;
  }
  function getSkillFrequencies(careerField?: string): SkillFrequency[] {
    const internships = getInternships(careerField);
    const allowedIds = new Set(internships.map((job) => job.internship_id));
    return data.Skills.map((skill) => {
      const mentions = data.Requirements.filter(
        (row) =>
          row.skill_id === skill.skill_id && allowedIds.has(row.internship_id),
      );
      const distinctIds = (type?: string) => [
        ...new Set(
          mentions
            .filter(
              (row) =>
                !type || (row.requirement_type ?? "unspecified") === type,
            )
            .map((row) => row.internship_id),
        ),
      ];
      // A posting contributes at most one mention, even if multiple excerpts list a skill.
      // Classification counts are also distinct, but may overlap for mixed classifications.
      const internshipIds = distinctIds();
      return {
        skill,
        internshipIds,
        count: internshipIds.length,
        total: internships.length,
        required: distinctIds("required").length,
        preferred: distinctIds("preferred").length,
        unspecified: distinctIds("unspecified").length,
      };
    })
      .filter((row) => row.count > 0)
      .sort(
        (a, b) =>
          b.count - a.count || a.skill.skill_id.localeCompare(b.skill.skill_id),
      );
  }
  function compareStudentSkills(
    student: StudentReportedSkills,
    careerField?: string,
  ) {
    const reported = new Set(student.skills.map(normalize));
    const matches = (id: string, name: string | null) =>
      reported.has(normalize(id)) ||
      (name !== null && reported.has(normalize(name)));
    const frequencies = getSkillFrequencies(careerField);
    return {
      reported: frequencies.filter((row) =>
        matches(row.skill.skill_id, row.skill.skill_name),
      ),
      notYetReported: frequencies.filter(
        (row) => !matches(row.skill.skill_id, row.skill.skill_name),
      ),
      unrecognized: student.skills.filter(
        (value) =>
          !data.Skills.some(
            (skill) =>
              normalize(skill.skill_id) === normalize(value) ||
              normalize(skill.skill_name ?? "") === normalize(value),
          ),
      ),
    };
  }
  function getProjects(careerField?: string) {
    return data.Projects.filter(
      (project) =>
        !careerField ||
        normalize(project.career_field ?? "") === normalize(careerField),
    );
  }
  function getProjectSkillIds(project: Project) {
    return [
      ...new Set(
        (project.target_skill_ids ?? "")
          .split("|")
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
  }
  function getProjectSkills(project: Project) {
    const ids = new Set(getProjectSkillIds(project));
    return data.Skills.filter((skill) => ids.has(skill.skill_id));
  }
  function getRequirementsForProject(projectId: string) {
    const project = data.Projects.find(
      (project) => project.project_id === projectId,
    );
    if (!project) return [];
    const targets = new Set(getProjectSkillIds(project));
    const allowedIds = new Set(
      getInternships(project.career_field ?? undefined).map(
        (job) => job.internship_id,
      ),
    );
    return data.Requirements.filter(
      (row) => targets.has(row.skill_id) && allowedIds.has(row.internship_id),
    );
  }
  function findProjectsForSkills(skillIds: string[], careerField?: string) {
    const selected = new Set(skillIds);
    return getProjects(careerField).filter((project) =>
      getRequirementsForProject(project.project_id).some((row) =>
        selected.has(row.skill_id),
      ),
    );
  }

  function getMilestones(projectId: string) {
    return data.Milestones.filter((row) => row.project_id === projectId).sort(
      (a, b) =>
        (a.step_number ?? Infinity) - (b.step_number ?? Infinity) ||
        a.milestone_id.localeCompare(b.milestone_id),
    );
  }
  function getExplorerState(
    query: {
      careerField?: string;
      skillId?: string;
      internshipId?: string;
    } = {},
  ) {
    const internships = getInternships(query.careerField);
    const frequencies = getSkillFrequencies(query.careerField);
    const selectedSkill = query.skillId
      ? frequencies.find((row) => row.skill.skill_id === query.skillId)
      : undefined;
    // Keep the frequency denominator tied to the career field, not the clicked skill.
    const visibleInternships = query.skillId
      ? internships.filter((job) =>
          selectedSkill?.internshipIds.includes(job.internship_id),
        )
      : internships;
    const selectedInternship = query.internshipId
      ? visibleInternships.find(
          (job) => job.internship_id === query.internshipId,
        )
      : visibleInternships[0];
    return {
      internships,
      frequencies,
      selectedSkill,
      visibleInternships,
      selectedInternship,
      invalidSkill: Boolean(query.skillId && !selectedSkill),
      invalidInternship: Boolean(query.internshipId && !selectedInternship),
    };
  }
  /** Count distinct other postings sharing at least one canonical skill in the same field. */
  function getSharedSkillOpportunities(internshipId: string) {
    const selected = data.Internships.find(job => job.internship_id === internshipId);
    if (!selected?.career_field) return null;
    const requested = new Set(getRequirements(internshipId).map(row => row.skill_id));
    if (!requested.size) return null;
    return getInternships(selected.career_field)
      .filter(job => job.internship_id !== internshipId)
      .map(internship => ({
        internship,
        sharedSkills: [...new Set(getRequirements(internship.internship_id)
          .map(row => row.skill_id).filter(id => requested.has(id)))]
          .map(id => getSkill(id)).filter((skill): skill is NonNullable<typeof skill> => Boolean(skill)),
      }))
      .filter(row => row.sharedSkills.length > 0)
      .sort((a, b) => b.sharedSkills.length - a.sharedSkills.length || a.internship.internship_id.localeCompare(b.internship.internship_id));
  }
  function getProjectsForInternship(internshipId: string) {
    return data.Projects.filter((project) =>
      getRequirementsForProject(project.project_id).some(
        (row) => row.internship_id === internshipId,
      ),
    );
  }
  return {
    metadata: data.metadata,
    getInternships,
    getCareerFields,
    getRequirements,
    getSkill,
    getSkills,
    getSkillFrequencies,
    compareStudentSkills,
    getProjects,
    getProjectSkills,
    getRequirementsForProject,
    findProjectsForSkills,
    getMilestones,
    getExplorerState,
    getProjectsForInternship,
    getSharedSkillOpportunities,
  };
}

export const {
  metadata,
  getInternships,
  getCareerFields,
  getRequirements,
  getSkill,
  getSkills,
  getSkillFrequencies,
  compareStudentSkills,
  getProjects,
  getProjectSkills,
  getRequirementsForProject,
  findProjectsForSkills,
  getMilestones,
  getExplorerState,
  getProjectsForInternship,
  getSharedSkillOpportunities,
} = createDataLayer(snapshot as WorkbookDataset);

/** Retain source text, but only make ordinary web URLs clickable. */
export function safeWebUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export function display(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

/** Dedicated detail routes keep selection separate from investigation. */
export function researchHref(
  query: { careerField?: string; skillId?: string; internshipId?: string } = {},
) {
  const params = new URLSearchParams();
  if (query.careerField) params.set("field", query.careerField);
  if (query.skillId) params.set("skill", query.skillId);
  const path = query.internshipId
    ? `/career-insights/${encodeURIComponent(query.internshipId)}`
    : "/career-insights";
  return `${path}${params.size ? `?${params}` : ""}`;
}
export function projectHref(projectId: string) {
  return `/my-projects/${encodeURIComponent(projectId)}`;
}

/** Column names mirror the workbook. Blank optional cells are imported as null. */
export interface Internship {
  internship_id: string;
  company: string | null;
  job_title: string | null;
  job_description_summary: string | null;
  career_field: string | null;
  location: string | null;
  employer_posting_url: string | null;
  retrieved_on: string | null;
  posting_status: string | null;
}
export type RequirementType = "required" | "preferred" | "unspecified";
export interface Requirement {
  internship_id: string;
  skill_id: string;
  requirement_type: RequirementType | null;
  evidence_excerpt: string | null;
}
export interface Skill {
  skill_id: string;
  skill_name: string | null;
}
export interface Project {
  project_id: string;
  career_field: string | null;
  title: string | null;
  description: string | null;
  target_skill_ids: string | null;
  final_deliverable: string | null;
}
export interface Milestone {
  milestone_id: string;
  project_id: string;
  step_number: number | null;
  title: string | null;
  instructions: string | null;
  deliverable: string | null;
  resource_title: string | null;
  resource_url: string | null;
}
export interface StudentReportedSkills {
  skills: string[];
}
export interface WorkbookDataset {
  metadata: {
    source: string;
    source_sha256: string;
    imported_at: string;
    record_counts: Record<string, number>;
    warnings: string[];
  };
  Internships: Internship[];
  Requirements: Requirement[];
  Skills: Skill[];
  Projects: Project[];
  Milestones: Milestone[];
}
export interface SkillFrequency {
  skill: Skill;
  internshipIds: string[];
  count: number;
  total: number;
  required: number;
  preferred: number;
  unspecified: number;
}

import imported from "../data/bridgepath-workbook.json";
import extra from "../data/extra-projects.json";
import type { WorkbookDataset } from "./workbook-types";

/**
 * The workbook import plus BridgePath-authored projects and milestones from
 * src/data/extra-projects.json (kept separate so re-importing the workbook
 * does not erase them). Workbook IDs win if both files ever share one.
 */
const base = imported as WorkbookDataset;
const projectIds = new Set(base.Projects.map(project => project.project_id));
const milestoneIds = new Set(base.Milestones.map(step => step.milestone_id));
export const workbook: WorkbookDataset = {
  ...base,
  Projects: [...base.Projects, ...(extra.Projects as WorkbookDataset["Projects"]).filter(project => !projectIds.has(project.project_id))],
  Milestones: [...base.Milestones, ...(extra.Milestones as WorkbookDataset["Milestones"]).filter(step => !milestoneIds.has(step.milestone_id))],
};

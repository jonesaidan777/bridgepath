import type { CareerContext } from "./student-profile";
import type { RequirementType, WorkbookDataset } from "./workbook-types";
import { matchInternship, rankInternships, type InternshipMatch } from "./matching";

export interface RoleReadiness {
  match: InternshipMatch;
  requiredMet: number;
  requiredTotal: number;
  /** Good candidate now (see isGoodCandidate). */
  ready: boolean;
  /** 0–100 strength for this role (see roleScore). */
  score: number;
  have: string[];
  missingRequired: string[];
  missingPreferred: string[];
}
export interface SkillStrength {
  skillId: string;
  label: string;
  sources: string[];
  roles: number;
}
export interface SkillGap {
  skillId: string;
  label: string;
  classification: RequirementType;
  roles: number;
  roleTitles: string[];
}
export interface Readiness {
  roles: RoleReadiness[];
  strengths: SkillStrength[];
  gaps: SkillGap[];
  /** Workbook roles where the student is a strong candidate now / after closing the gaps. */
  strongNow: number;
  strongAfter: number;
  /** 0–100 average role strength now and after closing every listed gap. */
  scoreNow: number;
  scoreAfter: number;
}

export interface CandidateGrade { label: string; tone: "low" | "mid" | "high"; message: string }
/** Deliberately strict bands: most students start below the bar. */
export function gradeCandidate(score: number): CandidateGrade {
  if (score >= 90) return { label: "Competitive", tone: "high", message: "You can compete for these roles. Keep your evidence current." };
  if (score >= 75) return { label: "Borderline", tone: "mid", message: "You’d likely be passed over for applicants who show every skill on the list." };
  if (score >= 50) return { label: "Below the bar", tone: "low", message: "Right now you’re not a strong candidate. Recruiters screen for the skills you’re missing, and other applicants already show them." };
  return { label: "Not competitive yet", tone: "low", message: "Right now most of these applications would be screened out. Your profile is missing too many of the skills these employers ask for." };
}

export interface ScoreSignals { hasInternship: boolean }
/**
 * Role strength out of 100, weighted toward what recruiters actually screen for,
 * not just whether the student lists the required skills:
 *   required skills 25 · preferred skills 25 · skills proven in a project or job 5
 *   relevant work experience 20 · a project using these skills 5
 *   portfolio/GitHub link 10 · internship experience 10
 */
export function roleScore(match: InternshipMatch, signals: ScoreSignals = { hasInternship: false }) {
  const required = match.qualifications.filter(group => group.classification === "required");
  const optional = match.qualifications.filter(group => group.classification !== "required");
  const share = (groups: typeof required) => groups.length ? groups.filter(group => group.satisfied).length / groups.length : 1;
  const items = match.qualifications.flatMap(group => group.demonstrated);
  const labels = new Set(items.map(item => item.label));
  const proven = new Set(items.filter(item => item.kind === "experience" || item.kind === "project").map(item => item.label));
  const proof = labels.size ? proven.size / labels.size : 0;
  const experience = items.some(item => item.kind === "experience") ? 1 : 0;
  const project = items.some(item => item.kind === "project") ? 1 : 0;
  const portfolio = items.some(item => item.kind === "project" && item.url) ? 1 : 0;
  return Math.round(
    25 * share(required) + 25 * share(optional) + 5 * proof +
    20 * experience + 5 * project + 10 * portfolio + 10 * (signals.hasInternship ? 1 : 0),
  );
}

export const MAX_PROJECTED_SCORE = 92;
const rank: Record<RequirementType, number> = { required: 0, preferred: 1, unspecified: 2 };

/**
 * A good candidate covers every required skill group and shows at least one
 * requested skill. Eligibility questions (often unclear in postings) are left
 * to the employer, so they do not block this count.
 */
export function isGoodCandidate(match: InternshipMatch) {
  return match.qualifications.every(group => group.classification !== "required" || group.satisfied) &&
    match.qualifications.some(group => group.demonstrated.length > 0);
}
function strongCount(context: CareerContext, data: WorkbookDataset) {
  return rankInternships(context, data, data.Internships.length).filter(isGoodCandidate).length;
}

/** Per-role strength, skills shown, and skills missing for one match. */
export function toRoleReadiness(match: InternshipMatch, data: WorkbookDataset, signals?: ScoreSignals): RoleReadiness {
  const skillName = (id: string) =>
    data.Skills.find(skill => skill.skill_id === id)?.skill_name || id;
  const required = match.qualifications.filter(group => group.classification === "required");
  const missing = (classes: RequirementType[]) => [...new Set(match.qualifications
    .filter(group => classes.includes(group.classification) && !group.satisfied)
    .flatMap(group => group.mode === "any" ? group.notDocumented.slice(0, 1) : group.notDocumented)
    .map(skillName))];
  return {
    match,
    requiredMet: required.filter(group => group.satisfied).length,
    requiredTotal: required.length,
    ready: isGoodCandidate(match),
    score: roleScore(match, signals),
    have: [...new Set(match.qualifications.flatMap(group => group.demonstrated.map(item => item.label)))],
    missingRequired: missing(["required"]),
    missingPreferred: missing(["preferred", "unspecified"]),
  };
}

/** What the student already documents for the chosen roles, and what to add next. */
export function buildReadiness(
  context: CareerContext,
  data: WorkbookDataset,
  selectedIds: string[],
): Readiness {
  const signals: ScoreSignals = { hasInternship: context.experiences.some(row => row.kind === "internship") };
  const skillName = (id: string) =>
    data.Skills.find(skill => skill.skill_id === id)?.skill_name || id;
  const roles = data.Internships
    .filter(job => selectedIds.includes(job.internship_id))
    .map(job => toRoleReadiness(matchInternship(context, job, data), data, signals));

  const strengths = new Map<string, SkillStrength & { roleIds: Set<string> }>();
  const gaps = new Map<string, SkillGap & { roleIds: Set<string> }>();
  for (const { match } of roles) {
    const roleId = match.internship.internship_id;
    for (const group of match.qualifications) {
      for (const item of group.demonstrated) {
        const row = strengths.get(item.skillId) ??
          { skillId: item.skillId, label: item.label, sources: [], roles: 0, roleIds: new Set<string>() };
        if (!row.sources.includes(item.title)) row.sources.push(item.title);
        row.roleIds.add(roleId);
        strengths.set(item.skillId, row);
      }
      if (group.satisfied) continue;
      // An "any" group is met by one alternative, so suggest only the first.
      const missing = group.mode === "any" ? group.notDocumented.slice(0, 1) : group.notDocumented;
      for (const id of missing) {
        const row = gaps.get(id) ?? {
          skillId: id, label: skillName(id), classification: group.classification,
          roles: 0, roleTitles: [], roleIds: new Set<string>(),
        };
        if (rank[group.classification] < rank[row.classification]) row.classification = group.classification;
        if (!row.roleIds.has(roleId)) {
          row.roleIds.add(roleId);
          row.roleTitles.push(match.internship.job_title || roleId);
        }
        gaps.set(id, row);
      }
    }
  }
  const strip = <T extends { roleIds: Set<string> }>({ roleIds, ...rest }: T) =>
    ({ ...rest, roles: roleIds.size });
  const gapList = [...gaps.values()].map(strip)
    .sort((a, b) => rank[a.classification] - rank[b.classification] || b.roles - a.roles || a.label.localeCompare(b.label));
  const improved: CareerContext = {
    ...context,
    skills: {
      ...context.skills,
      canonicalIds: [...new Set([...context.skills.canonicalIds, ...gapList.map(gap => gap.skillId)])],
    },
    // The recommended projects become portfolio evidence for the new skills.
    projects: [...context.projects, {
      id: "bridgepath-planned-project", kind: "personal", title: "BridgePath recommended project",
      description: "", url: "https://github.com/", organization: "", startMonth: "", endMonth: "",
      skillIds: gapList.map(gap => gap.skillId), accomplishments: "",
    }],
    // The plan also adds hands-on experience (an open-source contribution or hackathon).
    experiences: [...context.experiences, {
      id: "bridgepath-planned-experience", kind: "extracurricular", title: "Open-source contribution",
      organization: "", description: "", startMonth: "", endMonth: "", ongoing: false,
      skillIds: gapList.map(gap => gap.skillId), accomplishments: "", evidenceUrl: "",
    }],
  };
  const average = (scores: number[]) => scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const improvedScores = data.Internships
    .filter(job => selectedIds.includes(job.internship_id))
    .map(job => roleScore(matchInternship(improved, job, data), signals));
  return {
    roles,
    scoreNow: average(roles.map(role => role.score)),
    // Nobody is a sure thing: cap the projected rating so it stays believable.
    scoreAfter: Math.max(Math.min(average(improvedScores), MAX_PROJECTED_SCORE), average(roles.map(role => role.score))),
    strengths: [...strengths.values()].map(strip)
      .sort((a, b) => b.roles - a.roles || a.label.localeCompare(b.label)),
    gaps: gapList,
    strongNow: strongCount(context, data),
    strongAfter: strongCount(improved, data),
  };
}

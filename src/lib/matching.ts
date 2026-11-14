import type { CareerContext } from "./student-profile";
import type {
  Internship,
  RequirementType,
  Skill,
  WorkbookDataset,
} from "./workbook-types";
import { evaluateEligibility, type EligibilityCheck } from "./eligibility";

export interface SkillEvidence {
  skillId: string;
  label: string;
  kind: "reported_skill" | "experience" | "project" | "certification";
  title: string;
  detail: string;
  url?: string;
}
export interface QualificationGroup {
  skillIds: string[];
  labels: string[];
  classification: RequirementType;
  evidence: string;
  mode: "any" | "all";
  demonstrated: SkillEvidence[];
  notDocumented: string[];
  satisfied: boolean;
}
export interface PreferenceSignal {
  kind: "location" | "work_mode" | "season" | "year";
  status: "aligned" | "different" | "unknown";
  explanation: string;
  evidence: string;
}
export interface NextAction {
  kind:
    | "verify_eligibility"
    | "build_project"
    | "document_experience"
    | "learn_concept"
    | "verify_posting";
  title: string;
  explanation: string;
  href: string;
}
export interface InternshipMatch {
  internship: Internship;
  career: {
    fieldAligned: boolean;
    roleTerms: string[];
    legacyInterestTerms: string[];
    relevant: boolean;
  };
  eligibility: EligibilityCheck[];
  eligibilityStatus: "confirmed" | "uncertain" | "unmet";
  qualifications: QualificationGroup[];
  preferences: PreferenceSignal[];
  type:
    | "strong_current"
    | "interest_aligned_stretch"
    | "explicitly_unmet"
    | "not_aligned";
  reasons: string[];
  nextAction: NextAction;
  relevantExperience: string[];
}
const norm = (value: string) =>
  value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasPhrase = (text: string, phrase: string) =>
  Boolean(phrase.trim()) &&
  new RegExp(`(^|[^a-z0-9])${escape(norm(phrase))}(?=$|[^a-z0-9])`, "i").test(
    norm(text),
  );
const label = (skill: Skill) => skill.skill_name || skill.skill_id;
const aliases = (skill: Skill) => [
  ...new Set([
    skill.skill_id,
    label(skill),
    label(skill).replace(/\s*\(.*\)/, ""),
  ]),
];
const stopWords = new Set([
  "intern",
  "internship",
  "internships",
  "summer",
  "spring",
  "fall",
  "winter",
  "2027",
  "2028",
  "the",
  "and",
  "or",
  "a",
  "an",
  "of",
  "in",
  "still",
  "exploring",
  "student",
  "entry",
  "level",
]);
const terms = (value: string) =>
  norm(value)
    .split(/[^a-z0-9+#]+/)
    .filter((term) => term.length > 2 && !stopWords.has(term));
const web = (value: string | null) => {
  try {
    const url = new URL(value || "");
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

export function collectSkillEvidence(
  context: CareerContext,
  skills: Skill[],
): SkillEvidence[] {
  const evidence: SkillEvidence[] = [];
  const known = new Set(skills.map((skill) => skill.skill_id));
  for (const skill of skills) {
    if (
      context.skills.canonicalIds.includes(skill.skill_id) ||
      context.skills.additional.some((value) =>
        aliases(skill).some((alias) => norm(alias) === norm(value)),
      )
    ) {
      evidence.push({
        skillId: skill.skill_id,
        label: label(skill),
        kind: "reported_skill",
        title: "Student-confirmed skill",
        detail: "Reported in your profile; not independently verified.",
      });
    }
    for (const certification of context.certifications) {
      if (aliases(skill).some((alias) => hasPhrase(certification, alias)))
        evidence.push({
          skillId: skill.skill_id,
          label: label(skill),
          kind: "certification",
          title: certification,
          detail:
            "Your certification entry explicitly mentions this skill; credential verification is not performed.",
        });
    }
  }
  for (const row of context.experiences) {
    if (!row.title.trim()) continue;
    for (const id of row.skillIds.filter((id) => known.has(id)))
      evidence.push({
        skillId: id,
        label: label(skills.find((skill) => skill.skill_id === id)!),
        kind: "experience",
        title: row.title,
        detail: [
          row.kind,
          row.organization,
          row.startMonth &&
            `${row.startMonth}–${row.ongoing ? "present" : row.endMonth || "end not recorded"}`,
          row.accomplishments || row.description,
        ]
          .filter(Boolean)
          .join(" · "),
        url: web(row.evidenceUrl) ?? undefined,
      });
  }
  for (const row of context.projects) {
    if (!row.title.trim()) continue;
    for (const id of row.skillIds.filter((id) => known.has(id)))
      evidence.push({
        skillId: id,
        label: label(skills.find((skill) => skill.skill_id === id)!),
        kind: "project",
        title: row.title,
        detail: [
          row.kind,
          row.organization,
          row.startMonth &&
            `${row.startMonth}–${row.endMonth || "end not recorded"}`,
          row.accomplishments || row.description,
        ]
          .filter(Boolean)
          .join(" · "),
        url: web(row.url) ?? undefined,
      });
  }
  return evidence;
}

function qualificationGroups(
  context: CareerContext,
  job: Internship,
  data: WorkbookDataset,
  evidence: SkillEvidence[],
): QualificationGroup[] {
  const map = new Map<
    string,
    { skillIds: string[]; type: RequirementType; excerpt: string }
  >();
  for (const row of data.Requirements.filter(
    (row) => row.internship_id === job.internship_id,
  )) {
    const type = row.requirement_type ?? "unspecified";
    // Missing excerpts must not merge unrelated rows into a made-up alternative.
    const key = `${type}:${row.evidence_excerpt || row.skill_id}`;
    const group = map.get(key) ?? {
      skillIds: [],
      type,
      excerpt: row.evidence_excerpt || "",
    };
    if (!group.skillIds.includes(row.skill_id))
      group.skillIds.push(row.skill_id);
    map.set(key, group);
  }
  return [...map.values()].map((group) => {
    const any = /\b(?:or|one of|at least one|such as)\b|and\/or/i.test(
      group.excerpt,
    );
    const ids = new Set(group.skillIds);
    // Source-listed alternative languages count only if their actual names occur
    // in the same excerpt. This does not create or alter workbook requirement rows.
    if (any)
      for (const skill of data.Skills)
        if (aliases(skill).some((alias) => hasPhrase(group.excerpt, alias)))
          ids.add(skill.skill_id);
    const demonstrated = evidence.filter((item) => ids.has(item.skillId));
    if (any)
      for (const value of context.skills.additional) {
        if (
          hasPhrase(group.excerpt, value) &&
          !demonstrated.some((item) => norm(item.label) === norm(value))
        )
          demonstrated.push({
            skillId: `custom:${value}`,
            label: value,
            kind: "reported_skill",
            title: "Student-confirmed source-listed alternative",
            detail:
              "Your custom skill is explicitly named in this employer excerpt.",
          });
      }
    const demonstratedIds = new Set(demonstrated.map((item) => item.skillId));
    const satisfied = any
      ? demonstrated.length > 0
      : [...ids].every((id) => demonstratedIds.has(id));
    return {
      skillIds: [...ids],
      labels: [...ids].map((id) =>
        label(data.Skills.find((skill) => skill.skill_id === id)!),
      ),
      classification: group.type,
      evidence: group.excerpt,
      mode: any ? ("any" as const) : ("all" as const),
      demonstrated,
      notDocumented:
        satisfied && any
          ? []
          : [...ids].filter((id) => !demonstratedIds.has(id)),
      satisfied,
    };
  });
}

export function evaluatePreferences(
  context: CareerContext,
  job: Internship,
): PreferenceSignal[] {
  const signals: PreferenceSignal[] = [];
  const location = job.location || "";
  const locationText = norm(location);
  const preferred = context.preferences.locations.length
    ? context.preferences.locations
    : context.homeLocation
      ? [context.homeLocation]
      : [];
  const locationFits = preferred.some(
    (value) =>
      norm(value) === locationText ||
      hasPhrase(
        location,
        value
          .split(",")[0]
          .replace(/^USA\s*-\s*/i, "")
          .trim(),
      ),
  );
  signals.push({
    kind: "location",
    status:
      !location || !preferred.length
        ? "unknown"
        : locationFits
          ? "aligned"
          : context.preferences.willingToRelocate === "yes"
            ? "aligned"
            : !context.preferences.locations.length
              ? "unknown"
              : "different",
    explanation:
      !location || !preferred.length || /^remote$/i.test(location.trim())
        ? "Location or a geographic preference is not specific enough to compare; the opportunity is not excluded."
        : locationFits
          ? "The recorded location aligns with a preferred location (or your home city when none were chosen)."
          : context.preferences.willingToRelocate === "yes"
            ? "You are willing to relocate to a recorded location."
            : !context.preferences.locations.length
              ? "The recorded location is outside your home city; no location preference is recorded, so the opportunity is not excluded."
              : `Recorded location differs from your preference. Relocation: ${context.preferences.willingToRelocate || "not recorded"}.`,
    evidence: location || "Location not provided.",
  });
  const text = `${job.requirements || ""}\n${job.program_details || ""}`;
  let mode: "remote" | "hybrid" | "on_site" | undefined;
  if (/hybrid/i.test(location)) mode = "hybrid";
  else if (/on.?site|in.person/i.test(location)) mode = "on_site";
  else if (/remote/i.test(location)) mode = "remote";
  else if (
    /100% onsite|remote or hybrid will not be considered|full.time.{0,8}on.site|location: onsite|work onsite|work in person|in.person attendance for the whole|work in the office/i.test(
      text,
    )
  )
    mode = "on_site";
  else if (/\bhybrid\b/i.test(text)) mode = "hybrid";
  else if (
    /work (?:fully |entirely )?remotely|remote internship/i.test(text) &&
    !/fully remote company/i.test(text)
  )
    mode = "remote";
  signals.push({
    kind: "work_mode",
    status: mode && context.preferences.workModes.length
      ? context.preferences.workModes.includes(mode)
        ? "aligned"
        : "different"
      : "unknown",
    explanation: mode
      ? `The role explicitly describes ${mode.replace("_", "-")} work${!context.preferences.workModes.length ? "" : context.preferences.workModes.includes(mode) ? ", which you selected" : ", outside your selected arrangements"}.`
      : "Work arrangement is not clear; location alone is not treated as on-site.",
    evidence: mode
      ? location.match(/hybrid|on.?site|remote/i)
        ? location
        : text
            .split("\n")
            .find((line) => /hybrid|on.?site|in.person|remotely/i.test(line)) ||
          text
      : "Work arrangement not stated clearly.",
  });
  const schedule = `${job.job_title || ""}\n${job.program_details || ""}`;
  const years = [
    ...new Set([...schedule.matchAll(/\b20\d{2}\b/g)].map((match) => match[0])),
  ];
  // A year in the title is a clearer internship-year signal than other future
  // dates mentioned in program prose (for example, a later remote semester).
  const titleYear = job.job_title?.match(/\b20\d{2}\b/)?.[0];
  const year = titleYear || (years.length === 1 ? years[0] : undefined);
  const conflict =
    /although|as written|inconsistent/i.test(job.requirements || "") &&
    /summer/i.test(schedule) &&
    /january through june/i.test(job.requirements || "");
  signals.push({
    kind: "year",
    status: year && context.preferences.year
      ? year === context.preferences.year
        ? "aligned"
        : "different"
      : "unknown",
    explanation: year
      ? `The recorded program year is ${year}${!context.preferences.year ? "" : year === context.preferences.year ? ", your selected year" : `; you selected ${context.preferences.year}`}.`
      : "The internship year is not unambiguous; verify the source schedule.",
    evidence:
      job.job_title || job.program_details || "Program year not provided.",
  });
  const season = schedule
    .match(/\b(spring|summer|fall|winter)\b/i)?.[1]
    ?.toLowerCase();
  signals.push({
    kind: "season",
    status: conflict
      ? "unknown"
      : context.preferences.season === "any"
        ? "aligned"
        : season && context.preferences.season
          ? season === context.preferences.season
            ? "aligned"
            : "different"
          : "unknown",
    explanation: conflict
      ? "The source contains conflicting summer and January–June timing; verify the schedule."
      : context.preferences.season === "any"
        ? "You are open to any internship season."
        : season
          ? `The source names ${season}${!context.preferences.season ? "" : season === context.preferences.season ? ", your selected season" : `; you selected ${context.preferences.season}`}.`
          : "A clear internship season is not provided; no season is inferred from company location.",
    evidence: conflict
      ? job.requirements!
      : job.program_details || job.job_title || "Program season not provided.",
  });
  return signals;
}

function chooseNextAction(
  match: Omit<InternshipMatch, "nextAction">,
  context: CareerContext,
  data: WorkbookDataset,
): NextAction {
  const job = match.internship;
  const verify = match.eligibility.find(
    (check) =>
      check.classification === "required" && check.status !== "confirmed",
  );
  const source = web(job.employer_posting_url);
  const rolePath = `/career-insights/${encodeURIComponent(job.internship_id)}`;
  if (verify)
    return {
      kind: "verify_eligibility",
      title: "Verify this eligibility condition",
      explanation: verify.explanation,
      href: source || rolePath,
    };
  const missing = match.qualifications.filter(
    (group) => group.classification === "required" && !group.satisfied,
  );
  const missingIds = new Set(missing.flatMap((group) => group.notDocumented));
  const project = data.Projects.find(
    (project) =>
      project.career_field === job.career_field &&
      (project.target_skill_ids || "")
        .split("|")
        .some((id) => missingIds.has(id.trim())),
  );
  if (project)
    return {
      kind: "build_project",
      title: `Explore ${project.title || "the connected project"}`,
      explanation:
        "This workbook project targets at least one employer-requested skill not yet documented in your profile.",
      href: `/my-projects/${encodeURIComponent(project.project_id)}`,
    };
  if (missing.length) {
    const hasExperience =
      context.experiences.length ||
      context.projects.length ||
      context.certifications.length;
    return {
      kind: hasExperience ? "document_experience" : "learn_concept",
      title: hasExperience
        ? "Document relevant skills and experience"
        : `Review the ${missing[0].labels.join(" / ")} requirement`,
      explanation: hasExperience
        ? "Link skills used and an accomplishment or evidence URL to your existing coursework, work, or projects. Do not claim skills you have not used."
        : "Read this source requirement, choose a concept to practice, and document the work afterward. No guided project or learning resource is recorded for this gap.",
      href: hasExperience
        ? "/onboarding?edit=1&step=3"
        : `${rolePath}?review=requirements#source-requirements`,
    };
  }
  if (
    match.qualifications.some((group) =>
      group.demonstrated.some((item) => item.kind === "reported_skill"),
    ) &&
    !match.qualifications.some((group) =>
      group.demonstrated.some(
        (item) => item.kind === "experience" || item.kind === "project",
      ),
    )
  )
    return {
      kind: "document_experience",
      title: "Add evidence for your reported skills",
      explanation:
        "Your skill selections align with this posting. Add an actual project, accomplishment, or experience that shows their use.",
      href: "/onboarding?edit=1&step=3",
    };
  return {
    kind: "verify_posting",
    title: "Check the original employer posting",
    explanation:
      "Confirm current availability, remaining source qualifications, and application instructions before applying.",
    href: source || rolePath,
  };
}

/** No protected fields are accepted by this API. No compatibility score is produced. */
export function matchInternship(
  context: CareerContext,
  job: Internship,
  data: WorkbookDataset,
): InternshipMatch {
  const fieldAligned = context.careerInterests.some(
    (interest) => norm(interest) === norm(job.career_field || ""),
  );
  const titleText = `${job.job_title || ""} ${job.job_description_summary || ""}`;
  const roleTerms = [
    ...new Set(
      context.preferences.targetRoles
        .flatMap(terms)
        .filter((term) => hasPhrase(titleText, term)),
    ),
  ];
  const fields = new Set(
    data.Internships.map((job) => norm(job.career_field || "")),
  );
  const legacyInterestTerms = context.careerInterests.filter(
    (interest) =>
      !fields.has(norm(interest)) &&
      !/still exploring/i.test(interest) &&
      hasPhrase(titleText, interest),
  );
  const relevant =
    fieldAligned || roleTerms.length > 0 || legacyInterestTerms.length > 0;
  const eligibility = evaluateEligibility(context, job);
  const unmet = eligibility.some(
    (check) => check.classification === "required" && check.status === "unmet",
  );
  const uncertain = eligibility.some(
    (check) =>
      check.classification === "required" && check.status === "uncertain",
  );
  const qualifications = qualificationGroups(
    context,
    job,
    data,
    collectSkillEvidence(context, data.Skills),
  );
  const preferences = evaluatePreferences(context, job);
  const required = qualifications.filter(
    (group) => group.classification === "required",
  );
  const demonstrated = qualifications.flatMap((group) => group.demonstrated);
  const experienceEntries = [...context.experiences, ...context.projects];
  const relevantExperience = [
    ...new Set([
      ...demonstrated
        .filter((item) => item.kind === "experience" || item.kind === "project")
        .map((item) => item.title),
      ...experienceEntries
        .filter(
          (row) =>
            row.title.trim() &&
            terms(row.title).some((term) =>
              hasPhrase(job.job_title || "", term),
            ),
        )
        .map((row) => row.title),
    ]),
  ];
  const strong =
    required.length > 0 &&
    required.every((group) => group.satisfied) &&
    !uncertain &&
    !preferences.some((signal) => signal.status === "different");
  const reasons = [
    ...(fieldAligned
      ? [
          `The workbook categorizes this role in your selected career field: ${(job.career_field || "").replace(/_/g, " ")}.`,
        ]
      : []),
    ...(roleTerms.length
      ? [
          `Your target role terms occur in the posting: ${roleTerms.join(", ")}.`,
        ]
      : []),
    ...(legacyInterestTerms.length
      ? [
          `The posting explicitly mentions your interest: ${legacyInterestTerms.join(", ")}. This is a text-grounded interest, not a dataset category.`,
        ]
      : []),
    ...(demonstrated.length
      ? [
          `Your profile documents ${new Set(demonstrated.map((item) => item.skillId)).size} source-requested skills.`,
        ]
      : [
          "No requested skills are documented yet. That is not a claim that you lack them.",
        ]),
    ...(relevantExperience.length
      ? [
          `Relevant student-entered experience or projects: ${relevantExperience.join(", ")}.`,
        ]
      : []),
    ...preferences
      .filter((signal) => signal.status === "aligned")
      .map((signal) => signal.explanation),
  ];
  const base: Omit<InternshipMatch, "nextAction"> = {
    internship: job,
    career: { fieldAligned, roleTerms, legacyInterestTerms, relevant },
    eligibility,
    eligibilityStatus: unmet ? "unmet" : uncertain ? "uncertain" : "confirmed",
    qualifications,
    preferences,
    type: unmet
      ? "explicitly_unmet"
      : !relevant
        ? "not_aligned"
        : strong
          ? "strong_current"
          : "interest_aligned_stretch",
    reasons,
    relevantExperience,
  };
  return { ...base, nextAction: chooseNextAction(base, context, data) };
}

/** Lexicographic evidence ordering, not a weighted/AI compatibility percentage. */
export function rankInternships(
  context: CareerContext,
  data: WorkbookDataset,
  limit = 5,
): InternshipMatch[] {
  if (!["full_time", "part_time"].includes(context.education.enrollmentStatus))
    return [];
  const matches = data.Internships.map((job) =>
    matchInternship(context, job, data),
  ).filter(
    (match) =>
      match.career.relevant &&
      match.type !== "explicitly_unmet" &&
      !/^(closed|expired|withdrawn)$/i.test(
        match.internship.posting_status || "",
      ),
  );
  const tuple = (match: InternshipMatch) => [
    match.type === "strong_current" ? 0 : 1,
    match.career.fieldAligned ? 0 : 1,
    match.preferences.filter((signal) => signal.status === "different").length,
    match.qualifications.filter(
      (group) => group.classification === "required" && !group.satisfied,
    ).length,
    -match.qualifications.filter(
      (group) => group.classification === "required" && group.satisfied,
    ).length,
    -match.qualifications.filter(
      (group) => group.classification === "preferred" && group.satisfied,
    ).length,
    -new Set(
      match.qualifications.flatMap((group) =>
        group.demonstrated.map((item) => item.skillId),
      ),
    ).size,
    -match.relevantExperience.length,
    -match.career.roleTerms.length,
    -match.eligibility.filter((check) => check.status === "confirmed").length,
    -match.preferences.filter((signal) => signal.status === "aligned").length,
  ];
  return matches
    .sort((a, b) => {
      const left = tuple(a),
        right = tuple(b);
      for (let i = 0; i < left.length; i++)
        if (left[i] !== right[i]) return left[i] - right[i];
      return a.internship.internship_id.localeCompare(
        b.internship.internship_id,
      );
    })
    .slice(0, Math.max(0, limit));
}

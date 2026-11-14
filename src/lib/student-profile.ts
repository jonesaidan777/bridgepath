// Step 4 (Preferences) was removed; it stays in the type so older saved
// profiles parked on it can be migrated to the last remaining step.
export type OnboardingStep = 1 | 2 | 3 | 4 | 5;
// Stable IDs preserve saved progress and edit links when the display order changes.
export const ONBOARDING_STEPS = [5, 1, 2, 3] as const;
export type DegreeLevel = "associate" | "bachelor" | "master" | "doctoral";
export type EnrollmentStatus = "full_time" | "part_time" | "not_enrolled";
export type ExperienceKind =
  "internship" | "work" | "research" | "extracurricular";
export type WorkMode = "remote" | "hybrid" | "on_site";
export const AGE_RANGES = [
  "Under 18",
  "18–20",
  "21–24",
  "25–29",
  "30–39",
  "40 or older",
  "Prefer not to say",
] as const;
export const ETHNICITIES = [
  "Asian",
  "Black or African American",
  "Hispanic or Latino",
  "Middle Eastern or North African",
  "Native American or Alaska Native",
  "Native Hawaiian or Pacific Islander",
  "White",
  "Multiracial",
  "Another identity",
  "Prefer not to say",
] as const;

export interface StudentExperience {
  id: string;
  kind: ExperienceKind;
  title: string;
  organization: string;
  description: string;
  startMonth: string;
  endMonth: string;
  ongoing: boolean;
  skillIds?: string[];
  accomplishments?: string;
  evidenceUrl?: string;
}
export interface StudentProject {
  id: string;
  kind: "personal" | "academic";
  title: string;
  description: string;
  url: string;
  organization?: string;
  startMonth?: string;
  endMonth?: string;
  skillIds?: string[];
  accomplishments?: string;
}
export interface ResumeSuggestion {
  field: "major" | "skill" | "careerInterest";
  value: string;
  source: "resume_extraction";
  confirmed: boolean;
}
export interface StudentProfile {
  version: 1;
  personal: { preferredName: string; cityState: string };
  demographics: { ageRange: string; raceEthnicity: string } | null;
  consent: { saveDemographics: boolean };
  careerInterests: string[];
  interestedInternshipIds?: string[];
  /** IDs of "What most students don't know" tips the student has checked off. */
  completedTips?: string[];
  /** Recommended project IDs the student has started, most recent first. */
  startedProjects?: string[];
  education: {
    college: string;
    major: string;
    degreeLevel: DegreeLevel | "";
    academicYear: "" | "1" | "2" | "3" | "4" | "5+";
    expectedGraduation: string;
    gpa: string;
    gpaScale?: string;
    enrollmentStatus: EnrollmentStatus | "";
  };
  experiences: StudentExperience[];
  skills: { canonicalIds: string[]; additional: string[] };
  projects: StudentProject[];
  certifications: string[];
  preferences: {
    targetRoles: string[];
    locations: string[];
    workModes: WorkMode[];
    willingToRelocate: "" | "yes" | "no" | "unsure";
    season: "" | "spring" | "summer" | "fall" | "winter" | "any";
    year: string;
  };
  // Raw files and document text never belong in this model. This milestone sets
  // no extracted suggestions; future extraction must preserve provenance/review.
  resume: {
    reviewedLocally: boolean;
    extractionStatus: "not_performed";
    suggestions: ResumeSuggestion[];
  };
  onboarding: {
    step: OnboardingStep;
    completed: boolean;
    completedAt: string | null;
  };
}
export type ProfileErrors = Record<string, string>;
export const PROFILE_STORAGE_KEY = "bridgepath.profile.v1";

export function emptyProfile(): StudentProfile {
  return {
    version: 1,
    personal: { preferredName: "", cityState: "" },
    demographics: null,
    consent: { saveDemographics: false },
    careerInterests: [],
    education: {
      college: "",
      major: "",
      degreeLevel: "",
      academicYear: "",
      expectedGraduation: "",
      gpa: "",
      gpaScale: "4",
      enrollmentStatus: "",
    },
    experiences: [],
    skills: { canonicalIds: [], additional: [] },
    projects: [],
    certifications: [],
    preferences: {
      targetRoles: [],
      locations: [],
      workModes: [],
      willingToRelocate: "",
      season: "",
      year: "",
    },
    resume: {
      reviewedLocally: false,
      extractionStatus: "not_performed",
      suggestions: [],
    },
    onboarding: { step: 5, completed: false, completedAt: null },
  };
}

const validMonth = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const currentMonth = (now: Date) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const normalized = (value: string) => value.trim().toLowerCase();
export function uniqueEntries(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      if (!value || seen.has(normalized(value))) return false;
      seen.add(normalized(value));
      return true;
    });
}
export function validProfileUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function validateProfileStep(
  profile: StudentProfile,
  step: OnboardingStep,
  now = new Date(),
): ProfileErrors {
  const errors: ProfileErrors = {};
  const required = (key: string, value: string, message: string) => {
    if (!value.trim()) errors[key] = message;
  };
  if (step === 1) {
    required(
      "preferredName",
      profile.personal.preferredName,
      "Enter the name you would like us to use.",
    );
    required(
      "cityState",
      profile.personal.cityState,
      "Enter your city and state or region.",
    );
    if (!uniqueEntries(profile.careerInterests).length)
      errors.careerInterests =
        "Add at least one career interest. You can say “Still exploring.”";
    if (
      profile.demographics?.ageRange &&
      !AGE_RANGES.includes(
        profile.demographics.ageRange as (typeof AGE_RANGES)[number],
      )
    )
      errors.ageRange = "Choose an available age range or leave it blank.";
    if (
      profile.demographics?.raceEthnicity &&
      !ETHNICITIES.includes(
        profile.demographics.raceEthnicity as (typeof ETHNICITIES)[number],
      )
    )
      errors.raceEthnicity = "Choose an available answer or leave it blank.";
  }
  if (step === 2) {
    const education = profile.education;
    required("college", education.college, "Enter your college or university.");
    required("major", education.major, "Enter your major or “Undeclared.”");
    if (
      !["associate", "bachelor", "master", "doctoral"].includes(
        education.degreeLevel,
      )
    )
      errors.degreeLevel = "Choose your current college degree level.";
    if (!["1", "2", "3", "4", "5+"].includes(education.academicYear))
      errors.academicYear = "Choose your current academic year.";
    if (
      !validMonth(education.expectedGraduation) ||
      education.expectedGraduation < currentMonth(now)
    )
      errors.expectedGraduation =
        "Enter an expected graduation month in the current month or later.";
    if (!["full_time", "part_time"].includes(education.enrollmentStatus))
      errors.enrollmentStatus =
        "BridgePath is for currently enrolled college students. Choose full-time or part-time enrollment to continue.";
    if (education.gpa.trim()) {
      const { value, scale } = readGpa(education.gpa, education.gpaScale);
      if (
        !/^\d+(?:\.\d+)?$/.test(value) ||
        !Number.isFinite(Number(scale)) ||
        Number(scale) <= 0 ||
        Number(value) > Number(scale)
      ) {
        errors.gpa =
          "Enter a GPA between 0 and the selected scale, or leave it blank.";
      }
    }
  }
  if (step === 3) {
    profile.experiences.forEach((experience, index) => {
      if (!experience.title.trim())
        errors[`experience-${index}-title`] =
          "Enter a role or activity title, or remove this entry.";
      if (experience.startMonth && !validMonth(experience.startMonth))
        errors[`experience-${index}-start`] = "Enter a valid month and year.";
      if (
        experience.endMonth &&
        (!validMonth(experience.endMonth) ||
          (experience.startMonth &&
            experience.endMonth < experience.startMonth))
      )
        errors[`experience-${index}-end`] =
          "The end month must be the same as or later than the start month.";
    });
    profile.projects.forEach((project, index) => {
      if (!project.title.trim())
        errors[`project-${index}-title`] =
          "Enter a project title, or remove this entry.";
      if (project.startMonth && !validMonth(project.startMonth))
        errors[`project-${index}-start`] = "Enter a valid month and year.";
      if (
        project.endMonth &&
        (!validMonth(project.endMonth) ||
          (project.startMonth && project.endMonth < project.startMonth))
      )
        errors[`project-${index}-end`] =
          "The end month must be the same as or later than the start month.";
      if (project.url && !validProfileUrl(project.url))
        errors[`project-${index}-url`] =
          "Use a full http:// or https:// URL, or leave it blank.";
    });
  }
  return errors;
}
export function firstIncompleteStep(
  profile: StudentProfile,
  now = new Date(),
): OnboardingStep | null {
  for (const step of ONBOARDING_STEPS)
    if (Object.keys(validateProfileStep(profile, step, now)).length)
      return step;
  return null;
}

// Reconstruct a whitelist, instead of trusting a JSON cast or spreading unknown
// storage objects. Extra fields (including raw documents) are never restored.
export function parseStoredProfile(raw: string | null): StudentProfile | null {
  if (!raw) return null;
  try {
    const input: unknown = JSON.parse(raw);
    const object = (value: unknown): Record<string, unknown> => {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("Invalid object");
      return value as Record<string, unknown>;
    };
    const text = (value: unknown, max = 2000) => {
      if (typeof value !== "string" || value.length > max)
        throw new Error("Invalid text");
      return value.trim();
    };
    const boolean = (value: unknown) => {
      if (typeof value !== "boolean") throw new Error("Invalid boolean");
      return value;
    };
    const choice = <T extends string>(
      value: unknown,
      choices: readonly T[],
    ): T => {
      if (typeof value !== "string" || !choices.includes(value as T))
        throw new Error("Invalid choice");
      return value as T;
    };
    const list = <T>(
      value: unknown,
      parse: (item: unknown) => T,
      max = 50,
    ): T[] => {
      if (!Array.isArray(value) || value.length > max)
        throw new Error("Invalid list");
      return value.map(parse);
    };
    const strings = (value: unknown) =>
      uniqueEntries(list(value, (item) => text(item, 160)));
    const root = object(input);
    if (root.version !== 1) return null;
    const personal = object(root.personal),
      education = object(root.education),
      skills = object(root.skills);
    const preferences = object(root.preferences),
      onboarding = object(root.onboarding),
      resume = object(root.resume);
    const consent = object(root.consent);
    const saveDemographics = boolean(consent.saveDemographics);
    const profile: StudentProfile = {
      version: 1,
      personal: {
        preferredName: text(personal.preferredName, 80),
        cityState: text(personal.cityState, 160),
      },
      consent: { saveDemographics },
      demographics: null,
      careerInterests: strings(root.careerInterests),
      ...(root.interestedInternshipIds === undefined ? {} : {
        interestedInternshipIds: strings(root.interestedInternshipIds),
      }),
      ...(root.completedTips === undefined ? {} : {
        completedTips: strings(root.completedTips),
      }),
      ...(root.startedProjects === undefined ? {} : {
        startedProjects: strings(root.startedProjects),
      }),
      education: {
        college: text(education.college, 160),
        major: text(education.major, 160),
        degreeLevel: choice(education.degreeLevel, [
          "",
          "associate",
          "bachelor",
          "master",
          "doctoral",
        ] as const),
        academicYear: choice(education.academicYear, [
          "",
          "1",
          "2",
          "3",
          "4",
          "5+",
        ] as const),
        expectedGraduation: text(education.expectedGraduation, 7),
        gpa: readGpa(
          text(education.gpa, 30),
          education.gpaScale === undefined
            ? undefined
            : text(education.gpaScale, 12),
        ).value,
        gpaScale: readGpa(
          text(education.gpa, 30),
          education.gpaScale === undefined
            ? undefined
            : text(education.gpaScale, 12),
        ).scale,
        enrollmentStatus: choice(education.enrollmentStatus, [
          "",
          "full_time",
          "part_time",
          "not_enrolled",
        ] as const),
      },
      experiences: list(root.experiences, (item) => {
        const row = object(item);
        return {
          id: text(row.id, 100),
          kind: choice(row.kind, [
            "internship",
            "work",
            "research",
            "extracurricular",
          ] as const),
          title: text(row.title, 160),
          organization: text(row.organization, 160),
          description: text(row.description),
          startMonth: text(row.startMonth, 7),
          endMonth: text(row.endMonth, 7),
          ongoing: boolean(row.ongoing),
          ...(row.skillIds === undefined
            ? {}
            : { skillIds: strings(row.skillIds) }),
          ...(row.accomplishments === undefined
            ? {}
            : { accomplishments: text(row.accomplishments) }),
          ...(row.evidenceUrl === undefined
            ? {}
            : { evidenceUrl: text(row.evidenceUrl, 1000) }),
        };
      }),
      skills: {
        canonicalIds: strings(skills.canonicalIds),
        additional: strings(skills.additional),
      },
      projects: list(root.projects, (item) => {
        const row = object(item);
        return {
          id: text(row.id, 100),
          kind: choice(row.kind, ["personal", "academic"] as const),
          title: text(row.title, 160),
          description: text(row.description),
          url: text(row.url, 1000),
          ...(row.organization === undefined
            ? {}
            : { organization: text(row.organization, 160) }),
          ...(row.startMonth === undefined
            ? {}
            : { startMonth: text(row.startMonth, 7) }),
          ...(row.endMonth === undefined
            ? {}
            : { endMonth: text(row.endMonth, 7) }),
          ...(row.skillIds === undefined
            ? {}
            : { skillIds: strings(row.skillIds) }),
          ...(row.accomplishments === undefined
            ? {}
            : { accomplishments: text(row.accomplishments) }),
        };
      }),
      certifications: strings(root.certifications),
      preferences: {
        targetRoles: strings(preferences.targetRoles),
        locations: strings(preferences.locations),
        workModes: list(
          preferences.workModes,
          (value) => choice(value, ["remote", "hybrid", "on_site"] as const),
          3,
        ),
        willingToRelocate: choice(preferences.willingToRelocate, [
          "",
          "yes",
          "no",
          "unsure",
        ] as const),
        season: choice(preferences.season, [
          "",
          "spring",
          "summer",
          "fall",
          "winter",
          "any",
        ] as const),
        year: text(preferences.year, 4),
      },
      resume: {
        reviewedLocally: boolean(resume.reviewedLocally),
        extractionStatus: choice(resume.extractionStatus, ["not_performed"]),
        suggestions: list(resume.suggestions, (item) => {
          const row = object(item);
          return {
            field: choice(row.field, [
              "major",
              "skill",
              "careerInterest",
            ] as const),
            value: text(row.value),
            source: choice(row.source, ["resume_extraction"]),
            confirmed: boolean(row.confirmed),
          };
        }),
      },
      onboarding: {
        // Saved progress on the removed Preferences step resumes at Experience & skills.
        step: (onboarding.step === 4 ? 3 : onboarding.step) as OnboardingStep,
        completed: boolean(onboarding.completed),
        completedAt:
          onboarding.completedAt === null
            ? null
            : text(onboarding.completedAt, 40),
      },
    };
    if (!(ONBOARDING_STEPS as readonly number[]).includes(profile.onboarding.step)) return null;
    // This milestone has no extraction engine; do not restore invented suggestions.
    if (profile.resume.suggestions.length) return null;
    if (
      profile.onboarding.completedAt !== null &&
      !Number.isFinite(Date.parse(profile.onboarding.completedAt))
    )
      return null;
    if (saveDemographics && root.demographics !== null) {
      const demographics = object(root.demographics);
      profile.demographics = {
        ageRange: choice(demographics.ageRange, ["", ...AGE_RANGES]),
        raceEthnicity: choice(demographics.raceEthnicity, ["", ...ETHNICITIES]),
      };
    }
    for (const rows of [profile.experiences, profile.projects]) {
      if (
        rows.some((row) => !row.id.trim()) ||
        new Set(rows.map((row) => row.id)).size !== rows.length
      )
        return null;
    }
    // Validate completion against its saved date, so a calendar change never
    // discards a previously valid profile. Editing education uses today's date.
    if (
      profile.onboarding.completed &&
      (!profile.onboarding.completedAt ||
        firstIncompleteStep(
          profile,
          new Date(profile.onboarding.completedAt),
        ) !== null)
    )
      return null;
    return profile;
  } catch {
    return null;
  }
}

export function serializeProfile(profile: StudentProfile) {
  const sanitized = parseStoredProfile(
    JSON.stringify({
      ...profile,
      demographics: profile.consent.saveDemographics
        ? profile.demographics
        : null,
    }),
  );
  if (!sanitized) throw new Error("The profile contains invalid data.");
  return JSON.stringify(sanitized);
}

/** Explicit future matching input: no name, demographics, resume, or suggestions. */
export function toCareerContext(profile: StudentProfile) {
  return {
    homeLocation: profile.personal.cityState,
    careerInterests: [...profile.careerInterests],
    interestedInternshipIds: [...(profile.interestedInternshipIds ?? [])],
    education: {
      college: profile.education.college,
      major: profile.education.major,
      degreeLevel: profile.education.degreeLevel,
      academicYear: profile.education.academicYear,
      expectedGraduation: profile.education.expectedGraduation,
      gpa: readGpa(profile.education.gpa, profile.education.gpaScale).value,
      gpaScale: readGpa(profile.education.gpa, profile.education.gpaScale)
        .scale,
      enrollmentStatus: profile.education.enrollmentStatus,
    },
    experiences: profile.experiences.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      organization: row.organization,
      description: row.description,
      startMonth: row.startMonth,
      endMonth: row.endMonth,
      ongoing: row.ongoing,
      skillIds: [...(row.skillIds ?? [])],
      accomplishments: row.accomplishments ?? "",
      evidenceUrl: row.evidenceUrl ?? "",
    })),
    skills: {
      canonicalIds: [...profile.skills.canonicalIds],
      additional: [...profile.skills.additional],
    },
    projects: profile.projects.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      description: row.description,
      url: row.url,
      organization: row.organization ?? "",
      startMonth: row.startMonth ?? "",
      endMonth: row.endMonth ?? "",
      skillIds: [...(row.skillIds ?? [])],
      accomplishments: row.accomplishments ?? "",
    })),
    certifications: [...profile.certifications],
    // Students no longer enter preferences, so saved values from older profiles
    // are ignored; matching treats blank preferences as not recorded.
    preferences: emptyProfile().preferences,
  };
}

export interface ProfileStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export function loadLocalProfile(storage: ProfileStorage): {
  profile: StudentProfile;
  message: string;
} {
  try {
    const raw = storage.getItem(PROFILE_STORAGE_KEY);
    const parsed = parseStoredProfile(raw);
    return {
      profile: parsed ?? emptyProfile(),
      message:
        raw && !parsed
          ? "Your saved profile could not be read. Please start setup again or remove the saved data from Profile."
          : "",
    };
  } catch {
    return {
      profile: emptyProfile(),
      message:
        "Browser storage is unavailable. You can use this session, but progress may not survive a refresh.",
    };
  }
}
export function saveLocalProfile(
  storage: ProfileStorage,
  profile: StudentProfile,
) {
  storage.setItem(PROFILE_STORAGE_KEY, serializeProfile(profile));
}
export function deleteLocalProfile(storage: ProfileStorage) {
  storage.removeItem(PROFILE_STORAGE_KEY);
}

export async function inspectResumeFile(file: File): Promise<string | null> {
  if (file.size === 0 || file.size > 5 * 1024 * 1024)
    return "Choose a nonempty PDF or DOCX no larger than 5 MB.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  const expected =
    extension === "pdf"
      ? "application/pdf"
      : extension === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : null;
  if (!expected || (file.type && file.type !== expected))
    return "Choose a PDF or DOCX file.";
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (extension === "pdf") {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
      return "This file does not have a PDF signature. Choose another file.";
  } else {
    const content = new TextDecoder("latin1").decode(bytes);
    if (
      bytes[0] !== 0x50 ||
      bytes[1] !== 0x4b ||
      !content.includes("[Content_Types].xml") ||
      !content.includes("word/document.xml")
    )
      return "This file does not look like a DOCX document. Choose another file.";
  }
  return null;
}

/** Migrate the original “3.0 / 4.0” value without losing returning profiles. */
export function readGpa(gpa: string, scale?: string) {
  const legacy = gpa.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  return legacy
    ? { value: legacy[1], scale: String(Number(legacy[2])) }
    : { value: gpa.trim(), scale: scale === undefined ? "4" : scale };
}
export type CareerContext = ReturnType<typeof toCareerContext>;

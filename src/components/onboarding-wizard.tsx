"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";
import {
  AGE_RANGES,
  ONBOARDING_STEPS,
  ETHNICITIES,
  emptyProfile,
  firstIncompleteStep,
  inspectResumeFile,
  uniqueEntries,
  validateProfileStep,
  type OnboardingStep,
  type ProfileErrors,
  type StudentExperience,
  type StudentProfile,
  type StudentProject,
} from "@/lib/student-profile";
import { SkillPicker } from "./skill-picker";
import { careerFieldLabel, MONTHS } from "@/lib/profile-options";
import { FormField, TagEditor } from "./profile-fields";
import { useStudentProfile } from "./profile-provider";
import { ProfileSummary } from "./profile-summary";

const stageTitles = [
  "Resume",
  "About you",
  "Education",
  "Experience & skills",
];
const stageDescriptions = [
  "Review your resume locally, or continue without one.",
  "Start with your interests and where you are today.",
  "BridgePath is for currently enrolled college students seeking internships.",
  "Experience can come from work, research, activities, or projects. Starting without formal work experience is welcome.",
];

// Demo defaults are separate from resume review: no document extraction is claimed.
// Fill only empty inputs so saved student entries are never replaced.
// Optional demographic answers stay blank: they are consent-gated and never demo-filled.
// The sample student is an entry-level first-year college student.
const SAMPLE_RESUME_URL = "/sample-resume.pdf";
// Values from earlier, more advanced demo versions; replaced when found unchanged.
const LEGACY_DEMO_TITLES = ["Student Software Developer", "IT Help Desk Assistant", "Study Group Finder", "Transit Delay Analysis"];
const LEGACY_DEMO_SKILLS = ["python", "git", "sql", "javascript_typescript", "react", "rest_apis", "databases"];
const LEGACY_DEMO_CERTS = ["AWS Certified Cloud Practitioner", "Google Data Analytics Certificate"];
function withDemoInputs(
  profile: StudentProfile,
  availableSkillIds: string[],
  availableFields: string[],
): StudentProfile {
  const year = new Date().getFullYear();
  // Fall semester starts a new class; graduation is four springs after it begins.
  const startYear = new Date().getMonth() >= 7 ? year : year - 1;
  const pick = (ids: string[]) => ids.filter(id => availableSkillIds.includes(id));
  const sampleSkills = pick(["python", "excel"]);
  const or = <T,>(value: T, fallback: T) => (typeof value === "string" ? value.trim() : value) ? value : fallback;
  const demoExperiences: StudentExperience[] = [{
    id: "bridgepath-demo-v3-experience",
    kind: "work",
    title: "Student Library Assistant",
    organization: "Towson University — Albert S. Cook Library",
    description: "Help students find resources at the front desk, check materials in and out, and keep study spaces organized.",
    startMonth: `${startYear}-09`,
    endMonth: "",
    ongoing: true,
    skillIds: pick(["excel"]),
    accomplishments: "Track daily desk questions in a shared Excel sheet used for weekly staffing.",
  }];
  const demoProjects: StudentProject[] = [{
    id: "bridgepath-demo-v3-project",
    kind: "academic",
    title: "Grade Calculator",
    organization: "Towson University — Intro to Computer Science",
    description: "First Python program for an intro course: reads assignment scores from a file and calculates weighted course grades.",
    url: "",
    startMonth: `${startYear}-10`,
    endMonth: `${startYear}-12`,
    skillIds: pick(["python"]),
    accomplishments: "Added input checks so missing or invalid scores are reported instead of crashing.",
  }];
  const isLegacy = (row: { title: string }) => /\(demo\)|sample university/i.test(JSON.stringify(row)) || LEGACY_DEMO_TITLES.includes(row.title);
  // Older demo entries are refreshed with the current sample; student-added entries are kept.
  const withDemoEntries = <T extends { id: string; title: string }>(saved: T[], demo: T[]): T[] => {
    if (!saved.length) return demo;
    return saved.some(isLegacy) ? [...saved.filter(row => !isLegacy(row)), ...demo] : saved;
  };
  const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(value => b.includes(value));
  const legacySkills = sameSet(profile.skills.canonicalIds, LEGACY_DEMO_SKILLS) && !profile.skills.additional.length;
  const legacyCerts = sameSet(profile.certifications, LEGACY_DEMO_CERTS);
  const legacyEducation = /towson/i.test(profile.education.college) && profile.education.academicYear === "3" && profile.education.gpa === "3.6";
  const savedCollege = /sample university|georgia state/i.test(profile.education.college)
    ? ""
    : profile.education.college;
  const education = legacyEducation
    ? { ...profile.education, academicYear: "" as const, expectedGraduation: "", gpa: "" }
    : profile.education;
  return {
    ...profile,
    personal: {
      preferredName: or(profile.personal.preferredName, "Jordan Lee"),
      cityState: or(profile.personal.cityState, "Towson, MD"),
    },
    careerInterests: profile.careerInterests.length
      ? profile.careerInterests
      : ["software_engineering", "data_science_ai_ml"].filter(field => availableFields.includes(field)),
    education: {
      ...education,
      college: or(savedCollege, "Towson University"),
      major: or(education.major, "Computer Science"),
      degreeLevel: or(education.degreeLevel, "bachelor"),
      academicYear: or(education.academicYear, "1"),
      expectedGraduation: or(education.expectedGraduation, `${startYear + 4}-05`),
      gpa: or(education.gpa, "3.4"),
      gpaScale: or(education.gpaScale ?? "", "4"),
      enrollmentStatus: or(education.enrollmentStatus, "full_time"),
    },
    experiences: withDemoEntries(profile.experiences, demoExperiences),
    skills: {
      ...profile.skills,
      canonicalIds: legacySkills || (!profile.skills.canonicalIds.length && !profile.skills.additional.length)
        ? sampleSkills : profile.skills.canonicalIds,
    },
    projects: withDemoEntries(profile.projects, demoProjects),
    certifications: legacyCerts || !profile.certifications.length
      ? ["Microsoft Office Specialist: Excel Associate"]
      : profile.certifications,
  };
}

export function OnboardingWizard({
  editing = false,
  initialStep,
}: {
  editing?: boolean;
  initialStep?: OnboardingStep;
}) {
  const {
    profile,
    ready,
    canonicalSkills,
    careerFields,
    saveProfile,
    journeyStage,
    setJourneyStage,
  } = useStudentProfile();
  const router = useRouter();
  const initialized = useRef(false);
  const [draft, setDraft] = useState<StudentProfile>(emptyProfile);
  const [step, setStep] = useState<OnboardingStep>(ONBOARDING_STEPS[0]);
  const stepIndex = (ONBOARDING_STEPS as readonly OnboardingStep[]).indexOf(step);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [skillInput, setSkillInput] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const resumeRequest = useRef(0);

  useEffect(() => {
    if (!ready || initialized.current) return;
    initialized.current = true;
    setDraft(withDemoInputs(profile, canonicalSkills.map(skill => skill.skill_id), careerFields));
    // Start with the sample resume attached so the Resume step shows a selected file.
    void loadSampleResume();
    setStep(
      // Edit links may jump straight to a step (e.g. "Add experience" → step 3).
      editing
        ? (initialStep ?? ONBOARDING_STEPS[0])
        : ONBOARDING_STEPS[0],
    );
  }, [ready, profile, editing, initialStep, router, canonicalSkills, journeyStage]);
  useEffect(() => {
    if (!resumeFile || !resumeFile.name.toLowerCase().endsWith(".pdf")) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(resumeFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [resumeFile]);

  function showErrors(next: ProfileErrors) {
    setErrors(next);
    requestAnimationFrame(() => summaryRef.current?.focus());
  }
  function changeStep(next: OnboardingStep, nextProfile = draft) {
    const saved = {
      ...nextProfile,
      demographics: nextProfile.consent.saveDemographics
        ? nextProfile.demographics
        : null,
      onboarding: { step: next, completed: false, completedAt: null },
    };
    if (!saveProfile(saved)) return;
    setDraft(saved);
    setStep(next);
    setErrors({});
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      window.scrollTo(0, 0);
    });
  }
  function addSkill(value: string) {
    const name = value.trim();
    if (!name) return;
    const canonical = canonicalSkills.find(
      (skill) =>
        skill.skill_id.toLowerCase() === name.toLowerCase() ||
        skill.skill_name?.toLowerCase() === name.toLowerCase(),
    );
    setDraft((current) => ({
      ...current,
      skills: canonical
        ? {
            ...current.skills,
            canonicalIds: uniqueEntries([
              ...current.skills.canonicalIds,
              canonical.skill_id,
            ]),
          }
        : {
            ...current.skills,
            additional: uniqueEntries([
              ...current.skills.additional,
              name.slice(0, 160),
            ]),
          },
    }));
    setSkillInput("");
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let next = draft;
    if (step === 3 && skillInput.trim()) {
      const name = skillInput.trim();
      const canonical = canonicalSkills.find(
        (skill) =>
          skill.skill_id.toLowerCase() === name.toLowerCase() ||
          skill.skill_name?.toLowerCase() === name.toLowerCase(),
      );
      next = {
        ...draft,
        skills: canonical
          ? {
              ...draft.skills,
              canonicalIds: uniqueEntries([
                ...draft.skills.canonicalIds,
                canonical.skill_id,
              ]),
            }
          : {
              ...draft.skills,
              additional: uniqueEntries([...draft.skills.additional, name]),
            },
      };
      setDraft(next);
      setSkillInput("");
    }
    const validation = validateProfileStep(next, step);
    if (Object.keys(validation).length) {
      showErrors(validation);
      return;
    }
    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      changeStep(ONBOARDING_STEPS[stepIndex + 1], next);
      return;
    }
    const incomplete = firstIncompleteStep(next);
    if (incomplete) {
      setStep(incomplete);
      showErrors(validateProfileStep(next, incomplete));
      return;
    }
    const completed: StudentProfile = {
      ...next,
      onboarding: {
        step: 3,
        completed: true,
        completedAt: new Date().toISOString(),
      },
    };
    if (saveProfile(completed)) {
      setJourneyStage("discovery");
      router.push("/discover-opportunities");
    }
  }
  function updateEducation<K extends keyof StudentProfile["education"]>(
    key: K,
    value: StudentProfile["education"][K],
  ) {
    setDraft((current) => ({
      ...current,
      education: { ...current.education, [key]: value },
    }));
  }
  function updateExperience(index: number, patch: Partial<StudentExperience>) {
    setDraft((current) => ({
      ...current,
      experiences: current.experiences.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }
  function updateProject(index: number, patch: Partial<StudentProject>) {
    setDraft((current) => ({
      ...current,
      projects: current.projects.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }
  async function selectResume(event: ChangeEvent<HTMLInputElement>) {
    await reviewResume(event.target.files?.[0], event.target);
  }
  async function loadSampleResume() {
    try {
      const response = await fetch(SAMPLE_RESUME_URL);
      if (!response.ok) throw new Error("sample unavailable");
      const blob = await response.blob();
      const input = document.getElementById("resume-file") as HTMLInputElement | null;
      if (input) input.value = "";
      const attached = await reviewResume(
        new File([blob], "Jordan-Lee-Resume.pdf", { type: "application/pdf" }),
      );
      if (attached)
        setDraft((current) => ({
          ...current,
          resume: { ...current.resume, reviewedLocally: true },
        }));
    } catch {
      setResumeError("The sample resume could not be loaded.");
    }
  }
  async function reviewResume(file: File | undefined, input?: HTMLInputElement): Promise<boolean> {
    const request = ++resumeRequest.current;
    setResumeFile(null);
    setResumeError("");
    setDraft((current) => ({
      ...current,
      resume: { ...current.resume, reviewedLocally: false },
    }));
    if (!file) return false;
    setInspecting(true);
    try {
      const error = await inspectResumeFile(file);
      if (request !== resumeRequest.current) return false;
      if (error) {
        setResumeError(error);
        if (input) input.value = "";
        return false;
      }
      setResumeFile(file);
      return true;
    } catch {
      if (request === resumeRequest.current)
        setResumeError(
          "This file could not be read. Choose another file or continue without a resume.",
        );
      return false;
    } finally {
      if (request === resumeRequest.current) setInspecting(false);
    }
  }
  const described = (id: string) => (errors[id] ? `${id}-error` : undefined);
  if (!ready)
    return (
      <p role="status" className="profile-loading">
        Opening your student profile…
      </p>
    );
  return (
    <div className="onboarding-content">
      <nav aria-label="Onboarding progress">
        <ol className="onboarding-progress">
          {stageTitles.map((title, index) => (
            <li
              key={title}
              className={step === ONBOARDING_STEPS[index] ? "current-step" : ""}
            >
              <button
                type="button"
                className="onboarding-section-button"
                aria-current={step === ONBOARDING_STEPS[index] ? "step" : undefined}
                onClick={() => changeStep(ONBOARDING_STEPS[index])}
              >
                <span>{index + 1}</span>
                <span>{title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <header className="page-heading">
        <p className="setup-step">
          Step {stepIndex + 1} of {ONBOARDING_STEPS.length}{editing ? " · Edit your profile" : ""}
        </p>
        <h1 ref={headingRef} tabIndex={-1}>
          {stageTitles[stepIndex]}
        </h1>
        <p>{stageDescriptions[stepIndex]}</p>
      </header>
      <form onSubmit={submit} noValidate>
        {Object.keys(errors).length > 0 && (
          <div
            className="validation-summary"
            role="alert"
            ref={summaryRef}
            tabIndex={-1}
          >
            <h2>Check these entries</h2>
            <ul>
              {Object.entries(errors).map(([key, message]) => (
                <li key={key}>
                  <a href={`#${key}`}>{message}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {step === 1 && (
          <>
            <FormField
              id="preferredName"
              label="Preferred name"
              error={errors.preferredName}
            >
              <input
                id="preferredName"
                autoComplete="given-name"
                value={draft.personal.preferredName}
                maxLength={80}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    personal: {
                      ...draft.personal,
                      preferredName: event.target.value,
                    },
                  })
                }
                aria-invalid={Boolean(errors.preferredName)}
                aria-describedby={described("preferredName")}
              />
            </FormField>
            <FormField
              id="cityState"
              label="City and state / region"
              error={errors.cityState}
            >
              <input
                id="cityState"
                autoComplete="off"
                value={draft.personal.cityState}
                maxLength={160}
                placeholder="e.g. Atlanta, Georgia"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    personal: {
                      ...draft.personal,
                      cityState: event.target.value,
                    },
                  })
                }
                aria-invalid={Boolean(errors.cityState)}
                aria-describedby={described("cityState")}
              />
            </FormField>
            <fieldset
              id="careerInterests"
              className="mode-options"
              aria-describedby={
                errors.careerInterests ? "careerInterests-error" : undefined
              }
            >
              <legend>Career interests</legend>
              <p className="field-hint">
                Choose one or more fields represented in the current internship
                dataset.
              </p>
              {careerFields.map((field) => (
                <label className="checkbox-label" key={field}>
                  <input
                    type="checkbox"
                    checked={draft.careerInterests.includes(field)}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        careerInterests: event.target.checked
                          ? uniqueEntries([...draft.careerInterests, field])
                          : draft.careerInterests.filter(
                              (value) => value !== field,
                            ),
                      })
                    }
                  />
                  {careerFieldLabel(field)}
                </label>
              ))}
              {draft.careerInterests
                .filter((field) => !careerFields.includes(field))
                .map((field) => (
                  <p key={field} className="field-hint">
                    Previous interest: {field} (not a current dataset category).{" "}
                    <button
                      className="plain-button"
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          careerInterests: draft.careerInterests.filter(
                            (value) => value !== field,
                          ),
                        })
                      }
                    >
                      Remove
                    </button>
                  </p>
                ))}
              {errors.careerInterests && (
                <p className="field-error" id="careerInterests-error">
                  {errors.careerInterests}
                </p>
              )}
            </fieldset>
            <details className="disclosure demographic-questions">
              <summary>Optional demographic questions</summary>
              <div className="disclosure-content">
                <p>
                  These answers are optional and excluded from career-context
                  data. Leave them blank or choose “Prefer not to say.”
                </p>
                <FormField
                  id="ageRange"
                  label="Age range (optional)"
                  error={errors.ageRange}
                >
                  <select
                    id="ageRange"
                    value={draft.demographics?.ageRange ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        demographics: {
                          ageRange: event.target.value,
                          raceEthnicity:
                            draft.demographics?.raceEthnicity ?? "",
                        },
                      })
                    }
                  >
                    <option value="">Not shared</option>
                    {AGE_RANGES.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  id="raceEthnicity"
                  label="Race / ethnicity (optional)"
                  error={errors.raceEthnicity}
                >
                  <select
                    id="raceEthnicity"
                    value={draft.demographics?.raceEthnicity ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        demographics: {
                          ageRange: draft.demographics?.ageRange ?? "",
                          raceEthnicity: event.target.value,
                        },
                      })
                    }
                  >
                    <option value="">Not shared</option>
                    {ETHNICITIES.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </FormField>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={draft.consent.saveDemographics}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        consent: { saveDemographics: event.target.checked },
                      })
                    }
                  />
                  I explicitly consent to saving these optional answers on this
                  device.
                </label>
                <p className="field-hint">
                  Without this consent, these answers are discarded when you
                  leave this stage. You can remove saved answers from Profile.
                </p>
                <button
                  type="button"
                  className="plain-button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      demographics: null,
                      consent: { saveDemographics: false },
                    })
                  }
                >
                  Clear optional answers
                </button>
              </div>
            </details>
          </>
        )}
        {step === 5 && (
            <section className="resume-section">
              <h2>Resume (optional)</h2>
              <p className="supporting-text">
                Select a PDF or DOCX up to 5 MB for local review. It is not
                uploaded, parsed, or saved.
              </p>
              <FormField
                id="resume-file"
                label="Choose a resume"
                error={resumeError}
              >
                <input
                  id="resume-file"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={selectResume}
                  aria-invalid={Boolean(resumeError)}
                  aria-describedby={
                    resumeError ? "resume-file-error" : undefined
                  }
                />
              </FormField>
              {!resumeFile && !inspecting && (
                <button type="button" className="plain-button" onClick={loadSampleResume}>
                  Use sample resume
                </button>
              )}
              {inspecting && <p role="status">Checking file format…</p>}
              {resumeFile && (
                <div className="resume-review">
                  <p>
                    <strong>{resumeFile.name}</strong> ·{" "}
                    {Math.ceil(resumeFile.size / 1024)} KB · selected on this
                    device only
                  </p>
                  {previewUrl ? (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link"
                    >
                      Open selected PDF
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <p>
                      DOCX preview is not available here. Review the document in
                      your own editor if needed.
                    </p>
                  )}
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={draft.resume.reviewedLocally}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          resume: {
                            ...draft.resume,
                            reviewedLocally: event.target.checked,
                          },
                        })
                      }
                    />
                    I have reviewed this document
                  </label>
                  <button
                    type="button"
                    className="plain-button"
                    onClick={() => {
                      resumeRequest.current++;
                      setResumeFile(null);
                      setInspecting(false);
                      setDraft({
                        ...draft,
                        resume: { ...draft.resume, reviewedLocally: false },
                      });
                      const input = document.getElementById(
                        "resume-file",
                      ) as HTMLInputElement | null;
                      if (input) input.value = "";
                    }}
                  >
                    Remove selected file
                  </button>
                </div>
              )}
              {!resumeFile && draft.resume.reviewedLocally && (
                <p className="supporting-text">
                  A resume was previously reviewed locally. The document was not
                  retained; select it again if you want to review it.
                </p>
              )}
              <p className="field-hint">
                Automatic resume extraction is a separate milestone. The manual
                profile is fully functional without it.
              </p>
            </section>
        )}
        {step === 2 && (
          <>
            <FormField
              id="college"
              label="College or university"
              error={errors.college}
            >
              <input
                id="college"
                value={draft.education.college}
                maxLength={160}
                onChange={(event) =>
                  updateEducation("college", event.target.value)
                }
                aria-invalid={Boolean(errors.college)}
                aria-describedby={described("college")}
              />
            </FormField>
            <FormField
              id="major"
              label="Major"
              error={errors.major}
              hint="Undeclared or still exploring is welcome."
            >
              <input
                id="major"
                value={draft.education.major}
                maxLength={160}
                onChange={(event) =>
                  updateEducation("major", event.target.value)
                }
                aria-invalid={Boolean(errors.major)}
                aria-describedby={described("major")}
              />
            </FormField>
            <div className="profile-field-grid">
              <FormField
                id="degreeLevel"
                label="Degree level"
                error={errors.degreeLevel}
              >
                <select
                  id="degreeLevel"
                  value={draft.education.degreeLevel}
                  onChange={(event) =>
                    updateEducation(
                      "degreeLevel",
                      event.target
                        .value as StudentProfile["education"]["degreeLevel"],
                    )
                  }
                  aria-invalid={Boolean(errors.degreeLevel)}
                  aria-describedby={described("degreeLevel")}
                >
                  <option value="">Choose your degree</option>
                  <option value="associate">Associate’s</option>
                  <option value="bachelor">Bachelor’s</option>
                  <option value="master">Master’s</option>
                  <option value="doctoral">Doctoral</option>
                </select>
              </FormField>
              <FormField
                id="academicYear"
                label="Current academic year"
                error={errors.academicYear}
              >
                <select
                  id="academicYear"
                  value={draft.education.academicYear}
                  onChange={(event) =>
                    updateEducation(
                      "academicYear",
                      event.target
                        .value as StudentProfile["education"]["academicYear"],
                    )
                  }
                  aria-invalid={Boolean(errors.academicYear)}
                  aria-describedby={described("academicYear")}
                >
                  <option value="">Choose your year</option>
                  {["1", "2", "3", "4", "5+"].map((year) => (
                    <option value={year} key={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <fieldset id="expectedGraduation" className="mode-options">
              <legend>Expected graduation</legend>
              <div className="profile-field-grid">
                <FormField id="graduation-month" label="Graduation month">
                  <select
                    id="graduation-month"
                    value={
                      draft.education.expectedGraduation.split("-")[1] || ""
                    }
                    onChange={(event) =>
                      updateEducation(
                        "expectedGraduation",
                        `${draft.education.expectedGraduation.split("-")[0] || ""}-${event.target.value}`,
                      )
                    }
                    aria-invalid={Boolean(errors.expectedGraduation)}
                    aria-describedby={
                      errors.expectedGraduation
                        ? "expectedGraduation-error"
                        : undefined
                    }
                  >
                    <option value="">Choose a month</option>
                    {MONTHS.map((month, index) => (
                      <option
                        key={month}
                        value={String(index + 1).padStart(2, "0")}
                      >
                        {month}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField id="graduation-year" label="Graduation year">
                  <select
                    id="graduation-year"
                    value={
                      draft.education.expectedGraduation.split("-")[0] || ""
                    }
                    onChange={(event) =>
                      updateEducation(
                        "expectedGraduation",
                        `${event.target.value}-${draft.education.expectedGraduation.split("-")[1] || ""}`,
                      )
                    }
                    aria-invalid={Boolean(errors.expectedGraduation)}
                    aria-describedby={
                      errors.expectedGraduation
                        ? "expectedGraduation-error"
                        : undefined
                    }
                  >
                    <option value="">Choose a year</option>
                    {[
                      ...new Set(
                        [
                          ...Array.from({ length: 13 }, (_, index) =>
                            String(new Date().getFullYear() + index),
                          ),
                          draft.education.expectedGraduation.split("-")[0],
                        ].filter(Boolean),
                      ),
                    ]
                      .sort()
                      .map((year) => (
                        <option key={year}>{year}</option>
                      ))}
                  </select>
                </FormField>
              </div>
              {errors.expectedGraduation && (
                <p className="field-error" id="expectedGraduation-error">
                  {errors.expectedGraduation}
                </p>
              )}
            </fieldset>
            <div className="profile-field-grid">
              <FormField id="gpa" label="GPA (optional)" error={errors.gpa}>
                <input
                  id="gpa"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.education.gpa}
                  onChange={(event) =>
                    updateEducation("gpa", event.target.value)
                  }
                  aria-invalid={Boolean(errors.gpa)}
                  aria-describedby={described("gpa")}
                />
              </FormField>
              <FormField id="gpa-scale" label="GPA scale">
                <select
                  id="gpa-scale"
                  value={
                    ["4", "5", "10"].includes(draft.education.gpaScale ?? "4")
                      ? (draft.education.gpaScale ?? "4")
                      : "other"
                  }
                  onChange={(event) =>
                    updateEducation(
                      "gpaScale",
                      event.target.value === "other" ? "" : event.target.value,
                    )
                  }
                >
                  <option value="4">4.0</option>
                  <option value="5">5.0</option>
                  <option value="10">10.0</option>
                  <option value="other">Other</option>
                </select>
              </FormField>
            </div>
            {!["4", "5", "10"].includes(draft.education.gpaScale ?? "4") && (
              <FormField id="gpa-custom-scale" label="Your GPA scale">
                <input
                  id="gpa-custom-scale"
                  type="number"
                  min="0.1"
                  step="any"
                  value={draft.education.gpaScale ?? ""}
                  onChange={(event) =>
                    updateEducation("gpaScale", event.target.value)
                  }
                />
              </FormField>
            )}
            <FormField
              id="enrollmentStatus"
              label="Current enrollment"
              error={errors.enrollmentStatus}
            >
              <select
                id="enrollmentStatus"
                value={draft.education.enrollmentStatus}
                onChange={(event) =>
                  updateEducation(
                    "enrollmentStatus",
                    event.target
                      .value as StudentProfile["education"]["enrollmentStatus"],
                  )
                }
                aria-invalid={Boolean(errors.enrollmentStatus)}
                aria-describedby={described("enrollmentStatus")}
              >
                <option value="">Choose your enrollment status</option>
                <option value="full_time">Currently enrolled full-time</option>
                <option value="part_time">Currently enrolled part-time</option>
                <option value="not_enrolled">
                  Not currently enrolled in college
                </option>
              </select>
            </FormField>
          </>
        )}
        {step === 3 && (
          <>
            <section className="repeatable-section">
              <h2>Experience (optional)</h2>
              <p className="supporting-text">
                Include internships, paid work, research, or extracurricular
                activities. You can continue with no entries.
              </p>
              {draft.experiences.map((experience, index) => (
                <fieldset key={experience.id} className="repeatable-entry">
                  <legend>Experience {index + 1}</legend>
                  <FormField
                    id={`experience-${index}-kind`}
                    label="Experience type"
                  >
                    <select
                      id={`experience-${index}-kind`}
                      value={experience.kind}
                      onChange={(event) =>
                        updateExperience(index, {
                          kind: event.target.value as StudentExperience["kind"],
                        })
                      }
                    >
                      <option value="internship">Previous internship</option>
                      <option value="work">Part-time or full-time work</option>
                      <option value="research">Research experience</option>
                      <option value="extracurricular">
                        Extracurricular activity
                      </option>
                    </select>
                  </FormField>
                  <FormField
                    id={`experience-${index}-title`}
                    label="Role or activity title"
                    error={errors[`experience-${index}-title`]}
                  >
                    <input
                      id={`experience-${index}-title`}
                      value={experience.title}
                      maxLength={160}
                      onChange={(event) =>
                        updateExperience(index, { title: event.target.value })
                      }
                      aria-invalid={Boolean(
                        errors[`experience-${index}-title`],
                      )}
                      aria-describedby={described(`experience-${index}-title`)}
                    />
                  </FormField>
                  <FormField
                    id={`experience-${index}-organization`}
                    label="Organization (optional)"
                  >
                    <input
                      id={`experience-${index}-organization`}
                      value={experience.organization}
                      maxLength={160}
                      onChange={(event) =>
                        updateExperience(index, {
                          organization: event.target.value,
                        })
                      }
                    />
                  </FormField>
                  <div className="profile-field-grid">
                    <FormField
                      id={`experience-${index}-start`}
                      label="Start month (optional)"
                      error={errors[`experience-${index}-start`]}
                    >
                      <input
                        type="month"
                        id={`experience-${index}-start`}
                        value={experience.startMonth}
                        onChange={(event) =>
                          updateExperience(index, {
                            startMonth: event.target.value,
                          })
                        }
                        aria-invalid={Boolean(
                          errors[`experience-${index}-start`],
                        )}
                        aria-describedby={described(
                          `experience-${index}-start`,
                        )}
                      />
                    </FormField>
                    <FormField
                      id={`experience-${index}-end`}
                      label="End month (optional)"
                      error={errors[`experience-${index}-end`]}
                    >
                      <input
                        type="month"
                        id={`experience-${index}-end`}
                        value={experience.endMonth}
                        disabled={experience.ongoing}
                        onChange={(event) =>
                          updateExperience(index, {
                            endMonth: event.target.value,
                          })
                        }
                        aria-invalid={Boolean(
                          errors[`experience-${index}-end`],
                        )}
                        aria-describedby={described(`experience-${index}-end`)}
                      />
                    </FormField>
                  </div>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={experience.ongoing}
                      onChange={(event) =>
                        updateExperience(index, {
                          ongoing: event.target.checked,
                          endMonth: event.target.checked
                            ? ""
                            : experience.endMonth,
                        })
                      }
                    />
                    I’m currently doing this
                  </label>
                  <details className="disclosure">
                    <summary>Skills used in this experience</summary>
                    <SkillPicker
                      id={`experience-${index}-skills`}
                      skills={canonicalSkills}
                      selected={experience.skillIds ?? []}
                      onChange={(skillIds) =>
                        updateExperience(index, { skillIds })
                      }
                    />
                  </details>
                  <FormField
                    id={`experience-${index}-accomplishments`}
                    label="Accomplishments (optional)"
                  >
                    <textarea
                      id={`experience-${index}-accomplishments`}
                      value={experience.accomplishments ?? ""}
                      maxLength={2000}
                      rows={3}
                      onChange={(event) =>
                        updateExperience(index, {
                          accomplishments: event.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField
                    id={`experience-${index}-description`}
                    label="What did you do? (optional)"
                  >
                    <textarea
                      id={`experience-${index}-description`}
                      value={experience.description}
                      maxLength={2000}
                      rows={3}
                      onChange={(event) =>
                        updateExperience(index, {
                          description: event.target.value,
                        })
                      }
                    />
                  </FormField>
                  <button
                    type="button"
                    className="plain-button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        experiences: draft.experiences.filter(
                          (entry) => entry.id !== experience.id,
                        ),
                      })
                    }
                  >
                    Remove experience {index + 1}
                  </button>
                </fieldset>
              ))}
              <button
                type="button"
                className="text-button"
                disabled={draft.experiences.length >= 50}
                onClick={() =>
                  setDraft({
                    ...draft,
                    experiences: [
                      ...draft.experiences,
                      {
                        id: crypto.randomUUID(),
                        kind: "work",
                        title: "",
                        organization: "",
                        description: "",
                        startMonth: "",
                        endMonth: "",
                        ongoing: false,
                      },
                    ],
                  })
                }
              >
                <Plus size={18} />
                Add experience
              </button>
            </section>
            <section className="repeatable-section">
              <h2>Technical &amp; professional skills</h2>
              <SkillPicker
                id="canonical-skill"
                skills={canonicalSkills}
                selected={draft.skills.canonicalIds}
                showSelected={false}
                onChange={(canonicalIds) =>
                  setDraft({
                    ...draft,
                    skills: { ...draft.skills, canonicalIds },
                  })
                }
              />
              <FormField
                id="additional-skill"
                label="Other student-entered skill (optional)"
                hint="Include skills from class, hobbies, volunteering, or life experience."
              >
                <div className="entry-input">
                  <input
                    id="additional-skill"
                    value={skillInput}
                    maxLength={160}
                    onChange={(event) => setSkillInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addSkill(skillInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="text-button"
                    disabled={!skillInput.trim()}
                    onClick={() => addSkill(skillInput)}
                  >
                    Add skill
                  </button>
                </div>
              </FormField>
              <ul className="profile-tags" aria-label="Selected skills">
                {draft.skills.canonicalIds.map((id) => (
                  <li key={id}>
                    {canonicalSkills.find((skill) => skill.skill_id === id)
                      ?.skill_name || id}
                    <button
                      type="button"
                      aria-label={`Remove ${canonicalSkills.find((skill) => skill.skill_id === id)?.skill_name || id}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          skills: {
                            ...draft.skills,
                            canonicalIds: draft.skills.canonicalIds.filter(
                              (value) => value !== id,
                            ),
                          },
                        })
                      }
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
                {draft.skills.additional.map((skill) => (
                  <li key={skill}>
                    {skill} (custom)
                    <button
                      type="button"
                      aria-label={`Remove ${skill}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          skills: {
                            ...draft.skills,
                            additional: draft.skills.additional.filter(
                              (value) => value !== skill,
                            ),
                          },
                        })
                      }
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <section className="repeatable-section">
              <h2>Personal &amp; academic projects (optional)</h2>
              {draft.projects.map((project, index) => (
                <fieldset className="repeatable-entry" key={project.id}>
                  <legend>Project {index + 1}</legend>
                  <FormField id={`project-${index}-kind`} label="Project type">
                    <select
                      id={`project-${index}-kind`}
                      value={project.kind}
                      onChange={(event) =>
                        updateProject(index, {
                          kind: event.target.value as StudentProject["kind"],
                        })
                      }
                    >
                      <option value="personal">Personal project</option>
                      <option value="academic">Academic project</option>
                    </select>
                  </FormField>
                  <FormField
                    id={`project-${index}-title`}
                    label="Project title"
                    error={errors[`project-${index}-title`]}
                  >
                    <input
                      id={`project-${index}-title`}
                      value={project.title}
                      maxLength={160}
                      onChange={(event) =>
                        updateProject(index, { title: event.target.value })
                      }
                      aria-invalid={Boolean(errors[`project-${index}-title`])}
                      aria-describedby={described(`project-${index}-title`)}
                    />
                  </FormField>
                  <FormField
                    id={`project-${index}-organization`}
                    label="Organization or course (optional)"
                  >
                    <input
                      id={`project-${index}-organization`}
                      value={project.organization ?? ""}
                      maxLength={160}
                      onChange={(event) =>
                        updateProject(index, {
                          organization: event.target.value,
                        })
                      }
                    />
                  </FormField>
                  <div className="profile-field-grid">
                    <FormField
                      id={`project-${index}-start`}
                      label="Start month (optional)"
                      error={errors[`project-${index}-start`]}
                    >
                      <input
                        id={`project-${index}-start`}
                        type="month"
                        value={project.startMonth ?? ""}
                        onChange={(event) =>
                          updateProject(index, {
                            startMonth: event.target.value,
                          })
                        }
                      />
                    </FormField>
                    <FormField
                      id={`project-${index}-end`}
                      label="End month (optional)"
                      error={errors[`project-${index}-end`]}
                    >
                      <input
                        id={`project-${index}-end`}
                        type="month"
                        value={project.endMonth ?? ""}
                        onChange={(event) =>
                          updateProject(index, { endMonth: event.target.value })
                        }
                      />
                    </FormField>
                  </div>
                  <details className="disclosure">
                    <summary>Skills used in this project</summary>
                    <SkillPicker
                      id={`project-${index}-skills`}
                      skills={canonicalSkills}
                      selected={project.skillIds ?? []}
                      onChange={(skillIds) =>
                        updateProject(index, { skillIds })
                      }
                    />
                  </details>
                  <FormField
                    id={`project-${index}-accomplishments`}
                    label="Accomplishments (optional)"
                  >
                    <textarea
                      id={`project-${index}-accomplishments`}
                      value={project.accomplishments ?? ""}
                      maxLength={2000}
                      rows={3}
                      onChange={(event) =>
                        updateProject(index, {
                          accomplishments: event.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField
                    id={`project-${index}-description`}
                    label="What did you make? (optional)"
                  >
                    <textarea
                      id={`project-${index}-description`}
                      rows={3}
                      maxLength={2000}
                      value={project.description}
                      onChange={(event) =>
                        updateProject(index, {
                          description: event.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField
                    id={`project-${index}-url`}
                    label="Repository or project URL (optional)"
                    error={errors[`project-${index}-url`]}
                  >
                    <input
                      id={`project-${index}-url`}
                      type="url"
                      value={project.url}
                      maxLength={1000}
                      placeholder="https://"
                      onChange={(event) =>
                        updateProject(index, { url: event.target.value })
                      }
                      aria-invalid={Boolean(errors[`project-${index}-url`])}
                      aria-describedby={described(`project-${index}-url`)}
                    />
                  </FormField>
                  <button
                    type="button"
                    className="plain-button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        projects: draft.projects.filter(
                          (entry) => entry.id !== project.id,
                        ),
                      })
                    }
                  >
                    Remove project {index + 1}
                  </button>
                </fieldset>
              ))}
              <button
                type="button"
                className="text-button"
                disabled={draft.projects.length >= 50}
                onClick={() =>
                  setDraft({
                    ...draft,
                    projects: [
                      ...draft.projects,
                      {
                        id: crypto.randomUUID(),
                        kind: "personal",
                        title: "",
                        description: "",
                        url: "",
                      },
                    ],
                  })
                }
              >
                <Plus size={18} />
                Add project
              </button>
            </section>
            <TagEditor
              id="certifications"
              label="Certifications (optional)"
              values={draft.certifications}
              onChange={(certifications) =>
                setDraft({ ...draft, certifications })
              }
            />
            <details className="disclosure">
              <summary>Review your profile before finishing</summary>
              <div className="disclosure-content">
                <p className="supporting-text">
                  Everything below is student-entered. Use Back to correct an
                  earlier stage.
                </p>
                <ProfileSummary profile={draft} />
              </div>
            </details>
          </>
        )}
        <div className="onboarding-actions">
          {stepIndex > 0 ? (
            <button
              type="button"
              className="plain-button"
              onClick={() => changeStep(ONBOARDING_STEPS[stepIndex - 1])}
            >
              <ArrowLeft size={18} />
              Back
            </button>
          ) : editing ? (
            <Link href="/profile" className="back-link">
              Back to Profile
            </Link>
          ) : (
            <span />
          )}
          <button type="submit" className="button" disabled={inspecting}>
            {stepIndex === ONBOARDING_STEPS.length - 1
              ? editing
                ? "Save and discover internships"
                : "Discover internships"
              : "Continue"}
            <ArrowRight size={18} />
          </button>
        </div>
      </form>
      <p className="local-storage-note">
        Your profile saves on this browser when you use Back or Continue. This
        is local-device storage, not a secure cloud account. Avoid sensitive
        details on a shared device.{" "}
        <Link href="/profile">Review or delete local data</Link>.
      </p>
    </div>
  );
}

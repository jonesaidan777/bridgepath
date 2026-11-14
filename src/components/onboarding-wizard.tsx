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
  "Preferences",
];
const stageDescriptions = [
  "Review your resume locally, or continue without one.",
  "Start with your interests and where you are today.",
  "BridgePath is for currently enrolled college students seeking internships.",
  "Experience can come from work, research, activities, or projects. Starting without formal work experience is welcome.",
  "Choose the internships you want to explore.",
];

// Demo defaults are separate from resume review: no document extraction is claimed.
// Fill only empty inputs so saved student entries are never replaced.
function withDemoInputs(profile: StudentProfile, availableSkillIds: string[]): StudentProfile {
  const year = new Date().getFullYear();
  const sampleSkills = ["python", "git", "sql"].filter(id => availableSkillIds.includes(id));
  return {
    ...profile,
    experiences: profile.experiences.length ? profile.experiences : [{
      id: "bridgepath-demo-experience",
      kind: "research",
      title: "Student Software Developer (demo)",
      organization: "Sample University — computing lab (demo)",
      description: "Built a Python tool to clean sample records, query a small SQL database, and summarize findings for a class research team.",
      startMonth: `${year - 1}-09`,
      endMonth: `${year}-05`,
      ongoing: false,
      skillIds: sampleSkills,
      accomplishments: "Added input validation, wrote repeatable checks, and documented the workflow in a README. Sample experience for the demo only.",
      evidenceUrl: "",
    }],
    skills: {
      ...profile.skills,
      canonicalIds: profile.skills.canonicalIds.length || profile.skills.additional.length
        ? profile.skills.canonicalIds : sampleSkills,
    },
    preferences: {
      targetRoles: profile.preferences.targetRoles.length ? profile.preferences.targetRoles : ["Software Engineering Intern"],
      locations: profile.preferences.locations.length ? profile.preferences.locations : ["Washington, DC"],
      workModes: profile.preferences.workModes.length ? profile.preferences.workModes : ["remote", "hybrid"],
      willingToRelocate: profile.preferences.willingToRelocate || "yes",
      season: profile.preferences.season || "summer",
      year: profile.preferences.year || String(year + 1),
    },
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
    internshipOptions,
    saveProfile,
    journeyStage,
    setJourneyStage,
  } = useStudentProfile();
  const router = useRouter();
  const initialized = useRef(false);
  const [draft, setDraft] = useState<StudentProfile>(emptyProfile);
  const [step, setStep] = useState<OnboardingStep>(ONBOARDING_STEPS[0]);
  const stepIndex = ONBOARDING_STEPS.indexOf(step);
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
    setDraft(withDemoInputs(profile, canonicalSkills.map(skill => skill.skill_id)));
    setStep(
      journeyStage === "complete" && editing
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
        step: 4,
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
  function updatePreferences<K extends keyof StudentProfile["preferences"]>(
    key: K,
    value: StudentProfile["preferences"][K],
  ) {
    setDraft((current) => ({
      ...current,
      preferences: { ...current.preferences, [key]: value },
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
    const file = event.target.files?.[0];
    const request = ++resumeRequest.current;
    setResumeFile(null);
    setResumeError("");
    setDraft((current) => ({
      ...current,
      resume: { ...current.resume, reviewedLocally: false },
    }));
    if (!file) return;
    setInspecting(true);
    try {
      const error = await inspectResumeFile(file);
      if (request !== resumeRequest.current) return;
      if (error) {
        setResumeError(error);
        event.target.value = "";
      } else setResumeFile(file);
    } catch {
      if (request === resumeRequest.current)
        setResumeError(
          "This file could not be read. Choose another file or continue without a resume.",
        );
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
      {(step === 3 || step === 4) && (
        <p className="profile-inline-notice" role="note">
          Demo setup: empty experience, skill, and preference inputs start with editable
          sample values. These values are not extracted from your resume. Existing saved
          entries are preserved.
        </p>
      )}
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
                uploaded, parsed, or saved. No profile fields have been
                extracted.
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
                    id={`experience-${index}-evidenceUrl`}
                    label="Evidence URL (optional)"
                    error={errors[`experience-${index}-evidenceUrl`]}
                  >
                    <input
                      id={`experience-${index}-evidenceUrl`}
                      type="url"
                      value={experience.evidenceUrl ?? ""}
                      maxLength={1000}
                      onChange={(event) =>
                        updateExperience(index, {
                          evidenceUrl: event.target.value,
                        })
                      }
                      aria-invalid={Boolean(
                        errors[`experience-${index}-evidenceUrl`],
                      )}
                      aria-describedby={described(
                        `experience-${index}-evidenceUrl`,
                      )}
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
          </>
        )}
        {step === 4 && (
          <>

            <FormField
              id="role-from-dataset"
              label="Choose an internship role from the dataset (optional)"
            >
              <select
                id="role-from-dataset"
                value=""
                onChange={(event) =>
                  updatePreferences(
                    "targetRoles",
                    uniqueEntries([
                      ...draft.preferences.targetRoles,
                      event.target.value,
                    ]),
                  )
                }
              >
                <option value="">Choose a role to add</option>
                {internshipOptions
                  .filter((option) =>
                    draft.careerInterests.includes(option.field),
                  )
                  .map((option) => (
                    <option
                      value={option.title}
                      key={`${option.field}-${option.title}`}
                    >
                      {option.title}
                    </option>
                  ))}
              </select>
            </FormField>
            <TagEditor
              id="targetRoles"
              label="Target internship roles"
              values={draft.preferences.targetRoles}
              onChange={(targetRoles) =>
                updatePreferences("targetRoles", targetRoles)
              }
              error={errors.targetRoles}
              hint="Enter internship roles you’re interested in, or “Still exploring.”"
            />
            <FormField
              id="location-from-dataset"
              label="Preferred location from this dataset (optional)"
            >
              <select
                id="location-from-dataset"
                value=""
                onChange={(event) =>
                  updatePreferences(
                    "locations",
                    uniqueEntries([
                      ...draft.preferences.locations,
                      event.target.value,
                    ]),
                  )
                }
              >
                <option value="">Choose a location to add</option>
                {[
                  ...new Set(
                    internshipOptions
                      .flatMap((option) =>
                        option.location.split(";").map((value) => value.trim()),
                      )
                      .filter(Boolean),
                  ),
                ]
                  .sort()
                  .map((location) => (
                    <option key={location}>{location}</option>
                  ))}
              </select>
            </FormField>
            <TagEditor
              id="preferredLocations"
              label="Preferred locations (optional)"
              values={draft.preferences.locations}
              onChange={(locations) =>
                updatePreferences("locations", locations)
              }
              hint="Add cities or regions. Leave blank if flexible."
            />
            <fieldset
              className="mode-options"
              id="workModes"
              aria-describedby={
                errors.workModes ? "workModes-error" : undefined
              }
            >
              <legend>Working arrangements</legend>
              {(
                [
                  ["remote", "Remote"],
                  ["hybrid", "Hybrid"],
                  ["on_site", "On-site"],
                ] as const
              ).map(([mode, label]) => (
                <label key={mode} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={draft.preferences.workModes.includes(mode)}
                    onChange={(event) =>
                      updatePreferences(
                        "workModes",
                        event.target.checked
                          ? [...draft.preferences.workModes, mode]
                          : draft.preferences.workModes.filter(
                              (value) => value !== mode,
                            ),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
              {errors.workModes && (
                <p id="workModes-error" className="field-error">
                  {errors.workModes}
                </p>
              )}
            </fieldset>
            <FormField
              id="willingToRelocate"
              label="Would you relocate for an internship?"
              error={errors.willingToRelocate}
            >
              <select
                id="willingToRelocate"
                value={draft.preferences.willingToRelocate}
                onChange={(event) =>
                  updatePreferences(
                    "willingToRelocate",
                    event.target
                      .value as StudentProfile["preferences"]["willingToRelocate"],
                  )
                }
                aria-invalid={Boolean(errors.willingToRelocate)}
                aria-describedby={described("willingToRelocate")}
              >
                <option value="">Choose a preference</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unsure">Not sure yet</option>
              </select>
            </FormField>
            <div className="profile-field-grid">
              <FormField
                id="season"
                label="Preferred internship season"
                error={errors.season}
              >
                <select
                  id="season"
                  value={draft.preferences.season}
                  onChange={(event) =>
                    updatePreferences(
                      "season",
                      event.target
                        .value as StudentProfile["preferences"]["season"],
                    )
                  }
                  aria-invalid={Boolean(errors.season)}
                  aria-describedby={described("season")}
                >
                  <option value="">Choose a season</option>
                  <option value="spring">Spring</option>
                  <option value="summer">Summer</option>
                  <option value="fall">Fall</option>
                  <option value="winter">Winter</option>
                  <option value="any">Any season</option>
                </select>
              </FormField>
              <FormField id="year" label="Internship year" error={errors.year}>
                <input
                  id="year"
                  type="number"
                  inputMode="numeric"
                  value={draft.preferences.year}
                  onChange={(event) =>
                    updatePreferences("year", event.target.value)
                  }
                  aria-invalid={Boolean(errors.year)}
                  aria-describedby={described("year")}
                />
              </FormField>
            </div>
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
            {step === 4
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

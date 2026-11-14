const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { createRequire } = require("node:module");
const filename = path.resolve("src/lib/student-profile.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
    target: ts.ScriptTarget.ES2017,
  },
}).outputText;
const mod = { exports: {} };
new Function("require", "module", "exports", compiled)(
  createRequire(filename),
  mod,
  mod.exports,
);
const api = mod.exports;
const futureYear = String(new Date().getFullYear() + 2);
function completeStudent() {
  const p = api.emptyProfile();
  p.personal = { preferredName: "Test Student", cityState: "Atlanta, Georgia" };
  p.careerInterests = ["Cybersecurity", "Still exploring"];
  p.education = {
    college: "Example College",
    major: "Computer science",
    degreeLevel: "bachelor",
    academicYear: "2",
    expectedGraduation: futureYear + "-05",
    gpa: "",
    enrollmentStatus: "full_time",
  };
  p.preferences = {
    targetRoles: ["Security intern"],
    locations: [],
    workModes: ["remote"],
    willingToRelocate: "unsure",
    season: "summer",
    year: futureYear,
  };
  p.onboarding = {
    step: 4,
    completed: true,
    completedAt: new Date().toISOString(),
  };
  return p;
}
function memoryStorage() {
  const entries = new Map();
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  };
}

test("a new student starts at the resume stage without demographics or completion", () => {
  const profile = api.emptyProfile();
  assert.equal(profile.onboarding.step, 5);
  assert.equal(profile.onboarding.completed, false);
  assert.equal(profile.demographics, null);
  assert.equal(profile.consent.saveDemographics, false);
  assert.equal(api.firstIncompleteStep(profile), 1);
});
test("all five stages can complete without employment, skills, projects, GPA, or a resume", () => {
  const profile = completeStudent();
  for (const step of api.ONBOARDING_STEPS)
    assert.deepEqual(api.validateProfileStep(profile, step), {});
  assert.equal(api.firstIncompleteStep(profile), null);
  assert.ok(
    api.parseStoredProfile(api.serializeProfile(profile)).onboarding.completed,
  );
});
test("current enrollment is required and no high-school or graduate-job-seeker degree is accepted", () => {
  for (const enrollment of ["not_enrolled", ""]) {
    const profile = completeStudent();
    profile.education.enrollmentStatus = enrollment;
    assert.ok(api.validateProfileStep(profile, 2).enrollmentStatus);
    assert.equal(api.firstIncompleteStep(profile), 2);
    assert.equal(api.parseStoredProfile(JSON.stringify(profile)), null);
  }
  for (const degree of ["high_school", "graduate_seeking_work"]) {
    const profile = completeStudent();
    profile.education.degreeLevel = degree;
    assert.ok(api.validateProfileStep(profile, 2).degreeLevel);
    assert.equal(api.parseStoredProfile(JSON.stringify(profile)), null);
  }
});
test("college students are not excluded because of age or optional race answers", () => {
  const profile = completeStudent();
  profile.consent.saveDemographics = true;
  for (const ageRange of ["Under 18", "40 or older", "Prefer not to say"]) {
    profile.demographics = { ageRange, raceEthnicity: "Prefer not to say" };
    assert.equal(api.firstIncompleteStep(profile), null);
  }
});
test("required fields, graduation dates, internship dates, and GPA scale validate", () => {
  const profile = completeStudent();
  profile.personal.preferredName = "  ";
  profile.careerInterests = [];
  assert.ok(api.validateProfileStep(profile, 1).preferredName);
  assert.ok(api.validateProfileStep(profile, 1).careerInterests);
  profile.education.expectedGraduation = "2000-01";
  assert.ok(api.validateProfileStep(profile, 2).expectedGraduation);
  profile.education.gpa = "11/10";
  assert.ok(api.validateProfileStep(profile, 2).gpa);
  profile.education.gpa = "8.2 / 10";
  assert.equal(api.validateProfileStep(profile, 2).gpa, undefined);
});
test("repeatable experiences and projects preserve records and validate entry errors", () => {
  const profile = completeStudent();
  profile.experiences = [
    {
      id: "exp1",
      kind: "work",
      title: "Tutor",
      organization: "",
      description: "",
      startMonth: "2025-04",
      endMonth: "2025-06",
      ongoing: false,
    },
    {
      id: "exp2",
      kind: "extracurricular",
      title: "Club volunteer",
      organization: "Student club",
      description: "Helped organize events",
      startMonth: "",
      endMonth: "",
      ongoing: true,
    },
  ];
  profile.projects = [
    {
      id: "p1",
      kind: "personal",
      title: "Personal lab",
      description: "",
      url: "https://example.org/lab",
    },
    {
      id: "p2",
      kind: "academic",
      title: "Class project",
      description: "A class project",
      url: "",
    },
  ];
  const restored = api.parseStoredProfile(api.serializeProfile(profile));
  assert.deepEqual(restored.experiences, profile.experiences);
  assert.deepEqual(restored.projects, profile.projects);
  profile.experiences[0].endMonth = "2025-01";
  profile.projects[0].url = "javascript:alert(1)";
  const errors = api.validateProfileStep(profile, 3);
  assert.ok(errors["experience-0-end"]);
  assert.ok(errors["project-0-url"]);
  profile.projects[1].title = "";
  assert.ok(api.validateProfileStep(profile, 3)["project-1-title"]);
});
test("partial progress restores the saved stage after a refresh", () => {
  const storage = memoryStorage();
  const draft = completeStudent();
  draft.onboarding = { step: 3, completed: false, completedAt: null };
  draft.preferences.targetRoles = [];
  api.saveLocalProfile(storage, draft);
  const loaded = api.loadLocalProfile(storage);
  assert.equal(loaded.profile.onboarding.step, 3);
  assert.equal(loaded.profile.onboarding.completed, false);
  assert.equal(loaded.profile.education.college, "Example College");
  assert.deepEqual(loaded.profile.preferences.targetRoles, []);
  assert.equal(loaded.message, "");
});
test("a returning completed student stays completed and can save edits", () => {
  const storage = memoryStorage();
  const profile = completeStudent();
  api.saveLocalProfile(storage, profile);
  const loaded = api.loadLocalProfile(storage).profile;
  assert.equal(loaded.onboarding.completed, true);
  loaded.personal.preferredName = "Updated Name";
  api.saveLocalProfile(storage, loaded);
  assert.equal(
    api.loadLocalProfile(storage).profile.personal.preferredName,
    "Updated Name",
  );
});
test("demographics are discarded without explicit consent", () => {
  const profile = completeStudent();
  profile.demographics = { ageRange: "21–24", raceEthnicity: "Multiracial" };
  const stored = api.serializeProfile(profile);
  assert.equal(JSON.parse(stored).demographics, null);
  assert.ok(!stored.includes("Multiracial"));
});
test("consented demographics can be saved and removed without changing career context", () => {
  const profile = completeStudent();
  const original = api.toCareerContext(profile);
  profile.consent.saveDemographics = true;
  profile.demographics = { ageRange: "21–24", raceEthnicity: "Multiracial" };
  const restored = api.parseStoredProfile(api.serializeProfile(profile));
  assert.equal(restored.demographics.raceEthnicity, "Multiracial");
  assert.deepEqual(api.toCareerContext(restored), original);
  restored.consent.saveDemographics = false;
  assert.equal(
    api.parseStoredProfile(api.serializeProfile(restored)).demographics,
    null,
  );
  const context = api.toCareerContext(profile);
  for (const key of [
    "personal",
    "demographics",
    "consent",
    "resume",
    "onboarding",
  ])
    assert.ok(!(key in context));
});
test("unknown stored fields and raw resume data are never restored", () => {
  const profile = completeStudent();
  profile.rawResume = { filename: "secret.pdf", contents: "private document" };
  profile.personal.birthDate = "2000-01-01";
  profile.resume.documentText = "private text";
  const stored = JSON.parse(api.serializeProfile(profile));
  assert.ok(!("rawResume" in stored));
  assert.ok(!("birthDate" in stored.personal));
  assert.ok(!("documentText" in stored.resume));
});
test("malformed JSON, versions, field types, duplicate IDs, and invented extraction are rejected", () => {
  for (const raw of ["not json", "null", "[]", '{"version":99}'])
    assert.equal(api.parseStoredProfile(raw), null);
  const invalid = completeStudent();
  invalid.skills.canonicalIds = "python";
  assert.equal(api.parseStoredProfile(JSON.stringify(invalid)), null);
  const duplicates = completeStudent();
  const project = {
    id: "same",
    kind: "personal",
    title: "Lab",
    description: "",
    url: "",
  };
  duplicates.projects = [project, project];
  assert.equal(api.parseStoredProfile(JSON.stringify(duplicates)), null);
  const fakeExtraction = completeStudent();
  fakeExtraction.resume.suggestions = [
    {
      field: "skill",
      value: "Python",
      source: "resume_extraction",
      confirmed: false,
    },
  ];
  assert.equal(api.parseStoredProfile(JSON.stringify(fakeExtraction)), null);
});
test("corrupted storage falls back safely and storage failures remain visible to callers", () => {
  const storage = memoryStorage();
  storage.setItem(api.PROFILE_STORAGE_KEY, "{broken");
  const loaded = api.loadLocalProfile(storage);
  assert.equal(loaded.profile.onboarding.completed, false);
  assert.ok(loaded.message);
  const failing = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  assert.ok(api.loadLocalProfile(failing).message);
  assert.throws(
    () => api.saveLocalProfile(failing, completeStudent()),
    /quota/,
  );
  assert.throws(() => api.deleteLocalProfile(failing), /blocked/);
});
test("deletion removes only BridgePath profile data", () => {
  const storage = memoryStorage();
  storage.setItem("unrelated", "keep");
  api.saveLocalProfile(storage, completeStudent());
  api.deleteLocalProfile(storage);
  assert.equal(storage.getItem(api.PROFILE_STORAGE_KEY), null);
  assert.equal(storage.getItem("unrelated"), "keep");
  assert.equal(
    api.loadLocalProfile(storage).profile.onboarding.completed,
    false,
  );
});
test("list entries deduplicate without case sensitivity and maintain student wording", () => {
  assert.deepEqual(
    api.uniqueEntries([" Python ", "python", "Communication", ""]),
    ["Python", "Communication"],
  );
});
test("resume review accepts a PDF signature without claiming extraction", async () => {
  const file = new File(["%PDF-1.7\nlocal test content"], "resume.pdf", {
    type: "application/pdf",
  });
  assert.equal(await api.inspectResumeFile(file), null);
  assert.equal(api.emptyProfile().resume.extractionStatus, "not_performed");
  assert.deepEqual(api.emptyProfile().resume.suggestions, []);
});
test("resume review checks DOCX package markers and rejects unsupported or mismatched files", async () => {
  const docx = new File(
    ["PK\u0003\u0004[Content_Types].xml word/document.xml"],
    "resume.docx",
    {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  );
  assert.equal(await api.inspectResumeFile(docx), null);
  for (const file of [
    new File(["text"], "resume.txt"),
    new File(["not a pdf"], "resume.pdf"),
    new File(["%PDF-1.7"], "resume.pdf", { type: "text/html" }),
    new File(["PK\u0003\u0004not-word"], "resume.docx"),
  ])
    assert.ok(await api.inspectResumeFile(file));
});
test("empty and oversized resumes are rejected", async () => {
  assert.ok(await api.inspectResumeFile(new File([], "empty.pdf")));
  assert.ok(
    await api.inspectResumeFile(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf"),
    ),
  );
});

test("calendar changes do not discard a previously valid student profile", () => {
  const profile = completeStudent();
  const previousYear = new Date().getFullYear() - 2;
  profile.onboarding.completedAt = `${previousYear}-01-10T12:00:00.000Z`;
  profile.education.expectedGraduation = `${previousYear + 1}-05`;
  profile.preferences.year = String(previousYear);
  assert.ok(api.parseStoredProfile(JSON.stringify(profile)));
  assert.ok(api.validateProfileStep(profile, 2).expectedGraduation);
});

test("saved progress on the removed Preferences step resumes at Experience & skills", () => {
  const profile = completeStudent();
  profile.onboarding = { step: 4, completed: false, completedAt: null };
  const restored = api.parseStoredProfile(api.serializeProfile(profile));
  assert.ok(restored);
  assert.equal(restored.onboarding.step, 3);
});

test("saved preferences from older profiles are not used for matching", () => {
  const ctx = api.toCareerContext(completeStudent());
  assert.deepEqual(ctx.preferences.workModes, []);
  assert.equal(ctx.preferences.year, "");
});

test("resume is first while stable IDs preserve saved education links", () => {
  assert.deepEqual(api.ONBOARDING_STEPS, [5, 1, 2, 3]);
  const profile = completeStudent();
  profile.onboarding = { step: 5, completed: false, completedAt: null };
  const restored = api.parseStoredProfile(api.serializeProfile(profile));
  assert.equal(restored.onboarding.step, 5);
});

test("checked-off tips survive saving and reloading", () => {
  const profile = completeStudent();
  profile.completedTips = ["timing", "career-center"];
  const restored = api.parseStoredProfile(api.serializeProfile(profile));
  assert.deepEqual(restored.completedTips, ["timing", "career-center"]);
  const legacy = completeStudent();
  assert.equal(api.parseStoredProfile(api.serializeProfile(legacy)).completedTips, undefined);
});

test("started projects survive saving and reloading", () => {
  const profile = completeStudent();
  profile.startedProjects = ["PRJ-111", "concept-INT-001"];
  assert.deepEqual(api.parseStoredProfile(api.serializeProfile(profile)).startedProjects, ["PRJ-111", "concept-INT-001"]);
});

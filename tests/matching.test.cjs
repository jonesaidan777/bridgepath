const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
// Load the pure TypeScript modules with the compiler already in this project.
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2017,
      },
    }).outputText,
    filename,
  );
const { rankInternships, matchInternship } = require("../src/lib/matching.ts");
const { evaluateEligibility } = require("../src/lib/eligibility.ts");
const {
  emptyProfile,
  toCareerContext,
  parseStoredProfile,
  serializeProfile,
  validateProfileStep,
} = require("../src/lib/student-profile.ts");
const actual = require("../src/data/bridgepath-workbook.json");
function student() {
  const p = emptyProfile();
  p.personal = { preferredName: "Test", cityState: "Atlanta, GA" };
  p.careerInterests = ["software_engineering"];
  p.education = {
    college: "Test college",
    major: "Computer Science",
    degreeLevel: "bachelor",
    academicYear: "3",
    expectedGraduation: "2028-05",
    gpa: "",
    gpaScale: "4",
    enrollmentStatus: "full_time",
  };
  p.preferences = {
    targetRoles: [],
    locations: [],
    workModes: ["remote", "hybrid", "on_site"],
    willingToRelocate: "yes",
    season: "summer",
    year: "2027",
  };
  return p;
}
function fixture() {
  const job = {
    internship_id: "TEST-001",
    company: "Test employer",
    job_title: "Software intern - Summer 2027",
    job_description_summary: "Software development internship",
    career_field: "software_engineering",
    location: "Remote",
    employer_posting_url: "https://example.org/job",
    retrieved_on: "2026-11-14",
    posting_status: "unknown",
    requirements:
      "Currently enrolled in a Bachelor's degree in Computer Science.",
    preferred: null,
    program_details: "Summer 2027; remote internship.",
  };
  const skills = [
    { skill_id: "python", skill_name: "Python" },
    { skill_id: "sql", skill_name: "SQL" },
    { skill_id: "java", skill_name: "Java" },
    { skill_id: "javascript_typescript", skill_name: "JavaScript/TypeScript" },
  ];
  return {
    metadata: {
      source: "test fixture",
      source_sha256: "",
      imported_at: "",
      record_counts: {},
      warnings: [],
    },
    Internships: [job],
    Requirements: [
      {
        internship_id: job.internship_id,
        skill_id: "python",
        requirement_type: "required",
        evidence_excerpt: "Experience with Python.",
      },
    ],
    Skills: skills,
    Projects: [],
    Milestones: [],
  };
}
const ctx = (p) => toCareerContext(p);
test("relevant confirmed skills and education produce a transparent current match without scores", () => {
  const p = student();
  p.skills.canonicalIds = ["python"];
  const d = fixture();
  const m = rankInternships(ctx(p), d)[0];
  assert.equal(m.type, "strong_current");
  assert.ok(m.qualifications[0].satisfied);
  assert.ok(m.reasons.length);
  assert.ok(!("score" in m));
  assert.ok(!("percentage" in m));
});
test("no experience and no skills still allow interest-aligned stretch opportunities", () => {
  const matches = rankInternships(ctx(student()), fixture());
  assert.equal(matches.length, 1);
  assert.equal(matches[0].type, "interest_aligned_stretch");
  assert.ok(matches[0].qualifications[0].notDocumented.includes("python"));
});
test("multiple career fields are respected, and irrelevant fields are not backfilled", () => {
  const p = student();
  p.careerInterests = ["software_engineering", "quant_finance"];
  const d = fixture();
  d.Internships.push({
    ...d.Internships[0],
    internship_id: "TEST-002",
    career_field: "quant_finance",
    job_title: "Quant intern",
  });
  assert.equal(rankInternships(ctx(p), d).length, 2);
  p.careerInterests = ["nonexistent interest"];
  assert.deepEqual(rankInternships(ctx(p), d), []);
});
test("missing optional GPA is uncertain rather than exclusion, and scales are not guessed", () => {
  const d = fixture();
  d.Internships[0].preferred = "GPA of 3.0 or above on a 4.0 scale.";
  const p = student();
  assert.equal(rankInternships(ctx(p), d).length, 1);
  assert.equal(
    evaluateEligibility(ctx(p), d.Internships[0]).find((c) => c.kind === "gpa")
      .status,
    "uncertain",
  );
  p.education.gpa = "3.0";
  assert.equal(
    evaluateEligibility(ctx(p), d.Internships[0]).find((c) => c.kind === "gpa")
      .status,
    "confirmed",
  );
  p.education.gpaScale = "5";
  assert.equal(
    evaluateEligibility(ctx(p), d.Internships[0]).find((c) => c.kind === "gpa")
      .status,
    "uncertain",
  );
});
test("an explicit graduation-window mismatch is excluded and explained", () => {
  const d = fixture();
  d.Internships[0].requirements +=
    " Graduating between December 2027 and June 2028.";
  const p = student();
  p.education.expectedGraduation = "2029-05";
  const m = matchInternship(ctx(p), d.Internships[0], d);
  assert.equal(m.eligibilityStatus, "unmet");
  assert.equal(m.type, "explicitly_unmet");
  assert.deepEqual(rankInternships(ctx(p), d), []);
});
test("preferred skills do not satisfy missing required skills", () => {
  const d = fixture();
  d.Requirements.push({
    internship_id: "TEST-001",
    skill_id: "sql",
    requirement_type: "preferred",
    evidence_excerpt: "SQL is a plus.",
  });
  const p = student();
  p.skills.canonicalIds = ["sql"];
  const m = rankInternships(ctx(p), d)[0];
  assert.equal(m.type, "interest_aligned_stretch");
  assert.equal(
    m.qualifications.find((g) => g.classification === "required").satisfied,
    false,
  );
  assert.equal(
    m.qualifications.find((g) => g.classification === "preferred").satisfied,
    true,
  );
});
test("explicit OR alternatives do not demand every named skill", () => {
  const d = fixture();
  d.Requirements = [
    ...["python", "java"].map((skill_id) => ({
      internship_id: "TEST-001",
      skill_id,
      requirement_type: "required",
      evidence_excerpt: "Experience with Python or Java.",
    })),
  ];
  const p = student();
  p.skills.canonicalIds = ["java"];
  const m = matchInternship(ctx(p), d.Internships[0], d);
  assert.equal(m.qualifications.length, 1);
  assert.ok(m.qualifications[0].satisfied);
  assert.deepEqual(m.qualifications[0].notDocumented, []);
});
test("AND requirements remain separately necessary and duplicate mentions do not inflate groups", () => {
  const d = fixture();
  d.Requirements = ["python", "sql"].map((skill_id) => ({
    internship_id: "TEST-001",
    skill_id,
    requirement_type: "required",
    evidence_excerpt: "Experience with Python and SQL.",
  }));
  d.Requirements.push({ ...d.Requirements[0] });
  const p = student();
  p.skills.canonicalIds = ["python"];
  const m = matchInternship(ctx(p), d.Internships[0], d);
  assert.equal(m.qualifications.length, 1);
  assert.equal(m.qualifications[0].satisfied, false);
  assert.deepEqual(m.qualifications[0].notDocumented, ["sql"]);
});
test("linked work, research, and projects supply skill evidence without inferring it from titles", () => {
  const d = fixture();
  const p = student();
  p.experiences = [
    {
      id: "e",
      kind: "research",
      title: "Student research",
      organization: "Test lab",
      description: "Built a script",
      startMonth: "2026-01",
      endMonth: "",
      ongoing: true,
      skillIds: ["python"],
      accomplishments: "Parsed a sample dataset",
      evidenceUrl: "https://example.org/evidence",
    },
  ];
  let m = matchInternship(ctx(p), d.Internships[0], d);
  assert.equal(m.qualifications[0].demonstrated[0].kind, "experience");
  assert.ok(m.relevantExperience.includes("Student research"));
  p.experiences[0].skillIds = [];
  p.experiences[0].title = "Python expert";
  m = matchInternship(ctx(p), d.Internships[0], d);
  assert.equal(m.qualifications[0].satisfied, false);
});
test("missing locations and work arrangements never silently exclude roles", () => {
  const d = fixture();
  d.Internships[0].location = null;
  d.Internships[0].program_details = null;
  const m = rankInternships(ctx(student()), d)[0];
  assert.ok(m);
  assert.equal(
    m.preferences.find((s) => s.kind === "location").status,
    "unknown",
  );
  assert.equal(
    m.preferences.find((s) => s.kind === "work_mode").status,
    "unknown",
  );
});
test("GPA accepts numeric 3.0 and separate scales while older profiles migrate", () => {
  const p = student();
  p.education.gpa = "3.0";
  assert.equal(validateProfileStep(p, 2).gpa, undefined);
  p.education.gpa = "5.1";
  assert.ok(validateProfileStep(p, 2).gpa);
  p.education.gpa = "3.0 / 4.0";
  delete p.education.gpaScale;
  const migrated = parseStoredProfile(serializeProfile(p));
  assert.equal(migrated.education.gpa, "3.0");
  assert.equal(migrated.education.gpaScale, "4");
  assert.equal(migrated.personal.preferredName, p.personal.preferredName);
});
test("changing interests changes the actual workbook shortlist; changing skills changes ordering", () => {
  const p = student();
  p.careerInterests = ["software_engineering"];
  const first = rankInternships(ctx(p), actual).map(
    (m) => m.internship.internship_id,
  );
  p.careerInterests = ["hardware_engineering"];
  const second = rankInternships(ctx(p), actual).map(
    (m) => m.internship.internship_id,
  );
  assert.notDeepEqual(first, second);
  const d = fixture();
  d.Internships.push({ ...d.Internships[0], internship_id: "TEST-002" });
  d.Requirements.push({
    internship_id: "TEST-002",
    skill_id: "sql",
    requirement_type: "required",
    evidence_excerpt: "Experience with SQL.",
  });
  p.careerInterests = ["software_engineering"];
  p.skills.canonicalIds = ["python"];
  assert.equal(
    rankInternships(ctx(p), d)[0].internship.internship_id,
    "TEST-001",
  );
  p.skills.canonicalIds = ["sql"];
  assert.equal(
    rankInternships(ctx(p), d)[0].internship.internship_id,
    "TEST-002",
  );
});
test("protected demographics and preferred name never influence ranking", () => {
  const left = student(),
    right = student();
  left.consent.saveDemographics = true;
  left.demographics = { ageRange: "Under 18", raceEthnicity: "Multiracial" };
  right.demographics = {
    ageRange: "40 or older",
    raceEthnicity: "Prefer not to say",
  };
  right.personal.preferredName = "Different name";
  assert.deepEqual(
    rankInternships(ctx(left), actual),
    rankInternships(ctx(right), actual),
  );
});
test("recorded open status is not a live availability claim and source URLs are unchanged", () => {
  const p = student();
  p.skills.canonicalIds = actual.Skills.map((s) => s.skill_id);
  for (const m of rankInternships(ctx(p), actual))
    assert.equal(
      m.internship.employer_posting_url,
      actual.Internships.find(
        (j) => j.internship_id === m.internship.internship_id,
      ).employer_posting_url,
    );
  const d = fixture();
  d.Internships[0].posting_status = "closed";
  assert.deepEqual(rankInternships(ctx(p), d), []);
});
test("work authorization and age clauses remain questions even when demographics exist", () => {
  const d = fixture();
  d.Internships[0].requirements +=
    "\nCandidates must be at least 18 years old.\nMust be eligible to work in the UK.";
  const p = student();
  p.demographics = { ageRange: "Under 18", raceEthnicity: "Prefer not to say" };
  const m = matchInternship(ctx(p), d.Internships[0], d);
  assert.notEqual(m.type, "explicitly_unmet");
  assert.ok(
    m.eligibility
      .filter((c) => c.kind === "verification")
      .every((c) => c.status === "uncertain"),
  );
});
test("ranking is deterministic, capped at five, and uses stable ID tie-breaking", () => {
  const d = fixture();
  d.Internships = Array.from({ length: 8 }, (_, i) => ({
    ...d.Internships[0],
    internship_id: `TEST-${String(i).padStart(3, "0")}`,
  }));
  d.Requirements = [];
  const p = student();
  const first = rankInternships(ctx(p), d).map(
    (m) => m.internship.internship_id,
  );
  assert.equal(first.length, 5);
  d.Internships.reverse();
  assert.deepEqual(
    rankInternships(ctx(p), d).map((m) => m.internship.internship_id),
    first,
  );
});

test("explicit graduation windows distinguish months within the same year", () => {
  const d = fixture();
  d.Internships[0].requirements += " Graduating between December 2027 and June 2028.";
  const p = student();
  for (const [date, expected] of [["2027-11", "unmet"], ["2027-12", "confirmed"], ["2028-06", "confirmed"], ["2028-07", "unmet"]]) {
    p.education.expectedGraduation = date;
    const check = evaluateEligibility(ctx(p), d.Internships[0]).find(c => c.kind === "graduation");
    assert.equal(check.status, expected, date);
  }
});

test("readiness splits documented skills from gaps and never lowers the after-count", () => {
  const { buildReadiness } = require("../src/lib/readiness.ts");
  const p = student();
  p.skills.canonicalIds = ["python"];
  const ids = actual.Internships.slice(0, 3).map((job) => job.internship_id);
  p.interestedInternshipIds = ids;
  const r = buildReadiness(ctx(p), actual, ids);
  assert.equal(r.roles.length, 3);
  for (const gap of r.gaps)
    assert.ok(!r.strengths.some((s) => s.skillId === gap.skillId && gap.classification === "required" && s.roles === r.roles.length));
  assert.ok(r.strongAfter >= r.strongNow);
  const order = { required: 0, preferred: 1, unspecified: 2 };
  for (let i = 1; i < r.gaps.length; i++)
    assert.ok(order[r.gaps[i - 1].classification] <= order[r.gaps[i].classification]);
});

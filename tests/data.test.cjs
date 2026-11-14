const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");
// data.ts imports ./workbook (TypeScript), so compile .ts files on require too.
require.extensions[".ts"] = (module, file) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2017 },
    }).outputText,
    file,
  );

// Transpile the actual module with the project's existing TypeScript dependency.
// Its only runtime import is the generated JSON; no test framework is needed.
const filename = path.resolve("src/lib/data.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
    target: ts.ScriptTarget.ES2017,
  },
}).outputText;
const compiledModule = { exports: {} };
new Function("require", "module", "exports", compiled)(
  createRequire(filename),
  compiledModule,
  compiledModule.exports,
);
const api = compiledModule.exports;
const dataset = require("../src/data/bridgepath-workbook.json");
const clone = () => JSON.parse(JSON.stringify(dataset));

test("all imported counts reconcile to metadata", () => {
  for (const [sheet, count] of Object.entries(dataset.metadata.record_counts))
    assert.equal(dataset[sheet].length, count);
});
test("frequencies equal an independent distinct-posting calculation", () => {
  for (const row of api.getSkillFrequencies()) {
    const ids = new Set(
      dataset.Requirements.filter((r) => r.skill_id === row.skill.skill_id).map(
        (r) => r.internship_id,
      ),
    );
    assert.equal(row.count, ids.size);
    assert.equal(row.total, dataset.Internships.length);
    for (const type of ["required", "preferred", "unspecified"]) {
      assert.equal(
        row[type],
        new Set(
          dataset.Requirements.filter(
            (r) =>
              r.skill_id === row.skill.skill_id &&
              (r.requirement_type ?? "unspecified") === type,
          ).map((r) => r.internship_id),
        ).size,
      );
    }
  }
});
test("duplicate mentions cannot inflate counts, including classification counts", () => {
  const data = clone();
  data.Requirements.push(
    ...Array.from({ length: 5 }, () => ({ ...data.Requirements[0] })),
  );
  assert.deepEqual(
    api.createDataLayer(data).getSkillFrequencies(),
    api.getSkillFrequencies(),
  );
});
test("career filtering changes both numerators and denominator", () => {
  const data = clone();
  data.Internships[0].career_field = "alternate";
  const layer = api.createDataLayer(data);
  assert.equal(layer.getInternships(" ALTERNATE ").length, 1);
  assert.ok(
    layer
      .getSkillFrequencies("alternate")
      .every((r) => r.total === 1 && r.count === 1),
  );
  assert.deepEqual(layer.getSkillFrequencies("missing"), []);
});
test("student skills match canonical IDs or names without guessing proficiency", () => {
  const result = api.compareStudentSkills({
    skills: [" PYTHON ", "ci_cd", "unknown"],
  });
  assert.ok(result.reported.some((r) => r.skill.skill_id === "python"));
  assert.ok(result.reported.some((r) => r.skill.skill_id === "ci_cd"));
  assert.ok(!result.notYetReported.some((r) => r.skill.skill_id === "python"));
  assert.deepEqual(result.unrecognized, ["unknown"]);
});
test("project connections use canonical skills and respect career fields", () => {
  const project = api.getProjects()[0];
  const skills = new Set(api.getProjectSkills(project).map((s) => s.skill_id));
  assert.ok(
    api
      .getRequirementsForProject(project.project_id)
      .every((r) => skills.has(r.skill_id)),
  );
  assert.ok(
    api
      .findProjectsForSkills([...skills])
      .some((p) => p.project_id === project.project_id),
  );
  assert.deepEqual(api.findProjectsForSkills(["unknown"]), []);
  const data = clone();
  data.Projects[0].career_field = "another-field";
  assert.deepEqual(
    api.createDataLayer(data).getRequirementsForProject(project.project_id),
    [],
  );
});
test("milestones remain associated and ordered; missing relationships are empty", () => {
  const id = api.getProjects()[0].project_id;
  const steps = api.getMilestones(id);
  assert.ok(steps.every((s) => s.project_id === id));
  assert.deepEqual(
    steps.map((s) => s.step_number),
    [...steps.map((s) => s.step_number)].sort((a, b) => a - b),
  );
  assert.deepEqual(api.getMilestones("missing"), []);
  assert.deepEqual(api.getRequirements("missing"), []);
  assert.equal(api.getSkill("missing"), undefined);
});
test("empty datasets and optional values remain safe", () => {
  const empty = {
    ...clone(),
    Internships: [],
    Requirements: [],
    Skills: [],
    Projects: [],
    Milestones: [],
  };
  assert.deepEqual(api.createDataLayer(empty).getSkillFrequencies(), []);
  assert.equal(api.display(null), "Not provided");
  assert.equal(api.safeWebUrl(null), null);
  assert.equal(api.safeWebUrl("javascript:alert(1)"), null);
  assert.equal(api.safeWebUrl("invalid"), null);
  assert.equal(
    api.safeWebUrl("https://example.org/job"),
    "https://example.org/job",
  );
});

test("skill selection shows only related internships without changing frequency denominator", () => {
  const frequency = api
    .getSkillFrequencies()
    .find((row) => row.count < row.total);
  assert.ok(frequency);
  const state = api.getExplorerState({ skillId: frequency.skill.skill_id });
  assert.deepEqual(
    state.visibleInternships.map((job) => job.internship_id).sort(),
    [...frequency.internshipIds].sort(),
  );
  assert.equal(
    state.frequencies.find(
      (row) => row.skill.skill_id === frequency.skill.skill_id,
    ).total,
    dataset.Internships.length,
  );
  assert.equal(
    state.selectedInternship.internship_id,
    state.visibleInternships[0].internship_id,
  );
});
test("role selection is constrained to the active field and skill", () => {
  const frequency = api
    .getSkillFrequencies()
    .find((row) => row.count < row.total);
  const matchingId = frequency.internshipIds[0];
  const valid = api.getExplorerState({
    skillId: frequency.skill.skill_id,
    internshipId: matchingId,
  });
  assert.equal(valid.selectedInternship.internship_id, matchingId);
  const outside = dataset.Internships.find(
    (job) => !frequency.internshipIds.includes(job.internship_id),
  );
  const invalid = api.getExplorerState({
    skillId: frequency.skill.skill_id,
    internshipId: outside.internship_id,
  });
  assert.equal(invalid.selectedInternship, undefined);
  assert.equal(invalid.invalidInternship, true);
  assert.equal(
    api.getExplorerState({ skillId: "missing" }).visibleInternships.length,
    0,
  );
  assert.equal(api.getExplorerState({ skillId: "missing" }).invalidSkill, true);
  assert.equal(
    api.getExplorerState({ careerField: "missing" }).visibleInternships.length,
    0,
  );
});
test("role-to-project links are supported by evidence for that exact internship", () => {
  for (const job of dataset.Internships) {
    const actual = api.getProjectsForInternship(job.internship_id);
    const expected = api
      .getProjects()
      .filter((project) =>
        api
          .getRequirementsForProject(project.project_id)
          .some((row) => row.internship_id === job.internship_id),
      );
    assert.deepEqual(actual, expected);
  }
  assert.deepEqual(api.getProjectsForInternship("missing"), []);
});
test("selection links encode IDs and use dedicated detail routes", () => {
  const href = api.researchHref({
    careerField: "field & more",
    skillId: "skill?value",
    internshipId: "id/#special",
  });
  const url = new URL(href, "https://bridgepath.example");
  assert.equal(url.searchParams.get("field"), "field & more");
  assert.equal(url.searchParams.get("skill"), "skill?value");
  assert.equal(
    url.pathname,
    `/career-insights/${encodeURIComponent("id/#special")}`,
  );
  assert.equal(url.searchParams.get("internship"), null);
  assert.equal(url.hash, "");
  const project = new URL(api.projectHref("project & more"), url.origin);
  assert.equal(
    project.pathname,
    `/my-projects/${encodeURIComponent("project & more")}`,
  );
  assert.equal(project.searchParams.get("project"), null);
  assert.equal(project.hash, "");
  assert.equal(api.researchHref(), "/career-insights");
});

test("shared-skill opportunity counts exclude the source and other fields and deduplicate mentions", () => {
  for (const job of dataset.Internships) {
    const ids = new Set(dataset.Requirements.filter(row => row.internship_id === job.internship_id).map(row => row.skill_id));
    const result = api.getSharedSkillOpportunities(job.internship_id);
    if (!job.career_field || !ids.size) { assert.equal(result, null); continue; }
    const expected = dataset.Internships.filter(other => other.internship_id !== job.internship_id && other.career_field === job.career_field && dataset.Requirements.some(row => row.internship_id === other.internship_id && ids.has(row.skill_id)));
    assert.deepEqual(result.map(row => row.internship.internship_id).sort(), expected.map(row => row.internship_id).sort());
    for (const row of result) assert.equal(row.sharedSkills.length, new Set(row.sharedSkills.map(skill => skill.skill_id)).size);
  }
  const duplicate = clone(); duplicate.Requirements.push(...duplicate.Requirements);
  const layer = api.createDataLayer(duplicate);
  for (const job of dataset.Internships) assert.deepEqual(layer.getSharedSkillOpportunities(job.internship_id), api.getSharedSkillOpportunities(job.internship_id));
});
test("shared-skill comparisons handle missing records and missing data without invented counts", () => {
  assert.equal(api.getSharedSkillOpportunities("missing"), null);
  const d=clone(); d.Internships[0].career_field=null;
  assert.equal(api.createDataLayer(d).getSharedSkillOpportunities(d.Internships[0].internship_id),null);
  d.Internships[0].career_field="isolated-field";
  assert.deepEqual(api.createDataLayer(d).getSharedSkillOpportunities(d.Internships[0].internship_id),[]);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017}}).outputText, filename);
const { journeyRedirect } = require('../src/lib/onboarding-journey.ts');
const { emptyProfile, toCareerContext, serializeProfile, parseStoredProfile } = require('../src/lib/student-profile.ts');
const { rankInternships } = require('../src/lib/matching.ts');
const { recommendProjects } = require('../src/lib/project-recommendations.ts');
const data = require('../src/data/bridgepath-workbook.json');

test('each fresh journey starts with onboarding even for saved completed profiles', () => {
  for (const path of ['/', '/my-opportunities', '/my-projects', '/discover-opportunities', '/profile']) {
    assert.equal(journeyRedirect('profile', path, true), '/onboarding');
  }
  assert.equal(journeyRedirect('profile', '/onboarding', true), null);
});
test('discovery follows profile completion and dashboard opens only after finishing journey', () => {
  assert.equal(journeyRedirect('discovery', '/', true), '/discover-opportunities');
  assert.equal(journeyRedirect('discovery', '/discover-opportunities', true), null);
  assert.equal(journeyRedirect('discovery', '/discover-opportunities', false), '/onboarding');
  assert.equal(journeyRedirect('discovery', '/onboarding', true), null);
  assert.equal(journeyRedirect('complete', '/', true), null);
  assert.equal(journeyRedirect('complete', '/my-projects', true), null);
  assert.equal(journeyRedirect('complete', '/my-projects', false), '/onboarding');
});
test('interests persist through existing profile storage and do not change discovery ranking', () => {
  const p = emptyProfile();
  p.careerInterests = ['software_engineering'];
  Object.assign(p.education, {degreeLevel:'master', academicYear:'3', enrollmentStatus:'full_time', expectedGraduation:'2028-05', major:'Computer Science'});
  const before = rankInternships(toCareerContext(p), data).map(x=>x.internship.internship_id);
  p.interestedInternshipIds = ['INT-012', 'INT-012'];
  const restored = parseStoredProfile(serializeProfile(p));
  assert.deepEqual(restored.interestedInternshipIds, ['INT-012']);
  assert.deepEqual(rankInternships(toCareerContext(restored), data).map(x=>x.internship.internship_id), before);
  const projects = recommendProjects(toCareerContext(restored), data);
  assert.ok(projects.length);
  for (const project of projects) assert.deepEqual(project.internshipIds, ['INT-012']);
});
test('unavailable selections never manufacture records or project connections', () => {
  const p=emptyProfile(); p.interestedInternshipIds=['NOT-IN-WORKBOOK'];
  assert.deepEqual(recommendProjects(toCareerContext(p),data),[]);
  const oldProfile=emptyProfile();
  const restored=parseStoredProfile(serializeProfile(oldProfile));
  assert.deepEqual(toCareerContext(restored).interestedInternshipIds,[]);
});

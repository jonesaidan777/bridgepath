const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, esModuleInterop: true } }).outputText, filename);
const { recommendProjects } = require('../src/lib/project-recommendations.ts');
const { emptyProfile, toCareerContext } = require('../src/lib/student-profile.ts');
const data = require('../src/data/bridgepath-workbook.json');
function profile(field = 'software_engineering') {
    const p = emptyProfile();
    p.careerInterests = [field];
    Object.assign(p.education, { college: 'Test college', major: 'Computer Science', degreeLevel: 'bachelor', academicYear: '3', enrollmentStatus: 'full_time', expectedGraduation: '2028-05' });
    Object.assign(p.preferences, { year: '2027', season: 'summer', workModes: ['remote', 'hybrid', 'on_site'], willingToRelocate: 'yes' });
    return p;
}
const recommend = (p, selected, d = data) => recommendProjects(toCareerContext(p), d, selected);
test('software and data science profiles receive different, source-connected projects', () => {
    const a = recommend(profile()), b = recommend(profile('data_science_ai_ml'));
    assert.ok(a.length && b.length);
    assert.notDeepEqual(a.map(x => x.id), b.map(x => x.id));
    for (const [field, list] of [['software_engineering', a], ['data_science_ai_ml', b]])
        for (const project of list) {
            assert.equal(project.careerField, field);
            assert.ok(project.connections.length);
            for (const row of project.connections)
                assert.ok(data.Requirements.includes(row));
        }
});
test('documenting all canonical skills removes gap-based project suggestions', () => {
    const p = profile();
    assert.ok(recommend(p).length);
    p.skills.canonicalIds = data.Skills.map(x => x.skill_id);
    assert.deepEqual(recommend(p), []);
});
test('explicit experience evidence changes gaps without inferring skills from job title', () => {
    const p = profile();
    const initial = recommend(p, 'INT-001');
    p.experiences = [{ id: 'test', type: 'academic', title: 'Python Linux Git', organization: 'Test', startMonth: '', endMonth: '', description: '', skillIds: [] }];
    assert.deepEqual(recommend(p, 'INT-001'), initial);
    p.experiences[0].skillIds = data.Skills.map(x => x.skill_id);
    assert.deepEqual(recommend(p, 'INT-001'), []);
});
test('selected role controls employer evidence and bad IDs never fall back', () => {
    const results = recommend(profile(), 'INT-012');
    assert.ok(results.length);
    for (const project of results)
        assert.deepEqual(project.internshipIds, ['INT-012']);
    assert.deepEqual(recommend(profile(), 'MISSING'), []);
});
test('unsupported career fields do not force the three catalog projects', () => {
    assert.deepEqual(recommend(profile('unsupported_field')), []);
});
test('concepts have real requested skills but no fabricated source milestones or resources', () => {
    const before = JSON.stringify(data);
    const concepts = recommend(profile('data_science_ai_ml')).filter(x => x.kind === 'concept');
    assert.ok(concepts.length);
    for (const item of concepts) {
        assert.ok(item.skillIds.every(id => item.connections.some(row => row.skill_id === id)));
        assert.equal(item.milestones, undefined);
        assert.equal(item.resources, undefined);
        assert.ok(!data.Projects.some(x => x.project_id === item.id));
    }
    assert.equal(JSON.stringify(data), before);
});
test('only templates with recorded milestones are labeled guided', () => {
    for (const item of recommend(profile()))
        if (item.kind !== 'concept') {
            assert.equal(item.kind === 'guided', data.Milestones.some(step => step.project_id === item.id));
        }
    assert.equal(data.Milestones.filter(x => x.project_id === 'PRJ-001').length, 4);
});
test('required gaps outrank optional gaps and duplicate source mentions do not inflate rank', () => {
    const p = profile();
    const original = recommend(p);
    const duplicate = structuredClone(data);
    duplicate.Requirements.push(...duplicate.Requirements);
    assert.deepEqual(recommend(p, undefined, duplicate).map(x => x.id), original.map(x => x.id));
    assert.deepEqual(recommend(p).map(x => x.id), original.map(x => x.id));
});

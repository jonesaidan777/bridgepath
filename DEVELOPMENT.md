# BridgePath — Milestone 2A: Student profile foundation

## Run locally

Application: Node.js 20.9+ and npm. Dataset refresh and importer tests: Python 3.9+ (standard library only). No new npm or Python packages were added for Excel import.

```sh
npm install
npm run data:import
npm run dev
```

Open http://localhost:3000. New students are directed to four-stage setup. Current college enrollment is required to finish. Completed students see their name and career direction on the dashboard and can edit or delete their locally stored profile at `/profile`.

## Student onboarding and local profiles

`/onboarding` has four stages: About you; Education; Experience & skills; Resume & internship preferences. A visible progress indicator, Back/Continue controls, inline errors, and a focused validation summary support keyboard and mobile use. Saved stage progress restores after refresh. Valid full-time or part-time college enrollment is required; high-school and graduate-job-seeker degree paths are not offered. College/university names are unrestricted free text. Age is not an eligibility rule: a currently enrolled college student under 18 is supported.

Experiences and personal/academic projects use repeatable entries. Work history, skills, GPA, certifications, projects, and resumes are optional. Canonical skills come from the workbook; typed aliases matching canonical IDs/names reuse those IDs, and additional skills stay student-entered. No absence-of-experience proficiency inference is made.

The shared root layout supplies only the canonical skill catalog and available career fields to `ProfileProvider`. `ProfileGate` waits for browser storage before rendering the workspace, and sends students with incomplete setup to onboarding. Profile remains accessible for reviewing/removing partial or corrupt local data. This is a client-side product flow, **not authentication or a security boundary**.

### Profile data flow

- `src/lib/student-profile.ts`: versioned `StudentProfile`, field/stage validation, safe JSON restoration, storage helpers, local file checks, and `toCareerContext`.
- `src/components/profile-provider.tsx`: reads storage after hydration, manages shared session state, and handles read/write/delete failures. Saves update the current session even if storage is blocked, with an explicit persistence warning. Failed deletion never claims success.
- `src/components/onboarding-wizard.tsx`: owns draft values and the four-stage form. Back and Continue save the draft and current stage. Finish checks all stages and marks completion. Editing uses the same form; finishing edits returns to the dashboard.
- `src/components/profile-page.tsx` and `profile-summary.tsx`: review, edit, demographic removal, and confirmed deletion.
- `src/components/student-welcome.tsx`: browser-local name/career interests and one **Explore Internships** action. Research previews retain their existing dataset/source order.

The only profile storage key is `bridgepath.profile.v1`. No profile data is sent to the Next.js server, AI, or third parties. Storage is local to this browser and origin; it is not an encrypted or secure cloud account. Refreshing does not persist unsaved changes within a stage: use Back or Continue. A completed profile's original validation date is retained to prevent a calendar change from discarding saved information; education dates are revalidated when edited.

### Privacy and resume limitations

Optional age range and race/ethnicity are collapsed by default. Saving them requires a separate explicit checkbox. Serialization removes those answers without consent; Profile can revoke consent/remove answers or delete the entire local profile. `toCareerContext` explicitly selects career/education/skills/experience/preferences and excludes personal identity, demographics, consent metadata, resume data, and unconfirmed suggestions. It is not connected to any matcher in this milestone.

Resume selection accepts PDF/DOCX up to 5 MB with basic extension, MIME, and signature/package-marker checks. Files remain transient in component state, never localStorage. A local PDF can open via a temporary browser object URL that is revoked afterward; DOCX has a metadata-only review interface. The only saved resume fact is the student's review flag. These checks are not a full document parser. No document text is extracted or profile suggestions generated. Automatic resume parsing and AI are deferred; the manual profile works without a document.

### Verification

`npm test` runs the existing workbook/data tests plus focused profile tests for required fields, enrollment, empty work history, repeatable records, stage persistence, edits, consent/removal, exclusion of protected fields, corrupted storage, storage failures, deletion, and PDF/DOCX checks. `npm run typecheck` and `npm run build` remain the build checks.

Browser walkthrough used a synthetic test profile: first visit, validation, partial refresh, non-enrollment block, no-work/no-resume completion, returning student, name edit, multiple experiences/projects/skills, mobile breakpoint via zoom, and profile deletion followed by refresh. The test profile was removed afterward. Screenshot capture is not required for the local storage checks.

## Focused page flow

- `/`: student greeting, selected career direction, one **Explore Internships** action, and two source-order opportunity previews. No personalized rankings, charts, or KPIs.
- `/career-insights`: readable company, role, location, and **Explore requirements** links. Skill patterns, the complete table, and research notes are secondary disclosures. The career filter appears only when multiple fields exist.
- `/career-insights/[id]`: dedicated requirement page with required, preferred, and unspecified mentions grouped separately. Exact evidence expands on demand. The primary next step opens projects connected to this internship. Source links, dates, posting status, and summary remain available in disclosures.
- `/my-projects`: project titles, brief descriptions, and **Explore project** actions. Optional `?internship=ID` shows only source-connected projects.
- `/my-projects/[id]`: purpose, expected deliverable, and recorded guided steps. **Start the guided project** navigates to the first actual step and expands its instructions; it does not create or save progress. Resources, skill connections, and employer evidence remain optional disclosures. Missing guidance is explicitly labeled.

Both detail pages provide contextual back links. Older `?internship=ID` and `?project=ID` bookmarks redirect to their dedicated routes. Unknown record IDs return 404. Skill filtering retains the original full-sample denominator and remains available at `/career-insights?skill=python`.

The shared palette remains off-white, near-black, and orange. Body text is 17px, important section headings are 19–22px, and page headings range from 32–44px. Reading widths are constrained and tiny uppercase metadata has been removed. The sidebar keeps its responsive controls while dropping numbered links and repetitive presentation.

Example: open Career Insights, choose an internship, expand one source excerpt, select **Explore relevant projects**, choose a project, then select **Start the guided project**. Student onboarding is available separately. Internship matching, project personalization, saved project work, and milestone completion tracking are not included.

## Refresh after editing the spreadsheet

1. Save and close `BridgePath_Data.xlsx` in the repository root.
2. Run `npm run data:import`.
3. Run `npm test` and `npm run build`.
4. Refresh the development page. For production, stop the old server and restart `npm start` after building, or redeploy.

Commit `src/data/bridgepath-workbook.json` with the application: deployment only reads JSON and does not require Python or Excel. Updating the workbook alone does not update the app. Do not hand-edit the generated JSON. Do not rebuild underneath a running production server: it can retain stale asset references and return CSS 404s.

## Source schema and relationships

The importer maps sheet names through the workbook's relationship file, rather than assuming sheet file order. It preserves row order, source column names, and IDs. Optional blank cells become null, dates remain ISO dates, and milestone step numbers become integers. Extra named columns are preserved in JSON. Formula and Excel error cells fail explicitly rather than trusting cached results. Unknown requirement classifications, invalid dates, duplicate primary IDs, missing expected sheets/columns, and dangling references fail import. Validation happens before atomic snapshot replacement, so a failed import leaves the last good snapshot intact.

- `Internships`: `internship_id`, `company`, `job_title`, `job_description_summary`, `career_field`, `location`, `employer_posting_url`, `retrieved_on`, `posting_status`.
- `Requirements`: `internship_id`, `skill_id`, `requirement_type`, `evidence_excerpt`. This sheet has no requirement ID; all original rows, including repeated mentions, are preserved.
- `Skills`: `skill_id`, `skill_name`.
- `Projects`: `project_id`, `career_field`, `title`, `description`, `target_skill_ids`, `final_deliverable`. Target skills are pipe-delimited source IDs.
- `Milestones`: `milestone_id`, `project_id`, `step_number`, `title`, `instructions`, `deliverable`, `resource_title`, `resource_url`.

Requirements join internships to canonical skills. Project target skills join projects to the same skill vocabulary. Milestones join to projects. Connections between projects and employers are derived from shared skills within a career field; there is no direct project-to-employer foreign key or employer endorsement.

## Data flow and key functions

`scripts/import_data.py` → validated `src/data/bridgepath-workbook.json` → `src/lib/data.ts` → server-rendered page components. No browser or request opens Excel, and no live job/API request is made.

- `getInternships`, `getCareerFields`, `getRequirements`, `getSkill`, `getSkills`: source lookups with optional career filtering.
- `getSkillFrequencies`: counts distinct internship IDs per canonical skill and classification. The denominator is all internships in the selected career field. A posting counts once per skill even if it repeats that skill. Classification counts can overlap when the source uses multiple classifications.
- `compareStudentSkills`: case-insensitive, trimmed canonical-ID or canonical-name matching. Returns reported skills, skills not yet reported, and unrecognized input. No proficiency inference or synonym inference. Personalized matching uses the evidence-aware functions described below.
- `findProjectsForSkills`: finds source projects whose targeted skills overlap supplied IDs and employer requirements in the project's career field. No AI ranking.
- `getRequirementsForProject`: exposes the evidence rows supporting those connections.
- `getMilestones`: returns only the project's recorded milestones in step order. Missing milestones display an explicit unavailable state.
- `safeWebUrl`: only HTTP(S) links become clickable. Text is rendered by React without HTML injection.

The application shell and navigation keep their existing responsive behavior, with simpler presentation and dedicated detail routes. Career Insights retains URL skill filters (`/career-insights?skill=python`); optional field selections come from the dataset when multiple fields exist. The expanded workbook has five career fields. Unknown fields show empty results rather than fabricated data.

## Verification

```sh
npm run data:import
npm test
npm run typecheck
npm run build
```

Python tests validate the importer, count/value preservation, source hash, invalid references, duplicate primary IDs, missing columns, formula rejection, null handling, and preserving a good snapshot on failure. Node's built-in test runner verifies the actual TypeScript data functions using the existing TypeScript compiler, including distinct counts, filtering denominators, student matching, project connections, and milestone ordering. No test dependency is installed.

Manual check: select a skill and internship, then expand a requirement to see its classification and evidence. In My Projects, select a project and expand employer connections and associated milestones. The workbook currently includes milestones for only one project; the other projects correctly report none. External source/resource links open in a new tab. Mobile tables scroll horizontally while the surrounding page stays responsive.

## Limitations

The workbook is authoritative for this MVP; source excerpts, summaries, and posting status are not independently verified by the importer. “Open” in the workbook does not prove current availability. Every research page explains this. Frequencies describe this sample only and include required, preferred, and unspecified mentions. Some evidence lists alternative qualifications: always read the excerpt rather than treating a skill row as a standalone universal requirement.

No scraping, live retrieval, AI, authentication, database, AI project personalization, or milestone progress tracking is included. Future milestone work requires approval.


## Milestone 2B: personalized discovery

The current snapshot contains 31 internships, 153 requirement rows, 82 canonical skills, three projects and four milestones. Its five career fields come directly from the workbook. Expanded internship columns (`overview`, `responsibilities`, `requirements`, `preferred`, `program_details`, `what_we_offer`, `about_company`, `application_notes`) are preserved. Sixteen blank internship cells remain null.

The flow is onboarding → `/my-opportunities` → `/my-opportunities/[id]` → a source-grounded next action. Career Insights remains an unpersonalized research view; projects and milestones remain workbook-driven.

`toCareerContext` selects career-relevant profile fields before matching. Name, age, race/ethnicity, demographics consent, college prestige and resume contents do not enter ranking. College name is descriptive profile context only. Major, degree, enrollment, academic year, graduation and optional GPA support explicit eligibility checks. Career fields/roles drive relevance. Canonical skills and explicitly linked work/research/project skills provide self-reported qualification evidence; titles alone never establish skills. Accomplishments, dates, organizations and evidence links contextualize that evidence. Certifications supply literal canonical-skill mentions only. Home location, preferred locations, relocation, arrangement and season/year supply preference explanations where source information exists. Resume selection remains local metadata only, with no extraction.

`evaluateEligibility` reads the actual source requirements, preferred qualifications and program sections. It checks recognizable explicit degree, academic year, major, graduation and GPA clauses. Missing or ambiguous data becomes a question; a GPA threshold without a comparable stated scale is uncertain. Seasonal academic windows are not converted into invented month ranges. Work authorization, export restrictions and age clauses require employer verification. Alternative practical experience prevents an automatic degree exclusion. This conservative parser is not an exhaustive interpretation of natural-language job postings: students must read the displayed source evidence.

`collectSkillEvidence` joins canonical IDs to reported skills and explicitly linked experience/project entries. Custom skills remain marked custom; only exact canonical names/IDs or explicitly named alternatives supply matching evidence. `matchInternship` groups identical source quotes and classifications, handles explicitly stated alternatives, and separates required/preferred/unspecified mentions. Missing evidence means “not yet documented.” `rankInternships` filters unrelated, explicitly ineligible and recorded closed/expired/withdrawn roles, then returns at most five, without unrelated backfill.

Ranking uses ordered comparisons, not a weighted percentage: strong current match before stretch; exact career-field relevance; fewer known preference conflicts; fewer undocumented required groups; more documented required groups; more documented preferred groups; more distinct documented skills; relevant experience; target-role terms; confirmed eligibility checks; aligned preferences; internship ID as stable tie-breaker. Strong means all recorded required skill groups are documented, at least one exists, no required eligibility question remains, and no known preference conflicts exist. It is never an employer eligibility guarantee.

The next action first asks about unresolved required eligibility, then points to a relevant existing workbook project where available, documentation of existing experience, or review of the source-requested concept. No project, resource or milestone is generated.

Profiles retain storage version 1 and the existing key. Parsing migrates legacy GPA strings such as `3.0 / 4.0` into numeric text plus a separate scale, without deleting old entries. New structured fields are optional on restored experience/project records. Graduation is stored as `YYYY-MM`. Matching recalculates locally when the profile changes; nothing is sent to a service.

Focused tests cover matching skills, no experience, multiple interests, missing GPA, graduation windows (including exact month boundaries), preferred-only skills, empty results, legacy profile restoration, alternatives, duplicate mentions, original links, demographic invariance and deterministic ordering. Browser verification should also check dropdowns, skill search, profile refresh persistence, responsive navigation and expandable source evidence.

## Milestone 2C: project recommendations and brand

`recommendProjects(toCareerContext(profile), snapshot, selectedInternshipId?)` in `src/lib/project-recommendations.ts` reuses the existing internship shortlist and alternative-aware qualification groups. An explicit internship query supplies the role context instead. Candidates must connect to an actual requirement row and a skill not yet documented for that role. Workbook candidates must also share the role's career field; career labels alone do not make a project relevant.

Ranking compares distinct required gap skills addressed, all targeted gap skills, distinct connected roles, guided/brief/concept status, and stable ID. Duplicate source mentions do not inflate these counts. Recommended roles already reflect target roles, education, confirmed skills, explicitly linked experience, and preferences. No demographic fields enter this pipeline. At most five candidates appear in the list; details resolve against the full current candidate set.

The small field-specific concept template supplies a suggested artifact format and deliverable using up to three real, undocumented source-requested skills. Required gaps precede unspecified and preferred gaps. No employer assignment, external resource, recorded milestone or completion state is invented. A fully covered focus is not repeated as a concept when a relevant workbook project already addresses it. Only PRJ-001 has recorded guided steps; other workbook records remain accessible through their existing URLs. Concepts are recomputed from the current profile, so an older concept URL can become unavailable after an edit. Empty results do not trigger irrelevant backfill.

The browser reads the local profile and passes career context into this pure function; the client list/detail components render its output with source quotations available under disclosures. Guided steps remain server-rendered from the original workbook. A selected-role context can be opened with `/my-projects?internship=INT-012` and is preserved in project detail links. Suggested concepts can be added manually as planned project entries; no automatic progress tracking is introduced.

All interface typography now uses the original welcome headline family: Georgia, "Times New Roman", serif. See `BRIDGEPATH_STYLE_GUIDE.md` for exact tokens, component rules and future 16:9 presentation guidance. No PowerPoint is generated.

## Onboarding discovery journey

Full reloads now start at Resume, including reloads on dashboard and detail URLs. `ProfileProvider` keeps the journey stage (`profile`, `discovery`, `complete`) only in React memory; `journeyRedirect` gates routes until the student finishes. Existing answers remain in localStorage. Profile completion opens `/discover-opportunities`; continuing from there opens the unchanged dashboard. Clickable profile sections and existing fields remain available.

The discovery page reuses `rankInternships` for up to five source-backed roles. Checkbox interests persist as optional `interestedInternshipIds` on the existing profile schema, so older profiles remain valid. Selections do not reorder the shortlist. The bottom comparison uses the existing `matchInternship` qualification groups, explicitly linked skill evidence, and eligibility checks. Missing evidence is not treated as missing ability; required/preferred/unspecified labels and source quotations remain visible under disclosures. Demo profile entries are not independently verified qualifications.

Without a single explicit project-role query, saved interest selections now supply the employer context for project recommendations. Explicitly unmet or recorded closed roles are excluded from this project context. Unknown or unavailable selections do not fabricate replacements. Clearing interests restores the usual shortlist-based project suggestions.

Focused journey tests verify reload routing, discovery gating, old-profile compatibility, persistent/deduplicated interests, unchanged internship ordering and selection-driven project connections. Browser verification of the complete new journey remains a manual check.

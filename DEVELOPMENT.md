# BridgePath — Focused exploration UX

## Run locally

Application: Node.js 20.9+ and npm. Dataset refresh and importer tests: Python 3.9+ (standard library only). No new npm or Python packages were added for Excel import.

```sh
npm install
npm run data:import
npm run dev
```

Open http://localhost:3000. The dashboard leads to internship discovery, and dedicated detail pages hold requirement evidence and project guidance. Profile remains a placeholder.

## Focused page flow

- `/`: one introduction, one primary **Explore career opportunities** action, and two source-order opportunity previews. No charts, KPIs, or project widgets.
- `/career-insights`: readable company, role, location, and **Explore requirements** links. Skill patterns, the complete table, and research notes are secondary disclosures. The career filter appears only when multiple fields exist.
- `/career-insights/[id]`: dedicated requirement page with required, preferred, and unspecified mentions grouped separately. Exact evidence expands on demand. The primary next step opens projects connected to this internship. Source links, dates, posting status, and summary remain available in disclosures.
- `/my-projects`: project titles, brief descriptions, and **Explore project** actions. Optional `?internship=ID` shows only source-connected projects.
- `/my-projects/[id]`: purpose, expected deliverable, and recorded guided steps. **Start the guided project** navigates to the first actual step and expands its instructions; it does not create or save progress. Resources, skill connections, and employer evidence remain optional disclosures. Missing guidance is explicitly labeled.

Both detail pages provide contextual back links. Older `?internship=ID` and `?project=ID` bookmarks redirect to their dedicated routes. Unknown record IDs return 404. Skill filtering retains the original full-sample denominator and remains available at `/career-insights?skill=python`.

The shared palette remains off-white, near-black, and orange. Body text is 17px, important section headings are 19–22px, and page headings range from 32–44px. Reading widths are constrained and tiny uppercase metadata has been removed. The sidebar keeps its responsive controls while dropping numbered links and repetitive presentation.

Example: open Career Insights, choose an internship, expand one source excerpt, select **Explore relevant projects**, choose a project, then select **Start the guided project**. No onboarding, personalization, saved work, or completion tracking is included.

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
- `compareStudentSkills`: case-insensitive, trimmed canonical-ID or canonical-name matching. Returns reported skills, skills not yet reported, and unrecognized input. No proficiency inference, synonyms, or student form in this milestone.
- `findProjectsForSkills`: finds source projects whose targeted skills overlap supplied IDs and employer requirements in the project's career field. No AI ranking.
- `getRequirementsForProject`: exposes the evidence rows supporting those connections.
- `getMilestones`: returns only the project's recorded milestones in step order. Missing milestones display an explicit unavailable state.
- `safeWebUrl`: only HTTP(S) links become clickable. Text is rendered by React without HTML injection.

The application shell and navigation keep their existing responsive behavior, with simpler presentation and dedicated detail routes. Career Insights retains URL skill filters (`/career-insights?skill=python`); optional field selections come from the dataset when multiple fields exist. Only one career field is currently present. Unknown fields show empty results rather than fabricated data.

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

No scraping, live retrieval, AI, authentication, database, student onboarding, project personalization, or milestone progress tracking is included. Future milestone work requires approval.

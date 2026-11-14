# BridgePath brand style guide

## Identity

- **Name:** BridgePath
- **Tagline:** From potential to proof.
- **Mission:** Help college students turn career interests into demonstrable experience and internship opportunities.
- **Personality:** Editorial, intelligent, approachable, credible, purposeful.

Speak plainly. Explain what evidence supports an insight and what remains unknown. Use “not yet documented” rather than declaring that a student lacks a skill. Distinguish required, preferred, and unspecified qualifications. Never imply employer endorsement, guaranteed eligibility, or current availability from cached postings.

## Typography

The application uses **Georgia, "Times New Roman", serif**. Georgia is the actual family used by the original dashboard welcome headline. It now supplies body copy, headings, navigation, cards, labels, buttons, and native inputs/selects. No web-font download or extra font dependency is required. The precise rendering depends on the fonts installed on the viewing device; Times New Roman and the system serif are fallbacks.

CSS tokens: `--font-editorial`, `--headline`, and `--font-ui` resolve to this family; Tailwind's `--font-sans` also uses the same family so utilities cannot accidentally introduce a second font.

| Element | Desktop | Mobile | Weight / treatment |
| --- | --- | --- | --- |
| Main heading | 44px; 38px below 1050px | 36px below 700px | 400; line-height 1.18; restrained negative tracking |
| Section heading | 26px | 24px | Usually 400–600; line-height 1.4 |
| Project listing title | 28px | 26px | 400; deliberate editorial emphasis |
| Other listing title | 26px | 24px | 400; line-height 1.35 |
| Subheading / important label | 18–20px | 18–20px | 400–600; line-height 1.5 |
| Body | 18px | 17px | 400; line-height 1.75 |
| Introductory copy | 18px | 17px | 400; line-height 1.8 |
| Buttons / navigation | 17px | 16–17px | 500–600; clear focus state |
| Secondary evidence / metadata | 16–17px | 16–17px | 400; muted charcoal |
| Wordmark | 28px | 28px | 700; letter-spacing -1.5px |

Use regular type for reading and bold for meaningful emphasis. Avoid tiny uppercase metadata and excessive italics. Source quotations use a rule and indentation rather than a different font. Browser-native dropdown popovers may follow operating-system conventions, while the closed controls inherit Georgia.

Examples: “Choose your next project” is a main heading; “What you’ll produce” is a section heading; “Suggested concept · not guided” is readable secondary metadata. “Explore project” is a direct action label.

## Color palette

| CSS token / color | HEX | Use |
| --- | --- | --- |
| `--paper` | `#F6F4EE` | Main canvas, sidebar, warm off-white surfaces |
| `--ink` | `#171717` | Primary copy, headings, outlines, text on orange buttons |
| `--accent` / Tailwind brand | `#F05A32` | Primary-action fills, active navigation rule, evidence accents |
| `--muted` | `#625E57` | Secondary readable copy and metadata |
| `--line` | `#D8D4CA` | Subtle separators and boundaries |
| Input fill | `#FDFCF8` | Form-control surface |
| Input border | `#AAA396` | Form-control outline |
| Mobile overlay | `#17171766` | Translucent navigation backdrop only |

Use near-black text on the orange primary button. Orange is an accent, not a long-form text color on off-white. Avoid gradients, glows, glass effects, and decorative shadows. Do not rely on color alone to distinguish requirement classifications or recommendation types.

## Components

### Buttons and links

Primary buttons use a solid orange fill, near-black text, a thin orange border, generous padding, and nearly square corners. Pair a verb with an object: “Explore project,” “Review your opportunities.” Use one dominant next action in a detail view. Repeated listings each have one local exploration action. Secondary actions are text links, with underlines/underline offsets where appropriate. Arrows supplement text; never make an icon the only explanation of an action. External links announce a new tab and use safe HTTP(S) URLs.

### Navigation

Use the existing compact sidebar and top breadcrumb. An active link has text emphasis and an orange left rule, plus `aria-current`. The wordmark combines BridgePath with its simple arrow. The footer uses the tagline. My Opportunities remains the main student destination; Career Insights is the broader research tool.

### Listings and cards

Prefer an open vertical list with subtle horizontal rules over nested boxes. Titles come first, followed by concise purpose, relevance, and one action. Project types are explicit: **Guided workbook project**, **Workbook brief · not guided**, and **Suggested concept · not guided**. A shared skill does not mean an employer sponsors a project. Keep full quotations and employer connections behind expandable details.

### Forms and inputs

Use visible 18px labels above controls. Inputs/selects inherit the shared font, use a warm pale fill, a thin border, a small radius, and generous padding. Provide optional/required context in words. Errors explain the correction and are linked to controls; focus outlines must remain visible. Graduation uses month and year choices; GPA uses a numeric value and separate scale. Canonical skills use search and checkbox selection; custom skills remain labeled custom.

### Badges and metadata

Use readable text labels and restrained rules rather than colorful pills. Classification text must say required, preferred, or unspecified. Do not use compatibility percentages, employer-market statistics, or arbitrary competency grades.

### Expandable details

Native `details` / `summary` reveal source quotations, employer connections, resources, and recorded milestones. Summaries must describe the hidden content and work with keyboard navigation. Use a warm-gray rule and a comfortable click target. Evidence blockquotes have a slim orange left rule and muted readable text.

### Progress indicators

The onboarding stage indicator communicates the current setup stage with readable labels and an active underline. It is a navigation aid, not a competency score. Project milestones are recorded guided steps; completion tracking is not implemented. Never show invented completion percentages or completed states.

## Layout and rhythm

Use 8px-based spacing as a practical rhythm: 8–16px within related content, 20–28px around actions and disclosure groups, and 32–48px between meaningful sections. Existing rules use occasional optical adjustments. The main content container caps at 1060px including padding; dashboard caps at 980px. Body paragraphs generally cap at 65 characters, with project descriptions at 62ch. Main desktop padding is 55px vertically / 48px horizontally; medium screens use 42px / 32px; small screens use 35px / 24px, then 20px horizontal below 380px.

The sidebar is 240px on desktop, 220px below 1050px, and becomes a 270px off-canvas drawer below 700px. Its menu button announces expanded state. Escape closes the drawer; focus returns to the opener. Keep single-column listings on mobile, wrap long headings and tokens, and preserve readable control sizes. Use generous whitespace, not extra decorative panels.

**One page, one primary action, one clear next step.** Keep qualification detail, resources, and employer evidence progressively disclosed. A selection screen should help students choose; the detail screen should help them understand and act.

## Presentation design — future PowerPoint

Do not generate a deck from this milestone; use these specifications when creating one.

### Canvas and type

Use **16:9 widescreen, 13.333 × 7.5 inches**. Set the slide background to `#F6F4EE`; use Georgia throughout and embed it only if licensing/export support permits. Otherwise check the Times New Roman fallback on the presentation computer. Use 36–44pt headlines, 24–28pt section headings, 20–24pt body text, and 14–16pt source captions and footer text. Limit each slide to one claim and roughly three short supporting points. Use regular and bold, with minimal italics.

### Title slide

Place the BridgePath wordmark near the upper-left inside a 0.6-inch margin. Use a large, left-aligned “From potential to proof.” headline, then the mission in a short readable block. A single orange rule or small accent mark is sufficient. Put presenter/team and event details in muted charcoal near the bottom. Avoid oversized decorative shapes, gradients, or fake dashboard metrics.

### Suggested layouts

- **Problem / insight:** One headline with a short left text column and one supporting source or simple illustration on the right.
- **Student journey:** Four numbered stages: profile → opportunities → role evidence → relevant project. Use near-black labels and thin orange connectors.
- **Product demonstration:** One large application screenshot with one or two brief annotations outside its frame.
- **Evidence / architecture:** An ordered diagram showing workbook → validated JSON → deterministic matching → personalized interface. Keep source data distinct from suggested project concepts.
- **Before / after:** Equal-width examples showing a broad catalog versus a focused student shortlist; label the scenario and avoid implying market-wide outcomes.
- **Results / limitations:** A simple table of verified functionality, checks, and remaining scope.

### Screenshots

Capture the real implementation with synthetic demo profile data. Crop browser chrome unless it helps the demo. Keep a warm-gray 1pt frame, nearly square corners, and no floating shadow. Use a consistent aspect ratio and crop. Never stretch screenshots; enlarge the key region rather than shrinking text below legibility. Label concepts as unguided and retained postings as cached/unverified when visible.

### Diagrams and charts

Use near-black labels, warm-gray dividers, and orange for the one emphasized path or series. Use Georgia labels, direct annotations, and simple rectangular nodes. Avoid 3D charts, heavy grids, gradients, decorative icons, and invented statistics. Counts must come from the workbook, with the sample and retrieval context stated. Distinguish data sources from derived recommendations with explicit labels rather than color alone.

### Footer and consistency

Use a thin warm-gray rule at a fixed position approximately 0.4 inches from the bottom. Place “BridgePath · From potential to proof.” at the left and the slide number at the right in muted charcoal, 14–16pt. Keep source attribution above this footer, near its supporting claim. Align titles, content columns, screenshots, and footers to a consistent grid across the deck.

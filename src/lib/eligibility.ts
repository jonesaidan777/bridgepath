import type { Internship } from "./workbook-types";
import type { CareerContext, DegreeLevel } from "./student-profile";

export interface EligibilityCheck {
  kind:
    | "enrollment"
    | "degree"
    | "major"
    | "academic_year"
    | "graduation"
    | "gpa"
    | "verification";
  status: "confirmed" | "uncertain" | "unmet";
  classification: "required" | "preferred";
  explanation: string;
  evidence: string;
  sourceField: string;
}
const monthNames = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const monthPattern = monthNames.join("|");
const norm = (value: string) => value.toLowerCase().replace(/[’']/g, "").trim();
const majorNames = [
  "computer science",
  "software engineering",
  "computer engineering",
  "electrical engineering",
  "mechanical engineering",
  "aerospace engineering",
  "optical engineering",
  "information systems",
  "data science",
  "business analytics",
  "mathematics",
  "statistics",
  "econometrics",
  "economics",
  "finance",
  "business",
  "marketing",
  "physics",
  "cyber security",
  "engineering",
];
const majorAliases: Record<string, string> = {
  cs: "computer science",
  ee: "electrical engineering",
  ece: "electrical engineering",
  math: "mathematics",
};

/** Only explicit source clauses are evaluated. Unsupported/ambiguous wording stays a question. */
export function evaluateEligibility(
  context: CareerContext,
  job: Internship,
): EligibilityCheck[] {
  const checks: EligibilityCheck[] = [];
  const add = (
    kind: EligibilityCheck["kind"],
    status: EligibilityCheck["status"],
    explanation: string,
    evidence: string,
    sourceField: string,
    classification: EligibilityCheck["classification"] = "required",
  ) => {
    if (
      !checks.some(
        (check) =>
          check.kind === kind &&
          check.evidence === evidence &&
          check.classification === classification,
      )
    )
      checks.push({
        kind,
        status,
        explanation,
        evidence,
        sourceField,
        classification,
      });
  };
  const sources = [
    ["requirements", job.requirements, "required"],
    ["preferred", job.preferred, "preferred"],
    ["program_details", job.program_details, "required"],
  ] as const;
  for (const [field, text, initialClassification] of sources) {
    if (!text) continue;
    for (const raw of text.split("\n")) {
      const line = raw.replace(/^[-•\s]+/, "").trim();
      const lower = norm(line);
      if (!line) continue;
      // Application questions and protected-characteristic requirements cannot be
      // answered from demographics, residence, school, or nationality guesses.
      if (
        /\bat least 18\b|\bwork authori[sz]|\beligible to work|sponsor|export.control|u\.s\. person|\[application questions\]/i.test(
          line,
        )
      ) {
        add(
          "verification",
          "uncertain",
          "Verify this source condition directly with the employer. Protected demographic answers are never consulted.",
          line,
          field,
        );
        if (/application (?:questions|asks)/i.test(line)) continue;
      }
      const classification = initialClassification;
      const alternativeExperience =
        /or equivalent (?:practical |technical )?experience/.test(lower);
      const statusFor = (fits: boolean): EligibilityCheck["status"] =>
        fits ? "confirmed" : alternativeExperience ? "uncertain" : "unmet";
      if (
        field !== "program_details" &&
        /currently (?:enrolled|pursuing|studying)|continuing .*student|current university student|undergraduate college student|enrolled in (?:a |an )?(?:graduate|bachelor|master)/.test(
          lower,
        )
      ) {
        add(
          "enrollment",
          ["full_time", "part_time"].includes(
            context.education.enrollmentStatus,
          )
            ? "confirmed"
            : "unmet",
          `Your profile reports ${context.education.enrollmentStatus === "part_time" ? "part-time" : "full-time"} enrollment at ${context.education.college || "a college"}.`,
          line,
          field,
          classification,
        );
      }
      if (
        field !== "program_details" &&
        /degree|program|undergraduate|masters|mba|\bbs\b|\bms\b|phd/.test(
          lower,
        ) &&
        /pursu|enroll|student|educational background|degree program/.test(lower)
      ) {
        const allowed = new Set<DegreeLevel>();
        if (/bachelor|\bbs\b|b\.s\./.test(lower)) allowed.add("bachelor");
        if (/undergraduate/.test(lower)) {
          allowed.add("associate");
          allowed.add("bachelor");
        }
        if (/master|\bmba\b|\bms\b|m\.s\./.test(lower)) allowed.add("master");
        if (
          /\bgraduate (?:degree|program|student)|undergraduate,? graduate/.test(
            lower,
          )
        ) {
          allowed.add("master");
          allowed.add("doctoral");
        }
        if (/ph\.?d|doctoral/.test(lower)) allowed.add("doctoral");
        if (/associate/.test(lower)) allowed.add("associate");
        if (allowed.size) {
          const fits = allowed.has(
            context.education.degreeLevel as DegreeLevel,
          );
          add(
            "degree",
            statusFor(fits),
            fits
              ? "Your reported degree level is one of the levels explicitly listed."
              : alternativeExperience
                ? "The posting allows equivalent experience; verify that alternative with the employer."
                : `Your reported ${context.education.degreeLevel || "unspecified"} degree is outside the listed degree levels.`,
            line,
            field,
            classification,
          );
        }
        const listed = majorNames.filter((name) => lower.includes(name));
        if (/\bin ee\b|\bee or ece\b/.test(lower))
          listed.push("electrical engineering", "computer engineering");
        if (listed.length) {
          const studentMajor =
            majorAliases[norm(context.education.major)] ??
            norm(context.education.major);
          const fits = listed.some(
            (name) =>
              studentMajor === name ||
              (name === "engineering" && /engineering/.test(studentMajor)),
          );
          add(
            "major",
            fits ? "confirmed" : "uncertain",
            fits
              ? "Your major matches an explicitly listed field of study."
              : "Your major is not an exact listed-field match. Related-field equivalence needs employer verification.",
            line,
            field,
            classification,
          );
        }
      }
      if (
        /first\/second year applicants only|first year of a 3.year|juniors? or seniors?|junior or senior standing|school year:/.test(
          lower,
        )
      ) {
        const early = /first\/second|first year of/.test(lower);
        const allowed = early ? ["1", "2"] : ["3", "4"];
        const fits = allowed.includes(context.education.academicYear);
        const uncertain =
          (/or equivalent|3.year course|4.year course/.test(lower) && fits) ||
          context.education.academicYear === "5+";
        add(
          "academic_year",
          uncertain ? "uncertain" : statusFor(fits),
          uncertain
            ? "Check academic standing and course-length wording with the employer; year number alone cannot confirm it."
            : fits
              ? "Your academic year matches the explicitly listed years."
              : "Your reported academic year is outside the explicitly listed years.",
          line,
          field,
          classification,
        );
      } else if (field === "requirements" && /penultimate year/.test(lower)) {
        add(
          "academic_year",
          "uncertain",
          "Confirm penultimate-year standing; total degree duration is not assumed.",
          line,
          field,
          classification,
        );
      }
      if (
        field !== "program_details" &&
        /graduat|expected completion|degree completion/.test(lower)
      ) {
        const target = context.education.expectedGraduation;
        const monthIndex = (name: string) =>
          String(monthNames.indexOf(name.toLowerCase()) + 1).padStart(2, "0");
        const range = line.match(
          new RegExp(
            `between (${monthPattern})\\s+(20\\d{2})\\s+(?:and|[-–])\\s*(${monthPattern})\\s+(20\\d{2})`,
            "i",
          ),
        );
        const sameYearRange = line.match(
          new RegExp(
            `between (${monthPattern})\\s+and\\s+(${monthPattern})\\s+(20\\d{2})`,
            "i",
          ),
        );
        const minimum = line.match(
          new RegExp(
            `not graduating before (${monthPattern})\\s+(20\\d{2})`,
            "i",
          ),
        );
        const exactYear = line.match(
          /(?:graduating in|graduate in)\s+(20\d{2})\b|\b(20\d{2}) graduate\b/i,
        );
        let fits: boolean | undefined;
        if (range)
          fits =
            target >= `${range[2]}-${monthIndex(range[1])}` &&
            target <= `${range[4]}-${monthIndex(range[3])}`;
        else if (sameYearRange)
          fits =
            target >= `${sameYearRange[3]}-${monthIndex(sameYearRange[1])}` &&
            target <= `${sameYearRange[3]}-${monthIndex(sameYearRange[2])}`;
        else if (minimum)
          fits = target >= `${minimum[2]}-${monthIndex(minimum[1])}`;
        else if (exactYear)
          fits = target.startsWith(exactYear[1] || exactYear[2]);
        else {
          const years = [...line.matchAll(/\b20\d{2}\b/g)].map((match) =>
            Number(match[0]),
          );
          if (years.length && /graduat|expected completion/.test(lower)) {
            const year = Number(target.slice(0, 4));
            if (year < Math.min(...years) || year > Math.max(...years))
              fits = false;
            // Seasonal academic calendars are not converted to invented month bounds.
            else {
              const alternatives = line.match(
                new RegExp(
                  `(${monthPattern})\\s+(20\\d{2})\\s+or\\s+(?:spring|summer|fall|winter)\\s+(20\\d{2})`,
                  "i",
                ),
              );
              if (
                alternatives &&
                target === `${alternatives[2]}-${monthIndex(alternatives[1])}`
              )
                fits = true;
              else if (
                alternatives &&
                year === Number(alternatives[2]) &&
                alternatives[2] !== alternatives[3]
              )
                fits = false;
            }
          }
        }
        add(
          "graduation",
          fits === undefined ? "uncertain" : fits ? "confirmed" : "unmet",
          fits === undefined
            ? "The graduation wording uses a seasonal, relative, or unrecognized window. Verify the exact dates."
            : fits
              ? "Your graduation month/year fits the explicit source window."
              : "Your graduation month/year is outside the explicit source window.",
          line,
          field,
          classification,
        );
      }
      const gpa = line.match(
        /gpa\s*(?:of|:|>=|at least|minimum)?\s*(\d+(?:\.\d+)?)/i,
      );
      if (gpa) {
        const sourceScale = line.match(
          /(?:out of|on a|\/)\s*(\d+(?:\.\d+)?)\s*(?:point|scale)?/i,
        );
        let status: EligibilityCheck["status"] = "uncertain";
        let explanation = !context.education.gpa
          ? "GPA is optional and not documented. Verify the posting’s GPA wording."
          : "The posting does not state a comparable GPA scale; no cross-scale conversion is assumed.";
        if (
          context.education.gpa &&
          sourceScale &&
          Number(sourceScale[1]) === Number(context.education.gpaScale)
        ) {
          status =
            Number(context.education.gpa) >= Number(gpa[1])
              ? "confirmed"
              : "unmet";
          explanation =
            status === "confirmed"
              ? "Your reported GPA meets the explicit threshold on the same scale."
              : "Your reported GPA is below the explicit threshold on the same scale.";
        }
        add("gpa", status, explanation, line, field, classification);
      }
    }
  }
  if (!checks.some((check) => check.classification === "required"))
    checks.push({
      kind: "verification",
      status: "uncertain",
      classification: "required",
      explanation:
        "No machine-checkable education eligibility was provided. Review the original posting.",
      evidence:
        job.requirements ||
        "Detailed eligibility not provided in the workbook.",
      sourceField: "requirements",
    });
  return checks;
}

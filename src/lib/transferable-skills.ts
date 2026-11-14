/** Transferable strengths implied by an experience, from its type and wording. */
export function transferableSkills(row: { kind: string; title: string; description: string; accomplishments?: string }) {
  const text = `${row.title} ${row.description} ${row.accomplishments ?? ""}`.toLowerCase();
  const found = new Set<string>({
    internship: ["Professional experience"],
    work: ["Reliability", "Communication"],
    research: ["Research", "Analysis"],
    extracurricular: ["Teamwork"],
  }[row.kind] ?? []);
  const cues: [RegExp, string][] = [
    [/help|assist|support|customer|front desk|student/, "Helping people"],
    [/team|club|group|collaborat/, "Teamwork"],
    [/lead|manag|organiz|coordinat/, "Organization"],
    [/track|sheet|excel|data|record/, "Working with data"],
    [/explain|present|teach|tutor/, "Explaining ideas"],
    [/check|valid|test|accura/, "Attention to detail"],
    [/solve|fix|troubleshoot|diagnos/, "Problem solving"],
  ];
  for (const [pattern, label] of cues) if (pattern.test(text)) found.add(label);
  return [...found];
}

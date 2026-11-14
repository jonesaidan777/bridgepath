import Link from "next/link";
import { display, researchHref } from "@/lib/data";
import type { SkillFrequency } from "@/lib/workbook-types";

/** Counts come from the existing distinct-internship calculation, never UI arithmetic. */
export function SkillDemand({
  rows,
  selectedSkillId,
  careerField,
}: {
  rows: SkillFrequency[];
  selectedSkillId?: string;
  careerField?: string;
}) {
  if (!rows.length)
    return (
      <p className="data-empty">
        No skill requirements recorded for this selection.
      </p>
    );
  return (
    <div className="demand-bars">
      {rows.map((row) => {
        const selected = selectedSkillId === row.skill.skill_id;
        return (
          <Link
            key={row.skill.skill_id}
            href={`${researchHref({ careerField, skillId: selected ? undefined : row.skill.skill_id })}#opportunities`}
            className={`demand-choice ${selected ? "is-selected" : ""}`}
            aria-current={selected ? "true" : undefined}
          >
            <div className="demand-label">
              <span>{display(row.skill.skill_name)}</span>
              <span>
                <strong>{row.count}</strong> / {row.total} internships
              </span>
            </div>
            <div className="demand-track" aria-hidden="true">
              <span
                style={{
                  width: `${row.total ? (row.count / row.total) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="demand-breakdown">
              <span>{row.required} required</span>
              <span>{row.preferred} preferred</span>
              <span>{row.unspecified} unspecified</span>
              {selected && <strong>Selected</strong>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

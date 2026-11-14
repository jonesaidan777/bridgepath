"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { Skill } from "@/lib/workbook-types";

export function SkillPicker({
  id,
  skills,
  selected,
  onChange,
  showSelected = true,
}: {
  id: string;
  skills: Skill[];
  selected: string[];
  onChange(ids: string[]): void;
  showSelected?: boolean;
}) {
  const [query, setQuery] = useState("");
  const results = skills.filter((skill) =>
    `${skill.skill_name ?? ""} ${skill.skill_id}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  const visible = results.slice(0, query.trim() ? 20 : 8);
  return (
    <div className="skill-picker">
      <label htmlFor={id}>Search recognized skills</label>
      <input
        id={id}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="e.g. Python, Excel, circuit design"
      />
      <p className="field-hint" role="status">
        {results.length} recognized skills
        {results.length > visible.length
          ? ` · Showing ${visible.length}; search to narrow the list`
          : ""}
        .
      </p>
      <div className="skill-picker-results">
        {visible.map((skill) => (
          <label className="checkbox-label" key={skill.skill_id}>
            <input
              type="checkbox"
              checked={selected.includes(skill.skill_id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...new Set([...selected, skill.skill_id])]
                    : selected.filter((value) => value !== skill.skill_id),
                )
              }
            />
            {skill.skill_name || skill.skill_id}
          </label>
        ))}
      </div>
      {!results.length && (
        <p className="supporting-text">
          No recognized skill matches. You can still record custom skills in
          your profile.
        </p>
      )}
      {showSelected && selected.length > 0 && (
        <ul className="profile-tags" aria-label="Selected recognized skills">
          {selected.map((value) => (
            <li key={value}>
              {skills.find((skill) => skill.skill_id === value)?.skill_name ||
                value}
              <button
                type="button"
                aria-label={`Remove ${skills.find((skill) => skill.skill_id === value)?.skill_name || value}`}
                onClick={() => onChange(selected.filter((id) => id !== value))}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

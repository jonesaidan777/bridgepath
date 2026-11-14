"use client";

import { useState, type ReactNode } from "react";
import { X, Plus } from "lucide-react";
import { uniqueEntries } from "@/lib/student-profile";

export function FormField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="profile-field">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function TagEditor({
  id,
  label,
  values,
  onChange,
  suggestions = [],
  error,
  hint,
}: {
  id: string;
  label: string;
  values: string[];
  onChange(values: string[]): void;
  suggestions?: string[];
  error?: string;
  hint?: string;
}) {
  const [input, setInput] = useState("");
  function add() {
    if (!input.trim()) return;
    onChange(uniqueEntries([...values, input.slice(0, 160)]));
    setInput("");
  }
  return (
    <FormField id={id} label={label} error={error} hint={hint}>
      <div className="entry-input">
        <input
          id={id}
          value={input}
          maxLength={160}
          onChange={(event) => setInput(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          className="text-button"
          onClick={add}
          disabled={!input.trim()}
          aria-label={`Add to ${label}`}
        >
          <Plus size={18} />
          Add
        </button>
      </div>
      <p className="field-hint">Press Add or Enter to include each item.</p>
      {values.length > 0 && (
        <ul className="profile-tags" aria-label={`Selected ${label}`}>
          {values.map((value) => (
            <li key={value}>
              {value}
              <button
                type="button"
                onClick={() =>
                  onChange(values.filter((item) => item !== value))
                }
                aria-label={`Remove ${value}`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {suggestions.length > 0 && (
        <div className="suggested-entries">
          {suggestions.map((value) => {
            const selected = values.some(
              (item) => item.toLowerCase() === value.toLowerCase(),
            );
            return (
              <button
                type="button"
                key={value}
                className="text-button"
                disabled={selected}
                onClick={() => onChange(uniqueEntries([...values, value]))}
              >
                {selected ? "Added: " : "+ "}
                {value}
              </button>
            );
          })}
        </div>
      )}
    </FormField>
  );
}

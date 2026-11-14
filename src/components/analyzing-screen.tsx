"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export const ANALYZING_FLAG = "bridgepath.showAnalyzing";

/** Set right before navigating from Discover so Where you stand plays the intro once. */
export function requestAnalyzingIntro() {
  try { sessionStorage.setItem(ANALYZING_FLAG, "1"); } catch { /* storage blocked: skip the intro */ }
}
/** Reads and clears the one-time flag. */
export function takeAnalyzingIntro() {
  try {
    const wanted = sessionStorage.getItem(ANALYZING_FLAG) === "1";
    sessionStorage.removeItem(ANALYZING_FLAG);
    return wanted;
  } catch {
    return false;
  }
}

/** Short step-by-step loading screen shown between Discover and Where you stand. */
export function AnalyzingScreen({ roleCount, onDone }: { roleCount: number; onDone: () => void }) {
  const steps = [
    "Reading your profile",
    `Comparing you to ${roleCount} ${roleCount === 1 ? "role" : "roles"}`,
    "Checking the skills employers ask for",
    "Building your plan",
  ];
  const [done, setDone] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const stepMs = reduced ? 250 : 650;
    const timers = steps.map((_, index) => setTimeout(() => setDone(index + 1), stepMs * (index + 1)));
    const finish = setTimeout(onDone, stepMs * steps.length + (reduced ? 150 : 450));
    return () => { timers.forEach(clearTimeout); clearTimeout(finish); };
    // Runs once per mount; the step list length is fixed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="analyzing" role="status" aria-live="polite">
    <div className="analyzing-card">
      <div className="analyzing-spinner" aria-hidden="true"/>
      <h1>Seeing where you stand…</h1>
      <ol className="analyzing-steps">
        {steps.map((step, index) => <li key={step} className={index < done ? "is-done" : index === done ? "is-active" : ""}>
          <span className="analyzing-dot" aria-hidden="true">{index < done && <Check size={14} strokeWidth={3}/>}</span>
          {step}
        </li>)}
      </ol>
      <div className="analyzing-bar" aria-hidden="true"><span style={{ width: `${(done / steps.length) * 100}%` }}/></div>
    </div>
  </div>;
}

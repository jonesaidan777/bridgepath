"use client";

import { useRouter } from "next/navigation";
import { useStudentProfile } from "./profile-provider";

const steps = [
  { id: "profile", label: "Your profile" },
  { id: "opportunities", label: "Your opportunities" },
  { id: "direction", label: "Your direction" },
] as const;
type StepId = (typeof steps)[number]["id"];

/** Clickable journey breadcrumbs shown on Discover, Where you stand, and Resume. */
export function JourneyCrumbs({ current }: { current: StepId }) {
  const router = useRouter();
  const { setJourneyStage } = useStudentProfile();
  function go(id: StepId) {
    if (id === "profile") {
      setJourneyStage("profile");
      router.push("/onboarding?edit=1");
    } else router.push(id === "opportunities" ? "/discover-opportunities" : "/your-fit");
  }
  return <nav className="journey-crumbs" aria-label="Your journey">
    <ol>
      {steps.map(step => <li key={step.id}>
        {step.id === current
          ? <span aria-current="step">{step.label}</span>
          : <button type="button" onClick={() => go(step.id)}>{step.label}</button>}
      </li>)}
    </ol>
  </nav>;
}

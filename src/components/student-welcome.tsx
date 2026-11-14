"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { careerFieldLabel } from "@/lib/profile-options";
import { useStudentProfile } from "./profile-provider";

export function StudentWelcome() {
  const { profile } = useStudentProfile();
  return (
    <header className="page-heading">
      <h1>Welcome, {profile.personal.preferredName}.</h1>
      <p>
        Your direction:{" "}
        <strong>
          {profile.careerInterests.map(careerFieldLabel).join(", ")}
        </strong>
        .
      </p>
      <p>Your evidence-based shortlist is ready in Career Insights.</p>
      <Link href="/career-insights" className="button">
        View Career Insights
        <ArrowRight size={20} />
      </Link>
    </header>
  );
}

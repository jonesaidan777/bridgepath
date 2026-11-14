"use client";

import { useRouter } from "next/navigation";
import { useStudentProfile } from "./profile-provider";
import { projectStartHref } from "./project-dialog";
import type { ProjectRecommendation } from "@/lib/project-recommendations";

/** Records the project as started, finishes onboarding, and opens its page. */
export function useStartProject() {
  const { profile, saveProfile, setJourneyStage } = useStudentProfile();
  const router = useRouter();
  return (project: ProjectRecommendation) => {
    const started = [project.id, ...(profile.startedProjects ?? []).filter(id => id !== project.id)];
    saveProfile({ ...profile, startedProjects: started });
    setJourneyStage("complete");
    router.push(projectStartHref(project));
  };
}

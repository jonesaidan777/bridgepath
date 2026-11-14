export type JourneyStage = "profile" | "discovery" | "complete";

/** Only journey position is ephemeral; profile answers and interests stay saved. */
export function journeyRedirect(stage: JourneyStage, pathname: string, profileCompleted: boolean): string | null {
  if (stage === "profile") return pathname === "/onboarding" ? null : "/onboarding";
  if (stage === "discovery") {
    if (!profileCompleted) return "/onboarding";
    return pathname === "/discover-opportunities" || pathname === "/onboarding"
      ? null : "/discover-opportunities";
  }
  return profileCompleted || pathname === "/onboarding" || pathname === "/profile"
    ? null : "/onboarding";
}

import type { OnboardingStep } from "@/lib/student-profile";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; step?: string }>;
}) {
  const { edit, step } = await searchParams;
  return (
    <OnboardingWizard
      editing={edit === "1"}
      initialStep={
        ["1", "2", "3", "4", "5"].includes(step || "")
          ? (Number(step) as OnboardingStep)
          : undefined
      }
    />
  );
}

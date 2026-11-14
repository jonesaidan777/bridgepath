import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ProfileProvider, ProfileGate } from "@/components/profile-provider";
import { getSkills, getCareerFields, getInternships } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "BridgePath — Your next chapter",
  description: "Turn real career opportunities into actionable experience.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <ProfileProvider
          canonicalSkills={getSkills()}
          careerFields={getCareerFields()}
          internshipOptions={getInternships().map((job) => ({
            title: job.job_title || "",
            field: job.career_field || "",
            location: job.location || "",
          }))}
        >
          <ProfileGate>
            <AppShell>{children}</AppShell>
          </ProfileGate>
        </ProfileProvider>
      </body>
    </html>
  );
}

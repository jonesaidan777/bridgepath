"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useStudentProfile } from "./profile-provider";
import { ProfileSummary } from "./profile-summary";

export function StudentProfilePage() {
  const { profile, ready, saveProfile, deleteProfile } = useStudentProfile();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState("");
  const router = useRouter();
  if (!ready) return <p role="status">Loading your profile…</p>;
  function removeDemographics() {
    if (
      saveProfile({
        ...profile,
        consent: { saveDemographics: false },
        demographics: null,
      })
    )
      setNotice(
        "Optional demographic answers have been removed from the current profile. Check any storage warning above to confirm whether the browser saved this change.",
      );
  }
  return (
    <div className="page-content profile-page">
      <header className="page-heading">
        <h1>Your profile</h1>
        <p>
          Your information stays in this browser. This is local-device storage,
          not a secure cloud account.
        </p>
        <Link
          href={
            profile.onboarding.completed ? "/onboarding?edit=1" : "/onboarding"
          }
          className="button"
        >
          {profile.onboarding.completed ? "Edit profile" : "Continue setup"}
          <ArrowRight size={18} />
        </Link>
      </header>
      {!profile.onboarding.completed && (
        <p className="profile-inline-notice">
          Setup is incomplete. Complete all four stages before exploring
          internships.
        </p>
      )}
      {notice && (
        <p role="status" className="profile-inline-notice">
          {notice}
        </p>
      )}
      <ProfileSummary profile={profile} />
      <section className="profile-data-controls">
        <h2>Your local data</h2>
        <p>
          Deleting your profile removes the information saved by BridgePath on
          this browser. Raw resume documents are never saved here.
        </p>
        {profile.consent.saveDemographics && (
          <button
            className="plain-button"
            type="button"
            onClick={removeDemographics}
          >
            Remove optional demographic answers
          </button>
        )}
        {!confirmDelete ? (
          <button
            className="plain-button delete-profile-button"
            type="button"
            onClick={() => setConfirmDelete(true)}
          >
            Delete locally saved profile
          </button>
        ) : (
          <div className="delete-confirmation">
            <p>
              This will remove your saved profile and setup progress from this
              browser.
            </p>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                if (deleteProfile()) router.replace("/onboarding");
              }}
            >
              Delete profile from this browser
            </button>
            <button
              type="button"
              className="plain-button"
              onClick={() => setConfirmDelete(false)}
            >
              Keep my profile
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

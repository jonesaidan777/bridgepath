"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Skill } from "@/lib/workbook-types";
import {
  deleteLocalProfile,
  emptyProfile,
  loadLocalProfile,
  parseStoredProfile,
  PROFILE_STORAGE_KEY,
  saveLocalProfile,
  serializeProfile,
  type StudentProfile,
} from "@/lib/student-profile";

import { journeyRedirect, type JourneyStage } from "@/lib/onboarding-journey";

interface ProfileContextValue {
  journeyStage: JourneyStage;
  setJourneyStage(stage: JourneyStage): void;
  profile: StudentProfile;
  ready: boolean;
  message: string;
  canonicalSkills: Skill[];
  careerFields: string[];
  internshipOptions: { title: string; field: string; location: string }[];
  saveProfile(profile: StudentProfile): boolean;
  deleteProfile(): boolean;
}
const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({
  children,
  canonicalSkills,
  careerFields,
  internshipOptions,
}: {
  children: ReactNode;
  canonicalSkills: Skill[];
  careerFields: string[];
  internshipOptions: { title: string; field: string; location: string }[];
}) {
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile);
  // Deliberately not persisted: every full reload starts the onboarding journey.
  const [journeyStage, setJourneyStage] = useState<JourneyStage>("profile");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    function restore() {
      try {
        const loaded = loadLocalProfile(window.localStorage);
        setProfile(loaded.profile);
        setMessage(loaded.message);
      } catch {
        setMessage(
          "Browser storage is unavailable. You can continue in this session, but progress may not survive a refresh.",
        );
      }
    }
    restore();
    setReady(true);
    function sync(event: StorageEvent) {
      if (event.key === PROFILE_STORAGE_KEY || event.key === null) restore();
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function saveProfile(next: StudentProfile) {
    let sanitized: StudentProfile;
    try {
      sanitized = parseStoredProfile(serializeProfile(next))!;
    } catch {
      setMessage(
        "The profile could not be saved because some values are invalid. Review your entries.",
      );
      return false;
    }
    try {
      saveLocalProfile(window.localStorage, sanitized);
      setMessage("");
    } catch {
      setMessage(
        "Your changes are available for this session, but could not be saved in this browser. Refreshing may lose them.",
      );
    }
    setProfile(sanitized);
    return true;
  }
  function deleteProfile() {
    try {
      deleteLocalProfile(window.localStorage);
      setProfile(emptyProfile());
      setJourneyStage("profile");
      setMessage("");
      return true;
    } catch {
      setMessage(
        "The saved profile could not be removed. Please retry or clear this site’s data in your browser settings.",
      );
      return false;
    }
  }
  return (
    <ProfileContext.Provider
      value={{
        profile,
        journeyStage,
        setJourneyStage,
        ready,
        message,
        canonicalSkills,
        careerFields,
        internshipOptions,
        saveProfile,
        deleteProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
export function useStudentProfile() {
  const context = useContext(ProfileContext);
  if (!context)
    throw new Error("Student profile components require ProfileProvider.");
  return context;
}

export function ProfileGate({ children }: { children: ReactNode }) {
  const { profile, ready, message, journeyStage } = useStudentProfile();
  const pathname = usePathname();
  const router = useRouter();
  const redirectTo = journeyRedirect(journeyStage, pathname, profile.onboarding.completed);
  const allowed = redirectTo === null;
  useEffect(() => {
    if (ready && redirectTo) router.replace(redirectTo);
  }, [ready, redirectTo, router]);
  if (!ready || !allowed)
    return (
      <main id="main-content" className="profile-loading" role="status">
        {ready ? "Opening your profile…" : "Loading your local profile…"}
      </main>
    );
  return (
    <>
      {message && (
        <div className="profile-message" role="status">
          {message}
        </div>
      )}
      {children}
    </>
  );
}

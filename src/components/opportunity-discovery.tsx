"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Briefcase, Check, ChevronRight, MapPin } from "lucide-react";
import { TransferableSkillsNote } from "./transferable-skills-note";
import { useStudentProfile } from "./profile-provider";
import { JourneyCrumbs } from "./journey-crumbs";
import { RoleDialog } from "./role-dialog";
import { requestAnalyzingIntro } from "./analyzing-screen";
import { toRoleReadiness } from "@/lib/readiness";
import { toCareerContext } from "@/lib/student-profile";
import { rankInternships, matchInternship } from "@/lib/matching";
import { display, getSharedSkillOpportunities } from "@/lib/data";
import { careerFieldLabel } from "@/lib/profile-options"; import { workbook as snapshot } from "@/lib/workbook";
import type { WorkbookDataset } from "@/lib/workbook-types";
import { estimateJobs, formatJobCount } from "@/lib/job-estimates";

const data = snapshot as WorkbookDataset;

function companyInitials(name: string) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

function SelectedReach({ selectedIds, fromSelection }: { selectedIds: string[]; fromSelection: boolean }) {
  const chosen = new Set(selectedIds);
  const related = new Map<string, string>();
  for (const id of selectedIds) {
    const own = data.Internships.find(job => job.internship_id === id);
    if (own?.career_field) related.set(`self:${id}`, own.career_field);
    for (const { internship } of getSharedSkillOpportunities(id) ?? [])
      if (!chosen.has(internship.internship_id)) related.set(internship.internship_id, internship.career_field || "");
  }
  if (!related.size) return null;
  const fields = [...new Set(related.values())].filter(Boolean).map(field => careerFieldLabel(field));
  const jobs = formatJobCount(estimateJobs(related.size));
  return <section className="discovery-reach" aria-label="Where your selected roles lead">
    <p className="discovery-reach-number">{jobs}</p>
    <div>
      <p className="discovery-reach-text">
        {fromSelection
          ? <>The {selectedIds.length === 1 ? "job you selected matches" : "jobs you selected match"} requirements for <strong>{jobs} jobs</strong> in {fields.join(" and ")}.</>
          : <>Your top matches line up with requirements for <strong>{jobs} jobs</strong> in {fields.join(" and ")}.</>}
      </p>
      <p className="supporting-text">{fromSelection
        ? "Build these skills once and they count toward all of them."
        : "Select the jobs that interest you to see where your choices lead."}</p>
    </div>
  </section>;
}

export function OpportunityDiscovery() {
  const { profile, ready, saveProfile, setJourneyStage } = useStudentProfile();
  const router = useRouter();
  const context = useMemo(() => toCareerContext(profile), [profile]);
  const matches = useMemo(() => rankInternships(context, data, 5), [context]);
  const [openRoleId, setOpenRoleId] = useState<string | null>(null);
  const selected = useMemo(() => data.Internships
    .filter(job => context.interestedInternshipIds.includes(job.internship_id))
    .map(job => matchInternship(context, job, data)), [context]);
  if (!ready) return <p className="profile-loading" role="status">Finding your shortlist…</p>;

  function toggleInterest(id: string) {
    const ids = profile.interestedInternshipIds ?? [];
    saveProfile({ ...profile, interestedInternshipIds: ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id] });
  }
  function finishJourney() {
    setJourneyStage("complete");
    router.push("/career-insights");
  }
  function editProfile() {
    setJourneyStage("profile");
    router.push("/onboarding?edit=1");
  }
  return <div className="onboarding-content discovery-page">
    <JourneyCrumbs current="opportunities"/>
    <header className="page-heading">
      <h1>Discover your next opportunity</h1>
      <p>Choose the internships that interest you most. We’ll use your choices to focus the projects that help you build relevant experience.</p>
    </header>
    <section className="discovery-grid" aria-label="Your top internship recommendations">
      {matches.map(match => {
        const job = match.internship;
        const checked = context.interestedInternshipIds.includes(job.internship_id);
        return <article key={job.internship_id} className={`discovery-listing${checked ? " is-selected" : ""}`}>
          <button type="button" className="discovery-select" aria-pressed={checked} onClick={() => toggleInterest(job.internship_id)}>
            <span className="sr-only">{checked ? "Deselect" : "Select"} {display(job.job_title)} at {display(job.company)}</span>
          </button>
          <div className="discovery-card-head">
            <span className="discovery-logo" aria-hidden="true">{companyInitials(display(job.company))}</span>
            <p className="discovery-company">{display(job.company)}</p>
            <span className="discovery-check" aria-hidden="true">{checked && <Check size={14} strokeWidth={3}/>}</span>
          </div>
          <h2>
            <button type="button" className="discovery-title-link" onClick={() => setOpenRoleId(job.internship_id)}>
              {display(job.job_title)}<ChevronRight size={18} aria-hidden="true"/>
              <span className="sr-only"> — view role details</span>
            </button>
          </h2>
          <ul className="discovery-tags" aria-label="Role details">
            <li><Briefcase size={14} aria-hidden="true"/>{careerFieldLabel(job.career_field || "")}</li>
            <li><MapPin size={14} aria-hidden="true"/>{display(job.location)}</li>
          </ul>
          <TransferableSkillsNote internshipId={job.internship_id} careerField={job.career_field} />
        </article>;
      })}
      {!matches.length && <div className="empty-state"><h2>No suitable shortlist in this sample yet</h2><p>Your interests or explicit eligibility conditions may not overlap this workbook. We won’t fill the list with unrelated roles.</p><button type="button" className="plain-button" onClick={editProfile}>Review your profile</button></div>}
      {matches.length > 0 && matches.length < 5 && <p className="supporting-text">Only {matches.length} suitable roles were found. This sample does not support five relevant recommendations for your current profile.</p>}
    </section>
    {(selected.length > 0 || matches.length > 0) && <SelectedReach
      fromSelection={selected.length > 0}
      selectedIds={(selected.length ? selected : matches).map(match => match.internship.internship_id)}/>}
    {(() => {
      const open = matches.find(match => match.internship.internship_id === openRoleId);
      return <RoleDialog role={open ? toRoleReadiness(open, data, { hasInternship: profile.experiences.some(row => row.kind === "internship") }) : null} onClose={() => setOpenRoleId(null)}/>;
    })()}
    <div className="onboarding-actions">
      <button type="button" className="plain-button" onClick={editProfile}><ArrowLeft size={18}/>Back to profile</button>
      {selected.length
        ? <button type="button" className="button" onClick={() => { requestAnalyzingIntro(); router.push("/your-fit"); }}>See where you stand<ArrowRight size={18}/></button>
        : <button type="button" className="button" onClick={finishJourney}>Continue without selecting<ArrowRight size={18}/></button>}
    </div>
    <p className="local-storage-note">Pick roles to see what you already bring and what to build next. Your choices guide My Projects after this journey. Reloading restarts at Resume and keeps your saved answers and interests.</p>
  </div>;
}

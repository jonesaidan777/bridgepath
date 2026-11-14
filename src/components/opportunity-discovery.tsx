"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { TransferableSkillsNote } from "./transferable-skills-note";
import { useStudentProfile } from "./profile-provider";
import { toCareerContext } from "@/lib/student-profile";
import { rankInternships, matchInternship, type InternshipMatch, type QualificationGroup } from "@/lib/matching";
import { display, safeWebUrl } from "@/lib/data";
import { careerFieldLabel } from "@/lib/profile-options"; import snapshot from "@/data/bridgepath-workbook.json";
import type { WorkbookDataset } from "@/lib/workbook-types";

const data = snapshot as WorkbookDataset;

function QualificationEvidence({ group, documented }: { group: QualificationGroup; documented?: boolean }) {
  return <li>
    <details className="discovery-evidence">
      <summary>
        {documented
          ? [...new Set(group.demonstrated.map(item => item.label))].join(", ")
          : `${group.mode === "any" ? "One source-listed alternative: " : ""}${group.notDocumented.map(id => data.Skills.find(skill => skill.skill_id === id)?.skill_name || id).join(", ")}`}
        <span className="requirement-type"> · {group.classification}</span>
      </summary>
      <div className="disclosure-content">
        {documented && group.demonstrated.map((item, index) => <p key={index}><strong>{item.title}</strong> — {item.detail}</p>)}
        {group.mode === "any" && <p>These are source-listed alternatives; all alternatives are not mandatory.</p>}
        {group.evidence ? <blockquote>{group.evidence}</blockquote> : <p>Supporting quotation unavailable.</p>}
      </div>
    </details>
  </li>;
}

function RoleComparison({ match }: { match: InternshipMatch }) {
  const documented = match.qualifications.filter(group => group.demonstrated.length);
  const gaps = match.qualifications.filter(group => group.notDocumented.length);
  const source = safeWebUrl(match.internship.employer_posting_url);
  return <div className="disclosure-content">
    <div className="discovery-comparison-grid">
      <section>
        <h3>What your profile documents</h3>
        {documented.length ? <ul className="discovery-evidence-list">{documented.map((group, index) => <QualificationEvidence key={index} group={group} documented />)}</ul>
          : <p>No requested skills are documented yet. Coursework and personal projects can provide evidence.</p>}
        {match.relevantExperience.length > 0 && <details className="discovery-evidence"><summary>Related experience & projects</summary><ul>{match.relevantExperience.map(title => <li key={title}>{title}</li>)}</ul><p className="supporting-text">Relevance is not proof that every qualification is met. Skills count only when explicitly documented.</p></details>}
      </section>
      <section>
        <h3>What to develop or document</h3>
        <p className="supporting-text">Not yet documented does not mean you lack the skill. Preferred and unspecified mentions are not mandatory requirements.</p>
        {gaps.length ? <ul className="discovery-evidence-list">{gaps.map((group, index) => <QualificationEvidence key={index} group={group}/>)}</ul>
          : <p>No skill gaps were identified among the recorded requirements. Other employer conditions may still apply.</p>}
      </section>
    </div>
    <details className="discovery-evidence">
      <summary>Education conditions & eligibility questions</summary>
      <div className="disclosure-content">{match.eligibility.map((check, index) => <div className="discovery-eligibility" key={index}>
        <h3>{check.status === "confirmed" ? "Documented alignment" : check.status === "unmet" ? "Explicit condition differs" : "Needs verification"} <span className="requirement-type"> · {check.classification}</span></h3>
        <p>{check.explanation}</p><blockquote>{check.evidence}</blockquote>
      </div>)}</div>
    </details>
    <p className="project-fit"><strong>Suggested next step:</strong> {match.nextAction.explanation}</p>
    {source && <p><a href={source} className="text-link" target="_blank" rel="noopener noreferrer">Read original employer posting<span className="sr-only"> (opens in a new tab)</span></a></p>}
  </div>;
}

export function OpportunityDiscovery() {
  const { profile, ready, saveProfile, setJourneyStage } = useStudentProfile();
  const router = useRouter();
  const context = useMemo(() => toCareerContext(profile), [profile]);
  const matches = useMemo(() => rankInternships(context, data, 5), [context]);
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
    router.push("/");
  }
  function editProfile() {
    setJourneyStage("profile");
    router.push("/onboarding?edit=1");
  }
  return <div className="onboarding-content discovery-page">
    <p className="setup-step">Your profile → Your opportunities → Your direction</p>
    <header className="page-heading">
      <h1>Discover your next opportunity</h1>
      <p>Choose the internships that interest you most. We’ll use your choices to focus the projects that help you build relevant experience.</p>
    </header>
    <p className="availability-note">Up to five roles from {snapshot.metadata.source}, matched to your profile. These cached postings are not verified as accepting applications. Recommendations are not eligibility guarantees.</p>
    <section className="readable-list" aria-label="Your top internship recommendations">
      {matches.map(match => {
        const job = match.internship;
        const checked = context.interestedInternshipIds.includes(job.internship_id);
        return <article key={job.internship_id} className={`listing discovery-listing${checked ? " is-selected" : ""}`}>
          <p className="company-name">{display(job.company)}</p>
          <h2>{display(job.job_title)}</h2>
          <p className="location">{display(job.location)} · {careerFieldLabel(job.career_field || "")}</p>
          <p className="project-description role-preview">{display(job.job_description_summary)}</p>
          <p className="discovery-reason">{match.reasons[0]}</p>
          <p className="supporting-text">{match.type === "strong_current" ? "Strong current match based on documented evidence" : "Interest-aligned stretch opportunity"}{match.eligibilityStatus === "uncertain" ? " · Eligibility needs verification" : ""}</p>
          <TransferableSkillsNote internshipId={job.internship_id} careerField={job.career_field} />
          <label className="discovery-interest"><input type="checkbox" checked={checked} onChange={() => toggleInterest(job.internship_id)}/><span>{checked ? "Selected — this interests me" : "This interests me"}<span className="sr-only">: {job.job_title} at {job.company}</span></span></label>
        </article>;
      })}
      {!matches.length && <div className="empty-state"><h2>No suitable shortlist in this sample yet</h2><p>Your interests or explicit eligibility conditions may not overlap this workbook. We won’t fill the list with unrelated roles.</p><button type="button" className="plain-button" onClick={editProfile}>Review your profile</button></div>}
      {matches.length > 0 && matches.length < 5 && <p className="supporting-text">Only {matches.length} suitable roles were found. This sample does not support five relevant recommendations for your current profile.</p>}
    </section>
    <section id="selected-role-comparison" className="discovery-comparison" aria-labelledby="comparison-title">
      <h2 id="comparison-title">Your experience. Their requirements.</h2>
      <p role="status" aria-live="polite" className="discovery-selection-count">{selected.length ? `${selected.length} ${selected.length === 1 ? "role selected" : "roles selected"}. Your interests are saved in this browser.` : "Select a role above to compare your starting point with its requirements."}</p>
      {selected.length > 0 && <p className="supporting-text">This reflects profile information, including any demo values you kept. Nothing has been verified or extracted from a resume.</p>}
      {selected.map(match => <details className="disclosure discovery-role-comparison" key={match.internship.internship_id} open={selected.length === 1}>
        <summary>{display(match.internship.company)} — {display(match.internship.job_title)}</summary>
        {(!matches.some(item => item.internship.internship_id === match.internship.internship_id) || match.type === "explicitly_unmet") && <p className="profile-inline-notice">This saved interest is no longer in your top shortlist. Review its conditions against your updated profile.</p>}
        <RoleComparison match={match}/>
        <button className="plain-button" type="button" onClick={() => toggleInterest(match.internship.internship_id)}>Remove this selection<span className="sr-only">: {match.internship.job_title}</span></button>
      </details>)}
    </section>
    <div className="onboarding-actions">
      <button type="button" className="plain-button" onClick={editProfile}><ArrowLeft size={18}/>Back to profile</button>
      <button type="button" className="button" onClick={finishJourney}>{selected.length ? "Continue with these interests" : "Continue without selecting"}<ArrowRight size={18}/></button>
    </div>
    <p className="local-storage-note">Your choices guide My Projects after this journey. Reloading restarts at Resume and keeps your saved answers and interests.</p>
  </div>;
}

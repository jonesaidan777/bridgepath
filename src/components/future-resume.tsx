"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Sparkles } from "lucide-react";
import { useStudentProfile } from "./profile-provider";
import { JourneyCrumbs } from "./journey-crumbs";
import { toCareerContext, type StudentProfile } from "@/lib/student-profile";
import { buildReadiness } from "@/lib/readiness";
import { projectDisplayTitle, recommendProjects, type ProjectRecommendation } from "@/lib/project-recommendations";
import { estimateJobs, formatJobCount } from "@/lib/job-estimates";
import { buildResumePdf, type ResumeModel } from "@/lib/resume-pdf";
import { workbook as snapshot } from "@/lib/workbook";
import type { WorkbookDataset } from "@/lib/workbook-types";

const data = snapshot as WorkbookDataset;
const skillName = (id: string) => data.Skills.find(skill => skill.skill_id === id)?.skill_name || id;
const degreeLabel: Record<string, string> = { associate: "A.S.", bachelor: "B.S.", master: "M.S.", doctoral: "Ph.D." };
const yearLabel: Record<string, string> = { "1": "First year", "2": "Second year", "3": "Third year", "4": "Fourth year", "5+": "Fifth year+" };

function monthLabel(value?: string) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return "";
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1).toLocaleString("en-US", { month: "short", year: "numeric" });
}
function range(start?: string, end?: string, ongoing?: boolean) {
  const from = monthLabel(start);
  const to = ongoing ? "Present" : monthLabel(end);
  return [from, to].filter(Boolean).join(" – ");
}
function bullets(...texts: (string | undefined)[]) {
  return texts.flatMap(text => (text || "").split(/(?<=\.)\s+/)).map(line => line.trim()).filter(Boolean);
}

interface ResumeView {
  model: ResumeModel;
  newEntryHeadings: Set<string>;
  skills: { label: string; isNew: boolean }[];
}
/** One resume model drives both the on-page preview and the downloaded PDF. */
function buildResume(profile: StudentProfile, planned: ProjectRecommendation[], newSkills: string[]): ResumeView {
  const { personal, education } = profile;
  const existing = [...profile.skills.canonicalIds.map(skillName), ...profile.skills.additional];
  const skills = [
    ...existing.map(label => ({ label, isNew: false })),
    ...newSkills.filter(label => !existing.includes(label)).map(label => ({ label, isNew: true })),
  ];
  const plannedEntries = planned.map(project => ({
    heading: projectDisplayTitle(project),
    date: "Planned",
    bullets: [project.deliverable, `Built with ${project.missingSkillIds.map(skillName).join(", ")}.`],
  }));
  const educationLine = [degreeLabel[education.degreeLevel] || "", education.major].filter(Boolean).join(" ")
    + (education.academicYear ? ` · ${yearLabel[education.academicYear]}` : "")
    + (education.gpa ? ` · GPA ${education.gpa}/${education.gpaScale || "4"}` : "");
  const sections: ResumeModel["sections"] = [{
    title: "Education",
    entries: [{
      heading: education.college || "Your college",
      date: education.expectedGraduation ? `Expected ${monthLabel(education.expectedGraduation)}` : "",
      bullets: educationLine ? [educationLine] : [],
    }],
  }];
  if (profile.experiences.length) sections.push({
    title: "Experience",
    entries: profile.experiences.map(row => ({
      heading: `${row.title}${row.organization ? ` — ${row.organization}` : ""}`,
      date: range(row.startMonth, row.endMonth, row.ongoing),
      bullets: bullets(row.description, row.accomplishments),
    })),
  });
  if (profile.projects.length || plannedEntries.length) sections.push({
    title: "Projects",
    entries: [
      ...plannedEntries,
      ...profile.projects.map(row => ({
        heading: `${row.title}${row.organization ? ` — ${row.organization}` : ""}`,
        date: range(row.startMonth, row.endMonth),
        bullets: bullets(row.description, row.accomplishments),
      })),
    ],
  });
  sections.push({ title: "Skills", bullets: [skills.map(skill => skill.label).join(", ")] });
  if (profile.certifications.length) sections.push({ title: "Certifications", bullets: profile.certifications });
  return {
    model: {
      name: personal.preferredName || "Your name",
      contact: [personal.cityState, "your.email@example.com"].filter(Boolean).join("  ·  "),
      sections,
    },
    newEntryHeadings: new Set(plannedEntries.map(entry => entry.heading)),
    skills,
  };
}

function ResumeDocument({ resume }: { resume: ResumeView }) {
  const { model, newEntryHeadings, skills } = resume;
  return <article className="resume-doc" aria-label="Resume preview">
    <header className="resume-doc-head">
      <h2>{model.name}</h2>
      <p>{model.contact}</p>
    </header>
    {model.sections.map(section => <section key={section.title}>
      <h3>{section.title}</h3>
      {section.title === "Skills"
        ? <ul><li className="resume-doc-skills">{skills.map(skill => <span key={skill.label} className={skill.isNew ? "is-new" : ""}>{skill.label}</span>)}</li></ul>
        : section.bullets?.length
          ? <ul>{section.bullets.map(line => <li key={line}>{line}</li>)}</ul>
          : section.text && <p>{section.text}</p>}
      {section.entries?.map(entry => {
        const isNew = newEntryHeadings.has(entry.heading);
        return <div key={entry.heading} className={`resume-doc-entry${isNew ? " is-new" : ""}`}>
          <div className="resume-doc-row">
            <p><strong>{entry.heading}</strong>{isNew && <span className="resume-new-badge"><Sparkles size={12} aria-hidden="true"/>New</span>}</p>
            {entry.date && <p>{entry.date}</p>}
          </div>
          {entry.bullets.length > 0 && <ul>{entry.bullets.map((line, index) => <li key={index}>{line}</li>)}</ul>}
        </div>;
      })}
    </section>)}
  </article>;
}

function download(resume: ResumeView, fileName: string) {
  const url = URL.createObjectURL(buildResumePdf(resume.model));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function FutureResume() {
  const { profile, ready, setJourneyStage, journeyStage } = useStudentProfile();
  // Reaching this screen completes discovery, which unlocks the sidebar pages.
  useEffect(() => {
    if (ready && journeyStage === "discovery") setJourneyStage("complete");
  }, [ready, journeyStage, setJourneyStage]);
  const [view, setView] = useState<"after" | "today">("after");
  const context = useMemo(() => toCareerContext(profile), [profile]);
  const readiness = useMemo(() => buildReadiness(context, data, context.interestedInternshipIds), [context]);
  const projects = useMemo(() => recommendProjects(context, data).slice(0, 2), [context]);
  const today = useMemo(() => buildResume(profile, [], []), [profile]);
  const planned = useMemo(
    () => buildResume(profile, projects, readiness.gaps.map(gap => gap.label)),
    [profile, projects, readiness],
  );
  if (!ready) return <p className="profile-loading" role="status">Drafting your resume…</p>;

  const after = view === "after";
  const scoreAfter = Math.max(readiness.scoreAfter, readiness.scoreNow);
  const jobsToday = estimateJobs(readiness.strongNow);
  const jobsAfter = estimateJobs(Math.max(readiness.strongAfter, readiness.strongNow));
  const baseName = (profile.personal.preferredName || "resume").trim().replace(/\s+/g, "-");
  return <div className="onboarding-content resume-preview-page">
    <JourneyCrumbs current="direction"/>
    <header className="page-heading">
      <h1>Your resume, after the plan</h1>
      <p>This is what your resume can look like once you finish the recommended projects and add the missing skills.</p>
    </header>

    <div className="resume-toolbar">
      <div className="resume-toggle" role="tablist" aria-label="Resume version">
        <button type="button" role="tab" aria-selected={!after} className={!after ? "is-active" : ""} onClick={() => setView("today")}>Today · {readiness.scoreNow}/100</button>
        <button type="button" role="tab" aria-selected={after} className={after ? "is-active" : ""} onClick={() => setView("after")}>After your plan · {scoreAfter}/100</button>
      </div>
      <button
        type="button"
        className="plain-button resume-download"
        onClick={() => after
          ? download(planned, `${baseName}-resume-after-plan.pdf`)
          : download(today, `${baseName}-resume-today.pdf`)}
      >
        <Download size={16} aria-hidden="true"/>{after ? "Download after your plan" : "Download today"}
        <span className="sr-only"> resume as PDF</span>
      </button>
    </div>

    <section className={`resume-jobs${after ? " is-after" : ""}`} aria-live="polite" aria-label="Jobs this resume qualifies you for">
      <p className="resume-jobs-number">{formatJobCount(after ? jobsAfter : jobsToday)}</p>
      <div>
        <p className="resume-jobs-text">
          {after
            ? <>jobs you’d qualify for <strong>after your plan</strong></>
            : <>jobs you qualify for <strong>today</strong></>}
        </p>
        <p className="resume-jobs-sub">
          {after
            ? `That’s +${formatJobCount(jobsAfter - jobsToday).replace(/\+$/, "")} more than today.`
            : "Switch to “After your plan” to see how many more open up."}
        </p>
      </div>
    </section>

    {after && <p className="resume-legend"><span className="resume-legend-swatch" aria-hidden="true"/>Highlighted = added by your plan</p>}
    {/* Keyed so switching versions replays the fade. */}
    <ResumeDocument key={after ? "after" : "today"} resume={after ? planned : today}/>

    <div className="onboarding-actions">
      <Link href="/your-fit" className="plain-button"><ArrowLeft size={18}/>Back to where you stand</Link>
    </div>
  </div>;
}

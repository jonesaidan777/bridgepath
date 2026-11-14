"use client";

import { useStudentProfile } from "./profile-provider";
import { careerFieldLabel } from "@/lib/profile-options";
import { validProfileUrl, type StudentProfile } from "@/lib/student-profile";

const degreeLabels = {
  associate: "Associate’s",
  bachelor: "Bachelor’s",
  master: "Master’s",
  doctoral: "Doctoral",
  "": "Not provided",
};
const modeLabels = { remote: "Remote", hybrid: "Hybrid", on_site: "On-site" };
const value = (text: string) => text.trim() || "Not provided";

export function ProfileSummary({ profile }: { profile: StudentProfile }) {
  const { canonicalSkills } = useStudentProfile();
  const skillNames = [
    ...profile.skills.canonicalIds.map(
      (id) =>
        canonicalSkills.find((skill) => skill.skill_id === id)?.skill_name ||
        id,
    ),
    ...profile.skills.additional,
  ];
  return (
    <div className="profile-summary">
      <section>
        <h2>About you</h2>
        <dl>
          <div>
            <dt>Preferred name</dt>
            <dd>{value(profile.personal.preferredName)}</dd>
          </div>
          <div>
            <dt>City / state or region</dt>
            <dd>{value(profile.personal.cityState)}</dd>
          </div>
          <div>
            <dt>Career interests</dt>
            <dd>
              {profile.careerInterests.map(careerFieldLabel).join(", ") ||
                "Not provided"}
            </dd>
          </div>
        </dl>
        {profile.consent.saveDemographics && profile.demographics && (
          <details className="disclosure">
            <summary>Optional demographic answers</summary>
            <div className="disclosure-content">
              <p>Age range: {profile.demographics.ageRange || "Not shared"}</p>
              <p>
                Race / ethnicity:{" "}
                {profile.demographics.raceEthnicity || "Not shared"}
              </p>
              <p className="supporting-text">
                Saved with your consent. Excluded from career-context data.
              </p>
            </div>
          </details>
        )}
      </section>
      <section>
        <h2>Education</h2>
        <dl>
          <div>
            <dt>College / university</dt>
            <dd>{value(profile.education.college)}</dd>
          </div>
          <div>
            <dt>Major</dt>
            <dd>{value(profile.education.major)}</dd>
          </div>
          <div>
            <dt>Degree</dt>
            <dd>{degreeLabels[profile.education.degreeLevel]}</dd>
          </div>
          <div>
            <dt>Academic year</dt>
            <dd>{value(profile.education.academicYear)}</dd>
          </div>
          <div>
            <dt>Expected graduation</dt>
            <dd>{value(profile.education.expectedGraduation)}</dd>
          </div>
          <div>
            <dt>Enrollment</dt>
            <dd>
              {profile.education.enrollmentStatus === "full_time"
                ? "Full-time"
                : profile.education.enrollmentStatus === "part_time"
                  ? "Part-time"
                  : "Current enrollment not confirmed"}
            </dd>
          </div>
          {profile.education.gpa && (
            <div>
              <dt>GPA / scale</dt>
              <dd>
                {profile.education.gpa} / {profile.education.gpaScale ?? "4"}
              </dd>
            </div>
          )}
        </dl>
      </section>
      <section>
        <h2>Experience &amp; skills</h2>
        <p>
          {skillNames.length
            ? skillNames.join(" · ")
            : "No skills listed yet. You can add them anytime."}
        </p>
        {profile.experiences.length ? (
          <ul className="summary-entries">
            {profile.experiences.map((experience) => (
              <li key={experience.id}>
                <h3>{experience.title || "Untitled experience"}</h3>
                <p>
                  {experience.kind === "work"
                    ? "Work experience"
                    : experience.kind === "extracurricular"
                      ? "Extracurricular activity"
                      : experience.kind === "research"
                        ? "Research"
                        : "Internship"}
                  {experience.organization && ` · ${experience.organization}`}
                </p>
                {(experience.startMonth ||
                  experience.endMonth ||
                  experience.ongoing) && (
                  <p>
                    {experience.startMonth || "Start not provided"} —{" "}
                    {experience.ongoing
                      ? "Present"
                      : experience.endMonth || "End not provided"}
                  </p>
                )}
                {experience.description && <p>{experience.description}</p>}
                {experience.accomplishments && (
                  <p>{experience.accomplishments}</p>
                )}
                {experience.skillIds?.length ? (
                  <p>
                    Skills used:{" "}
                    {experience.skillIds
                      .map(
                        (id) =>
                          canonicalSkills.find((skill) => skill.skill_id === id)
                            ?.skill_name || id,
                      )
                      .join(", ")}
                  </p>
                ) : null}
                {experience.evidenceUrl &&
                  validProfileUrl(experience.evidenceUrl) && (
                    <a
                      href={experience.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Evidence link
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="supporting-text">
            No formal experience listed. This does not indicate an absence of
            skills.
          </p>
        )}
      </section>
      <section>
        <h2>Projects &amp; certifications</h2>
        {profile.projects.length ? (
          <ul className="summary-entries">
            {profile.projects.map((project) => (
              <li key={project.id}>
                <h3>{project.title || "Untitled project"}</h3>
                <p>
                  {project.kind === "academic"
                    ? "Academic project"
                    : "Personal project"}
                </p>
                {project.description && <p>{project.description}</p>}
                {project.organization && <p>{project.organization}</p>}
                {(project.startMonth || project.endMonth) && (
                  <p>
                    {project.startMonth || "Start not provided"} —{" "}
                    {project.endMonth || "End not provided"}
                  </p>
                )}
                {project.accomplishments && <p>{project.accomplishments}</p>}
                {project.skillIds?.length ? (
                  <p>
                    Skills used:{" "}
                    {project.skillIds
                      .map(
                        (id) =>
                          canonicalSkills.find((skill) => skill.skill_id === id)
                            ?.skill_name || id,
                      )
                      .join(", ")}
                  </p>
                ) : null}
                {project.url && validProfileUrl(project.url) && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Project link
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No personal or academic projects listed yet.</p>
        )}
        <p>
          Certifications: {profile.certifications.join(", ") || "None listed"}
        </p>
      </section>
      <section>
        <h2>Internship preferences</h2>
        <dl>
          <div>
            <dt>Target roles</dt>
            <dd>
              {profile.preferences.targetRoles.join(", ") || "Not provided"}
            </dd>
          </div>
          <div>
            <dt>Preferred locations</dt>
            <dd>
              {profile.preferences.locations.join(", ") ||
                "Flexible / not provided"}
            </dd>
          </div>
          <div>
            <dt>Work arrangement</dt>
            <dd>
              {profile.preferences.workModes
                .map((mode) => modeLabels[mode])
                .join(", ") || "Not provided"}
            </dd>
          </div>
          <div>
            <dt>Relocation</dt>
            <dd>
              {profile.preferences.willingToRelocate === "yes"
                ? "Willing to relocate"
                : profile.preferences.willingToRelocate === "no"
                  ? "Not willing to relocate"
                  : profile.preferences.willingToRelocate === "unsure"
                    ? "Unsure"
                    : "Not provided"}
            </dd>
          </div>
          <div>
            <dt>Season / year</dt>
            <dd>
              {profile.preferences.season === "any"
                ? "Any season"
                : profile.preferences.season || "Season not provided"}{" "}
              {profile.preferences.year}
            </dd>
          </div>
        </dl>
        <p className="supporting-text">
          Resume:{" "}
          {profile.resume.reviewedLocally
            ? "Reviewed locally; document not saved."
            : "Not provided."}{" "}
          No resume text has been extracted.
        </p>
      </section>
    </div>
  );
}

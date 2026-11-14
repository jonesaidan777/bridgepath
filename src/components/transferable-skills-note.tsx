import { display, getSharedSkillOpportunities } from "@/lib/data";
import { careerFieldLabel } from "@/lib/profile-options";

export function TransferableSkillsNote({ internshipId, careerField }: {
  internshipId: string;
  careerField: string | null;
}) {
  const related = getSharedSkillOpportunities(internshipId);
  if (related === null) return null;
  if (!related.length) return <p className="transferable-skills-note supporting-text">No other internships with shared recorded skills were found in this field in our workbook yet.</p>;
  return <div className="transferable-skills-note">
    <p><strong>Build skills that carry further.</strong> {related.length} other {related.length === 1 ? "internship" : "internships"} in {careerFieldLabel(careerField || "")} share at least one skill requirement with this role in our workbook.</p>
    <p className="supporting-text">Developing these skills can help you prepare for related opportunities. Each role has its own qualifications and eligibility conditions.</p>
    <details className="discovery-evidence">
      <summary>See the shared skills and roles</summary>
      <div className="disclosure-content">
        <p className="supporting-text">Each other posting counts once. Includes required, preferred, and unspecified mentions, including source-listed alternatives. This describes our cached sample, not the whole job market or current openings.</p>
        <ul>{related.map(({ internship, sharedSkills }) => <li key={internship.internship_id}>
          <strong>{display(internship.company)} — {display(internship.job_title)}</strong>: {sharedSkills.map(skill => display(skill.skill_name)).join(", ")}
        </li>)}</ul>
      </div>
    </details>
  </div>;
}

import { PersonalizedProjects } from "./project-recommendations";

export function WorkbookProjects({ internshipId }: { internshipId?: string }) {
  return <PersonalizedProjects internshipId={internshipId} />;
}

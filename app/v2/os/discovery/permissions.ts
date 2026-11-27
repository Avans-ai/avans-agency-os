import { directorMeta } from "../director-data";
import { CURRENT_USER, type OsClient } from "../os-data";
import type { PreviewRole } from "../os-store";

export const DEMO_PM = "Valentina Ríos";
export function discoveryActor(role: PreviewRole) {
  return role === "pm" ? DEMO_PM : CURRENT_USER.name;
}
/** Preview UI policy only. Production requires authenticated API + tenant RLS.
 * Membership alone is NOT sufficient: the simulated PM must lead this account. */
export function canEditDiscovery(role: PreviewRole, client: OsClient) {
  return (
    role === "admin" ||
    (role === "pm" &&
      !!directorMeta(client.slug)?.assignedTo.includes(DEMO_PM) &&
      client.team.some(
        (p) => p.name === DEMO_PM && p.role.startsWith("Responsable de cuenta"),
      ))
  );
}

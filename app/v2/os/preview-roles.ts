import { CURRENT_USER, type OsClient } from "./os-data";

export type PreviewRole = "admin" | "operativo" | "pm" | "content" | "designer" | "technical" | "provider" | "client";
export const PREVIEW_ROLES: { id: PreviewRole; label: string; actor: string }[] = [
  { id: "admin", label: "Administrador", actor: CURRENT_USER.name },
  { id: "operativo", label: "Ejecutiva de cuentas", actor: CURRENT_USER.name },
  { id: "pm", label: "Project Manager · Valentina Ríos", actor: "Valentina Ríos" },
  { id: "content", label: "Content Manager", actor: "Lucía Benítez" },
  { id: "designer", label: "Diseñador", actor: "Tomás Aguirre" },
  { id: "technical", label: "Líder técnico", actor: "Martín Ledesma" },
  { id: "provider", label: "Proveedor externo", actor: "Proveedor externo" },
  { id: "client", label: "Cliente", actor: "Cliente" },
];
export function previewActor(role: PreviewRole) {
  return PREVIEW_ROLES.find((item) => item.id === role)?.actor ?? CURRENT_USER.name;
}
export function assignedToRole(client: OsClient, role: PreviewRole) {
  if (role === "admin") return true;
  if (role === "client" || role === "provider") return false;
  return client.team.some((person) => person.name === previewActor(role));
}

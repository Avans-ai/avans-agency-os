export const PRESENTATION_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/presentations",
] as const;
export const presentationSettings = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GOOGLE_PRESENTATION_TEMPLATE_FILE_ID",
  "GOOGLE_CLIENTS_ROOT_FOLDER_ID",
  "GOOGLE_TOKEN_ENCRYPTION_KEY_ID",
] as const;
export const presentationBlockers = [
  "Google Workspace no conectado",
  "Repositorio de tokens cifrados e identidad real de administrador/organización pendientes",
  "Importación del master y mapa de objetos de Google Slides pendientes de validación visual",
  "Carpeta del cliente y almacenamiento de exportaciones pendientes de habilitación",
];
export function presentationReadiness(env: Record<string, string | undefined>) {
  return {
    enabled: false,
    state: "not-connected",
    missing: presentationSettings.filter((key) => !env[key]?.trim()),
    blockers: presentationBlockers,
    pptx: "blocked-template-fidelity",
    message:
      "PPTX se exportará desde una copia de la plantilla oficial en Google Slides. No se genera un diseño aproximado.",
  };
}

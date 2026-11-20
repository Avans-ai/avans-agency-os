export const requiredGoogleSettings = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GOOGLE_CLOUD_PROJECT_ID",
  "GOOGLE_PUBSUB_TOPIC",
  "GOOGLE_PUBSUB_SUBSCRIPTION",
  "GOOGLE_PUBSUB_AUDIENCE",
  "GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_WORKSPACE_EVENT_SOURCE",
  "GOOGLE_WORKSPACE_TARGET_RESOURCE",
  "GOOGLE_TOKEN_ENCRYPTION_KEY_ID",
] as const;
export function googleReadiness(env: Record<string, string | undefined>) {
  return {
    state: "not-connected" as const,
    label: "Google Workspace no conectado",
    enabled: false,
    missing: requiredGoogleSettings.filter((name) => !env[name]?.trim()),
    pending: [
      "Autenticación de administrador y organización validada en servidor",
      "Repositorio de tokens cifrados, sesiones OAuth y eventos idempotentes habilitado",
      "APIs y scopes aprobados por Workspace",
      "Suscripción Pub/Sub con OIDC verificada",
      "Prueba de punta a punta con una cuenta autorizada",
    ],
    event: "google.workspace.meet.smartNote.v2.fileGenerated",
  };
}

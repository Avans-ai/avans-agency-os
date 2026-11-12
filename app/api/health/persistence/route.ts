import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "../../../../lib/supabase/config";

export const dynamic = "force-dynamic";

export function GET() {
  const publicConfig = getSupabasePublicConfig();
  const adminConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  return NextResponse.json({
    ok: true,
    mode: publicConfig ? "supabase-ready" : "local-preview",
    publicClientConfigured: Boolean(publicConfig),
    serverAdminConfigured: adminConfigured,
    databaseVerified: false,
    note: publicConfig
      ? "Variables presentes. Falta verificar conectividad, Auth y RLS antes de activar escrituras."
      : "La preview usa persistencia local del navegador; no hay sincronización multiusuario.",
  });
}

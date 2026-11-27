"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicConfig } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const { url, publishableKey } = requireSupabasePublicConfig();
  browserClient = createBrowserClient(url, publishableKey);
  return browserClient;
}

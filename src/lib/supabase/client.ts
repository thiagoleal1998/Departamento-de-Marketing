"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/** Client Supabase para uso em Client Components. */
export function criarClienteBrowser() {
  return createBrowserClient(SUPABASE_URL ?? "", SUPABASE_ANON_KEY ?? "");
}

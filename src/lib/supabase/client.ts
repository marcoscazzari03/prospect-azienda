"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseAnonKey, supabaseUrl } from "./url";

export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl(),
    supabaseAnonKey(),
  );
}

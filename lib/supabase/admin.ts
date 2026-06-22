import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Service-role client for contexts with no Supabase Auth session (webhook
// receiver, cron jobs) where RLS owner-only policies would otherwise hide
// every row. Never expose this to the browser or use it for user-facing
// reads/writes — it bypasses RLS entirely.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY")
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

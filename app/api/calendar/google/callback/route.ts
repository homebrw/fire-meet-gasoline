import { createClient } from "@/lib/supabase/server"
import { exchangeCodeForTokens, getGoogleAccountEmail } from "@/lib/google-calendar"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const errorParam = url.searchParams.get("error")

  const redirectTo = (status: "error" | "connected") =>
    NextResponse.redirect(new URL(`/settings/integrations?google=${status}`, url.origin))

  if (errorParam || !code || !state) {
    return redirectTo("error")
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirectTo("error")

  const { data: person, error: personError } = await supabase
    .from("persons")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()
  if (personError || !person) return redirectTo("error")

  // Never trust `state` for the write target: it must match the person
  // re-derived from the current session, otherwise a forged/replayed state
  // could attach this grant to the wrong person's connection.
  if (state !== person.id) return redirectTo("error")

  try {
    const tokens = await exchangeCodeForTokens(code)
    if (!tokens.refresh_token) {
      // Happens if the user previously granted consent without `prompt=consent`.
      // We always request offline+consent, so this should be rare; bail out
      // and have the user retry rather than store an unrefreshable connection.
      return redirectTo("error")
    }

    const googleAccountEmail = await getGoogleAccountEmail(tokens.access_token)
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { error: upsertError } = await supabase
      .from("calendar_connections")
      .upsert(
        {
          person_id: person.id,
          provider: "google",
          google_account_email: googleAccountEmail,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt,
        },
        { onConflict: "person_id,provider" }
      )
    if (upsertError) throw new Error(upsertError.message)

    return redirectTo("connected")
  } catch (err) {
    console.error("[google-calendar-callback]", err)
    return redirectTo("error")
  }
}

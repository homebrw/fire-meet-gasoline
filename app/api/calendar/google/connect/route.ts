import { createClient } from "@/lib/supabase/server"
import { getGoogleAuthUrl } from "@/lib/google-calendar"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: person, error } = await supabase
    .from("persons")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()
  if (error || !person) {
    return NextResponse.json({ error: "Person not found" }, { status: 401 })
  }

  // `state` carries the initiating person's id, but the callback re-derives
  // identity from the authenticated session — it never trusts this value to
  // decide which person's connection gets written.
  return NextResponse.redirect(getGoogleAuthUrl(person.id))
}

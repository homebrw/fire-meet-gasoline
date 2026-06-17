import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const eventId = formData.get("event_id") as string | null

  if (!file || !eventId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Get current user's person record
  const { data: currentPerson } = await supabase
    .from("persons")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!currentPerson) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify user has access to event (can see it)
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, visibility, owner_person_id")
    .eq("id", eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  // Check permissions: can upload if owner OR can see the event
  const isOwner = event.owner_person_id === currentPerson.id
  const isVisibleEvent = event.visibility === "both"
  const isParticipant = isVisibleEvent
    ? true
    : event.owner_person_id === currentPerson.id

  if (!isOwner && !isVisibleEvent) {
    // For private events, check if user is a participant
    const { data: participant } = await supabase
      .from("event_participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("person_id", currentPerson.id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const ext = file.name.split(".").pop()
  const storagePath = `events/${eventId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(storagePath, file, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { error: dbError } = await supabase.from("event_attachments").insert({
    event_id: eventId,
    file_name: file.name,
    storage_path: storagePath,
    file_type: file.type,
    file_size: file.size,
    uploaded_by: currentPerson.id,
  })

  if (dbError) {
    await supabase.storage.from("attachments").remove([storagePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ storagePath })
}

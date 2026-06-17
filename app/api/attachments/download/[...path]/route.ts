import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const storagePath = path.join("/")

  // Get attachment details
  const { data: attachment, error: attachmentError } = await supabase
    .from("event_attachments")
    .select("id, event_id, file_name, storage_path")
    .eq("storage_path", storagePath)
    .single()

  if (attachmentError || !attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Get event details
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, owner_person_id, allow_participants_to_see_attachments")
    .eq("id", attachment.event_id)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
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

  // Check permissions
  const isOwner = event.owner_person_id === currentPerson.id

  let isParticipant = false
  if (!isOwner && event.allow_participants_to_see_attachments) {
    const { data: participant } = await supabase
      .from("event_participants")
      .select("id")
      .eq("event_id", attachment.event_id)
      .eq("person_id", currentPerson.id)
      .single()

    isParticipant = !!participant
  }

  if (!isOwner && !isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Get the file from storage
  const { data: file, error: downloadError } = await supabase.storage
    .from("attachments")
    .download(storagePath)

  if (downloadError || !file) {
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    )
  }

  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${attachment.file_name}"`,
    },
  })
}

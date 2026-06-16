import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const eventId = formData.get("event_id") as string | null
  const personId = formData.get("person_id") as string | null

  if (!file || !eventId || !personId) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
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
    uploaded_by: personId,
  })

  if (dbError) {
    await supabase.storage.from("attachments").remove([storagePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ storagePath })
}

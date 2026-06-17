"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { CalendarEvent } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EventDetailCard } from "@/components/events/EventDetailCard"
import { FileUploadButton } from "@/components/file-upload/FileUploadButton"
import { ChevronLeft } from "lucide-react"

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [event, setEvent] = useState<CalendarEvent | null>(null)
  const [currentPersonId, setCurrentPersonId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login")
          return
        }

        // Get current user's person
        const { data: currentPerson } = await supabase
          .from("persons")
          .select("id")
          .eq("auth_user_id", user.id)
          .single()

        if (currentPerson) {
          setCurrentPersonId(currentPerson.id)
        }

        // Get event
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .single()

        if (eventError || !eventData) {
          setError("Événement non trouvé")
          return
        }

        setEvent(eventData as CalendarEvent)
        setIsOwner(currentPerson?.id === eventData.owner_person_id)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors du chargement"
        )
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [eventId, refreshCount, router])

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm text-gray-500">Chargement...</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm text-red-600">{error || "Erreur"}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{event.title}</h1>
      </div>

      <EventDetailCard
        event={event}
        showAttachments={true}
        showParticipants={true}
        canDeleteAttachments={isOwner}
      />

      {isOwner && currentPersonId && (
        <Card className="p-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ajouter une pièce jointe
            </p>
            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}
            <FileUploadButton
              eventId={event.id}
              personId={currentPersonId}
              onSuccess={() => {
                setUploadError(null)
                setRefreshCount((prev) => prev + 1)
              }}
              onError={setUploadError}
            />
          </div>
        </Card>
      )}
    </div>
  )
}

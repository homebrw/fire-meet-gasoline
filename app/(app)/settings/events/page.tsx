"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { deleteEvent } from "@/lib/actions/events"
import type { CalendarEvent, Person } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Eye, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { EventForm } from "@/components/events/EventForm"

type EventParticipantData = {
  person_id: string
  persons?: Array<{
    name: string
    color: string
  }>
}

export default function EventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [participants, setParticipants] = useState<Record<string, EventParticipantData[]>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [evRes, persRes] = await Promise.all([
        supabase.from("events").select("*").order("start_at"),
        supabase.from("persons").select("*"),
      ])
      const eventsData = (evRes.data ?? []) as CalendarEvent[]
      const personsData = (persRes.data ?? []) as Person[]

      setEvents(eventsData)
      setPersons(personsData)

      // Load participants for each event
      const participantsMap: Record<string, EventParticipantData[]> = {}
      for (const ev of eventsData) {
        const { data: parts } = await supabase
          .from("event_participants")
          .select("person_id, persons(name, color)")
          .eq("event_id", ev.id)
        participantsMap[ev.id] = parts || []
      }
      setParticipants(participantsMap)
    }
    load()
  }, [])

  const personById = Object.fromEntries(persons.map((p) => [p.id, p]))

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteEvent(id)
      location.reload()
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <Link href="/settings">
        <Button variant="ghost" size="sm" className="gap-2 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Retour aux paramètres
        </Button>
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Événements</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent closeOnOutsideClick={false} className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvel événement</DialogTitle>
            </DialogHeader>
            <EventForm
              persons={persons}
              onSuccess={() => {
                setCreateOpen(false)
                location.reload()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-[var(--color-muted-foreground)]">
            Aucun événement. Créez-en un pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            return (
              <Card key={ev.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{ev.title}</span>
                    <div className="flex gap-1">
                      <Link href={`/settings/events/${ev.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Dialog
                        open={editEvent?.id === ev.id}
                        onOpenChange={(o) => !o && setEditEvent(null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setEditEvent(ev)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent closeOnOutsideClick={false} className="max-w-lg max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Modifier l&apos;événement</DialogTitle>
                          </DialogHeader>
                          <EventForm
                            persons={persons}
                            event={ev}
                            onSuccess={() => {
                              setEditEvent(null)
                              location.reload()
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-[var(--color-destructive)]"
                        disabled={isPending}
                        onClick={() => handleDelete(ev.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {ev.is_blocking && <Badge variant="destructive">Bloquant</Badge>}
                    {!ev.allow_participants_to_see_attachments && <Badge variant="outline">PJ restreintes</Badge>}
                    <span className="text-[var(--color-muted-foreground)]">
                      {format(parseISO(ev.start_at), "d MMM HH:mm", { locale: fr })}
                    </span>
                  </div>
                  {participants[ev.id] && participants[ev.id].length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {participants[ev.id].map((p: EventParticipantData) => (
                        <div key={p.person_id} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: p.persons?.[0]?.color || "#6b7280" }}
                          />
                          <span>{p.persons?.[0]?.name || "?"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

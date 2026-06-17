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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Eye, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { createEvent, updateEvent, addEventParticipant, removeEventParticipant, getEventParticipants } from "@/lib/actions/events"
import { ParticipantsSelector } from "./participants-selector"

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
            const owner = ev.owner_person_id ? personById[ev.owner_person_id] : null
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
                    <Badge variant={ev.type === "shared" ? "secondary" : "outline"}>
                      {ev.type === "shared" ? "Commun" : owner?.name ?? "Individuel"}
                    </Badge>
                    {ev.is_blocking && <Badge variant="destructive">Bloquant</Badge>}
                    {ev.visibility === "private" && <Badge variant="outline">Privé</Badge>}
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

interface EventFormProps {
  persons: Person[]
  event?: CalendarEvent
  onSuccess?: () => void
}

function EventForm({ persons, event, onSuccess }: EventFormProps) {
  const [eventType, setEventType] = useState<string>(event?.type ?? "shared")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [participants, setParticipants] = useState<string[]>([])

  // Separate parents and children
  const parentPersons = persons.filter((p) => !p.is_child)
  const childPersons = persons.filter((p) => p.is_child)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        if (event) {
          await updateEvent(event.id, formData)
          // Update participants for existing event
          const existingParticipants = await getEventParticipants(event.id)
          const existingIds = existingParticipants.map((p) => p.person_id)

          // Remove participants not in new list
          for (const id of existingIds) {
            if (!participants.includes(id)) {
              await removeEventParticipant(event.id, id)
            }
          }

          // Add new participants
          for (const id of participants) {
            if (!existingIds.includes(id)) {
              await addEventParticipant(event.id, id)
            }
          }
        } else {
          await createEvent(formData)
        }
        onSuccess?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input id="title" name="title" defaultValue={event?.title} required />
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <Select name="type" value={eventType} onValueChange={setEventType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="shared">Commun</SelectItem>
            <SelectItem value="individual">Individuel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {eventType === "individual" && (
        <div className="space-y-2">
          <Label>Personne</Label>
          <Select name="owner_person_id" defaultValue={event?.owner_person_id ?? ""}>
            <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {persons.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Créé par (hidden — defaults to first person) */}
      <input type="hidden" name="created_by" value={persons[0]?.id ?? ""} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="start_at">Début</Label>
          <Input
            id="start_at"
            name="start_at"
            type="datetime-local"
            defaultValue={event?.start_at?.slice(0, 16)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_at">Fin</Label>
          <Input
            id="end_at"
            name="end_at"
            type="datetime-local"
            defaultValue={event?.end_at?.slice(0, 16)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Lieu (optionnel)</Label>
        <Input id="location" name="location" defaultValue={event?.location ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={event?.description ?? ""} rows={3} />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            name="is_blocking"
            value="true"
            defaultChecked={event?.is_blocking}
            className="rounded"
          />
          Bloquant (annule la disponibilité)
        </label>
      </div>

      {eventType === "individual" && (
        <div className="space-y-2">
          <Label>Visibilité</Label>
          <Select name="visibility" defaultValue={event?.visibility ?? "both"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Visible par les deux</SelectItem>
              <SelectItem value="private">Privé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2 border-t pt-4">
        <Label>Participants</Label>
        <ParticipantsSelector
          parents={parentPersons}
          childPersonList={childPersons}
          onChange={setParticipants}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enregistrement…" : event ? "Modifier" : "Créer l'événement"}
      </Button>
    </form>
  )
}

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
import { Plus, Pencil, Trash2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { createEvent, updateEvent } from "@/lib/actions/events"

export default function EventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [isPending, startTransition] = useTransition()

  async function load() {
    const supabase = createClient()
    const [evRes, persRes] = await Promise.all([
      supabase.from("events").select("*").order("start_at"),
      supabase.from("persons").select("*"),
    ])
    setEvents((evRes.data ?? []) as CalendarEvent[])
    setPersons((persRes.data ?? []) as Person[])
  }

  useEffect(() => { load() }, [])

  const personById = Object.fromEntries(persons.map((p) => [p.id, p]))

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteEvent(id)
      await load()
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Événements</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvel événement</DialogTitle>
            </DialogHeader>
            <EventForm
              persons={persons}
              onSuccess={() => { setCreateOpen(false); load() }}
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
                      <Dialog
                        open={editEvent?.id === ev.id}
                        onOpenChange={(o) => !o && setEditEvent(null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setEditEvent(ev)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Modifier l'événement</DialogTitle>
                          </DialogHeader>
                          <EventForm
                            persons={persons}
                            event={ev}
                            onSuccess={() => { setEditEvent(null); load() }}
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
                <CardContent>
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        if (event) {
          await updateEvent(event.id, formData)
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enregistrement…" : event ? "Modifier" : "Créer l'événement"}
      </Button>
    </form>
  )
}

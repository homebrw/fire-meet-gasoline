"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useMemo, useState, useTransition } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { deleteEvent } from "@/lib/actions/events"
import { useEventsParticipants } from "@/lib/hooks/useEventParticipants"
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
import { Plus, Trash2, Eye, Pencil, ArrowLeft, ChevronDown, X } from "lucide-react"
import Link from "next/link"
import { EventForm } from "@/components/events/EventForm"
import { EventCard } from "@/components/events/EventCard"
import { cn } from "@/lib/utils"

type SourceFilter = "all" | "internal" | "external"

function EventsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialDate = searchParams.get("date")

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pastOpen, setPastOpen] = useState(false)
  const [now] = useState(() => Date.now())
  const [reloadToken, setReloadToken] = useState(0)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [participantFilter, setParticipantFilter] = useState<string[]>([])

  const eventIds = useMemo(() => events.map((ev) => ev.id), [events])
  const participantsByEvent = useEventsParticipants(eventIds)

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
    }
    load()
  }, [reloadToken])

  function load() {
    setReloadToken((t) => t + 1)
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteEvent(id)
      await load()
      router.refresh()
    })
  }

  function togglePersonFilter(personId: string) {
    setParticipantFilter((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    )
  }

  function resetFilters() {
    setSourceFilter("all")
    setDateFrom("")
    setDateTo("")
    setParticipantFilter([])
  }

  const hasActiveFilters = sourceFilter !== "all" || !!dateFrom || !!dateTo || participantFilter.length > 0

  const filteredEvents = events.filter((ev) => {
    if (sourceFilter === "internal" && ev.imported_from_connection_id) return false
    if (sourceFilter === "external" && !ev.imported_from_connection_id) return false
    if (dateFrom && new Date(ev.end_at).getTime() < new Date(dateFrom).getTime()) return false
    if (dateTo && new Date(ev.start_at).getTime() > new Date(`${dateTo}T23:59:59`).getTime()) return false
    if (participantFilter.length > 0) {
      const eventParticipantIds = (participantsByEvent[ev.id] ?? []).map((p) => p.person_id)
      if (!participantFilter.some((id) => eventParticipantIds.includes(id))) return false
    }
    return true
  })

  const upcomingEvents = filteredEvents
    .filter((ev) => new Date(ev.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  const pastEvents = filteredEvents
    .filter((ev) => new Date(ev.start_at).getTime() < now)
    .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())

  function renderEventCard(ev: CalendarEvent) {
    return (
      <Card key={ev.id}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{ev.title}</span>
            <div className="flex gap-1">
              <Link href={`/settings/events/${ev.id}`}>
                <Button variant="ghost" size="icon" aria-label="Voir l'événement">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Dialog
                open={editEvent?.id === ev.id}
                onOpenChange={(o) => !o && setEditEvent(null)}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setEditEvent(ev)} aria-label="Modifier l'événement">
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
                      load()
                      router.refresh()
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
                aria-label="Supprimer l'événement"
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
          </div>
          <EventCard
            event={ev}
            persons={persons}
            onRevalidateNeeded={async () => {
              await load()
              router.refresh()
            }}
          />
        </CardContent>
      </Card>
    )
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
              initialDate={initialDate ?? undefined}
              onSuccess={() => {
                setCreateOpen(false)
                load()
                router.refresh()
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
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--color-muted-foreground)]">Source</label>
                  <div className="flex gap-1">
                    {([
                      ["all", "Toutes"],
                      ["internal", "Interne"],
                      ["external", "Google"],
                    ] as [SourceFilter, string][]).map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={sourceFilter === value ? "default" : "outline"}
                        onClick={() => setSourceFilter(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="date-from" className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Du
                  </label>
                  <input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="date-to" className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Au
                  </label>
                  <input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 text-sm"
                  />
                </div>

                {hasActiveFilters && (
                  <Button type="button" size="sm" variant="ghost" onClick={resetFilters} className="gap-1">
                    <X className="h-3.5 w-3.5" />
                    Réinitialiser
                  </Button>
                )}
              </div>

              {persons.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--color-muted-foreground)]">Participants</label>
                  <div className="flex flex-wrap gap-1.5">
                    {persons.map((person) => {
                      const active = participantFilter.includes(person.id)
                      return (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => togglePersonFilter(person.id)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors",
                            active
                              ? "bg-[var(--color-secondary-surface)] ring-1 ring-[var(--color-foreground)]"
                              : "bg-[var(--color-secondary-surface)] opacity-60 hover:opacity-100"
                          )}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: person.color || "var(--color-muted-foreground)" }}
                          />
                          {person.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--color-muted-foreground)]">
              Événements à venir
            </h2>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {hasActiveFilters ? "Aucun événement ne correspond aux filtres." : "Aucun événement à venir."}
              </p>
            ) : (
              <div className="space-y-3">{upcomingEvents.map(renderEventCard)}</div>
            )}
          </div>

          {pastEvents.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setPastOpen((o) => !o)}
                className="flex items-center gap-2 text-sm font-semibold text-[var(--color-muted-foreground)]"
                aria-expanded={pastOpen}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${pastOpen ? "rotate-180" : ""}`}
                />
                Événements passés
              </button>
              {pastOpen && (
                <div className="space-y-3">{pastEvents.map(renderEventCard)}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <EventsPageContent />
    </Suspense>
  )
}

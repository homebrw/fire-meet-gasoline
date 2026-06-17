"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useState, useTransition } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
import { Plus, Trash2, Eye, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { EventForm } from "@/components/events/EventForm"
import { EventCard } from "@/components/events/EventCard"

function EventsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialDate = searchParams.get("date")

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [createOpen, setCreateOpen] = useState(false)
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
    }
    load()
  }, [])

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteEvent(id)
      router.refresh()
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
              initialDate={initialDate ?? undefined}
              onSuccess={() => {
                setCreateOpen(false)
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
                  </div>
                  <EventCard
                    event={ev}
                    persons={persons}
                    onRevalidateNeeded={async () => router.refresh()}
                  />
                </CardContent>
              </Card>
            )
          })}
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

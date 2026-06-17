"use client"

import { useState, useTransition } from "react"
import type { CalendarEvent, Person } from "@/lib/types"
import { createEvent, updateEvent, addEventParticipant, removeEventParticipant, getEventParticipants } from "@/lib/actions/events"
import { ParticipantsSelector } from "@/app/(app)/settings/events/participants-selector"
import {
  Button,
} from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"

interface EventFormProps {
  persons: Person[]
  event?: CalendarEvent
  initialDate?: string
  onSuccess?: () => void
}

export function EventForm({ persons, event, initialDate, onSuccess }: EventFormProps) {
  const [eventType, setEventType] = useState<string>(event?.type ?? "shared")
  const [isAllDay, setIsAllDay] = useState<boolean>(event?.is_all_day ?? false)
  const [allDayDate, setAllDayDate] = useState<string>(initialDate || event?.start_at?.slice(0, 10) || format(new Date(), "yyyy-MM-dd"))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [participants, setParticipants] = useState<string[]>([])

  const parentPersons = persons.filter((p) => !p.is_child)
  const childPersons = persons.filter((p) => p.is_child)

  // Set default start_at to initialDate or event start_at
  const defaultStartAt = event?.start_at?.slice(0, 16) || (initialDate ? format(new Date(initialDate + "T09:00:00"), "yyyy-MM-dd'T'HH:mm") : "")
  const defaultEndAt = event?.end_at?.slice(0, 16) || (initialDate ? format(new Date(initialDate + "T10:00:00"), "yyyy-MM-dd'T'HH:mm") : "")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        if (event) {
          await updateEvent(event.id, formData)
          const existingParticipants = await getEventParticipants(event.id)
          const existingIds = existingParticipants.map((p) => p.person_id)

          for (const id of existingIds) {
            if (!participants.includes(id)) {
              await removeEventParticipant(event.id, id)
            }
          }

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
        <Label htmlFor="title">
          Titre <span className="text-[var(--color-destructive)]">*</span>
        </Label>
        <Input id="title" name="title" defaultValue={event?.title} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type-trigger">Type</Label>
        <Select name="type" value={eventType} onValueChange={setEventType}>
          <SelectTrigger id="type-trigger"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="shared">Commun</SelectItem>
            <SelectItem value="individual">Individuel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {eventType === "individual" && (
        <div className="space-y-2">
          <Label htmlFor="person-trigger">Personne</Label>
          <Select name="owner_person_id" defaultValue={event?.owner_person_id ?? ""}>
            <SelectTrigger id="person-trigger"><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {persons.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <input type="hidden" name="created_by" value={persons[0]?.id ?? ""} />

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            id="is-all-day"
            type="checkbox"
            name="is_all_day"
            value="true"
            checked={isAllDay}
            onChange={(e) => setIsAllDay(e.target.checked)}
            className="rounded"
            aria-label="Événement sur une journée entière"
          />
          Journée entière
        </label>

        {isAllDay ? (
          <div className="space-y-2">
            <Label htmlFor="start_date">
              Date <span className="text-[var(--color-destructive)]">*</span>
            </Label>
            <Input
              id="start_date"
              type="date"
              value={allDayDate}
              onChange={(e) => setAllDayDate(e.target.value)}
              required
            />
            <input type="hidden" name="start_at" value={`${allDayDate}T00:00:00`} />
            <input type="hidden" name="end_at" value={`${allDayDate}T23:59:59`} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_at">
                Début <span className="text-[var(--color-destructive)]">*</span>
              </Label>
              <Input
                id="start_at"
                name="start_at"
                type="datetime-local"
                defaultValue={defaultStartAt}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_at">
                Fin <span className="text-[var(--color-destructive)]">*</span>
              </Label>
              <Input
                id="end_at"
                name="end_at"
                type="datetime-local"
                defaultValue={defaultEndAt}
                required
              />
            </div>
          </div>
        )}
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
            id="is-blocking"
            type="checkbox"
            name="is_blocking"
            value="true"
            defaultChecked={event?.is_blocking}
            className="rounded"
            aria-label="Marquer cet événement comme bloquant"
          />
          Bloquant (annule la disponibilité)
        </label>
      </div>

      {eventType === "individual" && (
        <div className="space-y-2">
          <Label htmlFor="visibility-trigger">Visibilité</Label>
          <Select name="visibility" defaultValue={event?.visibility ?? "both"}>
            <SelectTrigger id="visibility-trigger"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Visible par les deux</SelectItem>
              <SelectItem value="private">Privé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2 border-t pt-4">
        <Label htmlFor="participants">Participants</Label>
        <div id="participants">
          <ParticipantsSelector
            parents={parentPersons}
            childPersonList={childPersons}
            onChange={setParticipants}
          />
        </div>
      </div>

      {error && (
        <div
          className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-[var(--color-destructive)]"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-[var(--color-destructive)] font-medium">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enregistrement…" : event ? "Modifier" : "Créer l'événement"}
      </Button>
    </form>
  )
}

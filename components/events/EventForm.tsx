"use client"

import { useState, useTransition, useRef } from "react"
import type { CalendarEvent, Person } from "@/lib/types"
import { createEvent, updateEvent, addEventParticipant, removeEventParticipant, getEventParticipants } from "@/lib/actions/events"
import { ParticipantsSelector } from "@/app/(app)/settings/events/participants-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { Upload, X } from "lucide-react"
import { datetimeLocalToUTC, formatDatetimeLocal } from "@/lib/utils"

interface EventFormProps {
  persons: Person[]
  event?: CalendarEvent
  initialDate?: string
  onSuccess?: () => void
  onRevalidateNeeded?: () => Promise<void>
}

export function EventForm({ persons, event, initialDate, onSuccess, onRevalidateNeeded }: EventFormProps) {
  const [isAllDay, setIsAllDay] = useState<boolean>(event?.is_all_day ?? false)
  const [allDayDate, setAllDayDate] = useState<string>(initialDate || (event?.start_at ? formatDatetimeLocal(event.start_at).slice(0, 10) : format(new Date(), "yyyy-MM-dd")))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [participants, setParticipants] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parentPersons = persons.filter((p) => !p.is_child)
  const childPersons = persons.filter((p) => p.is_child)

  // Set default start_at to initialDate or event start_at
  const defaultStartAt = event?.start_at ? formatDatetimeLocal(event.start_at) : (initialDate ? format(new Date(initialDate + "T09:00:00"), "yyyy-MM-dd'T'HH:mm") : "")
  const defaultEndAt = event?.end_at ? formatDatetimeLocal(event.end_at) : (initialDate ? format(new Date(initialDate + "T10:00:00"), "yyyy-MM-dd'T'HH:mm") : "")

  async function uploadFiles(eventId: string, personId: string) {
    if (selectedFiles.length === 0) return

    for (const file of selectedFiles) {
      try {
        setUploadProgress(`Upload: ${file.name}...`)
        const formData = new FormData()
        formData.append("file", file)
        formData.append("event_id", eventId)
        formData.append("person_id", personId)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Upload failed")
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed"
        setError(message)
        throw err
      }
    }
    setUploadProgress(null)
    setSelectedFiles([])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    // Convert datetime-local values to UTC
    const startAt = formData.get("start_at")
    const endAt = formData.get("end_at")

    if (startAt && typeof startAt === "string" && startAt.includes("T") && !startAt.includes("Z")) {
      formData.set("start_at", datetimeLocalToUTC(startAt))
    }
    if (endAt && typeof endAt === "string" && endAt.includes("T") && !endAt.includes("Z")) {
      formData.set("end_at", datetimeLocalToUTC(endAt))
    }

    startTransition(async () => {
      try {
        const personId = persons[0]?.id
        if (!personId) throw new Error("Erreur: utilisateur non trouvé")

        let eventId: string
        if (event) {
          eventId = event.id
          await updateEvent(eventId, formData)
          const existingParticipants = await getEventParticipants(eventId)
          const existingIds = existingParticipants.map((p) => p.person_id)

          for (const id of existingIds) {
            if (!participants.includes(id)) {
              await removeEventParticipant(eventId, id)
            }
          }

          for (const id of participants) {
            if (!existingIds.includes(id)) {
              await addEventParticipant(eventId, id)
            }
          }
        } else {
          eventId = await createEvent(formData)

          // Add participants to new event
          for (const participantId of participants) {
            await addEventParticipant(eventId, participantId)
          }
        }

        // Upload files if any
        if (selectedFiles.length > 0) {
          await uploadFiles(eventId, personId)
        }

        onSuccess?.()
        await onRevalidateNeeded?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      }
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.currentTarget.files || [])
    setSelectedFiles(prev => [...prev, ...files])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">
          Titre <span className="text-[var(--color-destructive)]">*</span>
        </Label>
        <Input id="title" name="title" defaultValue={event?.title} required />
      </div>

      <input type="hidden" name="owner_person_id" value="" />
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
            <input type="hidden" name="start_at" value={datetimeLocalToUTC(`${allDayDate}T00:00:00`)} />
            <input type="hidden" name="end_at" value={datetimeLocalToUTC(`${allDayDate}T23:59:59`)} />
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

      <input type="hidden" name="visibility" value="both" />

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

      <div className="space-y-2 border-t pt-4">
        <Label htmlFor="attachments">Pièces jointes</Label>
        <div className="space-y-3">
          <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-900 transition">
            <input
              ref={fileInputRef}
              type="file"
              id="attachments"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <Upload className="h-4 w-4" />
              Ajouter des pièces jointes
            </button>
            <p className="text-xs text-gray-500 mt-1">ou glissez-déposez ici</p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Fichiers sélectionnés ({selectedFiles.length})
              </p>
              <div className="space-y-1">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-xs dark:bg-gray-800"
                  >
                    <span className="truncate text-gray-700 dark:text-gray-300">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-700 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
      {uploadProgress && <p className="text-sm text-blue-600">{uploadProgress}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {uploadProgress ? "Téléchargement…" : isPending ? "Enregistrement…" : event ? "Modifier" : "Créer l'événement"}
      </Button>
    </form>
  )
}

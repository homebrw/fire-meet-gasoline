"use client"

import { useState } from "react"
import type { CalendarEvent, Person } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EventDetailCard } from "@/components/events/EventDetailCard"
import { EventForm } from "@/components/events/EventForm"

interface EventDetailModalProps {
  event: CalendarEvent
  persons: Person[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onRevalidateNeeded?: () => Promise<void>
}

export function EventDetailModal({
  event,
  persons,
  open,
  onOpenChange,
  onRevalidateNeeded,
}: EventDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {isEditing ? (
          <>
            <DialogHeader>
              <DialogTitle>Modifier l&apos;événement</DialogTitle>
            </DialogHeader>
            <EventForm
              persons={persons}
              event={event}
              onSuccess={() => {
                setIsEditing(false)
                onOpenChange(false)
              }}
              onRevalidateNeeded={onRevalidateNeeded}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{event.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <EventDetailCard event={event} showParticipants />
              <Button onClick={() => setIsEditing(true)} className="w-full">
                Modifier
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

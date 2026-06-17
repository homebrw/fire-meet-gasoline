"use client"

import { useState } from "react"
import type { DayState, Person } from "@/lib/types"
import { getStateConfig } from "@/lib/recurrence/display"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Plus, ArrowUp, ArrowDown } from "lucide-react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { EventDetailCard } from "@/components/events/EventDetailCard"
import { EventForm } from "@/components/events/EventForm"
import { EventDetailModal } from "@/components/events/EventDetailModal"
import { AvailabilityWindowsList } from "@/components/shared/AvailabilityDetailSheet"
import type { CalendarEvent } from "@/lib/types"

interface DayDetailSheetProps {
  dateKey: string
  state: DayState | undefined
  persons: Person[]
  open: boolean
  onClose: () => void
}

export function DayDetailSheet({ dateKey, state, persons, open, onClose }: DayDetailSheetProps) {
  const date = parseISO(dateKey + "T12:00:00")
  const [person1, person2] = persons
  const [createEventOpen, setCreateEventOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const stateConfig = getStateConfig(person1?.name ?? "Personne 1", person2?.name ?? "Personne 2")
  const config = state ? stateConfig[state.displayState] : null

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="capitalize">
                {format(date, "EEEE d MMMM yyyy", { locale: fr })}
              </SheetTitle>
              {config && (
                <SheetDescription asChild>
                  <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 w-fit", config.bgClass)}>
                    <span className={cn("h-2 w-2 rounded-full", config.dotClass)} />
                    <span className={cn("text-sm font-medium", config.textClass)}>{config.label}</span>
                  </div>
                </SheetDescription>
              )}
            </div>
            <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Événement
                </Button>
              </DialogTrigger>
              <DialogContent closeOnOutsideClick={false} className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nouvel événement</DialogTitle>
                </DialogHeader>
                <EventForm
                  persons={persons}
                  initialDate={dateKey}
                  onSuccess={() => {
                    setCreateEventOpen(false)
                    onClose()
                    location.reload()
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </SheetHeader>

        {state && (
          <div className="mt-4 space-y-4">
            {/* Custody status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3" style={{backgroundColor: 'var(--color-damien-badge-bg)'}}>
                <p className="text-xs font-semibold mb-1" style={{color: 'var(--color-damien)'}}>{person1?.name ?? "Personne 1"}</p>
                <p className="text-sm">
                  {state.damienHasChildren ? "Avec ses enfants" : "Libre"}
                </p>
                {state.damienIndividualBlockingEvent && (
                  <Badge variant="outline" className="mt-1 text-xs">Bloquant</Badge>
                )}
              </div>
              <div className="rounded-lg p-3" style={{backgroundColor: 'var(--color-ma-badge-bg)'}}>
                <p className="text-xs font-semibold mb-1" style={{color: 'var(--color-ma)'}}>{person2?.name ?? "Personne 2"}</p>
                <p className="text-sm">
                  {state.maHasChild ? "Avec sa fille" : "Libre"}
                </p>
                {state.maIndividualBlockingEvent && (
                  <Badge variant="outline" className="mt-1 text-xs">Bloquant</Badge>
                )}
              </div>
            </div>

            {/* Transitions */}
            {state.custodyTransitions.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-semibold mb-3">Changements de garde</p>
                  <ul className="space-y-2">
                    {state.custodyTransitions.map((t) => {
                      const person = persons.find((p) => p.id === t.person_id)
                      const isPickup = t.direction === "pickup"
                      const Icon = isPickup ? ArrowUp : ArrowDown
                      return (
                        <li key={t.id} className="flex items-start gap-3 text-sm rounded-lg p-3 border" style={{borderColor: person?.color ?? "var(--color-border)", backgroundColor: person?.color ? person.color + "10" : "transparent"}}>
                          <div className="flex items-center justify-center flex-shrink-0">
                            <Icon
                              className="h-4 w-4"
                              style={{ color: person?.color ?? "var(--color-muted-foreground)" }}
                              strokeWidth={2.5}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: person?.color ?? "var(--color-muted-foreground)" }}
                              />
                              <span className="font-semibold">{person?.name ?? "?"}</span>
                              <span className="text-xs text-[var(--color-muted-foreground)]">
                                {isPickup ? "Récupération" : "Dépose"}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                              <span className="font-semibold">{format(parseISO(t.transition_at), "HH:mm", { locale: fr })}</span>
                              {t.location && <span> — {t.location}</span>}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </>
            )}

            {/* Shared events */}
            {state.sharedEvents.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-semibold mb-2">Événements</p>
                  <div className="space-y-3">
                    {state.sharedEvents.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="w-full text-left hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2 rounded"
                      >
                        <EventDetailCard
                          event={ev}
                          showAttachments={true}
                          showParticipants={true}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Availability summary */}
            <Separator />
            {state.bothAvailable || !state.partiallyAvailable ? (
              <div className="rounded-lg p-3" style={{backgroundColor: state.bothAvailable ? 'var(--color-available-light)' : 'var(--color-unavailable-light)'}}>
                <p className="text-sm font-medium" style={{color: state.bothAvailable ? 'var(--color-available)' : 'var(--color-primary)'}}>
                  {state.bothAvailable
                    ? "✓ Disponibles ensemble"
                    : "✗ Pas disponibles ensemble"}
                </p>
              </div>
            ) : (
              <div className="rounded-lg p-3" style={{backgroundColor: 'var(--color-transition-light)'}}>
                <p className="text-sm font-medium mb-2" style={{color: 'var(--color-transition)'}}>
                  Disponibles une partie de la journée
                </p>
                <AvailabilityWindowsList state={state} damien={person1} ma={person2} />
              </div>
            )}
          </div>
        )}
      </SheetContent>
      </Sheet>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          persons={persons}
          open={!!selectedEvent}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedEvent(null)
              location.reload()
            }
          }}
        />
      )}
    </>
  )
}

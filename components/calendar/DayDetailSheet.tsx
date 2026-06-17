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
import { Plus } from "lucide-react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { EventDetailCard } from "@/components/events/EventDetailCard"
import { EventForm } from "@/components/events/EventForm"

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
  const stateConfig = getStateConfig(person1?.name ?? "Personne 1", person2?.name ?? "Personne 2")
  const config = state ? stateConfig[state.displayState] : null

  return (
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
                {state.damienBlockingEvent && (
                  <Badge variant="outline" className="mt-1 text-xs">Bloquant</Badge>
                )}
              </div>
              <div className="rounded-lg p-3" style={{backgroundColor: 'var(--color-ma-badge-bg)'}}>
                <p className="text-xs font-semibold mb-1" style={{color: 'var(--color-ma)'}}>{person2?.name ?? "Personne 2"}</p>
                <p className="text-sm">
                  {state.maHasChild ? "Avec sa fille" : "Libre"}
                </p>
                {state.maBlockingEvent && (
                  <Badge variant="outline" className="mt-1 text-xs">Bloquant</Badge>
                )}
              </div>
            </div>

            {/* Transitions */}
            {state.custodyTransitions.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-semibold mb-2">Changements de garde</p>
                  <ul className="space-y-2">
                    {state.custodyTransitions.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full" style={{backgroundColor: 'var(--color-transition)'}} />
                        <span>
                          {t.direction === "pickup" ? "Récupération" : "Dépôt"}{" "}
                          à {format(parseISO(t.transition_at), "HH:mm")}
                          {t.location && ` — ${t.location}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Shared events */}
            {state.sharedEvents.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-semibold mb-2">Événements communs</p>
                  <div className="space-y-3">
                    {state.sharedEvents.map((ev) => (
                      <EventDetailCard
                        key={ev.id}
                        event={ev}
                        showAttachments={true}
                        showParticipants={true}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Availability summary */}
            <Separator />
            <div className="rounded-lg p-3" style={{backgroundColor: state.bothAvailable ? 'var(--color-available-light)' : 'var(--color-unavailable-light)'}}>
              <p className="text-sm font-medium" style={{color: state.bothAvailable ? 'var(--color-available)' : 'var(--color-primary)'}}>
                {state.bothAvailable
                  ? "✓ Disponibles ensemble"
                  : "✗ Pas disponibles ensemble"}
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

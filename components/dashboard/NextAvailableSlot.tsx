"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { DayState, Person } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { EventForm } from "@/components/events/EventForm"
import { format, parseISO, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarCheck, Plus } from "lucide-react"

interface NextAvailableSlotProps {
  slot: DayState | null
  persons: Person[]
}

export function NextAvailableSlot({ slot, persons }: NextAvailableSlotProps) {
  const router = useRouter()
  const [createEventOpen, setCreateEventOpen] = useState(false)

  return (
    <Card className="border-l-4 border-[var(--color-available)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" style={{color: 'var(--color-available-badge-text)'}} />
          Prochain créneau commun
        </CardTitle>
      </CardHeader>
      <CardContent>
        {slot ? (
          <div className="space-y-3">
            <div>
              <p className="font-semibold" style={{color: 'var(--color-available-badge-text)'}}>
                {format(parseISO(slot.date), "EEEE d MMMM yyyy", { locale: fr })}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {(() => {
                  const daysUntilSlot = differenceInDays(parseISO(slot.date), new Date())
                  return daysUntilSlot === 0 ? "Aujourd'hui" : `Dans ${daysUntilSlot} jour${daysUntilSlot > 1 ? "s" : ""}`
                })()}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                Disponible ensemble — pas d&apos;enfants, pas d&apos;événement bloquant
              </p>
            </div>
            <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Créer un événement
                </Button>
              </DialogTrigger>
              <DialogContent closeOnOutsideClick={false} className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nouvel événement</DialogTitle>
                </DialogHeader>
                <EventForm
                  persons={persons}
                  initialDate={slot.date}
                  onSuccess={() => {
                    setCreateEventOpen(false)
                    router.refresh()
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Aucun créneau commun trouvé dans les prochains 365 jours
          </p>
        )}
      </CardContent>
    </Card>
  )
}

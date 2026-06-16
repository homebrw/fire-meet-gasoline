"use client"

import type { DayState } from "@/lib/types"
import { STATE_CONFIG } from "@/lib/recurrence/display"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface DayDetailSheetProps {
  dateKey: string
  state: DayState | undefined
  open: boolean
  onClose: () => void
}

export function DayDetailSheet({ dateKey, state, open, onClose }: DayDetailSheetProps) {
  const date = parseISO(dateKey + "T12:00:00")
  const config = state ? STATE_CONFIG[state.displayState] : null

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
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
        </SheetHeader>

        {state && (
          <div className="mt-4 space-y-4">
            {/* Custody status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">Damien</p>
                <p className="text-sm">
                  {state.damienHasChildren ? "Avec ses enfants" : "Libre"}
                </p>
                {state.damienBlockingEvent && (
                  <Badge variant="outline" className="mt-1 text-xs">Bloquant</Badge>
                )}
              </div>
              <div className="rounded-lg bg-pink-50 p-3">
                <p className="text-xs font-semibold text-pink-700 mb-1">Marie-Alix</p>
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
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
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
                  <ul className="space-y-2">
                    {state.sharedEvents.map((ev) => (
                      <li key={ev.id} className="text-sm space-y-0.5">
                        <p className="font-medium">{ev.title}</p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {format(parseISO(ev.start_at), "HH:mm")} – {format(parseISO(ev.end_at), "HH:mm")}
                          {ev.location && ` • ${ev.location}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Availability summary */}
            <Separator />
            <div className={cn("rounded-lg p-3", state.bothAvailable ? "bg-green-50" : "bg-gray-50")}>
              <p className={cn("text-sm font-medium", state.bothAvailable ? "text-green-700" : "text-gray-600")}>
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

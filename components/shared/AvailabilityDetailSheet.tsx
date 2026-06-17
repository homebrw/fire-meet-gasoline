"use client"

import type { DayState, Person, TimeWindow } from "@/lib/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface AvailabilityWindowsListProps {
  state: DayState
  damien: Person | undefined
  ma: Person | undefined
}

export function AvailabilityWindowsList({ state, damien, ma }: AvailabilityWindowsListProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold mb-2" style={{ color: "var(--color-available)" }}>
          Disponibles ensemble
        </p>
        {state.commonAvailableWindows.length > 0 ? (
          <ul className="space-y-1.5">
            {state.commonAvailableWindows.map((w, i) => (
              <li key={i}>
                <TimeWindowBadge window={w} color="var(--color-available)" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Aucun créneau commun ce jour-là
          </p>
        )}
      </div>

      {state.damienBusyWindows.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: damien?.color ?? "var(--color-damien)" }} />
            {damien?.name ?? "Personne 1"} — occupé
          </p>
          <ul className="space-y-1">
            {state.damienBusyWindows.map((w, i) => (
              <li key={i}>
                <TimeWindowBadge window={w} color={damien?.color ?? "var(--color-damien)"} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.maBusyWindows.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ma?.color ?? "var(--color-ma)" }} />
            {ma?.name ?? "Personne 2"} — occupé(e)
          </p>
          <ul className="space-y-1">
            {state.maBusyWindows.map((w, i) => (
              <li key={i}>
                <TimeWindowBadge window={w} color={ma?.color ?? "var(--color-ma)"} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function TimeWindowBadge({ window, color }: { window: TimeWindow; color: string }) {
  const start = window.startsAtDayBoundary ? "00:00" : window.start
  const end = window.endsAtDayBoundary ? "23:59" : window.end
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: color + "15", color }}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full")} style={{ backgroundColor: color }} />
      {start} – {end}
    </span>
  )
}

interface AvailabilityDetailSheetProps {
  dateKey: string
  state: DayState | undefined
  damien: Person | undefined
  ma: Person | undefined
  open: boolean
  onClose: () => void
}

export function AvailabilityDetailSheet({
  dateKey,
  state,
  damien,
  ma,
  open,
  onClose,
}: AvailabilityDetailSheetProps) {
  const date = parseISO(dateKey + "T12:00:00")

  if (!state) return null

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="capitalize">
            {format(date, "EEEE d MMMM yyyy", { locale: fr })}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <AvailabilityWindowsList state={state} damien={damien} ma={ma} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

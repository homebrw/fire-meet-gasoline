"use client"

import type { DayState } from "@/lib/types"
import { DISPLAY_CLASSES } from "@/lib/recurrence/display"
import { cn } from "@/lib/utils"
import { format, parseISO, isToday } from "date-fns"

interface DayCellProps {
  dateKey: string
  state: DayState | undefined
  isCurrentMonth: boolean
  onClick: (dateKey: string) => void
}

export function DayCell({ dateKey, state, isCurrentMonth, onClick }: DayCellProps) {
  const date = parseISO(dateKey)
  const today = isToday(date)
  const config = state ? DISPLAY_CLASSES[state.displayState] : null

  return (
    <button
      onClick={() => onClick(dateKey)}
      className={cn(
        "relative flex flex-col items-center justify-start rounded-lg p-1 min-h-[56px] text-left transition-all hover:ring-2 hover:ring-[var(--color-ring)] hover:ring-offset-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
        isCurrentMonth ? "opacity-100" : "opacity-30",
        config?.bgClass ?? "bg-transparent",
      )}
      aria-label={`${format(date, "d MMMM yyyy")}${state?.displayState ? ` - ${state.displayState}` : ''}`}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
          today
            ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
            : config
              ? config.textClass
              : "text-[var(--color-foreground)]"
        )}
      >
        {format(date, "d")}
      </span>

      {/* Indicators */}
      <div className="mt-1 flex gap-0.5 flex-wrap justify-center">
        {state?.hasTransition && (
          <span className="h-1.5 w-1.5 rounded-full" style={{backgroundColor: 'var(--color-transition)'}} aria-label="Changement de garde" title="Changement de garde" />
        )}
        {state?.sharedEvents.length ? (
          <span className="h-1.5 w-1.5 rounded-full" style={{backgroundColor: 'var(--color-event)'}} aria-label="Événement commun" title="Événement commun" />
        ) : null}
      </div>
    </button>
  )
}

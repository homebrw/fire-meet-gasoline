"use client"

import { useState } from "react"
import {
  addWeeks,
  subWeeks,
  startOfWeek,
  addDays,
  format,
  isToday,
} from "date-fns"
import { fr } from "date-fns/locale"
import type { DayState, Person } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface WeekPlanningProps {
  dayStates: Record<string, DayState>
  damien: Person | undefined
  ma: Person | undefined
}

export function WeekPlanning({ dayStates, damien, ma }: WeekPlanningProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const dayKeys = days.map((d) => format(d, "yyyy-MM-dd"))

  const rows: { label: string; short: string; color?: string; check: (s: DayState) => boolean }[] = [
    {
      label: damien?.name ?? "Damien",
      short: damien?.name?.[0] ?? "D",
      color: damien?.color ?? "#3b82f6",
      check: (s) => s.damienHasChildren,
    },
    {
      label: ma?.name ?? "Personne 2",
      short: ma?.name?.[0] ?? "M",
      color: ma?.color ?? "#ec4899",
      check: (s) => s.maHasChild,
    },
    {
      label: "Disponible",
      short: "✓",
      color: "#22c55e",
      check: (s) => s.bothAvailable,
    },
    {
      label: "Changement",
      short: "↔",
      color: "#f97316",
      check: (s) => s.hasTransition,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium">
          {format(weekStart, "d MMM", { locale: fr })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: fr })}
        </p>
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 md:mx-0">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="w-8 md:w-28 text-left px-1 md:px-3 py-2 text-[var(--color-muted-foreground)] font-medium text-xs uppercase tracking-wide" />
              {days.map((d, i) => (
                <th key={i} className="text-center px-1 py-2">
                  <div className={cn(
                    "flex flex-col items-center",
                    isToday(d) && "font-bold"
                  )}>
                    <span className="text-xs text-[var(--color-muted-foreground)] capitalize">
                      {format(d, "EEE", { locale: fr })}
                    </span>
                    <span className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                      isToday(d)
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                        : "text-[var(--color-foreground)]"
                    )}>
                      {format(d, "d")}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="px-1 md:px-3 py-2 w-8 md:w-28">
                  <div className="flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="font-bold text-[10px] md:hidden">{row.short}</span>
                    <span className="font-medium text-xs hidden md:inline truncate">{row.label}</span>
                  </div>
                </td>
                {dayKeys.map((key) => {
                  const state = dayStates[key]
                  const active = state ? row.check(state) : false
                  return (
                    <td key={key} className="px-1 py-2 text-center">
                      {active ? (
                        <div
                          className="mx-auto h-6 w-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: row.color + "30" }}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: row.color }}
                          />
                        </div>
                      ) : (
                        <div className="mx-auto h-6 w-6" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {/* Events row */}
            <tr>
              <td className="px-1 md:px-3 py-2 w-8 md:w-28">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full flex-shrink-0 bg-amber-500" />
                  <span className="font-bold text-[10px] md:hidden text-[var(--color-muted-foreground)]">Ev</span>
                  <span className="text-xs font-medium hidden md:inline text-[var(--color-muted-foreground)]">Événements</span>
                </div>
              </td>
              {dayKeys.map((key) => {
                const state = dayStates[key]
                const evCount = state?.sharedEvents.length ?? 0
                return (
                  <td key={key} className="px-1 py-2 text-center">
                    {evCount > 0 ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        {evCount}
                      </span>
                    ) : null}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

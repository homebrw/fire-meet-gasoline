"use client"

import { useState } from "react"
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
} from "date-fns"
import { fr } from "date-fns/locale"
import type { DayState, Person } from "@/lib/types"
import { DayCell } from "./DayCell"
import { DayDetailSheet } from "./DayDetailSheet"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

interface MonthCalendarProps {
  initialMonth?: string
  dayStates: Record<string, DayState>
  persons: Person[]
}

export function MonthCalendar({ initialMonth, dayStates, persons }: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() =>
    initialMonth ? new Date(initialMonth + "-01") : startOfMonth(new Date())
  )
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  function buildGrid(): string[] {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days: string[] = []
    let day = gridStart
    while (day <= gridEnd) {
      days.push(format(day, "yyyy-MM-dd"))
      day = addDays(day, 1)
    }
    return days
  }

  const grid = buildGrid()
  const selectedState = selectedDay ? dayStates[selectedDay] : undefined
  const [person1, person2] = persons

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-[var(--color-muted-foreground)] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((dateKey) => (
          <DayCell
            key={dateKey}
            dateKey={dateKey}
            state={dayStates[dateKey]}
            isCurrentMonth={isSameMonth(new Date(dateKey + "T12:00:00"), currentMonth)}
            onClick={setSelectedDay}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-blue-100 border border-blue-300" /> {person1?.name ?? "Personne 1"}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-pink-100 border border-pink-300" /> {person2?.name ?? "Personne 2"}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-violet-100 border border-violet-300" /> Chacun a ses enfants</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-green-100 border border-green-300" /> Disponible</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-orange-100 border border-orange-300" /> Changement</span>
      </div>

      {/* Day detail sheet */}
      {selectedDay && (
        <DayDetailSheet
          dateKey={selectedDay}
          state={selectedState}
          persons={persons}
          open={!!selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}

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
  getISOWeek,
} from "date-fns"
import { fr } from "date-fns/locale"
import type { DayState, Person } from "@/lib/types"
import { DayCell } from "./DayCell"
import { DayDetailSheet } from "./DayDetailSheet"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Home } from "lucide-react"

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

  function buildWeeks(): string[][] {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const weeks: string[][] = []
    let week: string[] = []
    let day = gridStart

    while (day <= gridEnd) {
      week.push(format(day, "yyyy-MM-dd"))
      if (week.length === 7) {
        weeks.push(week)
        week = []
      }
      day = addDays(day, 1)
    }

    if (week.length > 0) {
      weeks.push(week)
    }

    return weeks
  }

  const weeks = buildWeeks()
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
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
            <Home className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers with week number column */}
      <div className="grid grid-cols-8 gap-1">
        <div className="text-center text-xs font-medium text-[var(--color-muted-foreground)] py-1">
          Sem
        </div>
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-[var(--color-muted-foreground)] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid with week numbers */}
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => {
          const firstDayOfWeek = new Date(week[0] + "T12:00:00")
          const weekNumber = getISOWeek(firstDayOfWeek)

          return (
            <div key={`week-${weekIndex}`} className="grid grid-cols-8 gap-1">
              <div className="text-center text-xs font-medium text-[var(--color-muted-foreground)] py-2 flex items-center justify-center min-h-16">
                {weekNumber}
              </div>
              {week.map((dateKey) => (
                <DayCell
                  key={dateKey}
                  dateKey={dateKey}
                  state={dayStates[dateKey]}
                  persons={persons}
                  isCurrentMonth={isSameMonth(new Date(dateKey + "T12:00:00"), currentMonth)}
                  onClick={setSelectedDay}
                />
              ))}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-muted-foreground)]">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-blue-100 border border-blue-300" /> {person1?.name ?? "Personne 1"}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-pink-100 border border-pink-300" /> {person2?.name ?? "Personne 2"}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-violet-100 border border-violet-300" /> Chacun a ses enfants</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-green-100 border border-green-300" /> Disponible</span>
        <span className="flex items-center gap-1"><span className="flex text-[0.6rem]">📤</span> Dépose</span>
        <span className="flex items-center gap-1"><span className="flex text-[0.6rem]">📥</span> Récupération</span>
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

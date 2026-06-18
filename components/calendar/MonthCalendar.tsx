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
import type { DayState, Person, RecurrenceException, RecurrenceRule } from "@/lib/types"
import { DayCell } from "./DayCell"
import { DayDetailSheet } from "./DayDetailSheet"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Home, ArrowUp, ArrowDown } from "lucide-react"

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

interface MonthCalendarProps {
  initialMonth?: string
  dayStates: Record<string, DayState>
  persons: Person[]
  exceptions?: RecurrenceException[]
  rules?: RecurrenceRule[]
}

export function MonthCalendar({ initialMonth, dayStates, persons, exceptions, rules }: MonthCalendarProps) {
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
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} aria-label="Mois précédent">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(startOfMonth(new Date()))} aria-label="Retour à aujourd'hui">
            <Home className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} aria-label="Mois suivant">
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
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[var(--color-damien-badge-bg)] border border-[var(--color-damien-badge-text)]" /> {person1?.name ?? "Personne 1"}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[var(--color-ma-badge-bg)] border border-[var(--color-ma-badge-text)]" /> {person2?.name ?? "Personne 2"}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[var(--color-both-kids-badge-bg)] border border-[var(--color-both-kids-badge-text)]" /> Chacun a ses enfants</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[var(--color-available-badge-bg)] border border-[var(--color-available-badge-text)]" /> Disponible</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[var(--color-transition-badge-bg)] border border-[var(--color-transition-badge-text)]" /> Dispo partielle</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{backgroundColor: 'var(--color-event)'}} /> Événement</span>
        <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3 text-foreground" /> Dépose</span>
        <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3 text-foreground" /> Récupération</span>
      </div>

      {/* Day detail sheet */}
      {selectedDay && (
        <DayDetailSheet
          dateKey={selectedDay}
          state={selectedState}
          persons={persons}
          exceptions={exceptions}
          rules={rules}
          open={!!selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}

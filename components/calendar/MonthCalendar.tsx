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
  isToday,
  getISOWeek,
} from "date-fns"
import { fr } from "date-fns/locale"
import type { DayState, Person, RecurrenceException, RecurrenceRule } from "@/lib/types"
import { getStateConfig } from "@/lib/recurrence/display"
import { cn } from "@/lib/utils"
import { DayCell } from "./DayCell"
import { DayDetailSheet } from "./DayDetailSheet"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Home, ArrowUp, ArrowDown, CalendarDays } from "lucide-react"

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
  const stateConfig = getStateConfig(person1?.name ?? "Personne 1", person2?.name ?? "Personne 2")

  function mobileStatus(state: DayState | undefined) {
    if (!state) {
      return {
        label: "Aucune donnée",
        bgClass: "bg-[var(--color-muted)]",
        textClass: "text-[var(--color-muted-foreground)]",
        dotClass: "bg-[var(--color-muted-foreground)]",
      }
    }

    if (state.partiallyAvailable) {
      return {
        label: "Disponible une partie de la journée",
        bgClass: "bg-[var(--color-transition-badge-bg)]",
        textClass: "text-[var(--color-transition-badge-text)]",
        dotClass: "bg-[var(--color-transition)]",
      }
    }

    return stateConfig[state.displayState]
  }

  return (
    <div className="space-y-4">
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

      <div className="space-y-3 md:hidden">
        {weeks.map((week) => {
          const monthDays = week.filter((dateKey) =>
            isSameMonth(new Date(dateKey + "T12:00:00"), currentMonth)
          )
          if (monthDays.length === 0) return null

          const weekNumber = getISOWeek(new Date(week[0] + "T12:00:00"))

          return (
            <section
              key={week[0]}
              className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]"
              aria-label={`Semaine ${weekNumber}`}
            >
              <div className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/60 px-3 py-2 text-xs font-medium text-[var(--color-muted-foreground)]">
                Semaine {weekNumber}
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                {monthDays.map((dateKey) => {
                  const date = new Date(dateKey + "T12:00:00")
                  const state = dayStates[dateKey]
                  const status = mobileStatus(state)
                  const transitionCount = state?.custodyTransitions.length ?? 0
                  const eventCount = state?.sharedEvents.length ?? 0

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => setSelectedDay(dateKey)}
                      className="press-feedback flex min-h-[64px] w-full items-center gap-3 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]"
                      aria-label={`${format(date, "EEEE d MMMM", { locale: fr })} — ${status.label}`}
                    >
                      <div className="w-12 shrink-0 text-center">
                        <div className="text-[11px] font-medium uppercase text-[var(--color-muted-foreground)]">
                          {format(date, "EEE", { locale: fr }).replace(".", "")}
                        </div>
                        <div
                          className={cn(
                            "mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold",
                            isToday(date)
                              ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                              : "text-[var(--color-foreground)]"
                          )}
                        >
                          {format(date, "d")}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className={cn("inline-flex max-w-full items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium", status.bgClass, status.textClass)}>
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", status.dotClass)} />
                          <span className="truncate">{status.label}</span>
                        </div>

                        {(transitionCount > 0 || eventCount > 0) && (
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-muted-foreground)]">
                            {transitionCount > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <ArrowUp className="h-3 w-3" />
                                {transitionCount} passation{transitionCount > 1 ? "s" : ""}
                              </span>
                            )}
                            {eventCount > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {eventCount} événement{eventCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-8 gap-1">
          <div className="py-1 text-center text-xs font-medium text-[var(--color-muted-foreground)]">
            Sem
          </div>
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1 text-center text-xs font-medium text-[var(--color-muted-foreground)]">
              {d}
            </div>
          ))}
        </div>

        <div className="mt-1 space-y-1">
          {weeks.map((week, weekIndex) => {
            const firstDayOfWeek = new Date(week[0] + "T12:00:00")
            const weekNumber = getISOWeek(firstDayOfWeek)

            return (
              <div key={`week-${weekIndex}`} className="grid grid-cols-8 gap-1">
                <div className="flex min-h-16 items-center justify-center py-2 text-center text-xs font-medium text-[var(--color-muted-foreground)]">
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
      </div>

      <div className="hidden flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-muted-foreground)] md:flex">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[var(--color-damien-badge-bg)] border border-[var(--color-damien-badge-text)]" /> {person1?.name ?? "Personne 1"}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[var(--color-ma-badge-bg)] border border-[var(--color-ma-badge-text)]" /> {person2?.name ?? "Personne 2"}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[var(--color-both-kids-badge-bg)] border border-[var(--color-both-kids-badge-text)]" /> Chacun a ses enfants</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[var(--color-available-badge-bg)] border border-[var(--color-available-badge-text)]" /> Disponible</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[var(--color-transition-badge-bg)] border border-[var(--color-transition-badge-text)]" /> Dispo partielle</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{backgroundColor: "var(--color-event)"}} /> Événement</span>
        <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3 text-foreground" /> Dépose</span>
        <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3 text-foreground" /> Récupération</span>
      </div>

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

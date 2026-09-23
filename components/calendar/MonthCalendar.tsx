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
  initialDay?: string
  dayStates: Record<string, DayState>
  persons: Person[]
  exceptions?: RecurrenceException[]
  rules?: RecurrenceRule[]
}

export function MonthCalendar({ initialMonth, initialDay, dayStates, persons, exceptions, rules }: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() =>
    initialMonth ? new Date(initialMonth + "-01T12:00:00") : startOfMonth(new Date())
  )
  const [selectedDay, setSelectedDay] = useState<string | null>(initialDay ?? null)

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

      <div className="md:hidden">
        {weeks.map((week, weekIndex) => {
          const monthDays = week.filter((dateKey) =>
            isSameMonth(new Date(dateKey + "T12:00:00"), currentMonth)
          )
          if (monthDays.length === 0) return null

          const weekNumber = getISOWeek(new Date(week[0] + "T12:00:00"))

          return (
            <section key={week[0]} className={cn(weekIndex > 0 && "mt-2")} aria-label={`Semaine ${weekNumber}`}>
              <div className="flex items-center gap-3 py-2">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  Semaine {weekNumber}
                </span>
                <span className="h-px flex-1 bg-[var(--color-border)]" aria-hidden="true" />
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                {monthDays.map((dateKey) => {
                  const date = new Date(dateKey + "T12:00:00")
                  const state = dayStates[dateKey]
                  const status = mobileStatus(state)
                  const firstTransition = state?.custodyTransitions[0]
                  const transitionPerson = firstTransition
                    ? persons.find((person) => person.id === firstTransition.person_id)
                    : undefined
                  const transitionDate = firstTransition ? new Date(firstTransition.transition_at) : null
                  const transitionMinutes = transitionDate
                    ? transitionDate.getHours() * 60 + transitionDate.getMinutes()
                    : null
                  const transitionPosition = transitionMinutes === null
                    ? null
                    : Math.min(92, Math.max(8, (transitionMinutes / (24 * 60)) * 100))
                  const transitionColor =
                    firstTransition?.person_id === person1?.id
                      ? "var(--color-damien)"
                      : firstTransition?.person_id === person2?.id
                        ? "var(--color-ma)"
                        : "var(--color-transition)"

                  return (
                    <button
                      id={dateKey}
                      key={dateKey}
                      type="button"
                      onClick={() => setSelectedDay(dateKey)}
                      className="press-feedback flex w-full gap-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]"
                      aria-label={`${format(date, "EEEE d MMMM", { locale: fr })} — ${status.label}`}
                    >
                      <div className="w-11 shrink-0 pt-0.5 text-center">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
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

                      <div className="min-w-0 flex-1 pr-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", status.dotClass)} />
                          <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", status.textClass)}>
                            {status.label}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
                        </div>

                        <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-muted)]" aria-hidden="true">
                          {firstTransition && transitionPosition !== null ? (
                            <>
                              <span
                                className="absolute inset-y-0 left-0"
                                style={{
                                  width: `${transitionPosition}%`,
                                  backgroundColor: firstTransition.direction === "dropoff"
                                    ? transitionColor
                                    : "var(--color-border)",
                                }}
                              />
                              <span
                                className="absolute inset-y-0 right-0"
                                style={{
                                  width: `${100 - transitionPosition}%`,
                                  backgroundColor: firstTransition.direction === "pickup"
                                    ? transitionColor
                                    : "var(--color-border)",
                                }}
                              />
                              <span
                                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-background)]"
                                style={{ left: `${transitionPosition}%`, backgroundColor: transitionColor }}
                              />
                            </>
                          ) : (
                            <span className={cn("absolute inset-0", status.dotClass)} />
                          )}
                        </div>

                        {(firstTransition || (state?.sharedEvents.length ?? 0) > 0) && (
                          <div className="mt-2 space-y-1 text-[11px] leading-4 text-[var(--color-muted-foreground)]">
                            {firstTransition && transitionDate && (
                              <div className="flex items-center gap-1.5">
                                {firstTransition.direction === "pickup" ? (
                                  <ArrowUp className="h-3 w-3 shrink-0" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 shrink-0" />
                                )}
                                <span>
                                  <span className="font-medium text-[var(--color-foreground)]">
                                    {format(transitionDate, "HH:mm")}
                                  </span>
                                  {" · "}
                                  {transitionPerson?.name ?? "Parent"}{" "}
                                  {firstTransition.direction === "pickup" ? "récupère ses enfants" : "dépose ses enfants"}
                                  {(state?.custodyTransitions.length ?? 0) > 1
                                    ? ` · +${(state?.custodyTransitions.length ?? 1) - 1} passation`
                                    : ""}
                                </span>
                              </div>
                            )}

                            {state?.sharedEvents.slice(0, 2).map((event) => (
                              <div key={event.id} className="flex items-center gap-1.5">
                                <CalendarDays className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {event.is_all_day ? "Toute la journée" : format(new Date(event.start_at), "HH:mm")}
                                  {" · "}
                                  <span className="text-[var(--color-foreground)]">{event.title}</span>
                                </span>
                              </div>
                            ))}
                            {(state?.sharedEvents.length ?? 0) > 2 && (
                              <div className="pl-[18px]">+{(state?.sharedEvents.length ?? 0) - 2} autre événement</div>
                            )}
                          </div>
                        )}
                      </div>
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

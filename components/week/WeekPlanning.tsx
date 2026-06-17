"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  addWeeks,
  subWeeks,
  startOfWeek,
  addDays,
  format,
  isToday,
  getISOWeek,
  parseISO,
} from "date-fns"
import { fr } from "date-fns/locale"
import type { DayState, Person, CalendarEvent } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Home, ArrowUp, ArrowDown, CircleDashed } from "lucide-react"
import { cn, getWeekString, parseWeekString } from "@/lib/utils"
import { revalidateWeekData } from "@/lib/actions/revalidate"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EventForm } from "@/components/events/EventForm"
import { EventDetailModal } from "@/components/events/EventDetailModal"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { AvailabilityDetailSheet } from "@/components/shared/AvailabilityDetailSheet"

interface WeekPlanningProps {
  dayStates: Record<string, DayState>
  damien: Person | undefined
  ma: Person | undefined
  persons: Person[]
  initialWeek?: string
}

export function WeekPlanning({ dayStates, damien, ma, persons, initialWeek }: WeekPlanningProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [weekStart, setWeekStart] = useState(() => {
    if (initialWeek) {
      return parseWeekString(initialWeek)
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 })
  })
  const [createEventOpen, setCreateEventOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [availabilityDetailOpen, setAvailabilityDetailOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    const weekStr = getWeekString(weekStart)
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.set("week", weekStr)
    router.push(`/week?${newSearchParams.toString()}`, { scroll: false })
  }, [weekStart, router, searchParams])

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const dayKeys = days.map((d) => format(d, "yyyy-MM-dd"))
  const weekNumber = getISOWeek(weekStart)

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
  ]

  function handleDayClick(date: string) {
    setSelectedDate(date)
    setCreateEventOpen(true)
  }

  function handleTransitionClick(date: string) {
    setSelectedDate(date)
    setDetailOpen(true)
  }

  function handleAvailabilityClick(date: string) {
    setSelectedDate(date)
    setAvailabilityDetailOpen(true)
  }

  async function handleRevalidate() {
    await revalidateWeekData()
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium">
            {format(weekStart, "d MMM", { locale: fr })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: fr })}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Semaine {weekNumber}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            <Home className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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
            {/* Availability row (full / partial / none) */}
            <tr>
              <td className="px-1 md:px-3 py-2 w-8 md:w-28">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--color-available)" }} />
                  <span className="font-bold text-[10px] md:hidden">✓</span>
                  <span className="font-medium text-xs hidden md:inline truncate">Disponible</span>
                </div>
              </td>
              {dayKeys.map((key) => {
                const state = dayStates[key]
                if (state?.bothAvailable) {
                  return (
                    <td key={key} className="px-1 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleAvailabilityClick(key)}
                        className="mx-auto h-6 w-6 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: "var(--color-available)" + "30" }}
                        title="Disponibles toute la journée"
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--color-available)" }} />
                      </button>
                    </td>
                  )
                }
                if (state?.partiallyAvailable) {
                  return (
                    <td key={key} className="px-1 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleAvailabilityClick(key)}
                        className="mx-auto h-6 w-6 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: "var(--color-transition)" + "30" }}
                        title="Disponibles une partie de la journée"
                      >
                        <CircleDashed className="h-3.5 w-3.5" style={{ color: "var(--color-transition)" }} strokeWidth={2.5} />
                      </button>
                    </td>
                  )
                }
                return (
                  <td key={key} className="px-1 py-2 text-center">
                    <div className="mx-auto h-6 w-6" />
                  </td>
                )
              })}
            </tr>
            {/* Transitions row */}
            <tr>
              <td className="px-1 md:px-3 py-2 w-8 md:w-28">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{backgroundColor: 'var(--color-transition)'}} />
                  <span className="font-bold text-[10px] md:hidden text-[var(--color-muted-foreground)]">Ch</span>
                  <span className="text-xs font-medium hidden md:inline text-[var(--color-muted-foreground)]">Changements</span>
                </div>
              </td>
              {dayKeys.map((key) => {
                const state = dayStates[key]
                const transitions = state?.custodyTransitions ?? []
                return (
                  <td key={key} className="px-1 py-2 text-center">
                    {transitions.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleTransitionClick(key)}
                        className="mx-auto flex gap-1 items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                        title="Afficher les changements de garde"
                      >
                        {transitions.map((transition) => {
                          const person = persons.find((p) => p.id === transition.person_id)
                          const isPickup = transition.direction === "pickup"
                          const Icon = isPickup ? ArrowUp : ArrowDown
                          return (
                            <Icon
                              key={`${transition.id}-${transition.direction}`}
                              className="h-3.5 w-3.5"
                              style={{ color: person?.color ?? "var(--color-muted-foreground)" }}
                              strokeWidth={2.5}
                            />
                          )
                        })}
                      </button>
                    ) : (
                      <div className="mx-auto h-6 w-6" />
                    )}
                  </td>
                )
              })}
            </tr>
            {/* Events row */}
            <tr>
              <td className="px-1 md:px-3 py-2 w-8 md:w-28">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{backgroundColor: 'var(--color-event)'}} />
                  <span className="font-bold text-[10px] md:hidden text-[var(--color-muted-foreground)]">Ev</span>
                  <span className="text-xs font-medium hidden md:inline text-[var(--color-muted-foreground)]">Événements</span>
                </div>
              </td>
              {dayKeys.map((key) => {
                const state = dayStates[key]
                const events = state?.sharedEvents ?? []
                return (
                  <td key={key} className="px-1 py-2 text-center">
                    <div className="mx-auto flex items-center justify-center gap-1 flex-wrap h-min">
                      {events.length > 0 ? (
                        events.map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelectedEvent(event)}
                            className="h-5 px-2 rounded text-xs font-medium transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ring)] truncate"
                            style={{
                              backgroundColor: 'var(--color-event-badge-bg)',
                              color: 'var(--color-event-badge-text)'
                            }}
                            title={event.title}
                          >
                            {event.title}
                          </button>
                        ))
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDayClick(key)}
                          className="mx-auto h-6 w-6 rounded hover:bg-[var(--color-muted)] transition-colors flex items-center justify-center group"
                        >
                          <Plus className="h-4 w-4 text-[var(--color-muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Transition detail sheet */}
      {selectedDate && (
        <TransitionDetailSheet
          dateKey={selectedDate}
          state={dayStates[selectedDate]}
          persons={persons}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
      )}

      {/* Availability detail sheet */}
      {selectedDate && (
        <AvailabilityDetailSheet
          dateKey={selectedDate}
          state={dayStates[selectedDate]}
          damien={damien}
          ma={ma}
          open={availabilityDetailOpen}
          onClose={() => setAvailabilityDetailOpen(false)}
        />
      )}

      {/* Event creation dialog */}
      <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
        <DialogContent closeOnOutsideClick={false} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvel événement</DialogTitle>
          </DialogHeader>
          {selectedDate && (
            <EventForm
              persons={persons}
              initialDate={selectedDate}
              onSuccess={() => {
                setCreateEventOpen(false)
                handleRevalidate()
              }}
              onRevalidateNeeded={handleRevalidate}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Event detail/edit modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          persons={persons}
          open={!!selectedEvent}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedEvent(null)
              handleRevalidate()
            }
          }}
          onRevalidateNeeded={handleRevalidate}
        />
      )}
    </div>
  )
}

interface TransitionDetailSheetProps {
  dateKey: string
  state: DayState | undefined
  persons: Person[]
  open: boolean
  onClose: () => void
}

function TransitionDetailSheet({
  dateKey,
  state,
  persons,
  open,
  onClose,
}: TransitionDetailSheetProps) {
  const date = parseISO(dateKey + "T12:00:00")
  const personById = Object.fromEntries(persons.map((p) => [p.id, p]))

  if (!state) return null

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <div>
            <SheetTitle className="capitalize">
              {format(date, "EEEE d MMMM yyyy", { locale: fr })}
            </SheetTitle>
          </div>
        </SheetHeader>

        {state.custodyTransitions.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold">Changements de garde</p>
            <ul className="space-y-2">
              {state.custodyTransitions.map((t) => {
                const person = personById[t.person_id]
                const isPickup = t.direction === "pickup"
                const Icon = isPickup ? ArrowUp : ArrowDown
                return (
                  <li key={t.id} className="flex items-start gap-3 text-sm rounded-lg p-3 border" style={{borderColor: person?.color ?? "var(--color-border)", backgroundColor: person?.color ? person.color + "10" : "transparent"}}>
                    <div className="flex items-center justify-center flex-shrink-0">
                      <Icon
                        className="h-4 w-4"
                        style={{ color: person?.color ?? "var(--color-muted-foreground)" }}
                        strokeWidth={2.5}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: person?.color ?? "var(--color-muted-foreground)" }}
                        />
                        <span className="font-semibold">{person?.name ?? "?"}</span>
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          {isPickup ? "Récupération" : "Dépose"}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        <span className="font-semibold">{format(parseISO(t.transition_at), "HH:mm", { locale: fr })}</span>
                        {t.location && <span> — {t.location}</span>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

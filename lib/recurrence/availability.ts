import { addDays, parseISO, startOfDay, endOfDay, format } from "date-fns"
import type {
  Person,
  GeneratedPeriod,
  ChildPresence,
  CalendarEvent,
  CustodyTransition,
  DayState,
  DisplayState,
} from "@/lib/types"

export function computeDayStates(
  persons: Person[],
  periods: GeneratedPeriod[],
  manualPresences: ChildPresence[],
  events: CalendarEvent[],
  transitions: CustodyTransition[],
  from: Date,
  to: Date
): Map<string, DayState> {
  const damien = persons.find((p) => p.name === "Damien")
  const ma = persons.find((p) => p.name === "MA")

  const states = new Map<string, DayState>()

  let current = startOfDay(from)
  const end = startOfDay(to)

  while (current <= end) {
    const dateKey = format(current, "yyyy-MM-dd")
    const dayStart = startOfDay(current)
    const dayEnd = endOfDay(current)

    // Custody from recurrence engine
    let damienHasChildren = false
    let maHasChild = false

    for (const period of periods) {
      if (period.start_at <= dayEnd && period.end_at >= dayStart) {
        if (damien && period.person_id === damien.id) damienHasChildren = true
        if (ma && period.person_id === ma.id) maHasChild = true
      }
    }

    // Manual presences (can override or add)
    for (const presence of manualPresences) {
      const presStart = parseISO(presence.start_at)
      const presEnd = parseISO(presence.end_at)
      if (presStart <= dayEnd && presEnd >= dayStart) {
        if (damien && presence.person_id === damien.id) damienHasChildren = true
        if (ma && presence.person_id === ma.id) maHasChild = true
      }
    }

    // Events for this day
    const dayEvents: CalendarEvent[] = []
    let damienBlockingEvent = false
    let maBlockingEvent = false

    for (const event of events) {
      const evStart = parseISO(event.start_at)
      const evEnd = parseISO(event.end_at)
      if (evStart <= dayEnd && evEnd >= dayStart) {
        dayEvents.push(event)
        if (event.is_blocking) {
          if (event.type === "shared") {
            damienBlockingEvent = true
            maBlockingEvent = true
          } else {
            if (damien && event.owner_person_id === damien.id) damienBlockingEvent = true
            if (ma && event.owner_person_id === ma.id) maBlockingEvent = true
          }
        }
      }
    }

    // Shared events (non-blocking, for display)
    const sharedEvents = dayEvents.filter((e) => e.type === "shared")

    // Transitions for this day
    const dayTransitions = transitions.filter((t) => {
      const tAt = parseISO(t.transition_at)
      return tAt >= dayStart && tAt <= dayEnd
    })

    const hasTransition = dayTransitions.length > 0
    const bothAvailable =
      !damienHasChildren && !maHasChild && !damienBlockingEvent && !maBlockingEvent

    const displayState = computeDisplayState({
      hasTransition,
      damienHasChildren,
      maHasChild,
      damienBlockingEvent,
      maBlockingEvent,
      bothAvailable,
    })

    states.set(dateKey, {
      date: dateKey,
      damienHasChildren,
      maHasChild,
      damienBlockingEvent,
      maBlockingEvent,
      hasTransition,
      sharedEvents,
      custodyTransitions: dayTransitions,
      bothAvailable,
      displayState,
    })

    current = addDays(current, 1)
  }

  return states
}

function computeDisplayState(args: {
  hasTransition: boolean
  damienHasChildren: boolean
  maHasChild: boolean
  damienBlockingEvent: boolean
  maBlockingEvent: boolean
  bothAvailable: boolean
}): DisplayState {
  const {
    hasTransition,
    damienHasChildren,
    maHasChild,
    damienBlockingEvent,
    maBlockingEvent,
    bothAvailable,
  } = args

  if (hasTransition) return "custody_change"
  if (bothAvailable) return "available"
  if (damienHasChildren && maHasChild) return "both_kids"
  if (damienHasChildren) return "damien_kids"
  if (maHasChild) return "ma_kid"
  if (damienBlockingEvent && maBlockingEvent) return "both_unavailable"
  if (damienBlockingEvent) return "damien_unavailable"
  if (maBlockingEvent) return "ma_unavailable"
  return "available"
}

export function findNextAvailableSlot(
  states: Map<string, DayState>,
  from: Date
): DayState | null {
  let current = startOfDay(from)
  for (let i = 0; i < 365; i++) {
    const key = format(current, "yyyy-MM-dd")
    const state = states.get(key)
    if (state?.bothAvailable) return state
    current = addDays(current, 1)
  }
  return null
}

export function getUpcomingTransitions(
  transitions: CustodyTransition[],
  from: Date,
  days = 14
): CustodyTransition[] {
  const end = addDays(from, days)
  return transitions
    .filter((t) => {
      const at = parseISO(t.transition_at)
      return at >= from && at <= end
    })
    .sort((a, b) => a.transition_at.localeCompare(b.transition_at))
}

export function getUpcomingEvents(
  events: CalendarEvent[],
  from: Date,
  days = 14
): CalendarEvent[] {
  const end = addDays(from, days)
  return events
    .filter((e) => {
      const start = parseISO(e.start_at)
      return start >= from && start <= end
    })
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
}

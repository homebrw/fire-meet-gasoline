import { addDays, parseISO, startOfDay, format } from "date-fns"
import { formatTimeInZone, zonedDayBounds } from "@/lib/timezone"
import type {
  Person,
  GeneratedPeriod,
  ChildPresence,
  CalendarEvent,
  CustodyTransition,
  DayState,
  DisplayState,
  TimeWindow,
} from "@/lib/types"

type Interval = { start: Date; end: Date }

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return []
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime())
  const merged: Interval[] = [sorted[0]]
  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1]
    if (current.start <= last.end) {
      if (current.end > last.end) last.end = current.end
    } else {
      merged.push({ ...current })
    }
  }
  return merged
}

function complement(busy: Interval[], dayStart: Date, dayEnd: Date): Interval[] {
  const free: Interval[] = []
  let cursor = dayStart
  for (const interval of busy) {
    if (interval.start > cursor) {
      free.push({ start: cursor, end: interval.start })
    }
    if (interval.end > cursor) cursor = interval.end
  }
  if (cursor < dayEnd) {
    free.push({ start: cursor, end: dayEnd })
  }
  return free
}

function toTimeWindow(interval: Interval, dayStart: Date, dayEnd: Date): TimeWindow {
  return {
    start: formatTimeInZone(interval.start),
    end: formatTimeInZone(interval.end),
    startsAtDayBoundary: interval.start <= dayStart,
    endsAtDayBoundary: interval.end >= dayEnd,
  }
}

function clip(start: Date, end: Date, dayStart: Date, dayEnd: Date): Interval | null {
  const clippedStart = start > dayStart ? start : dayStart
  const clippedEnd = end < dayEnd ? end : dayEnd
  if (clippedStart >= clippedEnd) return null
  return { start: clippedStart, end: clippedEnd }
}

export function computeDayStates(
  persons: Person[],
  periods: GeneratedPeriod[],
  manualPresences: ChildPresence[],
  events: CalendarEvent[],
  transitions: CustodyTransition[],
  from: Date,
  to: Date
): Map<string, DayState> {
  // persons are ordered by created_at — index 0 = first person, index 1 = second
  const [damien, ma] = persons

  const states = new Map<string, DayState>()

  let current = startOfDay(from)
  const end = startOfDay(to)

  while (current <= end) {
    const dateKey = format(current, "yyyy-MM-dd")
    const { start: dayStart, end: dayEnd } = zonedDayBounds(current)

    const damienBusy: Interval[] = []
    const maBusy: Interval[] = []

    function pushTo(personId: string | undefined, interval: Interval | null) {
      if (!interval) return
      if (damien && personId === damien.id) damienBusy.push(interval)
      if (ma && personId === ma.id) maBusy.push(interval)
    }

    // Custody from recurrence engine
    let damienHasChildren = false
    let maHasChild = false

    for (const period of periods) {
      if (period.start_at <= dayEnd && period.end_at >= dayStart) {
        if (damien && period.person_id === damien.id) damienHasChildren = true
        if (ma && period.person_id === ma.id) maHasChild = true
        pushTo(period.person_id, clip(period.start_at, period.end_at, dayStart, dayEnd))
      }
    }

    // Manual presences (can override or add)
    for (const presence of manualPresences) {
      const presStart = parseISO(presence.start_at)
      const presEnd = parseISO(presence.end_at)
      if (presStart <= dayEnd && presEnd >= dayStart) {
        if (damien && presence.person_id === damien.id) damienHasChildren = true
        if (ma && presence.person_id === ma.id) maHasChild = true
        pushTo(presence.person_id, clip(presStart, presEnd, dayStart, dayEnd))
      }
    }

    // Events for this day
    const dayEvents: CalendarEvent[] = []
    let damienIndividualBlockingEvent = false
    let maIndividualBlockingEvent = false
    let sharedBlockingEvent = false
    let damienBlockingEvent = false
    let maBlockingEvent = false

    for (const event of events) {
      const evStart = parseISO(event.start_at)
      const evEnd = parseISO(event.end_at)
      if (evStart <= dayEnd && evEnd >= dayStart) {
        dayEvents.push(event)
        if (event.is_blocking) {
          // all-day events block the entire day regardless of the stored time-of-day
          const interval = event.is_all_day
            ? { start: dayStart, end: dayEnd }
            : clip(evStart, evEnd, dayStart, dayEnd)

          if (!event.owner_person_id) {
            sharedBlockingEvent = true
            damienBlockingEvent = true
            maBlockingEvent = true
            pushTo(damien?.id, interval)
            pushTo(ma?.id, interval)
          } else {
            if (damien && event.owner_person_id === damien.id) {
              damienIndividualBlockingEvent = true
              damienBlockingEvent = true
            }
            if (ma && event.owner_person_id === ma.id) {
              maIndividualBlockingEvent = true
              maBlockingEvent = true
            }
            pushTo(event.owner_person_id, interval)
          }
        }
      }
    }

    const damienPersonallyAvailable = !damienHasChildren && !damienIndividualBlockingEvent
    const maPersonallyAvailable = !maHasChild && !maIndividualBlockingEvent

    // Shared events (non-blocking, for display)
    const sharedEvents = dayEvents.filter((e) => !e.owner_person_id)

    // Transitions for this day
    const dayTransitions = transitions.filter((t) => {
      const tAt = parseISO(t.transition_at)
      return tAt >= dayStart && tAt <= dayEnd
    })

    const hasTransition = dayTransitions.length > 0

    // Joint availability: merge each person's busy intervals, union them, and
    // take the complement over the day to get the common free windows.
    const damienMerged = mergeIntervals(damienBusy)
    const maMerged = mergeIntervals(maBusy)
    const unionBusy = mergeIntervals([...damienMerged, ...maMerged])
    const freeWindows = complement(unionBusy, dayStart, dayEnd)

    const bothAvailable =
      freeWindows.length === 1 &&
      freeWindows[0].start <= dayStart &&
      freeWindows[0].end >= dayEnd
    const partiallyAvailable = freeWindows.length > 0 && !bothAvailable

    const commonAvailableWindows = freeWindows.map((w) => toTimeWindow(w, dayStart, dayEnd))
    const damienBusyWindows = damienMerged.map((w) => toTimeWindow(w, dayStart, dayEnd))
    const maBusyWindows = maMerged.map((w) => toTimeWindow(w, dayStart, dayEnd))

    const displayState = computeDisplayState({
      hasTransition,
      damienHasChildren,
      maHasChild,
      damienIndividualBlockingEvent,
      maIndividualBlockingEvent,
      sharedBlockingEvent,
      bothAvailable,
    })

    states.set(dateKey, {
      date: dateKey,
      damienHasChildren,
      maHasChild,
      damienBlockingEvent,
      maBlockingEvent,
      damienIndividualBlockingEvent,
      maIndividualBlockingEvent,
      sharedBlockingEvent,
      damienPersonallyAvailable,
      maPersonallyAvailable,
      hasTransition,
      sharedEvents,
      custodyTransitions: dayTransitions,
      bothAvailable,
      partiallyAvailable,
      commonAvailableWindows,
      damienBusyWindows,
      maBusyWindows,
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
  damienIndividualBlockingEvent: boolean
  maIndividualBlockingEvent: boolean
  sharedBlockingEvent: boolean
  bothAvailable: boolean
}): DisplayState {
  const {
    damienHasChildren,
    maHasChild,
    damienIndividualBlockingEvent,
    maIndividualBlockingEvent,
    sharedBlockingEvent,
    bothAvailable,
  } = args

  if (bothAvailable) return "available"
  if (sharedBlockingEvent && !damienIndividualBlockingEvent && !maIndividualBlockingEvent)
    return "shared_event"
  if (damienHasChildren && maHasChild) return "both_kids"
  if (damienHasChildren) return "damien_kids"
  if (maHasChild) return "ma_kid"
  if (damienIndividualBlockingEvent && maIndividualBlockingEvent) return "both_unavailable"
  if (damienIndividualBlockingEvent) return "damien_unavailable"
  if (maIndividualBlockingEvent) return "ma_unavailable"
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

export function getNextTransitionPerPerson(
  transitions: CustodyTransition[],
  from: Date,
  days = 14
): CustodyTransition[] {
  const filtered = getUpcomingTransitions(transitions, from, days)
  const byPerson = new Map<string, CustodyTransition>()

  for (const transition of filtered) {
    if (!byPerson.has(transition.person_id)) {
      byPerson.set(transition.person_id, transition)
    }
  }

  return Array.from(byPerson.values()).sort((a, b) =>
    a.transition_at.localeCompare(b.transition_at)
  )
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

export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { generateCustodyPeriods } from "@/lib/recurrence/engine"
import {
  computeDayStates,
  findNextAvailableSlot,
  getUpcomingTransitions,
  getUpcomingEvents,
} from "@/lib/recurrence/availability"
import { DashboardContent } from "@/components/dashboard/DashboardContent"
import { subDays, addDays, startOfToday, parseISO } from "date-fns"
import type { RecurrenceRule, RecurrenceException, ChildPresence, CalendarEvent, CustodyTransition, Person } from "@/lib/types"



async function loadDashboardData() {
  const supabase = await createClient()
  const today = startOfToday()
  const from = subDays(today, 7)
  const to = addDays(today, 60)

  const [personsRes, rulesRes, exceptionsRes, presencesRes, eventsRes, transitionsRes] =
    await Promise.all([
      supabase.from("persons").select("*").order("created_at"),
      supabase.from("recurrence_rules").select("*").eq("is_active", true),
      supabase.from("recurrence_exceptions").select("*"),
      supabase.from("child_presences").select("*"),
      supabase.from("events").select("*"),
      supabase.from("custody_transitions").select("*"),
    ])

  if (personsRes.error) throw personsRes.error
  if (rulesRes.error) throw rulesRes.error

  const persons = (personsRes.data ?? []) as Person[]
  const rules = (rulesRes.data ?? []) as RecurrenceRule[]
  const exceptions = (exceptionsRes.data ?? []) as RecurrenceException[]
  const presences = (presencesRes.data ?? []) as ChildPresence[]
  const events = (eventsRes.data ?? []) as CalendarEvent[]
  const transitions = (transitionsRes.data ?? []) as CustodyTransition[]

  const periods = generateCustodyPeriods(rules, exceptions, from, to)
  const dayStates = computeDayStates(persons, periods, presences, events, transitions, from, to)

  const todayKey = today.toISOString().slice(0, 10)
  const todayState = dayStates.get(todayKey) ?? null

  const [damien, ma] = persons

  const nextSlot = findNextAvailableSlot(dayStates, addDays(today, 1))
  const upcomingTransitions = getUpcomingTransitions(transitions, today, 14)
  const upcomingEvents = getUpcomingEvents(events, today, 14)

  // Filter shared events that occur before the next available slot
  const sharedEventsBefore: CalendarEvent[] = []
  if (nextSlot) {
    const nextSlotDate = parseISO(nextSlot.date + "T00:00:00Z")
    sharedEventsBefore.push(
      ...upcomingEvents.filter(
        (e) =>
          !e.owner_person_id &&
          parseISO(e.start_at) < nextSlotDate
      )
    )
  }

  return {
    todayState,
    damien,
    ma,
    nextSlot,
    upcomingTransitions,
    upcomingEvents,
    sharedEventsBefore,
    persons,
  }
}

export default async function TodayPage() {
  const data = await loadDashboardData()

  return (
    <DashboardContent
      todayState={data.todayState}
      damien={data.damien}
      ma={data.ma}
      nextSlot={data.nextSlot}
      upcomingTransitions={data.upcomingTransitions}
      upcomingEvents={data.upcomingEvents}
      sharedEventsBefore={data.sharedEventsBefore}
      persons={data.persons}
    />
  )
}

export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { generateCustodyPeriods } from "@/lib/recurrence/engine"
import {
  computeDayStates,
  findNextAvailableSlot,
  getNextTransitionPerPerson,
  getUpcomingEvents,
} from "@/lib/recurrence/availability"
import { DashboardContent } from "@/components/dashboard/DashboardContent"
import { subDays, addDays, parseISO, format } from "date-fns"
import { todayInZone } from "@/lib/timezone"
import type { RecurrenceRule, RecurrenceException, ChildPresence, CalendarEvent, CustodyTransition, Person } from "@/lib/types"



async function loadDashboardData(selectedDateString?: string) {
  const supabase = await createClient()
  const today = todayInZone()
  const selectedDate = selectedDateString ? parseISO(selectedDateString) : today
  const from = subDays(selectedDate, 7)
  const to = addDays(selectedDate, 60)

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

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd")
  const todayState = dayStates.get(selectedDateKey) ?? null

  const [damien, ma] = persons

  const nextSlot = findNextAvailableSlot(dayStates, addDays(selectedDate, 1))
  const upcomingTransitions = getNextTransitionPerPerson(transitions, selectedDate, 14)
  const upcomingEvents = getUpcomingEvents(events, selectedDate, 14)

  // Filter shared events that occur before the next available slot
  const sharedEventsBefore: CalendarEvent[] = []
  let filteredUpcomingEvents = upcomingEvents

  if (nextSlot) {
    const nextSlotDate = parseISO(nextSlot.date + "T00:00:00Z")
    sharedEventsBefore.push(
      ...upcomingEvents.filter(
        (e) =>
          !e.owner_person_id &&
          parseISO(e.start_at) < nextSlotDate
      )
    )
    // Only show events after the next available slot to avoid duplication
    filteredUpcomingEvents = upcomingEvents.filter(
      (e) => parseISO(e.start_at) >= nextSlotDate
    )
  }

  return {
    todayState,
    damien,
    ma,
    nextSlot,
    upcomingTransitions,
    upcomingEvents: filteredUpcomingEvents,
    sharedEventsBefore,
    persons,
  }
}

interface TodayPageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const params = await searchParams
  const data = await loadDashboardData(params.date)

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

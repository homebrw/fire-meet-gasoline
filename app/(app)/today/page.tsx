export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { generateCustodyPeriods } from "@/lib/recurrence/engine"
import {
  computeDayStates,
  findNextAvailableSlot,
  getUpcomingTransitions,
  getUpcomingEvents,
} from "@/lib/recurrence/availability"
import { TodayStatus } from "@/components/dashboard/TodayStatus"
import { NextAvailableSlot } from "@/components/dashboard/NextAvailableSlot"
import { UpcomingTransitions } from "@/components/dashboard/UpcomingTransitions"
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents"
import { subDays, addDays, startOfToday } from "date-fns"
import type { RecurrenceRule, RecurrenceException, ChildPresence, CalendarEvent, CustodyTransition, Person } from "@/lib/types"

export default async function TodayPage() {
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

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Aujourd'hui</h1>
      <TodayStatus state={todayState} damien={damien} ma={ma} />
      <NextAvailableSlot slot={nextSlot} />
      <div className="grid gap-4 sm:grid-cols-2">
        <UpcomingTransitions transitions={upcomingTransitions} persons={persons} />
        <UpcomingEvents events={upcomingEvents} persons={persons} />
      </div>
    </div>
  )
}

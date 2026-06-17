export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { generateCustodyPeriods } from "@/lib/recurrence/engine"
import { computeDayStates } from "@/lib/recurrence/availability"
import { MonthCalendar } from "@/components/calendar/MonthCalendar"
import { subDays, addDays, startOfToday } from "date-fns"
import type { RecurrenceRule, RecurrenceException, ChildPresence, CalendarEvent, CustodyTransition, Person, DayState } from "@/lib/types"

export default async function CalendarPage() {
  const supabase = await createClient()
  const today = startOfToday()
  const from = subDays(today, 90)
  const to = addDays(today, 365)

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
  const dayStatesMap = computeDayStates(persons, periods, presences, events, transitions, from, to)

  // Convert Map to plain object for client component
  const dayStates: Record<string, DayState> = {}
  dayStatesMap.forEach((v, k) => { dayStates[k] = v })

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Calendrier</h1>
      <MonthCalendar dayStates={dayStates} persons={persons} exceptions={exceptions} rules={rules} />
    </div>
  )
}

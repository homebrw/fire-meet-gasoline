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
import { subDays, addDays, startOfToday } from "date-fns"
import type { RecurrenceRule, RecurrenceException, ChildPresence, CalendarEvent, CustodyTransition, Person } from "@/lib/types"

export default async function TodayPage() {
  try {
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

    return (
      <DashboardContent
        todayState={todayState}
        damien={damien}
        ma={ma}
        nextSlot={nextSlot}
        upcomingTransitions={upcomingTransitions}
        upcomingEvents={upcomingEvents}
        persons={persons}
      />
    )
  } catch (error) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4">Aujourd&apos;hui</h1>
        <div className="bg-red-50 dark:bg-red-950 border border-[var(--color-destructive)] rounded-lg p-4">
          <h3 className="font-semibold text-[var(--color-destructive)] mb-2">
            Erreur lors du chargement
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
            Impossible de charger vos données. Vérifiez votre connexion et réessayez.
          </p>
          <button
            onClick={() => location.reload()}
            className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md text-sm hover:opacity-90"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }
}

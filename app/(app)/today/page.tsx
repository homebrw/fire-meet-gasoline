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
import type { RecurrenceRule, RecurrenceException, ChildPresence, CalendarEvent, CustodyTransition, Person, ActivityFeedItem } from "@/lib/types"

interface ActivityData {
  id: string
  created_at: string
  updated_at: string
}

interface RuleActivityData extends ActivityData {
  name: string
  person_id: string
}

interface EventActivityData extends ActivityData {
  title: string
  created_by: string
}

interface ExceptionActivityData extends ActivityData {
  person_id: string
}

interface PresenceActivityData extends ActivityData {
  person_id: string
}

interface TransitionActivityData extends ActivityData {
  person_id: string
}

async function loadActivityFeed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  personById: Record<string, Person>
): Promise<ActivityFeedItem[]> {
  const sevenDaysAgo = subDays(startOfToday(), 7)

  const [rulesRes, eventsRes, exceptionsRes, presencesRes, transitionsRes] = await Promise.all([
    supabase
      .from("recurrence_rules")
      .select("id, name, person_id, created_at, updated_at")
      .gte("updated_at", sevenDaysAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("events")
      .select("id, title, created_by, created_at, updated_at")
      .gte("updated_at", sevenDaysAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("recurrence_exceptions")
      .select("id, recurrence_rule_id, person_id, created_at, updated_at")
      .gte("updated_at", sevenDaysAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("child_presences")
      .select("id, person_id, created_at, updated_at")
      .gte("updated_at", sevenDaysAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("custody_transitions")
      .select("id, person_id, created_at, updated_at")
      .gte("updated_at", sevenDaysAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(30),
  ])

  const items: ActivityFeedItem[] = []

  rulesRes.data?.forEach((rule: RuleActivityData) => {
    const isNew = rule.created_at === rule.updated_at
    items.push({
      id: rule.id,
      type: "rule",
      action: isNew ? "created" : "updated",
      resourceName: rule.name,
      personName: personById[rule.person_id]?.name ?? "?",
      timestamp: isNew ? rule.created_at : rule.updated_at,
    })
  })

  eventsRes.data?.forEach((event: EventActivityData) => {
    const isNew = event.created_at === event.updated_at
    items.push({
      id: event.id,
      type: "event",
      action: isNew ? "created" : "updated",
      resourceName: event.title,
      personName: personById[event.created_by]?.name ?? "?",
      timestamp: isNew ? event.created_at : event.updated_at,
    })
  })

  exceptionsRes.data?.forEach((exc: ExceptionActivityData) => {
    const isNew = exc.created_at === exc.updated_at
    items.push({
      id: exc.id,
      type: "exception",
      action: isNew ? "created" : "updated",
      resourceName: `Exception`,
      personName: personById[exc.person_id]?.name ?? "?",
      timestamp: isNew ? exc.created_at : exc.updated_at,
    })
  })

  presencesRes.data?.forEach((presence: PresenceActivityData) => {
    const isNew = presence.created_at === presence.updated_at
    items.push({
      id: presence.id,
      type: "presence",
      action: isNew ? "created" : "updated",
      resourceName: "Présence",
      personName: personById[presence.person_id]?.name ?? "?",
      timestamp: isNew ? presence.created_at : presence.updated_at,
    })
  })

  transitionsRes.data?.forEach((transition: TransitionActivityData) => {
    const isNew = transition.created_at === transition.updated_at
    items.push({
      id: transition.id,
      type: "transition",
      action: isNew ? "created" : "updated",
      resourceName: "Transition",
      personName: personById[transition.person_id]?.name ?? "?",
      timestamp: isNew ? transition.created_at : transition.updated_at,
    })
  })

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return items.slice(0, 10)
}

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

  const personById = Object.fromEntries(persons.map((p) => [p.id, p]))

  const periods = generateCustodyPeriods(rules, exceptions, from, to)
  const dayStates = computeDayStates(persons, periods, presences, events, transitions, from, to)

  const todayKey = today.toISOString().slice(0, 10)
  const todayState = dayStates.get(todayKey) ?? null

  const [damien, ma] = persons

  const nextSlot = findNextAvailableSlot(dayStates, addDays(today, 1))
  const upcomingTransitions = getUpcomingTransitions(transitions, today, 14)
  const upcomingEvents = getUpcomingEvents(events, today, 14)
  const activityFeed = await loadActivityFeed(supabase, personById)

  return {
    todayState,
    damien,
    ma,
    nextSlot,
    upcomingTransitions,
    upcomingEvents,
    persons,
    activityFeed,
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
      persons={data.persons}
      activityFeed={data.activityFeed}
    />
  )
}

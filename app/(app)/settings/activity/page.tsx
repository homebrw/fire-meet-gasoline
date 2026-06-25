export const dynamic = "force-dynamic"

import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { subDays, startOfToday } from "date-fns"
import type { Person, ActivityFeedItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

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
  recurrence_rule_id: string
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
      .select("id, recurrence_rule_id, created_at, updated_at")
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
  const rulePersonById: Record<string, string> = {}
  rulesRes.data?.forEach((rule: RuleActivityData) => {
    rulePersonById[rule.id] = rule.person_id
  })

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
      personName: personById[rulePersonById[exc.recurrence_rule_id]]?.name ?? "?",
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

  return items
}

async function loadActivityData() {
  const supabase = await createClient()

  const [personsRes] = await Promise.all([supabase.from("persons").select("*").order("created_at")])

  if (personsRes.error) throw personsRes.error

  const persons = (personsRes.data ?? []) as Person[]
  const personById = Object.fromEntries(persons.map((p) => [p.id, p]))

  const activityFeed = await loadActivityFeed(supabase, personById)

  return { activityFeed }
}

export default async function ActivityPage() {
  const { activityFeed } = await loadActivityData()

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <Link href="/settings">
        <Button variant="ghost" size="sm" className="gap-2 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Retour aux paramètres
        </Button>
      </Link>

      <h1 className="text-2xl font-bold">Activité récente</h1>

      <ActivityFeed items={activityFeed} />
    </div>
  )
}

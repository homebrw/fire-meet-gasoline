// Serveur ordinaire (PAS "use server") : lecture seule, appelé par
// lib/assistant/tools.ts et par app/api/assistant/route.ts. Aucun état ne
// doit être muté ici — voir lib/recurrence/README.md pour le modèle mental
// du moteur de récurrence sur lequel ce module s'appuie.
import { subDays, addDays, format } from "date-fns"
import { generateCustodyPeriods } from "@/lib/recurrence/engine"
import { zonedDayBounds } from "@/lib/timezone"
import type {
  Person,
  RecurrenceRule,
  RecurrenceException,
  CalendarEvent,
  GeneratedPeriod,
} from "@/lib/types"
import type { createClient } from "@/lib/supabase/server"

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type ScheduleContext = {
  persons: Person[]
  adults: Person[]
  children: Person[]
  rules: RecurrenceRule[]
  exceptions: RecurrenceException[]
}

// Charge tout ce dont l'assistant a besoin en trois lectures parallèles,
// comme app/(app)/today/page.tsx:25-33. À la différence de
// lib/actions/children.ts:getParentChildren(), on NE filtre PAS les enfants
// sur parent_id : l'assistant doit couvrir les deux foyers, pas seulement
// celui de l'utilisateur connecté.
export async function loadScheduleContext(
  supabase: SupabaseServerClient
): Promise<ScheduleContext> {
  const [personsRes, rulesRes, exceptionsRes] = await Promise.all([
    supabase.from("persons").select("*").order("created_at"),
    supabase.from("recurrence_rules").select("*").eq("is_active", true),
    supabase.from("recurrence_exceptions").select("*"),
  ])

  if (personsRes.error) throw personsRes.error
  if (rulesRes.error) throw rulesRes.error
  if (exceptionsRes.error) throw exceptionsRes.error

  const persons = (personsRes.data ?? []) as Person[]
  const rules = (rulesRes.data ?? []) as RecurrenceRule[]
  const exceptions = (exceptionsRes.data ?? []) as RecurrenceException[]

  return {
    persons,
    adults: persons.filter((p) => !p.is_child),
    children: persons.filter((p) => p.is_child),
    rules,
    exceptions,
  }
}

// Marge obligatoire autour de la fenêtre demandée avant d'appeler
// generateCustodyPeriods. expandCustomCycle scanne jour par jour à partir de
// `from` sans jamais regarder avant : un bloc de garde entamé avant `from`
// se verrait attribuer un mauvais (trop tardif) horaire de début si la
// fenêtre n'était pas élargie en amont. Voir lib/recurrence/README.md.
const ENGINE_MARGIN_DAYS = 14

function expandPeriods(ctx: ScheduleContext, from: Date, to: Date): GeneratedPeriod[] {
  return generateCustodyPeriods(
    ctx.rules,
    ctx.exceptions,
    subDays(from, ENGINE_MARGIN_DAYS),
    addDays(to, ENGINE_MARGIN_DAYS)
  )
}

export type CustodySegment = {
  from: Date
  to: Date
  personId: string | null
}

export type DaySegments = {
  date: string // 'YYYY-MM-DD'
  segments: CustodySegment[]
}

// Pour chaque jour calendaire de [from, to] et pour chaque adulte titulaire
// d'au moins une règle dans ctx.rules, découpe la journée de CET adulte en
// segments à partir de ses propres périodes générées : personId = son id
// quand une période le couvre, personId = null sinon (= les enfants liés à
// cet adulte sont chez l'autre parent, non suivi dans l'app).
//
// Les segments de deux adultes différents ne sont PAS fusionnés en une seule
// partition de la journée : dans un foyer recomposé, un adulte peut avoir la
// garde de ses propres enfants pendant que l'autre adulte du foyer a
// séparément la garde des siens (un enfant différent) — ce sont deux faits
// simultanés, pas un conflit. Le tableau de segments retourné peut donc
// contenir, au même horaire, un segment personId=A et un segment
// personId=B : c'est voulu, pas un bug.
//
// Pour filtrer sur un sous-ensemble de personnes (voir get_custody dans
// tools.ts), l'appelant doit pré-filtrer ctx.rules avant d'appeler cette
// fonction — sa signature ne prend pas de filtre.
export function custodySegments(ctx: ScheduleContext, from: Date, to: Date): DaySegments[] {
  const periods = expandPeriods(ctx, from, to)
  const personIds = Array.from(new Set(ctx.rules.map((r) => r.person_id)))

  const periodsByPerson = new Map<string, GeneratedPeriod[]>()
  for (const personId of personIds) periodsByPerson.set(personId, [])
  for (const period of periods) {
    periodsByPerson.get(period.person_id)?.push(period)
  }

  const days: DaySegments[] = []
  let day = from
  while (day <= to) {
    const { start: dayStart, end: dayEnd } = zonedDayBounds(day)
    const segments: CustodySegment[] = []

    for (const personId of personIds) {
      const personPeriods = periodsByPerson.get(personId) ?? []

      const boundaries = new Set<number>([dayStart.getTime(), dayEnd.getTime()])
      for (const period of personPeriods) {
        const startMs = period.start_at.getTime()
        const endMs = period.end_at.getTime()
        if (startMs > dayStart.getTime() && startMs < dayEnd.getTime()) boundaries.add(startMs)
        if (endMs > dayStart.getTime() && endMs < dayEnd.getTime()) boundaries.add(endMs)
      }

      const sorted = Array.from(boundaries).sort((a, b) => a - b)
      for (let i = 0; i < sorted.length - 1; i++) {
        const segStartMs = sorted[i]
        const segEndMs = sorted[i + 1]
        if (segStartMs === segEndMs) continue
        const midMs = segStartMs + (segEndMs - segStartMs) / 2
        const covered = personPeriods.some(
          (p) => p.start_at.getTime() <= midMs && p.end_at.getTime() > midMs
        )
        segments.push({
          from: new Date(segStartMs),
          to: new Date(segEndMs),
          personId: covered ? personId : null,
        })
      }
    }

    segments.sort((a, b) => a.from.getTime() - b.from.getTime())
    days.push({ date: format(day, "yyyy-MM-dd"), segments })
    day = addDays(day, 1)
  }

  return days
}

export type Handoff = {
  at: Date
  personId: string
  direction: "pickup" | "dropoff"
  location: string | null
  ruleId: string
}

// Dérive les passations des bornes des GeneratedPeriod : le début d'une
// période est une récupération (pickup) par son person_id, la fin est une
// dépose (dropoff). Même marge de 14 jours que custodySegments, pour la même
// raison (bornes de période correctement calculées près du bord de fenêtre).
export function handoffsInRange(ctx: ScheduleContext, from: Date, to: Date): Handoff[] {
  const periods = expandPeriods(ctx, from, to)
  const { start: rangeStart } = zonedDayBounds(from)
  const { end: rangeEnd } = zonedDayBounds(to)
  const rulesById = new Map(ctx.rules.map((r) => [r.id, r]))

  const handoffs: Handoff[] = []
  for (const period of periods) {
    const location = rulesById.get(period.rule_id)?.handoff_location ?? null

    if (period.start_at >= rangeStart && period.start_at <= rangeEnd) {
      handoffs.push({
        at: period.start_at,
        personId: period.person_id,
        direction: "pickup",
        location,
        ruleId: period.rule_id,
      })
    }
    if (period.end_at >= rangeStart && period.end_at <= rangeEnd) {
      handoffs.push({
        at: period.end_at,
        personId: period.person_id,
        direction: "dropoff",
        location,
        ruleId: period.rule_id,
      })
    }
  }

  handoffs.sort((a, b) => a.at.getTime() - b.at.getTime())
  return handoffs
}

// events borné par start_at/end_at (chevauchement avec [from, to]). Aucun
// contrôle d'accès applicatif ici : la RLS Supabase filtre déjà les
// événements privés pour l'utilisateur connecté.
export async function eventsInRange(
  supabase: SupabaseServerClient,
  from: Date,
  to: Date
): Promise<CalendarEvent[]> {
  const { start } = zonedDayBounds(from)
  const { end } = zonedDayBounds(to)

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .lte("start_at", end.toISOString())
    .gte("end_at", start.toISOString())
    .order("start_at")

  if (error) throw error
  return (data ?? []) as CalendarEvent[]
}

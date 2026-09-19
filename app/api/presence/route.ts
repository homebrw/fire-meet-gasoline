// Route de lecture seule, appelée serveur → serveur par Checkmate (autre
// dépôt, autre projet Supabase) pour savoir quand un enfant est chez le
// parent suivi ici. Aucune session utilisateur : protégée par un jeton
// partagé (PRESENCE_FEED_TOKEN), jamais par un cookie Supabase — la RLS
// bloquerait tout de toute façon sans session, d'où le client service-role.
//
// Ne fait rien de neuf côté garde : réutilise loadScheduleContext() +
// custodySegments() de lib/assistant/schedule.ts (déjà adossées à
// generateCustodyPeriods(), voir lib/recurrence/README.md) et se contente de
// convertir leur résultat en périodes Checkmate via lib/presence/periods.ts.
//
// `regime` (school/out_of_cycle) a besoin du champ `source` des
// GeneratedPeriod bruts, que custodySegments() ne conserve pas (elle ne
// garde que personId par segment) : on appelle donc EN PLUS
// expandPeriods() — même fonction, simplement rendue exportée — sur le même
// ctx déjà filtré sur le seul parent de l'enfant, sans dupliquer le moteur
// ni changer ce que custodySegments() fait pour l'assistant.
//
// Confidentialité : ne renvoie que des dates/périodes/booléens. Jamais de
// prénom, d'événement, de lieu de passation ni d'un autre enfant.
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { z } from "zod"
import { APP_TIMEZONE } from "@/lib/timezone"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  loadScheduleContext,
  custodySegments,
  expandPeriods,
  type ScheduleContext,
} from "@/lib/assistant/schedule"
import { presenceForDay, regimeForDay } from "@/lib/presence/periods"
import { checkPresenceToken } from "@/lib/presence/auth"

const MAX_WINDOW_DAYS = 200
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const querySchema = z
  .object({
    child: z.string().uuid(),
    from: z.string().regex(DATE_RE, "Format attendu : YYYY-MM-DD."),
    to: z.string().regex(DATE_RE, "Format attendu : YYYY-MM-DD."),
  })
  .refine((q) => q.from <= q.to, { message: "`from` doit être antérieur ou égal à `to`." })

// Même construction que parseCalendarDate (lib/assistant/tools.ts) : un
// marqueur de jour calendaire (minuit heure locale système), jamais dérivé
// d'un instant UTC — voir lib/recurrence/README.md.
function parseCalendarDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function daysBetweenInclusive(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((to.getTime() - from.getTime()) / msPerDay) + 1
}

function errorResponse(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

export async function GET(request: Request) {
  const auth = checkPresenceToken(request)
  if (!auth.ok) {
    return errorResponse(auth.status, auth.error)
  }

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    child: url.searchParams.get("child") ?? "",
    from: url.searchParams.get("from") ?? "",
    to: url.searchParams.get("to") ?? "",
  })
  if (!parsed.success) {
    return errorResponse(400, "Paramètres invalides.")
  }
  const { child, from, to } = parsed.data

  const fromDate = parseCalendarDate(from)
  const toDate = parseCalendarDate(to)
  if (daysBetweenInclusive(fromDate, toDate) > MAX_WINDOW_DAYS) {
    return errorResponse(400, `Fenêtre trop large (${MAX_WINDOW_DAYS} jours maximum).`)
  }

  const supabase = createAdminClient()
  const ctx: ScheduleContext = await loadScheduleContext(supabase)

  const childPerson = ctx.children.find((p) => p.id === child)
  if (!childPerson || !childPerson.parent_id) {
    return errorResponse(404, "Enfant inconnu.")
  }

  // Comme resolvePersonIds() (lib/assistant/tools.ts) : un enfant se résout
  // vers les règles de SON parent_id, une recurrence_rule n'appartenant
  // jamais directement à un enfant.
  const filteredCtx: ScheduleContext = {
    ...ctx,
    rules: ctx.rules.filter((r) => r.person_id === childPerson.parent_id),
  }

  const daySegments = custodySegments(filteredCtx, fromDate, toDate)
  const rawPeriods = expandPeriods(filteredCtx, fromDate, toDate)

  return NextResponse.json({
    timezone: APP_TIMEZONE,
    child_id: child,
    generated_at: new Date().toISOString(),
    days: daySegments.map((day) => {
      const dayMarker = parseCalendarDate(day.date)
      const { present_any, periods, switch_at } = presenceForDay(dayMarker, day.segments)
      const regime = regimeForDay(dayMarker, rawPeriods)
      return { date: day.date, present_any, regime, periods, switch_at }
    }),
  })
}

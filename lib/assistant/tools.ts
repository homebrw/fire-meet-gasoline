// Schémas d'outils bruts (JSON Schema, PAS Zod — cf. lib/assistant/README
// implicite dans app/api/assistant/route.ts) + dispatcher. Chaque outil est
// en lecture seule et n'expose que des données déjà calculées par
// lib/assistant/schedule.ts, elle-même adossée à generateCustodyPeriods().
import { format } from "date-fns"
import { APP_TIMEZONE, formatTimeInZone, todayInZone, zonedDayBounds, zonedDayMarker } from "@/lib/timezone"
import {
  custodySegments,
  handoffsInRange,
  eventsInRange,
  type ScheduleContext,
  type SupabaseServerClient,
} from "@/lib/assistant/schedule"
import { RECURRENCE_EXCEPTION_TYPE_LABELS } from "@/lib/recurrence/labels"
import type { RecurrenceRule } from "@/lib/types"

// ─── Schémas (input_schema JSON Schema brut, strict: true) ────────────────

const DATE_RANGE_PROPERTIES = {
  start_date: {
    type: "string",
    description: "Date de début, incluse, au format YYYY-MM-DD.",
  },
  end_date: {
    type: "string",
    description: "Date de fin, incluse, au format YYYY-MM-DD.",
  },
} as const

export const listFamilyTool = {
  name: "list_family",
  description:
    "Liste les adultes et les enfants suivis dans l'application (avec le parent_id de chaque enfant), le fuseau horaire de référence et la date du jour. À appeler avant toute question portant sur des prénoms : permet de résoudre les prénoms mentionnés par l'utilisateur sur les vrais noms enregistrés au lieu de les deviner.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
  strict: true,
} as const

export const getCustodyTool = {
  name: "get_custody",
  description:
    "Retourne, jour par jour sur la période demandée, les segments de garde : qui a les enfants et à partir de quelle heure. Un jour de passation renvoie plusieurs segments avec l'heure de bascule. Un segment avec person_id=null signifie que les enfants concernés sont chez l'autre parent, non suivi dans l'application (jamais 'personne' ni 'disponible').",
  input_schema: {
    type: "object",
    properties: {
      ...DATE_RANGE_PROPERTIES,
      person_names: {
        type: ["array", "null"],
        items: { type: "string" },
        description:
          "Prénoms d'adultes ou d'enfants (tels que renvoyés par list_family) pour restreindre la réponse à leur foyer. null ou absent = tous les adultes suivis.",
      },
    },
    required: ["start_date", "end_date", "person_names"],
    additionalProperties: false,
  },
  strict: true,
} as const

export const getHandoffsTool = {
  name: "get_handoffs",
  description:
    "Retourne les passations (récupérations et déposes) sur la période demandée, avec l'heure exacte, la personne concernée et le lieu si connu.",
  input_schema: {
    type: "object",
    properties: { ...DATE_RANGE_PROPERTIES },
    required: ["start_date", "end_date"],
    additionalProperties: false,
  },
  strict: true,
} as const

export const getEventsTool = {
  name: "get_events",
  description:
    "Retourne les événements du calendrier sur la période demandée : titre, horaires et propriétaire. La RLS Supabase filtre déjà les événements privés selon l'utilisateur connecté.",
  input_schema: {
    type: "object",
    properties: { ...DATE_RANGE_PROPERTIES },
    required: ["start_date", "end_date"],
    additionalProperties: false,
  },
  strict: true,
} as const

export const getRecurrenceRulesTool = {
  name: "get_recurrence_rules",
  description:
    "Retourne les règles de garde actives : type de motif (weekly_alternating = alternance selon la parité de semaine ; custom_cycle = cycle de jours qui se répète ; manual = période ponctuelle), horaires et lieu de passation, dates de début/fin. À utiliser pour une question sur le fonctionnement du calendrier de garde (ex. 'quel est le rythme de garde de Damien ?'), pas pour savoir qui a les enfants un jour précis (voir get_custody pour ça).",
  input_schema: {
    type: "object",
    properties: {
      person_names: {
        type: ["array", "null"],
        items: { type: "string" },
        description:
          "Prénoms d'adultes ou d'enfants (tels que renvoyés par list_family) pour restreindre aux règles de leur foyer. null ou absent = toutes les règles actives.",
      },
    },
    required: ["person_names"],
    additionalProperties: false,
  },
  strict: true,
} as const

export const getExceptionsTool = {
  name: "get_exceptions",
  description:
    "Retourne les exceptions (présence ou absence exceptionnelle) qui chevauchent la période demandée, avec leur motif (reason) et leurs notes. À utiliser pour expliquer pourquoi la garde d'un jour donné diffère de la règle habituelle (vacances, échange...).",
  input_schema: {
    type: "object",
    properties: {
      ...DATE_RANGE_PROPERTIES,
      person_names: {
        type: ["array", "null"],
        items: { type: "string" },
        description:
          "Prénoms d'adultes ou d'enfants (tels que renvoyés par list_family) pour restreindre aux exceptions de leur foyer. null ou absent = toutes les personnes.",
      },
    },
    required: ["start_date", "end_date", "person_names"],
    additionalProperties: false,
  },
  strict: true,
} as const

export const assistantTools = [
  listFamilyTool,
  getCustodyTool,
  getHandoffsTool,
  getEventsTool,
  getRecurrenceRulesTool,
  getExceptionsTool,
] as const

// Jours de la semaine pour handoff_day (0=lundi..6=dimanche), même convention
// que FULL_DAY_NAMES dans components/forms/RecurrenceRuleForm.tsx. Dupliqué
// sciemment plutôt que partagé : couche UI de formulaire vs. couche outil
// serveur, pas la même unité de sens malgré le contenu identique.
const WEEKDAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

// ─── Helpers ────────────────────────────────────────────────────────────────

// Les dates d'entrée sont de simples "YYYY-MM-DD" saisis/choisis par
// l'utilisateur, sans heure ni fuseau. On les découpe nous-mêmes en
// année/mois/jour plutôt que de passer par parseISO() : parseISO lirait ces
// composantes comme un instant UTC, et un accès local (.getFullYear(), etc.)
// sur cet instant dépendrait alors du fuseau du runtime — exactement
// l'ambiguïté que zonedDayMarker existe pour éviter côté moteur. En
// construisant directement `new Date(year, month - 1, day)`, on obtient un
// marqueur "jour calendaire" cohérent quel que soit le fuseau du serveur,
// au même titre que ce que renvoie zonedDayMarker.
function parseCalendarDate(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!match) {
    throw new Error(`Date invalide (attendu YYYY-MM-DD) : "${dateStr}"`)
  }
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d))
}

function personName(ctx: ScheduleContext, personId: string | null): string | null {
  if (!personId) return null
  return ctx.persons.find((p) => p.id === personId)?.name ?? personId
}

// Résout des prénoms (adulte ou enfant) vers l'ensemble des adultes dont les
// règles gouvernent la garde de ces personnes. Un enfant se résout vers son
// parent_id (l'adulte dont les périodes générées déterminent quand cet
// enfant est présent) ; un adulte se résout vers lui-même. Sans filtre,
// retourne tous les adultes qui possèdent au moins une règle.
function resolvePersonIds(
  ctx: ScheduleContext,
  names: string[] | null
): { personIds: string[]; unresolvedNames: string[] } {
  if (!names || names.length === 0) {
    return {
      personIds: Array.from(new Set(ctx.rules.map((r) => r.person_id))),
      unresolvedNames: [],
    }
  }

  const personIds = new Set<string>()
  const unresolvedNames: string[] = []

  for (const rawName of names) {
    const needle = rawName.trim().toLowerCase()
    const match = ctx.persons.find((p) => p.name.trim().toLowerCase() === needle)
    if (!match) {
      unresolvedNames.push(rawName)
      continue
    }
    if (match.is_child) {
      if (match.parent_id) {
        personIds.add(match.parent_id)
      } else {
        unresolvedNames.push(rawName)
      }
    } else {
      personIds.add(match.id)
    }
  }

  return { personIds: Array.from(personIds), unresolvedNames }
}

// ─── Implémentations ────────────────────────────────────────────────────────

export function listFamily(ctx: ScheduleContext) {
  return {
    timezone: APP_TIMEZONE,
    today: format(todayInZone(), "yyyy-MM-dd"),
    adults: ctx.adults.map((p) => ({ id: p.id, name: p.name })),
    children: ctx.children.map((p) => ({ id: p.id, name: p.name, parent_id: p.parent_id })),
  }
}

export type GetCustodyInput = {
  start_date: string
  end_date: string
  person_names: string[] | null
}

export function getCustody(ctx: ScheduleContext, input: GetCustodyInput) {
  const from = parseCalendarDate(input.start_date)
  const to = parseCalendarDate(input.end_date)
  const { personIds, unresolvedNames } = resolvePersonIds(ctx, input.person_names)

  const filteredCtx: ScheduleContext = {
    ...ctx,
    rules: ctx.rules.filter((r) => personIds.includes(r.person_id)),
  }

  const days = custodySegments(filteredCtx, from, to)

  return {
    timezone: APP_TIMEZONE,
    days: days.map((day) => ({
      date: day.date,
      segments: day.segments.map((seg) => ({
        from_time: formatTimeInZone(seg.from),
        to_time: formatTimeInZone(seg.to),
        person_id: seg.personId,
        person_name: personName(ctx, seg.personId),
      })),
    })),
    unresolved_names: unresolvedNames,
  }
}

export type GetHandoffsInput = {
  start_date: string
  end_date: string
}

export function getHandoffs(ctx: ScheduleContext, input: GetHandoffsInput) {
  const from = parseCalendarDate(input.start_date)
  const to = parseCalendarDate(input.end_date)
  const handoffs = handoffsInRange(ctx, from, to)

  return {
    timezone: APP_TIMEZONE,
    handoffs: handoffs.map((h) => ({
      date: format(zonedDayMarker(h.at), "yyyy-MM-dd"),
      time: formatTimeInZone(h.at),
      person_id: h.personId,
      person_name: personName(ctx, h.personId),
      direction: h.direction,
      location: h.location,
    })),
  }
}

export type GetEventsInput = {
  start_date: string
  end_date: string
}

export async function getEvents(
  ctx: ScheduleContext,
  supabase: SupabaseServerClient,
  input: GetEventsInput
) {
  const from = parseCalendarDate(input.start_date)
  const to = parseCalendarDate(input.end_date)
  const events = await eventsInRange(supabase, from, to)

  return {
    timezone: APP_TIMEZONE,
    events: events.map((e) => {
      const start = new Date(e.start_at)
      const end = new Date(e.end_at)
      return {
        title: e.title,
        date: format(zonedDayMarker(start), "yyyy-MM-dd"),
        start_time: e.is_all_day ? null : formatTimeInZone(start),
        end_time: e.is_all_day ? null : formatTimeInZone(end),
        is_all_day: e.is_all_day,
        location: e.location,
        owner_person_id: e.owner_person_id,
        owner_name: e.owner_person_id ? personName(ctx, e.owner_person_id) : "partagé",
        visibility: e.visibility,
      }
    }),
  }
}

export type GetRecurrenceRulesInput = {
  person_names: string[] | null
}

function ruleDate(dateStr: string): string {
  return format(zonedDayMarker(new Date(dateStr)), "yyyy-MM-dd")
}

export function getRecurrenceRules(ctx: ScheduleContext, input: GetRecurrenceRulesInput) {
  const { personIds, unresolvedNames } = resolvePersonIds(ctx, input.person_names)
  const rules = ctx.rules.filter((r) => personIds.includes(r.person_id))

  return {
    timezone: APP_TIMEZONE,
    rules: rules.map((r: RecurrenceRule) => ({
      id: r.id,
      person_id: r.person_id,
      person_name: personName(ctx, r.person_id),
      name: r.name,
      pattern_type: r.pattern_type,
      starts_at: ruleDate(r.starts_at),
      ends_at: r.ends_at ? ruleDate(r.ends_at) : null,
      custody_start_time: r.custody_start_time,
      custody_end_time: r.custody_end_time,
      week_parity: r.week_parity,
      handoff_day: r.handoff_day,
      handoff_day_name: r.handoff_day !== null ? WEEKDAY_NAMES[r.handoff_day] : null,
      cycle_length_days: r.cycle_length_days,
      custody_days: r.custody_days,
      handoff_location: r.handoff_location,
    })),
    unresolved_names: unresolvedNames,
  }
}

export type GetExceptionsInput = {
  start_date: string
  end_date: string
  person_names: string[] | null
}

export function getExceptions(ctx: ScheduleContext, input: GetExceptionsInput) {
  const from = parseCalendarDate(input.start_date)
  const to = parseCalendarDate(input.end_date)
  const { start: rangeStart } = zonedDayBounds(from)
  const { end: rangeEnd } = zonedDayBounds(to)

  const { personIds, unresolvedNames } = resolvePersonIds(ctx, input.person_names)
  const ruleIds = new Set(ctx.rules.filter((r) => personIds.includes(r.person_id)).map((r) => r.id))
  const rulesById = new Map(ctx.rules.map((r) => [r.id, r]))

  const exceptions = ctx.exceptions.filter((e) => {
    if (!ruleIds.has(e.recurrence_rule_id)) return false
    const start = new Date(e.start_at)
    const end = new Date(e.end_at)
    return start < rangeEnd && end > rangeStart
  })

  exceptions.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())

  return {
    timezone: APP_TIMEZONE,
    exceptions: exceptions.map((e) => {
      const rule = rulesById.get(e.recurrence_rule_id)
      const start = new Date(e.start_at)
      const end = new Date(e.end_at)
      return {
        id: e.id,
        rule_name: rule?.name ?? null,
        person_id: rule?.person_id ?? null,
        person_name: rule ? personName(ctx, rule.person_id) : null,
        type: e.type,
        type_label: RECURRENCE_EXCEPTION_TYPE_LABELS[e.type],
        start_date: format(zonedDayMarker(start), "yyyy-MM-dd"),
        start_time: formatTimeInZone(start),
        end_date: format(zonedDayMarker(end), "yyyy-MM-dd"),
        end_time: formatTimeInZone(end),
        reason: e.reason,
        notes: e.notes,
      }
    }),
    unresolved_names: unresolvedNames,
  }
}

// ─── Dispatcher ────────────────────────────────────────────────────────────

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Paramètre "${field}" manquant ou invalide.`)
  }
  return value
}

function optionalStringArray(value: unknown, field: string): string[] | null {
  if (value === null || value === undefined) return null
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
    throw new Error(`Paramètre "${field}" invalide : un tableau de chaînes était attendu.`)
  }
  return value
}

export async function runTool(
  name: string,
  input: unknown,
  ctx: ScheduleContext,
  supabase: SupabaseServerClient
): Promise<unknown> {
  const body = (input ?? {}) as Record<string, unknown>

  switch (name) {
    case "list_family":
      return listFamily(ctx)

    case "get_custody":
      return getCustody(ctx, {
        start_date: requireString(body.start_date, "start_date"),
        end_date: requireString(body.end_date, "end_date"),
        person_names: optionalStringArray(body.person_names, "person_names"),
      })

    case "get_handoffs":
      return getHandoffs(ctx, {
        start_date: requireString(body.start_date, "start_date"),
        end_date: requireString(body.end_date, "end_date"),
      })

    case "get_events":
      return getEvents(ctx, supabase, {
        start_date: requireString(body.start_date, "start_date"),
        end_date: requireString(body.end_date, "end_date"),
      })

    case "get_recurrence_rules":
      return getRecurrenceRules(ctx, {
        person_names: optionalStringArray(body.person_names, "person_names"),
      })

    case "get_exceptions":
      return getExceptions(ctx, {
        start_date: requireString(body.start_date, "start_date"),
        end_date: requireString(body.end_date, "end_date"),
        person_names: optionalStringArray(body.person_names, "person_names"),
      })

    default:
      throw new Error(`Outil inconnu : "${name}"`)
  }
}

// Schémas d'outils bruts (JSON Schema, PAS Zod — cf. lib/assistant/README
// implicite dans app/api/assistant/route.ts) + dispatcher. Chaque outil est
// en lecture seule et n'expose que des données déjà calculées par
// lib/assistant/schedule.ts, elle-même adossée à generateCustodyPeriods().
import { format } from "date-fns"
import { APP_TIMEZONE, formatTimeInZone, todayInZone, zonedDayMarker } from "@/lib/timezone"
import {
  custodySegments,
  handoffsInRange,
  eventsInRange,
  type ScheduleContext,
  type SupabaseServerClient,
} from "@/lib/assistant/schedule"

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

export const assistantTools = [
  listFamilyTool,
  getCustodyTool,
  getHandoffsTool,
  getEventsTool,
] as const

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

    default:
      throw new Error(`Outil inconnu : "${name}"`)
  }
}

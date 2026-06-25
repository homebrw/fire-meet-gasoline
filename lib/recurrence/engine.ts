import {
  addDays,
  differenceInDays,
  getISOWeek,
  parseISO,
  startOfDay,
  startOfWeek,
  format,
} from "date-fns"
import type {
  RecurrenceRule,
  RecurrenceException,
  GeneratedPeriod,
} from "@/lib/types"
import { zonedTimeToUtc } from "@/lib/timezone"

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateCustodyPeriods(
  rules: RecurrenceRule[],
  exceptions: RecurrenceException[],
  from: Date,
  to: Date
): GeneratedPeriod[] {
  const exceptionsByRule = groupBy(exceptions, (e) => e.recurrence_rule_id)
  const all: GeneratedPeriod[] = []

  for (const rule of rules) {
    if (!rule.is_active) continue
    const ruleExceptions = exceptionsByRule.get(rule.id) ?? []

    switch (rule.pattern_type) {
      case "weekly_alternating":
        all.push(...expandWeeklyAlternating(rule, ruleExceptions, from, to))
        break
      case "custom_cycle":
        all.push(...expandCustomCycle(rule, ruleExceptions, from, to))
        break
      case "manual":
        all.push(...expandManual(rule, ruleExceptions, from, to))
        break
    }
  }

  return all.sort((a, b) => a.start_at.getTime() - b.start_at.getTime())
}

// ─── weekly_alternating ───────────────────────────────────────────────────────

function expandWeeklyAlternating(
  rule: RecurrenceRule,
  exceptions: RecurrenceException[],
  from: Date,
  to: Date
): GeneratedPeriod[] {
  if (!rule.week_parity) return []

  const ruleStart = parseISO(rule.starts_at)
  const ruleEnd = rule.ends_at ? parseISO(rule.ends_at) : null
  const windowStart = from < ruleStart ? ruleStart : from
  const windowEnd = ruleEnd && to > ruleEnd ? ruleEnd : to

  // handoff_day : 0 = lundi … 6 = dimanche (même convention que custom_cycle).
  // date-fns weekStartsOn utilise 0 = dimanche, d'où la conversion.
  const handoffDay = rule.handoff_day ?? 0
  const weekStartsOn = (((handoffDay + 1) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6)

  // La garde commence au 1er jour de passation >= starts_at et dans une
  // semaine de la bonne parité — « le prochain jour de passation impair ».
  const handoffOfRuleStart = startOfWeek(ruleStart, { weekStartsOn })
  let firstHandoff =
    handoffOfRuleStart >= startOfDay(ruleStart)
      ? handoffOfRuleStart
      : addDays(handoffOfRuleStart, 7)
  while (!weekParityMatches(firstHandoff, rule.week_parity)) {
    firstHandoff = addDays(firstHandoff, 7)
  }

  // Démarrer une semaine avant la fenêtre pour capturer une période déjà en
  // cours (ex. handoff du matin), sans jamais précéder firstHandoff.
  let handoff = addDays(startOfWeek(windowStart, { weekStartsOn }), -7)
  if (handoff < firstHandoff) handoff = firstHandoff

  const periods: GeneratedPeriod[] = []
  while (handoff <= windowEnd) {
    if (handoff >= firstHandoff && weekParityMatches(handoff, rule.week_parity)) {
      const start_at = applyTime(handoff, rule.custody_start_time)
      const end_at = applyTime(addDays(handoff, 7), rule.custody_end_time) // jour de passation suivant
      if (end_at > windowStart) {
        periods.push({
          person_id: rule.person_id,
          start_at,
          end_at,
          rule_id: rule.id,
          source: "rule",
          exception_id: null,
        })
      }
    }
    handoff = addDays(handoff, 7)
  }

  return applyExceptions(periods, exceptions, rule)
}

function weekParityMatches(date: Date, parity: "even" | "odd"): boolean {
  const isEven = getISOWeek(date) % 2 === 0
  return parity === "even" ? isEven : !isEven
}

// ─── custom_cycle ─────────────────────────────────────────────────────────────

function expandCustomCycle(
  rule: RecurrenceRule,
  exceptions: RecurrenceException[],
  from: Date,
  to: Date
): GeneratedPeriod[] {
  if (!rule.cycle_length_days || !rule.custody_days?.length) return []

  const ruleStart = startOfDay(parseISO(rule.starts_at))
  const ruleEnd = rule.ends_at ? parseISO(rule.ends_at) : null
  const windowStart = from < ruleStart ? ruleStart : from
  const windowEnd = ruleEnd && to > ruleEnd ? ruleEnd : to

  const custodyDays: Date[] = []

  let current = startOfDay(windowStart)
  while (current <= windowEnd) {
    const daysSinceStart = differenceInDays(current, ruleStart)
    const dayInCycle = ((daysSinceStart % rule.cycle_length_days) + rule.cycle_length_days) % rule.cycle_length_days
    if (rule.custody_days.includes(dayInCycle)) {
      custodyDays.push(current)
    }
    current = addDays(current, 1)
  }

  const rawPeriods = groupConsecutiveDays(custodyDays, rule)
  return applyExceptions(rawPeriods, exceptions, rule)
}

// ─── manual ──────────────────────────────────────────────────────────────────

function expandManual(
  rule: RecurrenceRule,
  exceptions: RecurrenceException[],
  from: Date,
  to: Date
): GeneratedPeriod[] {
  const start = parseISO(rule.starts_at)
  if (start > to) return []

  const end = rule.ends_at ? parseISO(rule.ends_at) : addDays(start, 1)
  if (end < from) return []

  const period: GeneratedPeriod = {
    person_id: rule.person_id,
    start_at: applyTime(start > from ? start : from, rule.custody_start_time),
    end_at: applyTime(end, rule.custody_end_time),
    rule_id: rule.id,
    source: "rule",
    exception_id: null,
  }

  return applyExceptions([period], exceptions, rule)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupConsecutiveDays(days: Date[], rule: RecurrenceRule): GeneratedPeriod[] {
  if (days.length === 0) return []

  const periods: GeneratedPeriod[] = []
  let periodStart = days[0]
  let prev = days[0]

  for (let i = 1; i < days.length; i++) {
    const diff = differenceInDays(days[i], prev)
    if (diff > 1) {
      periods.push({
        person_id: rule.person_id,
        start_at: applyTime(periodStart, rule.custody_start_time),
        end_at: applyTime(addDays(prev, 1), rule.custody_end_time),
        rule_id: rule.id,
        source: "rule",
        exception_id: null,
      })
      periodStart = days[i]
    }
    prev = days[i]
  }

  periods.push({
    person_id: rule.person_id,
    start_at: applyTime(periodStart, rule.custody_start_time),
    end_at: applyTime(addDays(prev, 1), rule.custody_end_time),
    rule_id: rule.id,
    source: "rule",
    exception_id: null,
  })

  return periods
}

function applyTime(date: Date, time: string, endOfDay = false): Date {
  const [hours, minutes] = time.split(":").map(Number)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  if (endOfDay && hours === 0 && minutes === 0) {
    // If end time is midnight, treat as end of that day
    const endOfLocalDay = zonedTimeToUtc(year, month, day, 23, 59)
    return new Date(endOfLocalDay.getTime() + 59999)
  }
  return zonedTimeToUtc(year, month, day, hours, minutes)
}

// Applique d'abord toutes les exceptions "absent" (retire/tronque/scinde les
// périodes générées qui chevauchent), puis ajoute les périodes "present".
// Les "present" qui se chevauchent ne sont pas fusionnées entre elles.
function applyExceptions(
  periods: GeneratedPeriod[],
  exceptions: RecurrenceException[],
  rule: RecurrenceRule
): GeneratedPeriod[] {
  const relevant = exceptions.filter((exc) => exc.recurrence_rule_id === rule.id)
  const absences = relevant.filter((exc) => exc.type === "absent")
  const presences = relevant.filter((exc) => exc.type === "present")

  let result = [...periods]

  for (const exc of absences) {
    const excStart = parseISO(exc.start_at)
    const excEnd = parseISO(exc.end_at)
    const nextResult: GeneratedPeriod[] = []

    for (const period of result) {
      const overlapStart = period.start_at > excStart ? period.start_at : excStart
      const overlapEnd = period.end_at < excEnd ? period.end_at : excEnd

      if (overlapStart >= overlapEnd) {
        nextResult.push(period)
        continue
      }

      if (period.start_at < overlapStart) {
        nextResult.push({
          ...period,
          end_at: overlapStart,
        })
      }
      if (period.end_at > overlapEnd) {
        nextResult.push({
          ...period,
          start_at: overlapEnd,
        })
      }
    }

    result = nextResult
  }

  for (const exc of presences) {
    result.push({
      person_id: rule.person_id,
      start_at: parseISO(exc.start_at),
      end_at: parseISO(exc.end_at),
      rule_id: rule.id,
      source: "exception",
      exception_id: exc.id,
    })
  }

  return result
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
  }
  return map
}

export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

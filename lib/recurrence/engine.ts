import {
  addDays,
  differenceInDays,
  getISOWeek,
  isWithinInterval,
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

  // La garde commence au 1er lundi (a) >= starts_at et (b) dans une semaine de
  // la bonne parité — « le prochain lundi impair ».
  const mondayOfRuleStart = startOfWeek(ruleStart, { weekStartsOn: 1 })
  let firstMonday =
    mondayOfRuleStart >= startOfDay(ruleStart)
      ? mondayOfRuleStart
      : addDays(mondayOfRuleStart, 7)
  while (!weekParityMatches(firstMonday, rule.week_parity)) {
    firstMonday = addDays(firstMonday, 7)
  }

  // Démarrer une semaine avant la fenêtre pour capturer une période déjà en
  // cours (ex. handoff du lundi matin), sans jamais précéder firstMonday.
  let monday = addDays(startOfWeek(windowStart, { weekStartsOn: 1 }), -7)
  if (monday < firstMonday) monday = firstMonday

  const periods: GeneratedPeriod[] = []
  while (monday <= windowEnd) {
    if (monday >= firstMonday && weekParityMatches(monday, rule.week_parity)) {
      const start_at = applyTime(monday, rule.custody_start_time)
      const end_at = applyTime(addDays(monday, 7), rule.custody_end_time) // lundi suivant
      if (end_at > windowStart) {
        periods.push({
          person_id: rule.person_id,
          start_at,
          end_at,
          rule_id: rule.id,
          source: "rule",
        })
      }
    }
    monday = addDays(monday, 7)
  }

  return applyExceptions(periods, exceptions, rule.id)
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
  return applyExceptions(rawPeriods, exceptions, rule.id)
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

  const period: GeneratedPeriod = {
    person_id: rule.person_id,
    start_at: start > from ? start : from,
    end_at: to,
    rule_id: rule.id,
    source: "rule",
  }

  return applyExceptions([period], exceptions, rule.id)
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
        end_at: applyTime(prev, rule.custody_end_time, true),
        rule_id: rule.id,
        source: "rule",
      })
      periodStart = days[i]
    }
    prev = days[i]
  }

  periods.push({
    person_id: rule.person_id,
    start_at: applyTime(periodStart, rule.custody_start_time),
    end_at: applyTime(prev, rule.custody_end_time, true),
    rule_id: rule.id,
    source: "rule",
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

function applyExceptions(
  periods: GeneratedPeriod[],
  exceptions: RecurrenceException[],
  ruleId: string
): GeneratedPeriod[] {
  let result = [...periods]

  for (const exc of exceptions) {
    if (exc.recurrence_rule_id !== ruleId) continue

    const originalStart = exc.original_start_at ? parseISO(exc.original_start_at) : null

    switch (exc.type) {
      case "cancel":
        if (originalStart) {
          result = result.filter(
            (p) =>
              !isWithinInterval(originalStart, {
                start: p.start_at,
                end: p.end_at,
              })
          )
        }
        break

      case "move":
        if (originalStart && exc.override_start_at && exc.override_end_at) {
          result = result.filter(
            (p) =>
              !isWithinInterval(originalStart, {
                start: p.start_at,
                end: p.end_at,
              })
          )
          result.push({
            person_id: periods[0]?.person_id ?? "",
            start_at: parseISO(exc.override_start_at),
            end_at: parseISO(exc.override_end_at),
            rule_id: ruleId,
            source: "exception",
          })
        }
        break

      case "extend":
        if (originalStart && exc.override_end_at) {
          result = result.map((p) => {
            if (
              isWithinInterval(originalStart, { start: p.start_at, end: p.end_at })
            ) {
              return { ...p, end_at: parseISO(exc.override_end_at!) }
            }
            return p
          })
        }
        break

      case "shorten":
        if (originalStart && exc.override_end_at) {
          result = result.map((p) => {
            if (
              isWithinInterval(originalStart, { start: p.start_at, end: p.end_at })
            ) {
              return { ...p, end_at: parseISO(exc.override_end_at!) }
            }
            return p
          })
        }
        break

      case "add":
        if (exc.override_start_at && exc.override_end_at) {
          result.push({
            person_id: periods[0]?.person_id ?? "",
            start_at: parseISO(exc.override_start_at),
            end_at: parseISO(exc.override_end_at),
            rule_id: ruleId,
            source: "exception",
          })
        }
        break
    }
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

"use server"

import { createClient } from "@/lib/supabase/server"
import { generateCustodyPeriods } from "./engine"
import type { RecurrenceRule, ChildPresence, CustodyTransition } from "@/lib/types"
import { addYears, parseISO } from "date-fns"
import { syncPersonCalendarSafe } from "@/lib/calendar-sync/sync"

export async function generateAndPersistCustodyData(rule: RecurrenceRule) {
  const supabase = await createClient()

  // Fetch all exceptions for this rule
  const { data: exceptions } = await supabase
    .from("recurrence_exceptions")
    .select("*")
    .eq("recurrence_rule_id", rule.id)

  // Calculate generation period
  const ruleStart = parseISO(rule.starts_at)
  const ruleEnd = rule.ends_at ? parseISO(rule.ends_at) : addYears(ruleStart, 2)

  // Generate periods
  const generatedPeriods = generateCustodyPeriods([rule], exceptions ?? [], ruleStart, ruleEnd)

  // Delete old generated ChildPresence and CustodyTransition for this rule
  await supabase.from("child_presences").delete().eq("recurrence_rule_id", rule.id)
  await supabase.from("custody_transitions").delete().eq("recurrence_rule_id", rule.id)

  if (generatedPeriods.length === 0) {
    void syncPersonCalendarSafe(rule.person_id)
    return
  }

  // Create ChildPresence records
  const childPresences: Omit<ChildPresence, "id" | "created_at" | "updated_at">[] = generatedPeriods.map((period) => ({
    person_id: period.person_id,
    start_at: period.start_at.toISOString(),
    end_at: period.end_at.toISOString(),
    recurrence_rule_id: rule.id,
    is_exception: period.exception_id !== null,
    exception_id: period.exception_id,
    notes: null,
  }))

  // Create CustodyTransition records (start and end of each period)
  const custodyTransitions: Omit<CustodyTransition, "id" | "created_at" | "updated_at">[] = []

  for (const period of generatedPeriods) {
    // Start transition (pickup)
    custodyTransitions.push({
      person_id: period.person_id,
      transition_at: period.start_at.toISOString(),
      direction: "pickup",
      location: rule.handoff_location ?? null,
      recurrence_rule_id: rule.id,
      is_exception: period.exception_id !== null,
      exception_id: period.exception_id,
      notes: null,
    })

    // End transition (dropoff)
    custodyTransitions.push({
      person_id: period.person_id,
      transition_at: period.end_at.toISOString(),
      direction: "dropoff",
      location: rule.handoff_location ?? null,
      recurrence_rule_id: rule.id,
      is_exception: period.exception_id !== null,
      exception_id: period.exception_id,
      notes: null,
    })
  }

  // Persist to database
  if (childPresences.length > 0) {
    const { error: presenceError } = await supabase
      .from("child_presences")
      .insert(childPresences)

    if (presenceError) throw new Error(`Failed to insert child presences: ${presenceError.message}`)
  }

  if (custodyTransitions.length > 0) {
    const { error: transitionError } = await supabase
      .from("custody_transitions")
      .insert(custodyTransitions)

    if (transitionError) throw new Error(`Failed to insert custody transitions: ${transitionError.message}`)
  }

  void syncPersonCalendarSafe(rule.person_id)
}

export async function regenerateForRule(ruleId: string) {
  const supabase = await createClient()

  // Fetch the rule
  const { data: rule, error: ruleError } = await supabase
    .from("recurrence_rules")
    .select("*")
    .eq("id", ruleId)
    .single()

  if (ruleError || !rule) throw new Error(`Failed to fetch rule: ${ruleError?.message}`)

  await generateAndPersistCustodyData(rule)
}

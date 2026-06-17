"use server"

import { createClient } from "@/lib/supabase/server"
import { generateCustodyPeriods } from "./engine"
import type { RecurrenceRule, RecurrenceException, ChildPresence, CustodyTransition } from "@/lib/types"
import { addYears, format, parseISO } from "date-fns"

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

  if (generatedPeriods.length === 0) return

  // Create ChildPresence records
  const childPresences: Omit<ChildPresence, "id" | "created_at" | "updated_at">[] = generatedPeriods.map((period) => ({
    person_id: period.person_id,
    start_at: period.start_at.toISOString(),
    end_at: period.end_at.toISOString(),
    recurrence_rule_id: rule.id,
    is_exception: period.source === "exception",
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
      is_exception: period.source === "exception",
      notes: null,
    })

    // End transition (dropoff)
    custodyTransitions.push({
      person_id: period.person_id,
      transition_at: period.end_at.toISOString(),
      direction: "dropoff",
      location: rule.handoff_location ?? null,
      recurrence_rule_id: rule.id,
      is_exception: period.source === "exception",
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

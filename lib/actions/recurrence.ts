"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { generateAndPersistCustodyData, regenerateForRule } from "@/lib/recurrence/persist"
import { datetimeLocalToUTC } from "@/lib/utils"

const ruleSchema = z.object({
  person_id: z.string().uuid(),
  name: z.string().min(1),
  pattern_type: z.enum(["weekly_alternating", "custom_cycle", "manual"]),
  starts_at: z.string(),
  custody_start_time: z.string().default("18:00"),
  custody_end_time: z.string().default("18:00"),
  week_parity: z.enum(["even", "odd"]).nullable().optional(),
  handoff_day: z.coerce.number().int().min(0).max(6).nullable().optional(),
  cycle_length_days: z.coerce.number().int().positive().nullable().optional(),
  custody_days: z.array(z.number()).nullable().optional(),
  handoff_location: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
})

export async function createRecurrenceRule(formData: FormData) {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData)

  const custody_days_raw = formData.get("custody_days")
  const custody_days = custody_days_raw
    ? String(custody_days_raw).split(",").map(Number).filter((n) => !isNaN(n))
    : null

  const data = ruleSchema.parse({
    ...raw,
    custody_days,
    is_active: true,
  })

  const { data: inserted, error } = await supabase.from("recurrence_rules").insert(data).select().single()
  if (error) throw new Error(error.message)

  // Generate and persist custody data
  await generateAndPersistCustodyData(inserted)

  revalidatePath("/settings/rules")
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function updateRecurrenceRule(id: string, formData: FormData) {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData)

  const custody_days_raw = formData.get("custody_days")
  const custody_days = custody_days_raw
    ? String(custody_days_raw).split(",").map(Number).filter((n) => !isNaN(n))
    : null

  const data = ruleSchema.partial().parse({ ...raw, custody_days })

  const { error } = await supabase.from("recurrence_rules").update(data).eq("id", id)
  if (error) throw new Error(error.message)

  // Regenerate custody data with updated rule
  await regenerateForRule(id)

  revalidatePath("/settings/rules")
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function deleteRecurrenceRule(id: string) {
  const supabase = await createClient()

  // Delete generated custody data
  await supabase.from("child_presences").delete().eq("recurrence_rule_id", id)
  await supabase.from("custody_transitions").delete().eq("recurrence_rule_id", id)

  const { error } = await supabase.from("recurrence_rules").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/settings/rules")
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

const exceptionBaseSchema = z.object({
  recurrence_rule_id: z.string().uuid(),
  start_at: z.string(),
  end_at: z.string(),
  type: z.enum(["present", "absent"]),
  reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

const exceptionEndAfterStart = (data: { start_at?: string; end_at?: string }) =>
  !data.start_at || !data.end_at || new Date(data.end_at) > new Date(data.start_at)

const exceptionSchema = exceptionBaseSchema.refine(exceptionEndAfterStart, {
  message: "end_at must be after start_at",
  path: ["end_at"],
})

const partialExceptionSchema = exceptionBaseSchema.partial().refine(exceptionEndAfterStart, {
  message: "end_at must be after start_at",
  path: ["end_at"],
})

export async function createRecurrenceException(formData: FormData) {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData)

  if (raw.start_at && typeof raw.start_at === "string" && !raw.start_at.includes("Z")) {
    raw.start_at = datetimeLocalToUTC(raw.start_at)
  }
  if (raw.end_at && typeof raw.end_at === "string" && !raw.end_at.includes("Z")) {
    raw.end_at = datetimeLocalToUTC(raw.end_at)
  }

  const data = exceptionSchema.parse(raw)

  const { error } = await supabase.from("recurrence_exceptions").insert(data)
  if (error) throw new Error(error.message)

  // Regenerate custody data for the affected rule
  await regenerateForRule(data.recurrence_rule_id)

  revalidatePath("/settings/exceptions")
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function updateRecurrenceException(id: string, formData: FormData) {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData)

  if (raw.start_at && typeof raw.start_at === "string" && !raw.start_at.includes("Z")) {
    raw.start_at = datetimeLocalToUTC(raw.start_at)
  }
  if (raw.end_at && typeof raw.end_at === "string" && !raw.end_at.includes("Z")) {
    raw.end_at = datetimeLocalToUTC(raw.end_at)
  }

  const data = partialExceptionSchema.parse(raw)

  // Fetch the exception to get the rule_id
  const { data: exception, error: fetchError } = await supabase
    .from("recurrence_exceptions")
    .select("recurrence_rule_id")
    .eq("id", id)
    .single()

  if (fetchError || !exception) throw new Error(`Failed to fetch exception: ${fetchError?.message}`)

  const { error } = await supabase.from("recurrence_exceptions").update(data).eq("id", id)
  if (error) throw new Error(error.message)

  // Regenerate custody data for the affected rule
  await regenerateForRule(exception.recurrence_rule_id)

  revalidatePath("/settings/exceptions")
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

export async function deleteRecurrenceException(id: string) {
  const supabase = await createClient()

  // Fetch the exception to get the rule_id
  const { data: exception, error: fetchError } = await supabase
    .from("recurrence_exceptions")
    .select("recurrence_rule_id")
    .eq("id", id)
    .single()

  if (fetchError || !exception) throw new Error(`Failed to fetch exception: ${fetchError?.message}`)

  const { error } = await supabase.from("recurrence_exceptions").delete().eq("id", id)
  if (error) throw new Error(error.message)

  // Regenerate custody data for the affected rule
  await regenerateForRule(exception.recurrence_rule_id)

  revalidatePath("/settings/exceptions")
  revalidatePath("/settings/custody")
  revalidatePath("/today")
  revalidatePath("/calendar")
  revalidatePath("/week")
}

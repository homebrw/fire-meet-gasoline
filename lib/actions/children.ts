"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { lightenColor } from "@/lib/utils"
import { z } from "zod"

const childSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().optional(),
})

export async function createChild(data: z.infer<typeof childSchema>) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  // Get parent person record
  const { data: parent, error: parentError } = await supabase
    .from("persons")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (parentError || !parent) {
    throw new Error("Parent person not found")
  }

  const validated = childSchema.parse(data)
  const fullName = `${validated.firstName} ${validated.lastName}`

  // Get parent's color and generate a lighter variation for the child
  const { data: parentData } = await supabase
    .from("persons")
    .select("color")
    .eq("id", parent.id)
    .single()

  const parentColor = parentData?.color || "#06b6d4"
  const childColor = lightenColor(parentColor, 30)

  const { error } = await supabase.from("persons").insert({
    name: fullName,
    parent_id: parent.id,
    is_child: true,
    date_of_birth: validated.dateOfBirth || null,
    color: childColor,
  })

  if (error) {
    throw error
  }

  revalidatePath("/settings/children")
}

export async function updateChild(
  childId: string,
  data: z.infer<typeof childSchema>
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  // Verify parent owns this child
  const { data: parent, error: parentError } = await supabase
    .from("persons")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (parentError || !parent) {
    throw new Error("Parent person not found")
  }

  const { data: child } = await supabase
    .from("persons")
    .select("parent_id")
    .eq("id", childId)
    .single()

  if (!child || child.parent_id !== parent.id) {
    throw new Error("Unauthorized")
  }

  const validated = childSchema.parse(data)
  const fullName = `${validated.firstName} ${validated.lastName}`

  const { error } = await supabase
    .from("persons")
    .update({
      name: fullName,
      date_of_birth: validated.dateOfBirth || null,
    })
    .eq("id", childId)

  if (error) {
    throw error
  }

  revalidatePath("/settings/children")
}

export async function deleteChild(childId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  // Verify parent owns this child
  const { data: parent, error: parentError } = await supabase
    .from("persons")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (parentError || !parent) {
    throw new Error("Parent person not found")
  }

  const { data: child } = await supabase
    .from("persons")
    .select("parent_id")
    .eq("id", childId)
    .single()

  if (!child || child.parent_id !== parent.id) {
    throw new Error("Unauthorized")
  }

  const { error } = await supabase
    .from("persons")
    .delete()
    .eq("id", childId)

  if (error) {
    throw error
  }

  revalidatePath("/settings/children")
}

export async function getParentChildren() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const { data: parent } = await supabase
    .from("persons")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!parent) {
    return []
  }

  const { data: children, error } = await supabase
    .from("persons")
    .select("*")
    .eq("parent_id", parent.id)
    .order("name")

  if (error) {
    throw error
  }

  return children || []
}

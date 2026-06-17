"use server"

import { revalidatePath } from "next/cache"

export async function revalidateWeekData() {
  revalidatePath("/week")
}

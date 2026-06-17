import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getISOWeek, startOfWeek, addWeeks } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWeekString(date: Date): string {
  const year = date.getFullYear()
  const week = String(getISOWeek(date)).padStart(2, "0")
  return `${year}-W${week}`
}

export function parseWeekString(weekStr: string): Date {
  const match = weekStr.match(/^(\d{4})-W(\d{2})$/)
  if (!match) {
    return startOfWeek(new Date(), { weekStartsOn: 1 })
  }

  const [, yearStr, weekStr_] = match
  const year = parseInt(yearStr)
  const week = parseInt(weekStr_)

  const jan4 = new Date(year, 0, 4)
  const weekOneMonday = startOfWeek(jan4, { weekStartsOn: 1 })
  return addWeeks(weekOneMonday, week - 1)
}

export function lightenColor(hex: string, percent: number = 30): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.min(255, Math.round((num >> 16) + (255 - (num >> 16)) * (percent / 100)))
  const g = Math.min(255, Math.round(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * (percent / 100)))
  const b = Math.min(255, Math.round((num & 255) + (255 - (num & 255)) * (percent / 100)))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

export function datetimeLocalToUTC(datetimeLocal: string): string {
  const [datePart, timePart] = datetimeLocal.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hours, minutes] = timePart.split(":").map(Number)

  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0)
  return localDate.toISOString()
}

export function formatDatetimeLocal(isoString: string): string {
  const date = new Date(isoString)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

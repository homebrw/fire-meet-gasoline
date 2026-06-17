import { formatDistanceToNow, format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

export function formatRelativeTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : dateString
    return formatDistanceToNow(date, { locale: fr, addSuffix: true })
  } catch (e) {
    return "date invalide"
  }
}

export function isNew(createdAt: string, hoursThreshold: number = 24): boolean {
  try {
    const created = parseISO(createdAt)
    const now = new Date()
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
    return hoursDiff < hoursThreshold
  } catch (e) {
    return false
  }
}

export function isModified(createdAt: string | null, updatedAt: string | null): boolean {
  if (!createdAt || !updatedAt) return false
  try {
    const created = parseISO(createdAt)
    const updated = parseISO(updatedAt)
    return updated.getTime() > created.getTime()
  } catch (e) {
    return false
  }
}

export function getModifiedTimeAgo(createdAt: string, updatedAt: string): string {
  if (!isModified(createdAt, updatedAt)) return ""
  return `Modifié ${formatRelativeTime(updatedAt)}`
}

export function formatLocaleDateTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : dateString
    return format(date, "d MMM HH:mm", { locale: fr })
  } catch (e) {
    return "date invalide"
  }
}

export function formatCreatedLabel(dateString: string): string {
  return `Créé le ${formatLocaleDateTime(dateString)}`
}

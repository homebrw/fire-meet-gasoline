import { Badge } from "@/components/ui/badge"
import { isNew, isModified, getModifiedTimeAgo } from "@/lib/datetime"

interface ChangeBadgeProps {
  createdAt: string
  updatedAt?: string | null | undefined
  newThresholdHours?: number
}

export function ChangeBadge({
  createdAt,
  updatedAt,
  newThresholdHours = 24,
}: ChangeBadgeProps) {
  const isNewItem = isNew(createdAt, newThresholdHours)
  const isModifiedItem = isModified(createdAt, updatedAt || null)

  if (isNewItem) {
    return <Badge variant="secondary">✨ Nouveau</Badge>
  }

  if (isModifiedItem && updatedAt) {
    const modTime = getModifiedTimeAgo(createdAt, updatedAt)
    return <Badge variant="outline">{modTime}</Badge>
  }

  return null
}

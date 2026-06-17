import { formatCreatedLabel } from "@/lib/datetime"

interface ItemTimestampProps {
  createdAt: string
}

export function ItemTimestamp({ createdAt }: ItemTimestampProps) {
  return (
    <span className="text-xs text-[var(--color-muted-foreground)]">
      {formatCreatedLabel(createdAt)}
    </span>
  )
}

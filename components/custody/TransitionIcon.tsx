import { ArrowDown, ArrowUp } from "lucide-react"
import type { CustodyTransitionDirection } from "@/lib/types"

interface TransitionIconProps {
  direction: CustodyTransitionDirection
  color?: string
  className?: string
  strokeWidth?: number
  title?: string
}

export function TransitionIcon({
  direction,
  color,
  className = "h-3.5 w-3.5",
  strokeWidth = 2.5,
  title,
}: TransitionIconProps) {
  const Icon = direction === "pickup" ? ArrowUp : ArrowDown
  const icon = (
    <Icon
      className={className}
      style={{ color: color ?? "var(--color-muted-foreground)" }}
      strokeWidth={strokeWidth}
    />
  )

  if (title) {
    return <span title={title}>{icon}</span>
  }
  return icon
}

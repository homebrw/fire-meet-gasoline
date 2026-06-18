import { ArrowDown, ArrowUp } from "lucide-react"
import type { CustodyTransitionDirection } from "@/lib/types"

interface TransitionIconProps {
  direction: CustodyTransitionDirection
  color?: string
  className?: string
  strokeWidth?: number
  title?: string
  withBackground?: boolean
}

export function TransitionIcon({
  direction,
  color,
  className = "h-4 w-4",
  strokeWidth = 3,
  title,
  withBackground = false,
}: TransitionIconProps) {
  const Icon = direction === "pickup" ? ArrowUp : ArrowDown
  const iconColor = color ?? "var(--color-muted-foreground)"

  const icon = (
    <Icon
      className={className}
      style={{ color: iconColor }}
      strokeWidth={strokeWidth}
    />
  )

  if (withBackground) {
    return (
      <span
        className="inline-flex items-center justify-center rounded p-1 flex-shrink-0"
        style={{ backgroundColor: typeof iconColor === 'string' ? iconColor + "15" : "transparent" }}
        title={title}
      >
        {icon}
      </span>
    )
  }

  if (title) {
    return <span title={title}>{icon}</span>
  }
  return icon
}

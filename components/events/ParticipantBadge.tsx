import { cn } from "@/lib/utils"

interface ParticipantBadgeProps {
  name: string
  color: string
  size?: "sm" | "md"
  className?: string
}

const sizeClasses = {
  sm: "gap-1 px-1.5 py-0.5",
  md: "gap-1 px-2 py-1",
}

const dotSizeClasses = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
}

export function ParticipantBadge({ name, color, size = "md", className }: ParticipantBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center rounded bg-[var(--color-secondary-surface)] text-xs",
        sizeClasses[size],
        className
      )}
    >
      <div className={cn("rounded-full", dotSizeClasses[size])} style={{ backgroundColor: color || "var(--color-muted-foreground)" }} />
      <span className="text-[var(--color-foreground)]">{name || "?"}</span>
    </div>
  )
}

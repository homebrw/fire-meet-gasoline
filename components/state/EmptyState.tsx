"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[300px] max-w-md mx-auto text-center p-6",
        className
      )}
    >
      {Icon && (
        <Icon className="h-12 w-12 text-[var(--color-muted-foreground)] mb-4 opacity-50" />
      )}
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-muted-foreground)] mb-6">
        {description}
      </p>
      {action && (
        <Button
          onClick={action.onClick}
          className="gap-2"
          asChild={!!action.href}
        >
          {action.href ? (
            <a href={action.href}>{action.label}</a>
          ) : (
            action.label
          )}
        </Button>
      )}
    </div>
  )
}

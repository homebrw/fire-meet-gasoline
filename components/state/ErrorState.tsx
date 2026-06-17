"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"

interface ErrorStateProps {
  title: string
  description: string
  onRetry?: () => void
  details?: string
  className?: string
}

export function ErrorState({
  title,
  description,
  onRetry,
  details,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 p-4 border border-[var(--color-destructive)] bg-[var(--color-background)] rounded-lg",
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3 flex-1">
        <AlertTriangle className="h-5 w-5 text-[var(--color-destructive)] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-[var(--color-destructive)] mb-1">
            {title}
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {description}
          </p>
          {details && (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-2 font-mono opacity-70">
              {details}
            </p>
          )}
        </div>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="self-start"
        >
          Réessayer
        </Button>
      )}
    </div>
  )
}

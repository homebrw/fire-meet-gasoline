"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  count?: number
  variant?: "card" | "list" | "grid"
  className?: string
}

export function LoadingState({
  count = 1,
  variant = "card",
  className,
}: LoadingStateProps) {
  const skeletonItems = Array.from({ length: count }, (_, i) => i)

  if (variant === "card") {
    return (
      <div className={cn("space-y-4", className)}>
        {skeletonItems.map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-5 bg-[var(--color-muted)] rounded w-1/3" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-4 bg-[var(--color-muted)] rounded w-full" />
              <div className="h-4 bg-[var(--color-muted)] rounded w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-2", className)}>
        {skeletonItems.map((i) => (
          <div
            key={i}
            className="h-12 bg-[var(--color-muted)] rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {skeletonItems.map((i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="pt-6 space-y-3">
            <div className="h-6 bg-[var(--color-muted)] rounded w-2/3" />
            <div className="h-4 bg-[var(--color-muted)] rounded w-full" />
            <div className="h-4 bg-[var(--color-muted)] rounded w-4/5" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

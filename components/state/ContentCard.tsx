"use client"

import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorState } from "./ErrorState"
import { EmptyState } from "./EmptyState"
import { LoadingState } from "./LoadingState"
import { LucideIcon } from "lucide-react"

interface ContentCardProps {
  title?: string
  icon?: LucideIcon
  children?: ReactNode
  isEmpty?: boolean
  isLoading?: boolean
  error?: {
    title: string
    description: string
    onRetry?: () => void
    details?: string
  }
  emptyState?: {
    title: string
    description: string
    action?: {
      label: string
      onClick?: () => void
      href?: string
    }
  }
  className?: string
}

export function ContentCard({
  title,
  icon: Icon,
  children,
  isEmpty,
  isLoading,
  error,
  emptyState,
  className,
}: ContentCardProps) {
  const showTitle = title && !isLoading && !error && !isEmpty

  if (error) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="border-b border-[var(--color-border)]">
            <CardTitle className="text-base flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5" />}
              {title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="pt-6">
          <ErrorState
            title={error.title}
            description={error.description}
            onRetry={error.onRetry}
            details={error.details}
          />
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="border-b border-[var(--color-border)]">
            <CardTitle className="text-base flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5" />}
              {title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="pt-6">
          <LoadingState variant="card" count={2} />
        </CardContent>
      </Card>
    )
  }

  if (isEmpty) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="border-b border-[var(--color-border)]">
            <CardTitle className="text-base flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5" />}
              {title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="pt-6">
          <EmptyState
            icon={Icon}
            title={emptyState?.title ?? "Aucun élément"}
            description={emptyState?.description ?? "Commencez par créer un nouveau"}
            action={emptyState?.action}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="border-b border-[var(--color-border)]">
          <CardTitle className="text-base flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5" />}
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  )
}

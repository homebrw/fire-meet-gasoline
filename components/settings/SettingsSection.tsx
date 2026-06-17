"use client"

import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorState } from "@/components/state/ErrorState"
import { EmptyState } from "@/components/state/EmptyState"
import { LoadingState } from "@/components/state/LoadingState"
import { LucideIcon } from "lucide-react"

interface SettingsSectionProps {
  title: string
  icon?: LucideIcon
  children?: ReactNode
  isEmpty?: boolean
  isLoading?: boolean
  error?: {
    title: string
    description: string
    onRetry?: () => void
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
}

export function SettingsSection({
  title,
  icon: Icon,
  children,
  isEmpty,
  isLoading,
  error,
  emptyState,
}: SettingsSectionProps) {
  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle className="flex items-center gap-2 text-base">
          {Icon && <Icon className="h-5 w-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {error ? (
          <ErrorState
            title={error.title}
            description={error.description}
            onRetry={error.onRetry}
          />
        ) : isLoading ? (
          <LoadingState variant="list" count={3} />
        ) : isEmpty ? (
          <EmptyState
            icon={Icon}
            title={emptyState?.title ?? `Aucun ${title.toLowerCase()}`}
            description={
              emptyState?.description ?? `Commencez par créer un nouveau ${title.toLowerCase()}`
            }
            action={emptyState?.action}
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

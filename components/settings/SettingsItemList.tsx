"use client"

import { ReactNode } from "react"
import { LoadingState } from "@/components/state/LoadingState"
import { EmptyState } from "@/components/state/EmptyState"
import { ErrorState } from "@/components/state/ErrorState"
import { LucideIcon } from "lucide-react"

interface SettingsItemListProps {
  children?: ReactNode
  isEmpty?: boolean
  isLoading?: boolean
  error?: {
    title: string
    description: string
    onRetry?: () => void
  }
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: LucideIcon
  onAddClick?: () => void
}

export function SettingsItemList({
  children,
  isEmpty,
  isLoading,
  error,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  onAddClick,
}: SettingsItemListProps) {
  if (error) {
    return (
      <ErrorState
        title={error.title}
        description={error.description}
        onRetry={error.onRetry}
      />
    )
  }

  if (isLoading) {
    return <LoadingState variant="list" count={3} />
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle ?? "Aucun élément"}
        description={emptyDescription ?? "Commencez par créer un nouveau"}
        action={
          onAddClick
            ? {
                label: "Créer",
                onClick: onAddClick,
              }
            : undefined
        }
      />
    )
  }

  return <div className="space-y-2">{children}</div>
}

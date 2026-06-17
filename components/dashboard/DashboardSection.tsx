"use client"

import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingState } from "@/components/state/LoadingState"
import { EmptyState } from "@/components/state/EmptyState"
import { LucideIcon } from "lucide-react"

interface DashboardSectionProps {
  title: string
  icon?: LucideIcon
  children?: ReactNode
  isEmpty?: boolean
  isLoading?: boolean
  emptyMessage?: string
}

export function DashboardSection({
  title,
  icon: Icon,
  children,
  isEmpty,
  isLoading,
  emptyMessage,
}: DashboardSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState variant="list" count={2} />
        ) : isEmpty ? (
          <EmptyState
            icon={Icon}
            title="Rien pour l'instant"
            description={
              emptyMessage ?? `Aucun ${title.toLowerCase()} pour les 14 prochains jours`
            }
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRelativeTime } from "@/lib/datetime"
import type { ActivityFeedItem } from "@/lib/types"
import { Calendar, Clock, User, AlertCircle, ArrowRight } from "lucide-react"

interface ActivityFeedProps {
  items: ActivityFeedItem[]
  maxItems?: number
}

export function ActivityFeed({ items, maxItems = 10 }: ActivityFeedProps) {
  const icons: Record<string, typeof Calendar> = {
    rule: AlertCircle,
    event: Calendar,
    exception: Clock,
    presence: User,
    transition: ArrowRight,
  }

  const labels: Record<string, string> = {
    created: "Créé",
    updated: "Modifié",
  }

  const colors: Record<string, string> = {
    rule: "bg-blue-50 dark:bg-blue-950",
    event: "bg-purple-50 dark:bg-purple-950",
    exception: "bg-orange-50 dark:bg-orange-950",
    presence: "bg-green-50 dark:bg-green-950",
    transition: "bg-amber-50 dark:bg-amber-950",
  }

  const typeLabels: Record<string, string> = {
    rule: "règle",
    event: "événement",
    exception: "exception",
    presence: "présence",
    transition: "transition",
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Aucune activité récente
          </p>
        ) : (
          <div className="space-y-2">
            {items.slice(0, maxItems).map((item) => {
              const Icon = icons[item.type] || Calendar
              return (
                <div
                  key={item.id}
                  className={`rounded p-3 flex items-start gap-3 ${colors[item.type]}`}
                >
                  <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {labels[item.action]} {typeLabels[item.type]}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                      {item.resourceName} — {item.personName}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--color-muted-foreground)] flex-shrink-0 whitespace-nowrap">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

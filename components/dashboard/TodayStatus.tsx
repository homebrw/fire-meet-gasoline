import type { DayState, Person } from "@/lib/types"
import { getStateConfig } from "@/lib/recurrence/display"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TodayStatusProps {
  state: DayState | null
  damien: Person | undefined
  ma: Person | undefined
}

export function TodayStatus({ state, damien, ma }: TodayStatusProps) {
  if (!state) {
    return (
      <Card>
        <CardContent className="pt-4">
          <p className="text-[var(--color-muted-foreground)] text-sm">Aucune donnée disponible</p>
        </CardContent>
      </Card>
    )
  }

  const stateConfig = getStateConfig(damien?.name ?? "Personne 1", ma?.name ?? "Personne 2")
  const config = stateConfig[state.displayState]

  return (
    <Card className={cn("border-l-4", getBorderColor(state.displayState))}>
      <CardContent className="pt-4 space-y-3">
        <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1", config.bgClass)}>
          <span className={cn("h-2 w-2 rounded-full", config.dotClass)} />
          <span className={cn("text-sm font-medium", config.textClass)}>{config.label}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: damien?.color ?? "#3b82f6" }} />
              <p className="text-xs font-semibold text-[var(--color-foreground)]">{damien?.name ?? "Personne 1"}</p>
            </div>
            <Badge variant={state.damienHasChildren ? "damien" : "outline"} className="text-xs">
              {state.damienHasChildren ? "Avec ses enfants" : "Sans enfants"}
            </Badge>
            {state.damienBlockingEvent && (
              <Badge variant="outline" className="text-xs ml-1">Événement bloquant</Badge>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ma?.color ?? "#ec4899" }} />
              <p className="text-xs font-semibold text-[var(--color-foreground)]">{ma?.name ?? "Personne 2"}</p>
            </div>
            <Badge variant={state.maHasChild ? "ma" : "outline"} className="text-xs">
              {state.maHasChild ? "Avec sa fille" : "Sans enfant"}
            </Badge>
            {state.maBlockingEvent && (
              <Badge variant="outline" className="text-xs ml-1">Événement bloquant</Badge>
            )}
          </div>
        </div>

        {state.custodyTransitions.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium" style={{color: 'var(--color-transition)'}}>Changements aujourd&apos;hui</p>
            {state.custodyTransitions.map((t) => (
              <p key={t.id} className="text-xs text-[var(--color-muted-foreground)]">
                {t.direction === "pickup" ? "↑ Récupération" : "↓ Dépôt"}{t.location ? ` — ${t.location}` : ""}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getBorderColor(state: string): string {
  const map: Record<string, string> = {
    damien_kids: "border-blue-500",
    ma_kid: "border-pink-500",
    both_kids: "border-violet-500",
    available: "border-green-500",
    custody_change: "border-orange-500",
    damien_unavailable: "border-gray-400",
    ma_unavailable: "border-gray-400",
    both_unavailable: "border-gray-400",
    shared_event: "border-amber-500",
  }
  return map[state] ?? "border-gray-300"
}

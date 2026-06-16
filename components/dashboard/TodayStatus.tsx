import type { DayState, Person } from "@/lib/types"
import { STATE_CONFIG } from "@/lib/recurrence/display"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
        <CardHeader>
          <CardTitle>Aujourd'hui</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--color-muted-foreground)] text-sm">Aucune donnée disponible</p>
        </CardContent>
      </Card>
    )
  }

  const config = STATE_CONFIG[state.displayState]

  return (
    <Card className={cn("border-l-4", getBorderColor(state.displayState))}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Aujourd'hui</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1", config.bgClass)}>
          <span className={cn("h-2 w-2 rounded-full", config.dotClass)} />
          <span className={cn("text-sm font-medium", config.textClass)}>{config.label}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="space-y-1">
            <p className="text-[var(--color-muted-foreground)] text-xs font-medium uppercase tracking-wide">Damien</p>
            <Badge variant={state.damienHasChildren ? "damien" : "outline"} className="text-xs">
              {state.damienHasChildren ? "Avec ses enfants" : "Sans enfants"}
            </Badge>
            {state.damienBlockingEvent && (
              <Badge variant="outline" className="text-xs ml-1">Événement bloquant</Badge>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[var(--color-muted-foreground)] text-xs font-medium uppercase tracking-wide">MA</p>
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
            <p className="text-xs font-medium text-orange-700">Changements aujourd'hui</p>
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

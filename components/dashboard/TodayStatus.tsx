import type { DayState, Person } from "@/lib/types"
import { getStateConfig } from "@/lib/recurrence/display"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { TRANSITION_DIRECTION_LABEL } from "@/lib/recurrence/labels"

interface TodayStatusProps {
  state: DayState | null
  damien: Person | undefined
  ma: Person | undefined
}

export function TodayStatus({ state, damien, ma }: TodayStatusProps) {
  if (!state) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6 text-center">
          <p className="text-[var(--color-muted-foreground)] text-sm mb-3">
            Aujourd&apos;hui — Aucune donnée disponible
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Créez une première règle de garde pour voir votre planning
          </p>
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
              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: damien?.color ?? "var(--color-damien)" }} />
              <p className="text-xs font-semibold text-[var(--color-foreground)]">{damien?.name ?? "Personne 1"}</p>
            </div>
            <Badge variant={state.damienHasChildren ? "damien" : "outline"} className="text-xs">
              {state.damienHasChildren ? "Avec ses enfants" : "Sans enfants"}
            </Badge>
            {state.damienIndividualBlockingEvent && (
              <Badge variant="outline" className="text-xs ml-1">Événement bloquant</Badge>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ma?.color ?? "var(--color-ma)" }} />
              <p className="text-xs font-semibold text-[var(--color-foreground)]">{ma?.name ?? "Personne 2"}</p>
            </div>
            <Badge variant={state.maHasChild ? "ma" : "outline"} className="text-xs">
              {state.maHasChild ? "Avec sa fille" : "Sans enfant"}
            </Badge>
            {state.maIndividualBlockingEvent && (
              <Badge variant="outline" className="text-xs ml-1">Événement bloquant</Badge>
            )}
          </div>
        </div>

        {state.partiallyAvailable && (
          <div className="rounded-md px-3 py-2" style={{ backgroundColor: 'var(--color-available-light)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--color-available-badge-text)' }}>
              Disponibles ensemble{" "}
              {state.commonAvailableWindows
                .map((w) => `${w.startsAtDayBoundary ? "00:00" : w.start} – ${w.endsAtDayBoundary ? "23:59" : w.end}`)
                .join(", ")}
            </p>
          </div>
        )}

        {state.custodyTransitions.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium" style={{color: 'var(--color-transition-badge-text)'}}>Changements aujourd&apos;hui</p>
            {state.custodyTransitions.map((t) => (
              <p key={t.id} className="text-xs text-[var(--color-muted-foreground)]">
                <span className="font-semibold">{format(parseISO(t.transition_at), "HH:mm", { locale: fr })}</span> — {TRANSITION_DIRECTION_LABEL[t.direction]}{t.location ? ` (${t.location})` : ""}
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
    damien_kids: "border-[var(--color-damien)]",
    ma_kid: "border-[var(--color-ma)]",
    both_kids: "border-[var(--color-both-kids)]",
    available: "border-[var(--color-available)]",
    custody_change: "border-[var(--color-transition)]",
    damien_unavailable: "border-[var(--color-unavailable)]",
    ma_unavailable: "border-[var(--color-unavailable)]",
    both_unavailable: "border-[var(--color-unavailable)]",
    shared_event: "border-[var(--color-event)]",
  }
  return map[state] ?? "border-[var(--color-border)]"
}

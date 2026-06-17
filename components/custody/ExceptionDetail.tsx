import type { ReactNode } from "react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import type { Person, RecurrenceException, RecurrenceRule } from "@/lib/types"
import { RECURRENCE_EXCEPTION_TYPE_LABELS } from "@/lib/recurrence/labels"
import { Badge } from "@/components/ui/badge"

interface ExceptionDetailProps {
  exception: RecurrenceException
  rule?: RecurrenceRule
  person?: Person
  actions?: ReactNode
}

export function ExceptionDetail({ exception, rule, person, actions }: ExceptionDetailProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{RECURRENCE_EXCEPTION_TYPE_LABELS[exception.type]}</Badge>
          <span className="text-sm text-[var(--color-muted-foreground)] flex items-center gap-1.5">
            {person && (
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: person.color }}
              />
            )}
            {rule?.name ?? "Règle inconnue"} — {person?.name ?? "?"}
          </span>
        </div>
        {actions && <div className="flex gap-1 flex-shrink-0">{actions}</div>}
      </div>
      <div className="text-xs text-[var(--color-muted-foreground)] space-y-0.5">
        {exception.original_start_at && (
          <p>Période originale : {format(parseISO(exception.original_start_at), "d MMM yyyy HH:mm", { locale: fr })}</p>
        )}
        {exception.override_start_at && (
          <p>Période : {format(parseISO(exception.override_start_at), "d MMM yyyy HH:mm", { locale: fr })}</p>
        )}
        {exception.reason && <p>Raison : {exception.reason}</p>}
        {exception.notes && <p>Notes : {exception.notes}</p>}
      </div>
    </div>
  )
}

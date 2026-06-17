import type { DayState } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarCheck } from "lucide-react"

interface NextAvailableSlotProps {
  slot: DayState | null
}

export function NextAvailableSlot({ slot }: NextAvailableSlotProps) {
  return (
    <Card className="border-l-4 border-green-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" style={{color: 'var(--color-available)'}} />
          Prochain créneau commun
        </CardTitle>
      </CardHeader>
      <CardContent>
        {slot ? (
          <div>
            <p className="font-semibold" style={{color: 'var(--color-available)'}}>
              {format(parseISO(slot.date), "EEEE d MMMM yyyy", { locale: fr })}
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Disponible ensemble — pas d&apos;enfants, pas d&apos;événement bloquant
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Aucun créneau commun trouvé dans les prochains 365 jours
          </p>
        )}
      </CardContent>
    </Card>
  )
}

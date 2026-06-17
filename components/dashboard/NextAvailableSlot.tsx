import type { DayState } from "@/lib/types"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarCheck, Plus } from "lucide-react"

interface NextAvailableSlotProps {
  slot: DayState | null
}

export function NextAvailableSlot({ slot }: NextAvailableSlotProps) {
  return (
    <Card className="border-l-4 border-[var(--color-available)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" style={{color: 'var(--color-available)'}} />
          Prochain créneau commun
        </CardTitle>
      </CardHeader>
      <CardContent>
        {slot ? (
          <div className="space-y-3">
            <div>
              <p className="font-semibold" style={{color: 'var(--color-available)'}}>
                {format(parseISO(slot.date), "EEEE d MMMM yyyy", { locale: fr })}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                Disponible ensemble — pas d&apos;enfants, pas d&apos;événement bloquant
              </p>
            </div>
            <Link href={`/settings/events?date=${slot.date}`}>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Créer un événement
              </Button>
            </Link>
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

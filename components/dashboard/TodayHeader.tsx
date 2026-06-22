"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { format, isSameDay, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { todayInZone } from "@/lib/timezone"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"

function parseDateParam(dateParam: string | null): Date | null {
  if (!dateParam) return null
  try {
    return parseISO(dateParam)
  } catch {
    return null
  }
}

export function TodayHeader() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = todayInZone()
  const selectedDate = parseDateParam(searchParams.get("date"))

  const displayDate = selectedDate || today
  const isToday = isSameDay(displayDate, today)

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [year, month, day] = e.target.value.split("-").map(Number)
      const newDate = new Date(year, month - 1, day)
      router.push(`?date=${format(newDate, "yyyy-MM-dd")}`)
    }
  }

  const handleReturnToday = () => {
    router.push(".")
  }

  return (
    <div className="flex items-center gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <button className="text-2xl font-bold cursor-pointer hover:opacity-75 transition-opacity text-left -ml-2 pl-2 pr-1 py-1">
            {isToday ? (
              <>Aujourd&apos;hui : {format(today, "d MMMM yyyy", { locale: fr })}</>
            ) : (
              <>Consulter : {format(displayDate, "d MMMM yyyy", { locale: fr })}</>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto">
          <div className="space-y-4">
            <div>
              <label htmlFor="date-picker" className="block text-sm font-medium mb-2">
                Sélectionner une date
              </label>
              <input
                id="date-picker"
                type="date"
                value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(today, "yyyy-MM-dd")}
                onChange={handleDateChange}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-[var(--color-foreground)]"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReturnToday}
              className="w-full"
            >
              Retour à aujourd&apos;hui
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Calendar className="w-5 h-5 text-[var(--color-muted-foreground)] opacity-50" />
    </div>
  )
}

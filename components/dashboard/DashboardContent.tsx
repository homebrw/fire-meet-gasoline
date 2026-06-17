"use client"

import type { DayState, Person, CalendarEvent, CustodyTransition } from "@/lib/types"
import { TodayStatus } from "./TodayStatus"
import { NextAvailableSlot } from "./NextAvailableSlot"
import { UpcomingTransitions } from "./UpcomingTransitions"
import { UpcomingEvents } from "./UpcomingEvents"
import { SharedEventCard } from "./SharedEventCard"
import { EmptyState } from "@/components/state/EmptyState"
import { CalendarDays } from "lucide-react"

interface DashboardContentProps {
  todayState: DayState | null
  damien?: Person
  ma?: Person
  nextSlot: DayState | null
  upcomingTransitions: CustodyTransition[]
  upcomingEvents: CalendarEvent[]
  sharedEventsBefore: CalendarEvent[]
  persons: Person[]
}

export function DashboardContent({
  todayState,
  damien,
  ma,
  nextSlot,
  upcomingTransitions,
  upcomingEvents,
  sharedEventsBefore,
  persons,
}: DashboardContentProps) {
  const hasData = damien && ma

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Aujourd&apos;hui</h1>

      {!hasData ? (
        <EmptyState
          icon={CalendarDays}
          title="Aucune donnée disponible"
          description="Créez une première règle de garde pour voir votre planning d'aujourd'hui"
          action={{
            label: "Créer une règle",
            href: "/settings/rules",
          }}
        />
      ) : (
        <>
          <TodayStatus state={todayState} damien={damien} ma={ma} />
          {sharedEventsBefore.length > 0 && (
            <div className="space-y-4">
              {sharedEventsBefore.map((event) => (
                <SharedEventCard key={event.id} event={event} persons={persons} />
              ))}
            </div>
          )}
          <NextAvailableSlot slot={nextSlot} />
          <div className="grid gap-4 sm:grid-cols-2">
            <UpcomingTransitions transitions={upcomingTransitions} persons={persons} />
            <UpcomingEvents events={upcomingEvents} persons={persons} />
          </div>
        </>
      )}
    </div>
  )
}

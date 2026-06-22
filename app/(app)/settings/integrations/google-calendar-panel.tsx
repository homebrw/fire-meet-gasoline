"use client"

import { useState, useTransition } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  disconnectGoogleCalendar,
  syncGoogleCalendarNow,
  type GoogleCalendarConnectionStatus,
} from "@/lib/actions/calendar-integrations"

export function GoogleCalendarPanel({
  initialStatus,
}: {
  initialStatus: GoogleCalendarConnectionStatus
}) {
  const [status, setStatus] = useState(initialStatus)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSyncNow() {
    setError(null)
    startTransition(async () => {
      try {
        await syncGoogleCalendarNow()
      } catch {
        setError("La synchronisation a échoué. Réessayez dans quelques instants.")
      }
    })
  }

  function handleDisconnect() {
    setError(null)
    startTransition(async () => {
      try {
        await disconnectGoogleCalendar()
        setStatus({ connected: false, googleAccountEmail: null, lastSyncedAt: null })
      } catch {
        setError("La déconnexion a échoué. Réessayez dans quelques instants.")
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Google Agenda</CardTitle>
        <Badge variant={status.connected ? "default" : "secondary"}>
          {status.connected ? "Connecté" : "Non connecté"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Envoie vos périodes de garde, transitions et événements vers votre Google
          Agenda. La synchronisation se fait uniquement du site vers Google (à sens
          unique) : les modifications faites directement dans Google Agenda ne sont
          pas reprises ici.
        </p>

        {status.connected ? (
          <>
            <p className="text-sm">
              Compte connecté : <span className="font-medium">{status.googleAccountEmail}</span>
            </p>
            {status.lastSyncedAt && (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Dernière synchronisation :{" "}
                {new Date(status.lastSyncedAt).toLocaleString("fr-FR")}
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleSyncNow} disabled={isPending}>
                Synchroniser maintenant
              </Button>
              <Button variant="outline" onClick={handleDisconnect} disabled={isPending}>
                Déconnecter
              </Button>
            </div>
          </>
        ) : (
          <Button asChild>
            <a href="/api/calendar/google/connect">Connecter Google Agenda</a>
          </Button>
        )}

        {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}
      </CardContent>
    </Card>
  )
}

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
  pendingImportCount = 0,
}: {
  initialStatus: GoogleCalendarConnectionStatus
  pendingImportCount?: number
}) {
  const [status, setStatus] = useState(initialStatus)
  const [isSyncing, startSync] = useTransition()
  const [isDisconnecting, startDisconnect] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSyncNow() {
    setError(null)
    startSync(async () => {
      try {
        await syncGoogleCalendarNow()
      } catch {
        setError("La synchronisation a échoué. Réessayez dans quelques instants.")
      }
    })
  }

  function handleDisconnect() {
    setError(null)
    startDisconnect(async () => {
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
          Agenda. Vous pouvez aussi importer des événements depuis Google Agenda,
          mais rien n&apos;est ajouté automatiquement : chaque événement doit être
          accepté individuellement.
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
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSyncNow} disabled={isSyncing || isDisconnecting}>
                {isSyncing ? "Synchronisation…" : "Synchroniser maintenant"}
              </Button>
              <Button variant="outline" asChild>
                <a href="/settings/integrations/import" className="gap-2">
                  Importer depuis Google
                  {pendingImportCount > 0 && (
                    <Badge variant="default" className="px-1.5">
                      {pendingImportCount > 9 ? "9+" : pendingImportCount}
                    </Badge>
                  )}
                </a>
              </Button>
              <Button variant="outline" onClick={handleDisconnect} disabled={isSyncing || isDisconnecting}>
                {isDisconnecting ? "Déconnexion…" : "Déconnecter"}
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

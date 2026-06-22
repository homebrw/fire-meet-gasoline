"use client"

import { useState, useTransition } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  acceptGoogleImportCandidate,
  rejectGoogleImportCandidate,
  refreshGoogleImportCandidates,
  type GoogleImportCandidate,
} from "@/lib/actions/calendar-integrations"

function formatPeriod(candidate: GoogleImportCandidate): string {
  const start = new Date(candidate.start_at)
  const end = new Date(candidate.end_at)
  if (candidate.is_all_day) {
    return start.toLocaleDateString("fr-FR")
  }
  return `${start.toLocaleString("fr-FR")} → ${end.toLocaleString("fr-FR")}`
}

export function ImportCandidatesPanel({
  initialCandidates,
}: {
  initialCandidates: GoogleImportCandidate[]
}) {
  const [candidates, setCandidates] = useState(initialCandidates)
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleRefresh() {
    setError(null)
    startTransition(async () => {
      try {
        await refreshGoogleImportCandidates()
        window.location.reload()
      } catch {
        setError("La récupération des événements Google a échoué.")
      }
    })
  }

  function handleAccept(id: string) {
    setError(null)
    setPendingId(id)
    startTransition(async () => {
      try {
        await acceptGoogleImportCandidate(id)
        setCandidates((prev) => prev.filter((c) => c.id !== id))
      } catch {
        setError("L'import de cet événement a échoué.")
      } finally {
        setPendingId(null)
      }
    })
  }

  function handleReject(id: string) {
    setError(null)
    setPendingId(id)
    startTransition(async () => {
      try {
        await rejectGoogleImportCandidate(id)
        setCandidates((prev) => prev.filter((c) => c.id !== id))
      } catch {
        setError("Le refus de cet événement a échoué.")
      } finally {
        setPendingId(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
        Rechercher de nouveaux événements
      </Button>

      {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}

      {candidates.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Aucun événement en attente de revue.
        </p>
      ) : (
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <Card key={candidate.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{candidate.summary}</CardTitle>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {formatPeriod(candidate)}
                  </p>
                  {candidate.location && (
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {candidate.location}
                    </p>
                  )}
                </div>
                {candidate.is_all_day && <Badge variant="secondary">Journée entière</Badge>}
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(candidate.id)}
                  disabled={isPending && pendingId === candidate.id}
                >
                  Accepter
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(candidate.id)}
                  disabled={isPending && pendingId === candidate.id}
                >
                  Refuser
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

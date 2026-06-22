"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  acceptGoogleImportCandidate,
  rejectGoogleImportCandidate,
  restoreGoogleImportCandidate,
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

function CandidateCard({
  candidate,
  isPending,
  children,
}: {
  candidate: GoogleImportCandidate
  isPending: boolean
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">{candidate.summary}</CardTitle>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {formatPeriod(candidate)}
          </p>
          {candidate.location && (
            <p className="text-xs text-[var(--color-muted-foreground)]">{candidate.location}</p>
          )}
          {candidate.description && (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
              {candidate.description}
            </p>
          )}
        </div>
        {candidate.is_all_day && <Badge variant="secondary">Journée entière</Badge>}
      </CardHeader>
      <CardContent className="flex gap-2" aria-busy={isPending}>
        {children}
      </CardContent>
    </Card>
  )
}

export function ImportCandidatesPanel({
  initialCandidates,
  initialRejected,
}: {
  initialCandidates: GoogleImportCandidate[]
  initialRejected: GoogleImportCandidate[]
}) {
  const router = useRouter()
  const [candidates, setCandidates] = useState(initialCandidates)
  const [rejected, setRejected] = useState(initialRejected)
  const [showRejected, setShowRejected] = useState(false)
  const [isRefreshing, startRefresh] = useTransition()
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "accept" | "reject" | "restore" } | null>(null)
  const [isActionPending, startAction] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // router.refresh() re-renders the server parent and gives us new props,
  // but useState's initial value is only read on mount — without this, the
  // list would never pick up server-side changes (e.g. after a refresh search).
  // Adjusting state during render (rather than in an effect) avoids an extra
  // render pass — see https://react.dev/learn/you-might-not-need-an-effect.
  const [prevInitialCandidates, setPrevInitialCandidates] = useState(initialCandidates)
  if (initialCandidates !== prevInitialCandidates) {
    setPrevInitialCandidates(initialCandidates)
    setCandidates(initialCandidates)
  }

  const [prevInitialRejected, setPrevInitialRejected] = useState(initialRejected)
  if (initialRejected !== prevInitialRejected) {
    setPrevInitialRejected(initialRejected)
    setRejected(initialRejected)
  }

  function handleRefresh() {
    setError(null)
    startRefresh(async () => {
      try {
        await refreshGoogleImportCandidates()
        router.refresh()
      } catch {
        setError("La récupération des événements Google a échoué. Réessayez dans quelques instants.")
      }
    })
  }

  function handleAccept(id: string) {
    setError(null)
    setPendingAction({ id, action: "accept" })
    startAction(async () => {
      try {
        await acceptGoogleImportCandidate(id)
        setCandidates((prev) => prev.filter((c) => c.id !== id))
      } catch {
        setError("L'import de cet événement a échoué. Réessayez dans quelques instants.")
      } finally {
        setPendingAction(null)
      }
    })
  }

  function handleReject(id: string) {
    setError(null)
    setPendingAction({ id, action: "reject" })
    startAction(async () => {
      try {
        await rejectGoogleImportCandidate(id)
        const candidate = candidates.find((c) => c.id === id)
        setCandidates((prev) => prev.filter((c) => c.id !== id))
        if (candidate) setRejected((prev) => [...prev, candidate])
      } catch {
        setError("Le refus de cet événement a échoué. Réessayez dans quelques instants.")
      } finally {
        setPendingAction(null)
      }
    })
  }

  function handleRestore(id: string) {
    setError(null)
    setPendingAction({ id, action: "restore" })
    startAction(async () => {
      try {
        await restoreGoogleImportCandidate(id)
        const candidate = rejected.find((c) => c.id === id)
        setRejected((prev) => prev.filter((c) => c.id !== id))
        if (candidate) setCandidates((prev) => [...prev, candidate])
      } catch {
        setError("La restauration de cet événement a échoué. Réessayez dans quelques instants.")
      } finally {
        setPendingAction(null)
      }
    })
  }

  function isBusy(id: string) {
    return isActionPending && pendingAction?.id === id
  }

  function label(id: string, action: "accept" | "reject" | "restore", idleLabel: string, busyLabel: string) {
    return isActionPending && pendingAction?.id === id && pendingAction.action === action ? busyLabel : idleLabel
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
        {isRefreshing ? "Recherche…" : "Rechercher de nouveaux événements"}
      </Button>

      {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}

      {candidates.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Aucun événement en attente de revue. Cliquez sur « Rechercher de nouveaux
          événements » pour vérifier votre Google Agenda.
        </p>
      ) : (
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} isPending={isBusy(candidate.id)}>
              <Button size="sm" onClick={() => handleAccept(candidate.id)} disabled={isBusy(candidate.id)}>
                {label(candidate.id, "accept", "Accepter", "Import…")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(candidate.id)}
                disabled={isBusy(candidate.id)}
              >
                {label(candidate.id, "reject", "Refuser", "…")}
              </Button>
            </CandidateCard>
          ))}
        </div>
      )}

      {rejected.length > 0 && (
        <div className="space-y-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRejected((prev) => !prev)}
            className="text-[var(--color-muted-foreground)]"
          >
            {showRejected ? "Masquer" : "Afficher"} les événements refusés ({rejected.length})
          </Button>

          {showRejected && (
            <div className="space-y-3">
              {rejected.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} isPending={isBusy(candidate.id)}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(candidate.id)}
                    disabled={isBusy(candidate.id)}
                  >
                    {label(candidate.id, "restore", "Annuler le refus", "…")}
                  </Button>
                </CandidateCard>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

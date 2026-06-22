"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  acceptGoogleImportCandidate,
  rejectGoogleImportCandidate,
  restoreGoogleImportCandidate,
  revokeGoogleImportCandidate,
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
  initialAccepted,
}: {
  initialCandidates: GoogleImportCandidate[]
  initialRejected: GoogleImportCandidate[]
  initialAccepted: GoogleImportCandidate[]
}) {
  const router = useRouter()
  const [candidates, setCandidates] = useState(initialCandidates)
  const [rejected, setRejected] = useState(initialRejected)
  const [accepted, setAccepted] = useState(initialAccepted)
  const [showRejected, setShowRejected] = useState(false)
  const [showAccepted, setShowAccepted] = useState(false)
  const [isRefreshing, startRefresh] = useTransition()
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "accept" | "reject" | "restore" | "revoke" } | null>(null)
  const [isActionPending, startAction] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isBulkPending, startBulkAction] = useTransition()
  const [revokeTarget, setRevokeTarget] = useState<GoogleImportCandidate | null>(null)

  function describeError(fallback: string, err: unknown): string {
    const detail = err instanceof Error ? err.message : null
    return detail ? `${fallback} (${detail})` : fallback
  }

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

  const [prevInitialAccepted, setPrevInitialAccepted] = useState(initialAccepted)
  if (initialAccepted !== prevInitialAccepted) {
    setPrevInitialAccepted(initialAccepted)
    setAccepted(initialAccepted)
  }

  function handleRefresh() {
    setError(null)
    startRefresh(async () => {
      try {
        await refreshGoogleImportCandidates()
        router.refresh()
      } catch (err) {
        setError(describeError("La récupération des événements Google a échoué. Réessayez dans quelques instants.", err))
      }
    })
  }

  function handleAccept(id: string) {
    setError(null)
    setPendingAction({ id, action: "accept" })
    startAction(async () => {
      try {
        await acceptGoogleImportCandidate(id)
        const candidate = candidates.find((c) => c.id === id) ?? rejected.find((c) => c.id === id)
        setCandidates((prev) => prev.filter((c) => c.id !== id))
        setRejected((prev) => prev.filter((c) => c.id !== id))
        if (candidate) setAccepted((prev) => [...prev, candidate])
      } catch (err) {
        setError(describeError("L'import de cet événement a échoué. Réessayez dans quelques instants.", err))
      } finally {
        setPendingAction(null)
      }
    })
  }

  function handleRevoke(id: string) {
    setError(null)
    setPendingAction({ id, action: "revoke" })
    startAction(async () => {
      try {
        await revokeGoogleImportCandidate(id)
        const candidate = accepted.find((c) => c.id === id)
        setAccepted((prev) => prev.filter((c) => c.id !== id))
        if (candidate) setRejected((prev) => [...prev, candidate])
      } catch (err) {
        setError(describeError("L'annulation de cet import a échoué. Réessayez dans quelques instants.", err))
      } finally {
        setPendingAction(null)
        setRevokeTarget(null)
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
      } catch (err) {
        setError(describeError("Le refus de cet événement a échoué. Réessayez dans quelques instants.", err))
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
      } catch (err) {
        setError(describeError("La restauration de cet événement a échoué. Réessayez dans quelques instants.", err))
      } finally {
        setPendingAction(null)
      }
    })
  }

  function handleAcceptAll(list: GoogleImportCandidate[]) {
    setError(null)
    startBulkAction(async () => {
      const ids = list.map((c) => c.id)
      try {
        await Promise.all(ids.map((id) => acceptGoogleImportCandidate(id)))
        setCandidates((prev) => prev.filter((c) => !ids.includes(c.id)))
        setRejected((prev) => prev.filter((c) => !ids.includes(c.id)))
        setAccepted((prev) => [...prev, ...list])
      } catch (err) {
        setError(describeError("L'import groupé a échoué. Réessayez dans quelques instants.", err))
        router.refresh()
      }
    })
  }

  function handleRejectAll(list: GoogleImportCandidate[]) {
    setError(null)
    startBulkAction(async () => {
      const ids = list.map((c) => c.id)
      try {
        await Promise.all(ids.map((id) => rejectGoogleImportCandidate(id)))
        setCandidates((prev) => prev.filter((c) => !ids.includes(c.id)))
        setRejected((prev) => [...prev, ...list])
      } catch (err) {
        setError(describeError("Le refus groupé a échoué. Réessayez dans quelques instants.", err))
        router.refresh()
      }
    })
  }

  function isBusy(id: string) {
    return isActionPending && pendingAction?.id === id
  }

  function label(id: string, action: "accept" | "reject" | "restore" | "revoke", idleLabel: string, busyLabel: string) {
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
          {candidates.length > 1 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleAcceptAll(candidates)} disabled={isBulkPending}>
                {isBulkPending ? "Import…" : "Tout accepter"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleRejectAll(candidates)} disabled={isBulkPending}>
                {isBulkPending ? "…" : "Tout refuser"}
              </Button>
            </div>
          )}
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
              {rejected.length > 1 && (
                <Button size="sm" variant="outline" onClick={() => handleAcceptAll(rejected)} disabled={isBulkPending}>
                  {isBulkPending ? "Import…" : "Tout accepter"}
                </Button>
              )}
              {rejected.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} isPending={isBusy(candidate.id)}>
                  <Button size="sm" onClick={() => handleAccept(candidate.id)} disabled={isBusy(candidate.id)}>
                    {label(candidate.id, "accept", "Accepter", "Import…")}
                  </Button>
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

      {accepted.length > 0 && (
        <div className="space-y-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAccepted((prev) => !prev)}
            className="text-[var(--color-muted-foreground)]"
          >
            {showAccepted ? "Masquer" : "Afficher"} les événements importés ({accepted.length})
          </Button>

          {showAccepted && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Annuler un import supprime l&apos;événement correspondant créé dans Famille
                Sync. Il restera disponible dans les événements refusés si vous souhaitez le
                réimporter plus tard.
              </p>
              {accepted.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} isPending={isBusy(candidate.id)}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[var(--color-destructive)]"
                    onClick={() => setRevokeTarget(candidate)}
                    disabled={isBusy(candidate.id)}
                  >
                    {label(candidate.id, "revoke", "Annuler l'import", "…")}
                  </Button>
                </CandidateCard>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler cet import ?</DialogTitle>
            <DialogDescription>
              L&apos;événement « {revokeTarget?.summary} » créé dans Famille Sync sera
              supprimé. Il restera disponible dans les événements refusés si vous souhaitez
              le réimporter plus tard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Annuler
            </Button>
            <Button
              className="bg-[var(--color-destructive)] text-white hover:bg-[var(--color-destructive)]/90"
              onClick={() => revokeTarget && handleRevoke(revokeTarget.id)}
              disabled={isActionPending && pendingAction?.action === "revoke"}
            >
              {isActionPending && pendingAction?.action === "revoke" ? "Suppression…" : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

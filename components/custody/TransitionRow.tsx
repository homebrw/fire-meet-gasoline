"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { Trash2 } from "lucide-react"
import type { CustodyTransition, Person, RecurrenceException, RecurrenceRule } from "@/lib/types"
import { TRANSITION_DIRECTION_LABEL } from "@/lib/recurrence/labels"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TransitionIcon } from "./TransitionIcon"
import { ExceptionDetail } from "./ExceptionDetail"

interface TransitionRowProps {
  transition: CustodyTransition
  person: Person | undefined
  ruleName?: string
  onDelete?: () => void
  exception?: RecurrenceException
  rule?: RecurrenceRule
  showDate?: boolean
}

export function TransitionRow({
  transition,
  person,
  ruleName,
  onDelete,
  exception,
  rule,
  showDate = false,
}: TransitionRowProps) {
  const [showException, setShowException] = useState(false)

  return (
    <div
      className="flex items-start gap-3 text-sm rounded-lg p-3 border"
      style={{
        borderColor: person?.color ?? "var(--color-border)",
        backgroundColor: person?.color ? person.color + "10" : "transparent",
      }}
    >
      <div className="flex items-center justify-center flex-shrink-0">
        <TransitionIcon direction={transition.direction} color={person?.color} className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: person?.color ?? "var(--color-muted-foreground)" }}
          />
          <span className="font-semibold">{person?.name ?? "?"}</span>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {TRANSITION_DIRECTION_LABEL[transition.direction]}
          </span>
          {exception && (
            <button
              type="button"
              onClick={() => setShowException(true)}
              className="text-xs font-medium rounded-full px-3 py-2 -my-1.5 bg-[var(--color-muted)] hover:opacity-80 transition-opacity"
            >
              Modifié
            </button>
          )}
          {ruleName && (
            <span className="text-xs text-[var(--color-muted-foreground)] ml-auto">{ruleName}</span>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-11 w-11 -m-2.5 text-[var(--color-destructive)]"
              onClick={onDelete}
              aria-label="Supprimer le changement de garde"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          <span className="font-semibold">
            {format(
              parseISO(transition.transition_at),
              showDate ? "EEEE d MMM yyyy à HH:mm" : "HH:mm",
              { locale: fr }
            )}
          </span>
          {transition.location && <span> — {transition.location}</span>}
        </div>
      </div>

      {exception && (
        <Dialog open={showException} onOpenChange={setShowException}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Détail de l&apos;exception</DialogTitle>
            </DialogHeader>
            <ExceptionDetail exception={exception} rule={rule} person={person} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

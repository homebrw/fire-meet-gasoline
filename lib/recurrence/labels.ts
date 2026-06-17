import type { CustodyTransitionDirection, RecurrenceExceptionType } from "@/lib/types"

export const TRANSITION_DIRECTION_LABEL: Record<CustodyTransitionDirection, string> = {
  pickup: "Récupération",
  dropoff: "Dépose",
}

export const RECURRENCE_EXCEPTION_TYPE_LABELS: Record<RecurrenceExceptionType, string> = {
  cancel: "Annulation",
  move: "Déplacement",
  extend: "Prolongation",
  shorten: "Réduction",
  add: "Ajout",
}

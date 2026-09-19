// Conversion des segments de garde d'une journée (lib/assistant/schedule.ts,
// `custodySegments`) en périodes de la journée au sens Checkmate
// (wakeup/morning/noon/afternoon/evening). Module partagé par
// app/api/presence/route.ts et scripts/preview-presence.ts : une seule
// implémentation, testée par le script, consommée telle quelle par la route.
import { zonedTimeToUtc, zonedDayBounds, formatTimeInZone } from "@/lib/timezone"
import type { CustodySegment } from "@/lib/assistant/schedule"
import type { GeneratedPeriod } from "@/lib/types"

export const PRESENCE_PERIODS = ["wakeup", "morning", "noon", "afternoon", "evening"] as const
export type PresencePeriod = (typeof PRESENCE_PERIODS)[number]

// Bornes horaires Europe/Paris, dans l'ordre imposé par le contrat de
// réponse. Intervalles [début, fin) : rien n'est défini entre 20:30 et
// 07:00, il n'y a pas de période nocturne côté Checkmate.
const PERIOD_BOUNDS: Record<PresencePeriod, [number, number, number, number]> = {
  // [startHour, startMinute, endHour, endMinute]
  wakeup: [7, 0, 9, 0],
  morning: [9, 0, 12, 0],
  noon: [12, 0, 14, 0],
  afternoon: [14, 0, 18, 0],
  evening: [18, 0, 20, 30],
}

export type DayPresence = {
  present_any: boolean
  periods: PresencePeriod[]
  switch_at: string | null
}

/**
 * Détermine, pour une journée calendaire donnée, la présence de l'enfant
 * chez le parent suivi : un indicateur journée entière (`present_any`), le
 * détail par période Checkmate (`periods`) et l'heure du premier changement
 * d'état de la journée (`switch_at`).
 *
 * `day` doit être un marqueur de jour calendaire (minuit heure locale
 * système), comme le produisent `zonedDayMarker`/`parseCalendarDate` — voir
 * le piège documenté dans lib/recurrence/README.md : ne jamais dériver ces
 * bornes avec `startOfDay()` sur un instant UTC.
 *
 * `segments` est la partition de CETTE journée (00:00-24:00 Europe/Paris)
 * pour un seul adulte (l'appelant doit avoir filtré `ctx.rules` sur le seul
 * `person_id` du parent titulaire, comme le fait `custodySegments`) :
 * `personId` y vaut soit cet adulte, soit `null` (« chez l'autre parent »).
 *
 * Règle de présence par période (volontairement permissive, voir la
 * migration 018_seed_custody_rules_2026_2027.sql : les heures de passation
 * de Clotilde sont encore des placeholders) : une période figure dans
 * `periods` dès que l'enfant est présent à un instant quelconque de cette
 * période — un recouvrement strictement positif suffit, pas besoin de
 * couvrir toute la période. Mieux vaut proposer une tâche de trop qu'amputer
 * une journée à cause d'une heure de passation approximative.
 *
 * `present_any` répond à une question différente et plus large : présence à
 * un instant quelconque de la journée calendaire complète, sans se limiter
 * aux cinq fenêtres ci-dessus. Une arrivée à 21:00 (après la fin de la
 * période `evening`, 20:30) donne `present_any: true` et `periods: []` — ce
 * n'est pas une incohérence, ce sont deux usages distincts côté Checkmate :
 * `present_any` filtre la génération des tâches à la granularité du jour
 * entier (décision produit : un jour de passation compte pour présent en
 * entier tant que l'heure de passation n'est pas fiable, quitte à générer
 * une tâche de trop, jamais une de moins), `periods` ne sert qu'à afficher
 * un libellé de lieu par période sur l'écran enfant.
 */
export function presenceForDay(day: Date, segments: CustodySegment[]): DayPresence {
  const year = day.getFullYear()
  const month = day.getMonth() + 1
  const date = day.getDate()

  const presentSegments = segments.filter((s) => s.personId !== null)

  const periods = PRESENCE_PERIODS.filter((name) => {
    const [startH, startM, endH, endM] = PERIOD_BOUNDS[name]
    const boundStart = zonedTimeToUtc(year, month, date, startH, startM)
    const boundEnd = zonedTimeToUtc(year, month, date, endH, endM)
    return presentSegments.some((seg) => seg.from < boundEnd && seg.to > boundStart)
  })

  // Premier changement d'état (présence -> absence ou l'inverse) strictement
  // à l'intérieur de la journée. Les segments sont déjà triés et contigus
  // (partition d'une seule journée pour un seul adulte, cf. custodySegments),
  // donc il suffit de comparer chaque segment au précédent.
  let switchAt: string | null = null
  if (segments.length > 0) {
    let previousPresent = segments[0].personId !== null
    for (let i = 1; i < segments.length; i++) {
      const present = segments[i].personId !== null
      if (present !== previousPresent) {
        switchAt = formatTimeInZone(segments[i].from)
        break
      }
      previousPresent = present
    }
  }

  return {
    present_any: presentSegments.length > 0,
    periods,
    switch_at: switchAt,
  }
}

export type PresenceRegime = "school" | "out_of_cycle"

/**
 * `"school"` si les heures de passation de ce jour sont celles, fiables, du
 * rythme scolaire ; `"out_of_cycle"` si elles viennent d'un bloc de
 * vacances, posées à 00:00 ou approximatives (cf. le commentaire de tête de
 * la migration 018_seed_custody_rules_2026_2027.sql).
 *
 * ⚠️ Heuristique adossée à la façon dont les données sont SAISIES, pas à un
 * calendrier scolaire réel : dans supabase/migrations/018_..., chaque bloc
 * de vacances (Toussaint / Noël / Hiver / Printemps / Été) neutralise le
 * cycle habituel avec une exception `absent` sur toute la période, puis pose
 * les vrais segments avec des exceptions `present` — ce sont CES périodes,
 * insérées par l'exception et marquées `source: "exception"`
 * (lib/recurrence/README.md), qui signalent un jour de vacances. À
 * l'inverse, les échanges ponctuels de période scolaire (un vendredi
 * échangé) sont de simples exceptions `absent` qui retirent une journée
 * entière sans jamais insérer de période `source: "exception"` : elles ne
 * produisent jamais de journée partielle, donc jamais de faux positif ici.
 * Si cette heuristique dérive un jour (nouvelle façon de saisir une
 * exception, par exemple), c'est ici qu'il faut regarder en premier.
 *
 * Un jour entièrement absent (`present_any: false`) est classé `"school"`
 * par défaut : la valeur n'a alors aucun usage côté Checkmate.
 *
 * `periods` : GeneratedPeriod[] déjà filtrées sur le seul adulte concerné
 * (comme pour `presenceForDay`), typiquement le résultat de
 * `expandPeriods()`/`generateCustodyPeriods()` — PAS le résultat de
 * `custodySegments()`, qui ne conserve pas `source`.
 */
export function regimeForDay(day: Date, periods: GeneratedPeriod[]): PresenceRegime {
  const { start, end } = zonedDayBounds(day)
  const hasInsertedExceptionPeriod = periods.some(
    (p) => p.source === "exception" && p.start_at < end && p.end_at > start
  )
  return hasInsertedExceptionPeriod ? "out_of_cycle" : "school"
}

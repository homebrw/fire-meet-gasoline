/**
 * Banc de vérification (hors app) de lib/presence/periods.ts : rejoue la
 * conversion segments -> périodes Checkmate, et périodes brutes -> regime,
 * sur quelques journées synthétiques, en particulier les cas tordus autour
 * des bornes de période, de la journée calendaire complète et de la
 * distinction rythme scolaire / vacances.
 *
 * Ne repasse PAS par generateCustodyPeriods() : les CustodySegment et
 * GeneratedPeriod de test sont construits à la main (exactement les objets
 * que custodySegments()/expandPeriods() produiraient pour un adulte donné
 * sur une journée) — ça suffit à isoler presenceForDay() et regimeForDay(),
 * les deux fonctions sous test ici.
 *
 * Usage: npx tsx scripts/preview-presence.ts
 */
import { zonedTimeToUtc, zonedDayBounds } from "@/lib/timezone"
import { presenceForDay, regimeForDay, type PresencePeriod, type PresenceRegime } from "@/lib/presence/periods"
import type { CustodySegment } from "@/lib/assistant/schedule"
import type { GeneratedPeriod } from "@/lib/types"

const PARENT = "marie-alix"

// Jour de test arbitraire (hors vacances, sans piège DST) pour les cas 1-3, 5-6.
const DAY = new Date(2026, 10, 9) // 2026-11-09
// Jour de test en zone de vacances (heure de passation à 00:00, cf.
// migration 018) pour le cas 4.
const VACATION_DAY = new Date(2026, 11, 20) // 2026-12-20
// Jour d'entrée en vacances (1er jour posé par une exception "present", cf.
// bloc Noël de la migration 018) pour le cas 7.
const VACATION_ENTRY_DAY = new Date(2026, 11, 19) // 2026-12-19

function at(day: Date, hour: number, minute: number): Date {
  return zonedTimeToUtc(day.getFullYear(), day.getMonth() + 1, day.getDate(), hour, minute)
}

function rulePeriod(start_at: Date, end_at: Date): GeneratedPeriod {
  return { person_id: PARENT, start_at, end_at, rule_id: "rule-ma-1", source: "rule", exception_id: null }
}

function exceptionPeriod(start_at: Date, end_at: Date): GeneratedPeriod {
  return {
    person_id: PARENT,
    start_at,
    end_at,
    rule_id: "rule-ma-1",
    source: "exception",
    exception_id: "exc-noel-1",
  }
}

type Case = {
  label: string
  day: Date
  segments: CustodySegment[]
  // Périodes brutes (avec `source`) recouvrant ce même jour pour ce même
  // adulte — ce que expandPeriods() renverrait, PAS custodySegments().
  rawPeriods: GeneratedPeriod[]
  expected: {
    present_any: boolean
    periods: PresencePeriod[]
    switch_at: string | null
    regime: PresenceRegime
  }
}

const { start: dayStart, end: dayEnd } = zonedDayBounds(DAY)
const { start: vacStart, end: vacEnd } = zonedDayBounds(VACATION_DAY)
const { start: entryStart, end: entryEnd } = zonedDayBounds(VACATION_ENTRY_DAY)

// Bornes larges (loin avant/après le jour testé) pour les périodes de règle
// "ordinaires" : seul leur chevauchement avec le jour testé compte pour
// regimeForDay(), leurs bornes exactes n'ont pas besoin de coller à un vrai
// cycle custom_cycle/weekly_alternating ici.
const FAR_PAST = new Date(2020, 0, 1)
const FAR_FUTURE = new Date(2030, 0, 1)

const cases: Case[] = [
  {
    label: "Jour entièrement présent (rythme scolaire)",
    day: DAY,
    segments: [{ from: dayStart, to: dayEnd, personId: PARENT }],
    rawPeriods: [rulePeriod(FAR_PAST, FAR_FUTURE)],
    expected: {
      present_any: true,
      periods: ["wakeup", "morning", "noon", "afternoon", "evening"],
      switch_at: null,
      regime: "school",
    },
  },
  {
    label: "Jour entièrement absent",
    day: DAY,
    segments: [{ from: dayStart, to: dayEnd, personId: null }],
    // Aucune période de ce parent ne recouvre le jour : regime "school" par
    // défaut (valeur sans usage côté Checkmate pour un jour absent).
    rawPeriods: [],
    expected: { present_any: false, periods: [], switch_at: null, regime: "school" },
  },
  {
    label: "Passation scolaire à 08:30 (arrivée, regime school)",
    day: DAY,
    segments: [
      { from: dayStart, to: at(DAY, 8, 30), personId: null },
      { from: at(DAY, 8, 30), to: dayEnd, personId: PARENT },
    ],
    // La période qui donne la garde à ce parent démarre à 08:30 (source
    // "rule", pas une exception) : c'est un jour de rythme scolaire normal.
    rawPeriods: [rulePeriod(at(DAY, 8, 30), FAR_FUTURE)],
    // Recouvrement strictement positif : 08:30-09:00 chevauche déjà la
    // fenêtre wakeup (07:00-09:00), donc wakeup est incluse elle aussi —
    // c'est la règle volontairement permissive documentée dans
    // lib/presence/periods.ts.
    expected: {
      present_any: true,
      periods: ["wakeup", "morning", "noon", "afternoon", "evening"],
      switch_at: "08:30",
      regime: "school",
    },
  },
  {
    label: "Passation à 00:00 en vacances (départ)",
    day: VACATION_DAY,
    // custodySegments() n'insère une frontière que si elle tombe
    // STRICTEMENT à l'intérieur de la journée (`startMs > dayStart` /
    // `endMs < dayEnd`, cf. lib/assistant/schedule.ts) : une passation à
    // minuit pile ne produit donc PAS deux segments pour ce jour-là, un
    // seul segment couvre toute la journée, ici personId=null (le départ a
    // déjà eu lieu à la limite du jour précédent).
    segments: [{ from: vacStart, to: vacEnd, personId: null }],
    // La période "exception" qui couvrait les vacances s'est terminée avant
    // ce jour (à sa borne exacte) : aucune période ne recouvre plus ce jour.
    rawPeriods: [],
    expected: { present_any: false, periods: [], switch_at: null, regime: "school" },
  },
  {
    label: "Arrivée tardive à 21:00, après la fin d'evening (20:30)",
    day: DAY,
    segments: [
      { from: dayStart, to: at(DAY, 21, 0), personId: null },
      { from: at(DAY, 21, 0), to: dayEnd, personId: PARENT },
    ],
    rawPeriods: [rulePeriod(at(DAY, 21, 0), FAR_FUTURE)],
    // Cas signalé par le propriétaire : present_any=true (présence à un
    // instant de la journée calendaire complète) alors qu'aucune des cinq
    // fenêtres de période n'est atteinte (21:00 > 20:30, fin d'evening).
    expected: { present_any: true, periods: [], switch_at: "21:00", regime: "school" },
  },
  {
    label: "Entrée en vacances (1er jour posé par une exception present, regime out_of_cycle)",
    day: VACATION_ENTRY_DAY,
    // Comme "Noël 1er jour" dans la migration 018 : le cycle habituel est
    // neutralisé par une exception "absent" sur toute la période de
    // vacances, et ce jour précis est repeuplé par une exception "present"
    // qui couvre la journée entière.
    segments: [{ from: entryStart, to: entryEnd, personId: PARENT }],
    rawPeriods: [exceptionPeriod(entryStart, entryEnd)],
    expected: {
      present_any: true,
      periods: ["wakeup", "morning", "noon", "afternoon", "evening"],
      switch_at: null,
      regime: "out_of_cycle",
    },
  },
]

let failures = 0

for (const c of cases) {
  const result = presenceForDay(c.day, c.segments)
  const regime = regimeForDay(c.day, c.rawPeriods)
  const ok =
    result.present_any === c.expected.present_any &&
    result.switch_at === c.expected.switch_at &&
    regime === c.expected.regime &&
    result.periods.length === c.expected.periods.length &&
    result.periods.every((p, i) => p === c.expected.periods[i])

  console.log(`${ok ? "✓" : "✗"} ${c.label}`)
  console.log(
    `    obtenu   : present_any=${result.present_any} regime=${regime} periods=[${result.periods.join(",")}] switch_at=${result.switch_at}`
  )
  if (!ok) {
    failures++
    console.log(
      `    attendu  : present_any=${c.expected.present_any} regime=${c.expected.regime} periods=[${c.expected.periods.join(",")}] switch_at=${c.expected.switch_at}`
    )
  }
}

console.log(failures === 0 ? "\n✅ Aucun écart." : `\n❌ ${failures} écart(s).`)
if (failures > 0) process.exitCode = 1

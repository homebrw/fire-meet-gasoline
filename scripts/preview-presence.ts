/**
 * Banc de vérification (hors app) de lib/presence/periods.ts : rejoue la
 * conversion segments -> périodes Checkmate sur quelques journées
 * synthétiques, en particulier les cas tordus autour des bornes de période
 * et de la journée calendaire complète.
 *
 * Ne repasse PAS par generateCustodyPeriods() : les CustodySegment de test
 * sont construits à la main (ce sont exactement les objets que
 * custodySegments() produirait pour un adulte donné sur une journée) — ça
 * suffit à isoler presenceForDay(), la seule fonction sous test ici.
 *
 * Usage: npx tsx scripts/preview-presence.ts
 */
import { zonedTimeToUtc, zonedDayBounds } from "@/lib/timezone"
import { presenceForDay, type PresencePeriod } from "@/lib/presence/periods"
import type { CustodySegment } from "@/lib/assistant/schedule"

const PARENT = "marie-alix"

// Jour de test arbitraire (hors vacances, sans piège DST) pour les cas 1-3.
const DAY = new Date(2026, 10, 9) // 2026-11-09
// Jour de test en zone de vacances (heure de passation à 00:00, cf.
// migration 018) pour le cas 4.
const VACATION_DAY = new Date(2026, 11, 20) // 2026-12-20

function at(day: Date, hour: number, minute: number): Date {
  return zonedTimeToUtc(day.getFullYear(), day.getMonth() + 1, day.getDate(), hour, minute)
}

type Case = {
  label: string
  day: Date
  segments: CustodySegment[]
  expected: {
    present_any: boolean
    periods: PresencePeriod[]
    switch_at: string | null
  }
}

const { start: dayStart, end: dayEnd } = zonedDayBounds(DAY)
const { start: vacStart, end: vacEnd } = zonedDayBounds(VACATION_DAY)

const cases: Case[] = [
  {
    label: "Jour entièrement présent",
    day: DAY,
    segments: [{ from: dayStart, to: dayEnd, personId: PARENT }],
    expected: {
      present_any: true,
      periods: ["wakeup", "morning", "noon", "afternoon", "evening"],
      switch_at: null,
    },
  },
  {
    label: "Jour entièrement absent",
    day: DAY,
    segments: [{ from: dayStart, to: dayEnd, personId: null }],
    expected: { present_any: false, periods: [], switch_at: null },
  },
  {
    label: "Passation matinale à 08:30 (arrivée)",
    day: DAY,
    segments: [
      { from: dayStart, to: at(DAY, 8, 30), personId: null },
      { from: at(DAY, 8, 30), to: dayEnd, personId: PARENT },
    ],
    // Recouvrement strictement positif : 08:30-09:00 chevauche déjà la
    // fenêtre wakeup (07:00-09:00), donc wakeup est incluse elle aussi —
    // c'est la règle volontairement permissive documentée dans
    // lib/presence/periods.ts.
    expected: {
      present_any: true,
      periods: ["wakeup", "morning", "noon", "afternoon", "evening"],
      switch_at: "08:30",
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
    expected: { present_any: false, periods: [], switch_at: null },
  },
  {
    label: "Arrivée tardive à 21:00, après la fin d'evening (20:30)",
    day: DAY,
    segments: [
      { from: dayStart, to: at(DAY, 21, 0), personId: null },
      { from: at(DAY, 21, 0), to: dayEnd, personId: PARENT },
    ],
    // Cas signalé par le propriétaire : present_any=true (présence à un
    // instant de la journée calendaire complète) alors qu'aucune des cinq
    // fenêtres de période n'est atteinte (21:00 > 20:30, fin d'evening).
    expected: { present_any: true, periods: [], switch_at: "21:00" },
  },
]

let failures = 0

for (const c of cases) {
  const result = presenceForDay(c.day, c.segments)
  const ok =
    result.present_any === c.expected.present_any &&
    result.switch_at === c.expected.switch_at &&
    result.periods.length === c.expected.periods.length &&
    result.periods.every((p, i) => p === c.expected.periods[i])

  console.log(`${ok ? "✓" : "✗"} ${c.label}`)
  console.log(
    `    obtenu   : present_any=${result.present_any} periods=[${result.periods.join(",")}] switch_at=${result.switch_at}`
  )
  if (!ok) {
    failures++
    console.log(
      `    attendu  : present_any=${c.expected.present_any} periods=[${c.expected.periods.join(",")}] switch_at=${c.expected.switch_at}`
    )
  }
}

console.log(failures === 0 ? "\n✅ Aucun écart." : `\n❌ ${failures} écart(s).`)
if (failures > 0) process.exitCode = 1

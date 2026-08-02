/**
 * Banc de vérification (hors app) : fait tourner le vrai moteur de récurrence
 * sur les règles/exceptions proposées et compare le résultat jour par jour
 * avec la vérité terrain fournie (ancrage §3 + segments §5).
 *
 * Usage: npx tsx scripts/preview-custody.ts
 *
 * Pour rejouer les règles telles qu'elles sont réellement en base plutôt que
 * celles décrites ici (aller-retour complet SQL → base → moteur) :
 *   CUSTODY_FIXTURE=/chemin/fixture.json npx tsx scripts/preview-custody.ts
 * où fixture.json contient { rules: [...], exceptions: [...] } exportés depuis
 * les tables recurrence_rules / recurrence_exceptions.
 */
import { readFileSync } from "node:fs"
import { addDays, format, parseISO } from "date-fns"
import { generateCustodyPeriods } from "@/lib/recurrence/engine"
import { zonedDayBounds, zonedTimeToUtc } from "@/lib/timezone"
import type { RecurrenceRule, RecurrenceException } from "@/lib/types"

const DAMIEN = "damien"
const MA = "marie-alix"

const base = {
  handoff_location: null,
  is_active: true,
  created_at: "",
  updated_at: "",
}

const CUSTODY_DAYS = [0, 1, 4, 5, 6, 7, 8]

const rules: RecurrenceRule[] = [
  {
    ...base,
    id: "rule-damien",
    person_id: DAMIEN,
    name: "Garde alternée — semaines ISO impaires",
    pattern_type: "weekly_alternating",
    starts_at: "2026-08-31T00:00:00+02:00",
    custody_start_time: "08:30",
    custody_end_time: "08:30",
    week_parity: "odd",
    handoff_day: 0,
    cycle_length_days: null,
    custody_days: null,
    handoff_location: "École",
    ends_at: null,
  },
  {
    ...base,
    id: "rule-ma-1",
    person_id: MA,
    name: "Clotilde — cycle 14 j (avant 2027)",
    pattern_type: "custom_cycle",
    // Origine déclarée du rythme : lundi de semaine ISO paire.
    starts_at: "2026-08-31T00:00:00+02:00",
    custody_start_time: "08:30",
    custody_end_time: "08:30",
    week_parity: null,
    handoff_day: null,
    cycle_length_days: 14,
    custody_days: [0, 1, 7, 8, 11, 12, 13],
    ends_at: "2027-01-03T00:00:00+01:00",
  },
  {
    ...base,
    id: "rule-ma-2",
    person_id: MA,
    name: "Clotilde — cycle 14 j (recalé sur S1 2027)",
    pattern_type: "custom_cycle",
    starts_at: "2027-01-04T00:00:00+01:00",
    custody_start_time: "08:30",
    custody_end_time: "08:30",
    week_parity: null,
    handoff_day: null,
    cycle_length_days: 14,
    custody_days: CUSTODY_DAYS,
    ends_at: null,
  },
]

function exc(
  rule: string,
  type: "present" | "absent",
  start: string,
  end: string,
  reason: string
): RecurrenceException {
  return {
    id: `${rule}-${type}-${start}`,
    recurrence_rule_id: rule,
    start_at: start,
    end_at: end,
    type,
    reason,
    notes: null,
    created_at: "",
    updated_at: "",
  }
}

// Heures d'été/hiver explicites : +02:00 = CEST, +01:00 = CET.
const exceptions: RecurrenceException[] = [
  // ── Damien : bascules de vacances (samedi du milieu, 14:00) ────────────
  exc("rule-damien", "absent", "2026-10-24T14:00:00+02:00", "2026-10-26T08:30:00+01:00", "Toussaint — sortie samedi 14h"),
  exc("rule-damien", "present", "2026-12-26T14:00:00+01:00", "2026-12-28T08:30:00+01:00", "Noël — entrée samedi 14h"),
  exc("rule-damien", "present", "2027-02-13T14:00:00+01:00", "2027-02-15T08:30:00+01:00", "Hiver — entrée samedi 14h"),
  exc("rule-damien", "present", "2027-04-10T14:00:00+02:00", "2027-04-12T08:30:00+02:00", "Printemps — entrée samedi 14h"),
  // ── Damien : lundis fériés (bascule reportée au mardi) ─────────────────
  exc("rule-damien", "absent", "2027-03-29T08:30:00+02:00", "2027-03-30T08:30:00+02:00", "Lundi de Pâques"),
  exc("rule-damien", "present", "2027-05-17T08:30:00+02:00", "2027-05-18T08:30:00+02:00", "Lundi de Pentecôte"),
  // ── Damien : été 2027 (régime 8 semaines, passation le dimanche) ───────
  exc("rule-damien", "absent", "2027-07-04T00:00:00+02:00", "2027-08-30T08:30:00+02:00", "Été — régime spécifique"),
  exc("rule-damien", "present", "2027-07-04T00:00:00+02:00", "2027-07-11T00:00:00+02:00", "Été S1"),
  exc("rule-damien", "present", "2027-07-18T00:00:00+02:00", "2027-08-08T00:00:00+02:00", "Été S3-S4-S5"),
  exc("rule-damien", "present", "2027-08-29T00:00:00+02:00", "2027-08-30T08:30:00+02:00", "Reprise scolaire"),

  // ── Clotilde : échanges ponctuels (vendredi chez le père) ──────────────
  exc("rule-ma-1", "absent", "2026-11-06T00:00:00+01:00", "2026-11-07T00:00:00+01:00", "Échange"),
  exc("rule-ma-1", "absent", "2026-11-20T00:00:00+01:00", "2026-11-21T00:00:00+01:00", "Échange"),
  exc("rule-ma-1", "absent", "2026-12-04T00:00:00+01:00", "2026-12-05T00:00:00+01:00", "Échange"),
  exc("rule-ma-1", "absent", "2026-12-18T00:00:00+01:00", "2026-12-19T00:00:00+01:00", "Échange"),
  // ── Clotilde : vacances (segments explicites) ──────────────────────────
  exc("rule-ma-1", "absent", "2026-10-17T00:00:00+02:00", "2026-11-02T08:30:00+01:00", "Toussaint"),
  exc("rule-ma-1", "present", "2026-10-24T00:00:00+02:00", "2026-10-31T00:00:00+01:00", "Toussaint 2e partie"),
  exc("rule-ma-1", "absent", "2026-12-19T00:00:00+01:00", "2027-01-04T08:30:00+01:00", "Noël"),
  exc("rule-ma-1", "present", "2026-12-19T00:00:00+01:00", "2026-12-20T00:00:00+01:00", "Noël 1er jour"),
  exc("rule-ma-1", "present", "2026-12-27T00:00:00+01:00", "2027-01-04T08:30:00+01:00", "Noël 2e partie"),
  exc("rule-ma-2", "absent", "2027-02-06T00:00:00+01:00", "2027-02-22T08:30:00+01:00", "Hiver"),
  exc("rule-ma-2", "present", "2027-02-06T00:00:00+01:00", "2027-02-15T00:00:00+01:00", "Hiver 1re partie"),
  exc("rule-ma-2", "absent", "2027-04-03T00:00:00+02:00", "2027-04-19T08:30:00+02:00", "Printemps"),
  exc("rule-ma-2", "present", "2027-04-03T00:00:00+02:00", "2027-04-12T00:00:00+02:00", "Printemps 1re partie"),
  exc("rule-ma-2", "absent", "2027-07-03T00:00:00+02:00", "2027-09-01T00:00:00+02:00", "Été"),
  exc("rule-ma-2", "present", "2027-07-05T00:00:00+02:00", "2027-07-12T00:00:00+02:00", "Été"),
  exc("rule-ma-2", "present", "2027-07-19T00:00:00+02:00", "2027-07-26T00:00:00+02:00", "Été"),
  exc("rule-ma-2", "present", "2027-08-02T00:00:00+02:00", "2027-08-16T00:00:00+02:00", "Été (quinzaine)"),
  exc("rule-ma-2", "present", "2027-08-30T00:00:00+02:00", "2027-09-01T00:00:00+02:00", "Fin d'été"),
]

// ─── Restitution jour par jour ────────────────────────────────────────────

const FROM = new Date(2026, 7, 31)
const TO = new Date(2027, 8, 6)

// Mode « aller-retour base » : CUSTODY_FIXTURE=<fichier.json> rejoue les
// règles telles qu'elles ont réellement été écrites en base par la migration,
// au lieu des objets définis ci-dessus. Ferme la boucle SQL → base → moteur.
const fixturePath = process.env.CUSTODY_FIXTURE
const source = fixturePath
  ? (JSON.parse(readFileSync(fixturePath, "utf8")) as {
      rules: RecurrenceRule[]
      exceptions: RecurrenceException[]
    })
  : { rules, exceptions }

if (fixturePath) {
  console.log(
    `⟳ Règles relues depuis la base : ${source.rules.length} règles, ` +
      `${source.exceptions.length} exceptions (${fixturePath})\n`
  )
}

const periods = generateCustodyPeriods(source.rules, source.exceptions, FROM, TO)

/**
 * Vérité terrain « chez qui est l'enfant ce jour-là » : on échantillonne à
 * 12:00 (heure de Paris), comme la lit un parent. Les passations du matin
 * (08:30) ou du milieu de journée (14:00) sont ainsi tranchées sans ambiguïté.
 */
function ownersAtNoon(day: Date): { damien: boolean; ma: boolean } {
  const noon = zonedTimeToUtc(day.getFullYear(), day.getMonth() + 1, day.getDate(), 12, 0)
  let damien = false
  let ma = false
  for (const p of periods) {
    if (p.start_at <= noon && p.end_at > noon) {
      if (p.person_id === DAMIEN) damien = true
      if (p.person_id === MA) ma = true
    }
  }
  return { damien, ma }
}

/** Ce que l'app peindra sur la case du mois (tout chevauchement compte). */
function ownersOn(day: Date): { damien: boolean; ma: boolean } {
  const { start: dayStart, end: dayEnd } = zonedDayBounds(day)
  let damien = false
  let ma = false
  for (const p of periods) {
    if (p.start_at <= dayEnd && p.end_at >= dayStart) {
      if (p.person_id === DAMIEN) damien = true
      if (p.person_id === MA) ma = true
    }
  }
  return { damien, ma }
}

// Vérité terrain §3 (ancrage) — 28 jours.
const ANCHOR_START = "2026-09-07"
const anchorDamien = "DDDDDDDCCCCCCCDDDDDDDCCCCCCC" // D = Damien, C = Caroline
const anchorMa = "MMPPMMMMMPPPPPMMPPMMMMMPPPPP" // M = Marie-Alix, P = père de Clotilde

// Vérité terrain §5 (segments) — [début inclus, fin exclue) → qui.
type Segment = { from: string; to: string; damien?: boolean; ma?: boolean; label: string }
const segments: Segment[] = [
  { from: "2026-10-25", to: "2026-10-26", damien: false, label: "Toussaint — après bascule" },
  { from: "2026-12-27", to: "2026-12-28", damien: true, label: "Noël — après bascule" },
  { from: "2027-02-14", to: "2027-02-15", damien: true, label: "Hiver — après bascule" },
  { from: "2027-04-11", to: "2027-04-12", damien: true, label: "Printemps — après bascule" },
  { from: "2027-03-29", to: "2027-03-30", damien: false, label: "Lundi de Pâques → Caroline" },
  { from: "2027-03-30", to: "2027-04-03", damien: true, label: "Après Pâques → Damien" },
  { from: "2027-05-17", to: "2027-05-18", damien: true, label: "Lundi de Pentecôte → Damien" },
  { from: "2027-05-18", to: "2027-05-24", damien: false, label: "Après Pentecôte → Caroline" },
  { from: "2027-07-04", to: "2027-07-11", damien: true, label: "Été S1" },
  { from: "2027-07-11", to: "2027-07-18", damien: false, label: "Été S2" },
  { from: "2027-07-18", to: "2027-08-08", damien: true, label: "Été S3-S5" },
  { from: "2027-08-08", to: "2027-08-29", damien: false, label: "Été S6-S8" },
  { from: "2027-08-29", to: "2027-08-31", damien: true, label: "Reprise scolaire" },

  { from: "2026-10-17", to: "2026-10-24", ma: false, label: "Clotilde — Toussaint 1re partie" },
  { from: "2026-10-24", to: "2026-10-31", ma: true, label: "Clotilde — Toussaint 2e partie" },
  { from: "2026-10-31", to: "2026-11-02", ma: false, label: "Clotilde — fin Toussaint" },
  { from: "2026-12-19", to: "2026-12-20", ma: true, label: "Clotilde — 1er jour Noël" },
  { from: "2026-12-20", to: "2026-12-27", ma: false, label: "Clotilde — Noël 1re partie" },
  { from: "2026-12-27", to: "2027-01-04", ma: true, label: "Clotilde — Noël 2e partie" },
  { from: "2027-02-06", to: "2027-02-15", ma: true, label: "Clotilde — hiver 1re partie" },
  { from: "2027-02-15", to: "2027-02-22", ma: false, label: "Clotilde — hiver 2e partie" },
  { from: "2027-04-03", to: "2027-04-12", ma: true, label: "Clotilde — printemps 1re partie" },
  { from: "2027-04-12", to: "2027-04-19", ma: false, label: "Clotilde — printemps 2e partie" },
  { from: "2027-07-03", to: "2027-07-05", ma: false, label: "Clotilde — début été" },
  { from: "2027-07-05", to: "2027-07-12", ma: true, label: "Clotilde — été" },
  { from: "2027-07-12", to: "2027-07-19", ma: false, label: "Clotilde — été" },
  { from: "2027-07-19", to: "2027-07-26", ma: true, label: "Clotilde — été" },
  { from: "2027-07-26", to: "2027-08-02", ma: false, label: "Clotilde — été" },
  { from: "2027-08-02", to: "2027-08-16", ma: true, label: "Clotilde — été (quinzaine)" },
  { from: "2027-08-16", to: "2027-08-30", ma: false, label: "Clotilde — été (quinzaine)" },
  { from: "2027-08-30", to: "2027-09-01", ma: true, label: "Clotilde — fin été" },
]

let failures = 0

function fail(msg: string) {
  failures++
  console.log(`  ✗ ${msg}`)
}

console.log("── Ancrage §3 (28 jours) ──────────────────────────────────────")
for (let i = 0; i < 28; i++) {
  const day = addDays(parseISO(ANCHOR_START), i)
  const { damien, ma } = ownersAtNoon(day)
  const expectedD = anchorDamien[i] === "D"
  const expectedM = anchorMa[i] === "M"
  const key = format(day, "yyyy-MM-dd (EEE)")
  if (damien !== expectedD) fail(`${key} Damien: attendu ${expectedD}, obtenu ${damien}`)
  if (ma !== expectedM) fail(`${key} Marie-Alix: attendu ${expectedM}, obtenu ${ma}`)
}
if (failures === 0) console.log("  ✓ 28/28 jours conformes (Damien + Marie-Alix)")

console.log("\n── Segments §5 ────────────────────────────────────────────────")
const before = failures
for (const seg of segments) {
  let day = parseISO(seg.from)
  const end = parseISO(seg.to)
  while (day < end) {
    const { damien, ma } = ownersAtNoon(day)
    const key = format(day, "yyyy-MM-dd (EEE)")
    if (seg.damien !== undefined && damien !== seg.damien)
      fail(`${key} [${seg.label}] Damien: attendu ${seg.damien}, obtenu ${damien}`)
    if (seg.ma !== undefined && ma !== seg.ma)
      fail(`${key} [${seg.label}] Marie-Alix: attendu ${seg.ma}, obtenu ${ma}`)
    day = addDays(day, 1)
  }
}
if (failures === before) console.log(`  ✓ ${segments.length} segments conformes`)

console.log("\n── Calendrier généré (extraits) ───────────────────────────────")
function dump(fromISO: string, days: number, title: string) {
  console.log(`\n${title}`)
  let day = parseISO(fromISO)
  for (let i = 0; i < days; i++) {
    const { damien, ma } = ownersOn(day)
    const d = damien ? "Damien   " : "         "
    const m = ma ? "Marie-Alix" : "          "
    console.log(`  ${format(day, "yyyy-MM-dd EEE")}  ${d}  ${m}`)
    day = addDays(day, 1)
  }
}

dump("2026-12-21", 28, "Passage 2026→2027 (S52 · S53 · S1 · S2) — le point à valider")


// ─── Diff contre l'oracle indépendant (365 jours) ─────────────────────────
// scripts/oracle/oracle_365j.csv est produit par scripts/oracle/oracle_garde.py,
// réimplémentation du rythme sans aucune dépendance au moteur de l'app.

/** Qui a les enfants à une heure donnée (heure de Paris). */
function ownersAt(day: Date, hour: number): { damien: boolean; ma: boolean } {
  const t = zonedTimeToUtc(day.getFullYear(), day.getMonth() + 1, day.getDate(), hour, 0)
  let damien = false
  let ma = false
  for (const p of periods) {
    if (p.start_at <= t && p.end_at > t) {
      if (p.person_id === DAMIEN) damien = true
      if (p.person_id === MA) ma = true
    }
  }
  return { damien, ma }
}

console.log("\n── Diff contre l'oracle indépendant (365 jours) ───────────────")

const csv = readFileSync(new URL("./oracle/oracle_365j.csv", import.meta.url), "utf8")
const rows = csv.trim().split("\n").slice(1).map((line) => line.split(","))

const counts = { GREEN: 0, PURPLE: 0, BLUE: 0, ORANGE: 0 }
let damienDays = 0
let maDays = 0
const oracleFailuresBefore = failures

for (const row of rows) {
  const [dateISO, , , , damienExpected, maExpected] = row
  const day = parseISO(dateISO)
  const expectedMa = maExpected === "True"
  const split = damienExpected.includes("|")
  const [expectedAm, expectedPm] = split
    ? damienExpected.split("|").map((v) => v === "True")
    : [damienExpected === "True", damienExpected === "True"]

  const am = ownersAt(day, 10)
  const pm = ownersAt(day, 16)

  if (am.damien !== expectedAm) fail(`${dateISO} 10:00 Damien: attendu ${expectedAm}, obtenu ${am.damien}`)
  if (pm.damien !== expectedPm) fail(`${dateISO} 16:00 Damien: attendu ${expectedPm}, obtenu ${pm.damien}`)
  if (am.ma !== expectedMa) fail(`${dateISO} 10:00 Marie-Alix: attendu ${expectedMa}, obtenu ${am.ma}`)
  if (pm.ma !== expectedMa) fail(`${dateISO} 16:00 Marie-Alix: attendu ${expectedMa}, obtenu ${pm.ma}`)

  // Décompte des états, les journées coupées comptant pour 0,5 de chaque côté.
  const state = (d: boolean, m: boolean) =>
    d && m ? "PURPLE" : d && !m ? "BLUE" : !d && m ? "ORANGE" : "GREEN"
  if (split) {
    counts[state(am.damien, am.ma)] += 0.5
    counts[state(pm.damien, pm.ma)] += 0.5
    damienDays += (am.damien ? 0.5 : 0) + (pm.damien ? 0.5 : 0)
  } else {
    counts[state(pm.damien, pm.ma)] += 1
    damienDays += pm.damien ? 1 : 0
  }
  maDays += pm.ma ? 1 : 0
}

if (failures === oracleFailuresBefore) console.log(`  ✓ ${rows.length} jours conformes à l'oracle`)

console.log("\n── Invariants d'acceptation ───────────────────────────────────")
const invariants: [string, number, number][] = [
  ["Tous les deux sans enfant", counts.GREEN, 115.5],
  ["Tous les deux avec enfants", counts.PURPLE, 117.5],
  ["Damien seul avec ses filles", counts.BLUE, 70.5],
  ["Marie-Alix seule avec Clotilde", counts.ORANGE, 61.5],
  ["Damien avec enfants (bleu + violet)", counts.BLUE + counts.PURPLE, 188],
  ["Clotilde chez Marie-Alix (orange + violet)", counts.ORANGE + counts.PURPLE, 179],
  ["— recomptés depuis les périodes : Damien", damienDays, 188],
  ["— recomptés depuis les périodes : Clotilde", maDays, 179],
]
for (const [label, got, expected] of invariants) {
  const ok = got === expected
  if (!ok) failures++
  console.log(`  ${ok ? "✓" : "✗"} ${label.padEnd(42)} ${got}${ok ? "" : ` (attendu ${expected})`}`)
}

console.log(
  failures === 0
    ? "\n✅ Aucun écart : ancrage, segments, oracle 365 jours et invariants."
    : `\n❌ ${failures} écart(s).`
)

console.log("\n── Périodes générées (Damien) ─────────────────────────────────")
for (const p of periods.filter((x) => x.person_id === DAMIEN)) {
  console.log(
    `  ${format(p.start_at, "EEE dd/MM/yyyy HH:mm")} → ${format(p.end_at, "EEE dd/MM/yyyy HH:mm")}` +
      (p.source === "exception" ? "   (exception)" : "")
  )
}
console.log("\n── Périodes générées (Marie-Alix / Clotilde) ──────────────────")
for (const p of periods.filter((x) => x.person_id === MA)) {
  console.log(
    `  ${format(p.start_at, "EEE dd/MM/yyyy HH:mm")} → ${format(p.end_at, "EEE dd/MM/yyyy HH:mm")}` +
      (p.source === "exception" ? "   (exception)" : "")
  )
}

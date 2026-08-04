/**
 * Banc de vérification (hors app, sans aucun appel LLM) de
 * lib/assistant/schedule.ts et lib/assistant/tools.ts.
 *
 * Rejoue les mêmes règles/exceptions que scripts/preview-custody.ts (Damien
 * / Juliette+Camille d'un côté, Marie-Alix / Clotilde de l'autre) et vérifie
 * trois scénarios :
 *   1. 2027-01-04 : le jour où la règle custom_cycle de Marie-Alix change
 *      d'ancrage (rule-ma-1 → rule-ma-2) exactement à l'heure de passation
 *      (08:30). custodySegments() doit renvoyer DEUX segments avec la bonne
 *      heure de bascule, comparés en plus à l'oracle indépendant
 *      scripts/oracle/oracle_365j.csv.
 *   2. Un jour ordinaire sans passation : un seul segment par foyer.
 *   3. Un jour couvert par une exception "present" : un seul segment, occupé
 *      par la personne de l'exception.
 *
 * Usage: npx tsx scripts/assistant-smoke.ts
 */
import { readFileSync } from "node:fs"
import { format } from "date-fns"
import { generateCustodyPeriods } from "@/lib/recurrence/engine"
import { zonedTimeToUtc } from "@/lib/timezone"
import { custodySegments } from "@/lib/assistant/schedule"
import type { ScheduleContext } from "@/lib/assistant/schedule"
import { getCustody, getExceptions, getRecurrenceRules } from "@/lib/assistant/tools"
import type { Person, RecurrenceRule, RecurrenceException } from "@/lib/types"

// ─── Fixture (identique à scripts/preview-custody.ts) ──────────────────────

const DAMIEN_ID = "damien"
const MA_ID = "marie-alix"

const persons: Person[] = [
  {
    id: DAMIEN_ID,
    name: "Damien",
    color: "#2563eb",
    avatar_url: null,
    auth_user_id: null,
    date_of_birth: null,
    parent_id: null,
    is_child: false,
    created_at: "",
    updated_at: "",
  },
  {
    id: MA_ID,
    name: "Marie-Alix",
    color: "#db2777",
    avatar_url: null,
    auth_user_id: null,
    date_of_birth: null,
    parent_id: null,
    is_child: false,
    created_at: "",
    updated_at: "",
  },
  {
    id: "juliette",
    name: "Juliette",
    color: "#16a34a",
    avatar_url: null,
    auth_user_id: null,
    date_of_birth: null,
    parent_id: DAMIEN_ID,
    is_child: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "camille",
    name: "Camille",
    color: "#ca8a04",
    avatar_url: null,
    auth_user_id: null,
    date_of_birth: null,
    parent_id: DAMIEN_ID,
    is_child: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "clotilde",
    name: "Clotilde",
    color: "#7c3aed",
    avatar_url: null,
    auth_user_id: null,
    date_of_birth: null,
    parent_id: MA_ID,
    is_child: true,
    created_at: "",
    updated_at: "",
  },
]

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
    person_id: DAMIEN_ID,
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
    person_id: MA_ID,
    name: "Clotilde — cycle 14 j (avant 2027)",
    pattern_type: "custom_cycle",
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
    person_id: MA_ID,
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

const exceptions: RecurrenceException[] = [
  exc("rule-damien", "absent", "2026-10-24T14:00:00+02:00", "2026-10-26T08:30:00+01:00", "Toussaint — sortie samedi 14h"),
  exc("rule-damien", "present", "2026-12-26T14:00:00+01:00", "2026-12-28T08:30:00+01:00", "Noël — entrée samedi 14h"),
  exc("rule-damien", "present", "2027-02-13T14:00:00+01:00", "2027-02-15T08:30:00+01:00", "Hiver — entrée samedi 14h"),
  exc("rule-damien", "present", "2027-04-10T14:00:00+02:00", "2027-04-12T08:30:00+02:00", "Printemps — entrée samedi 14h"),
  exc("rule-damien", "absent", "2027-03-29T08:30:00+02:00", "2027-03-30T08:30:00+02:00", "Lundi de Pâques"),
  exc("rule-damien", "present", "2027-05-17T08:30:00+02:00", "2027-05-18T08:30:00+02:00", "Lundi de Pentecôte"),
  exc("rule-damien", "absent", "2027-07-04T00:00:00+02:00", "2027-08-30T08:30:00+02:00", "Été — régime spécifique"),
  exc("rule-damien", "present", "2027-07-04T00:00:00+02:00", "2027-07-11T00:00:00+02:00", "Été S1"),
  exc("rule-damien", "present", "2027-07-18T00:00:00+02:00", "2027-08-08T00:00:00+02:00", "Été S3-S4-S5"),
  exc("rule-damien", "present", "2027-08-29T00:00:00+02:00", "2027-08-30T08:30:00+02:00", "Reprise scolaire"),

  exc("rule-ma-1", "absent", "2026-11-06T00:00:00+01:00", "2026-11-07T00:00:00+01:00", "Échange"),
  exc("rule-ma-1", "absent", "2026-11-20T00:00:00+01:00", "2026-11-21T00:00:00+01:00", "Échange"),
  exc("rule-ma-1", "absent", "2026-12-04T00:00:00+01:00", "2026-12-05T00:00:00+01:00", "Échange"),
  exc("rule-ma-1", "absent", "2026-12-18T00:00:00+01:00", "2026-12-19T00:00:00+01:00", "Échange"),
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

const ctx: ScheduleContext = {
  persons,
  adults: persons.filter((p) => !p.is_child),
  children: persons.filter((p) => p.is_child),
  rules,
  exceptions,
}

function damienOnlyCtx(): ScheduleContext {
  return { ...ctx, rules: ctx.rules.filter((r) => r.person_id === DAMIEN_ID) }
}
function maOnlyCtx(): ScheduleContext {
  return { ...ctx, rules: ctx.rules.filter((r) => r.person_id === MA_ID) }
}

function dateOnly(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day)
}

// ─── Harnais de test ────────────────────────────────────────────────────────

let failures = 0
function fail(msg: string) {
  failures++
  console.log(`  ✗ ${msg}`)
}
function ok(msg: string) {
  console.log(`  ✓ ${msg}`)
}

// ─── Scénario 1 : 2027-01-04 — passation de Marie-Alix (custom_cycle) ─────

console.log("── 2027-01-04 : passation Marie-Alix (rule-ma-1 → rule-ma-2, 08:30) ──")

const day1 = dateOnly(2027, 1, 4)
const [maDay1] = custodySegments(maOnlyCtx(), day1, day1)

if (maDay1.segments.length !== 2) {
  fail(
    `Attendu 2 segments pour Marie-Alix, obtenu ${maDay1.segments.length} : ${JSON.stringify(
      maDay1.segments.map((s) => ({ from: s.from.toISOString(), to: s.to.toISOString(), personId: s.personId }))
    )}`
  )
} else {
  ok("2 segments trouvés pour Marie-Alix")
  const [before, after] = maDay1.segments
  if (before.personId !== MA_ID || after.personId !== MA_ID) {
    fail(`Les deux segments doivent appartenir à Marie-Alix (obtenu ${before.personId}, ${after.personId})`)
  } else {
    ok("Les deux segments appartiennent à Marie-Alix")
  }
  if (before.to.getTime() !== after.from.getTime()) {
    fail("La fin du premier segment ne coïncide pas avec le début du second (bascule incohérente)")
  } else {
    const boundaryLocal = format(before.to, "HH:mm")
    // La bascule est portée en heure de Paris ; en janvier CET = UTC+1, donc
    // 08:30 local correspond à 07:30 UTC — on vérifie l'heure murale locale.
    const boundaryParis = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(before.to)
    if (boundaryParis !== "08:30") {
      fail(`Bascule attendue à 08:30 (heure de Paris), obtenu ${boundaryParis} (UTC: ${boundaryLocal})`)
    } else {
      ok(`Bascule à 08:30 heure de Paris confirmée`)
    }
  }
}

// Vérification via le dispatcher outil (résolution du prénom "Clotilde").
const toolResult = getCustody(ctx, {
  start_date: "2027-01-04",
  end_date: "2027-01-04",
  person_names: ["Clotilde"],
})
const toolDay = toolResult.days[0]
if (!toolDay || toolDay.segments.length !== 2) {
  fail(`get_custody("Clotilde") : attendu 2 segments, obtenu ${toolDay?.segments.length ?? "aucun jour"}`)
} else if (toolDay.segments[0].to_time !== "08:30" || toolDay.segments[1].from_time !== "08:30") {
  fail(`get_custody("Clotilde") : bascule attendue à 08:30, obtenu ${JSON.stringify(toolDay.segments)}`)
} else {
  ok('get_custody(person_names: ["Clotilde"]) résout le prénom et retrouve la bascule à 08:30')
}

// ─── Comparaison à l'oracle indépendant (scripts/oracle/oracle_365j.csv) ──

console.log("\n── Comparaison à l'oracle indépendant (2027-01-04) ──")

const periods = generateCustodyPeriods(rules, exceptions, dateOnly(2026, 8, 31), dateOnly(2027, 9, 6))

function ownersAt(day: Date, hour: number): { damien: boolean; ma: boolean } {
  const t = zonedTimeToUtc(day.getFullYear(), day.getMonth() + 1, day.getDate(), hour, 0)
  let damien = false
  let ma = false
  for (const p of periods) {
    if (p.start_at <= t && p.end_at > t) {
      if (p.person_id === DAMIEN_ID) damien = true
      if (p.person_id === MA_ID) ma = true
    }
  }
  return { damien, ma }
}

const csv = readFileSync(new URL("./oracle/oracle_365j.csv", import.meta.url), "utf8")
const row = csv
  .trim()
  .split("\n")
  .find((line) => line.startsWith("2027-01-04,"))

if (!row) {
  fail("Ligne 2027-01-04 introuvable dans scripts/oracle/oracle_365j.csv")
} else {
  const [, , , , damienExpected, maExpected] = row.split(",")
  const expectedMa = maExpected === "True"
  const split = damienExpected.includes("|")
  const [expectedAm, expectedPm] = split
    ? (damienExpected.split("|").map((v) => v === "True") as [boolean, boolean])
    : [damienExpected === "True", damienExpected === "True"]

  const am = ownersAt(day1, 10)
  const pm = ownersAt(day1, 16)

  if (am.damien !== expectedAm) fail(`10:00 Damien : attendu ${expectedAm}, obtenu ${am.damien}`)
  else ok(`10:00 Damien conforme à l'oracle (${am.damien})`)

  if (pm.damien !== expectedPm) fail(`16:00 Damien : attendu ${expectedPm}, obtenu ${pm.damien}`)
  else ok(`16:00 Damien conforme à l'oracle (${pm.damien})`)

  if (am.ma !== expectedMa) fail(`10:00 Marie-Alix : attendu ${expectedMa}, obtenu ${am.ma}`)
  else ok(`10:00 Marie-Alix conforme à l'oracle (${am.ma})`)

  if (pm.ma !== expectedMa) fail(`16:00 Marie-Alix : attendu ${expectedMa}, obtenu ${pm.ma}`)
  else ok(`16:00 Marie-Alix conforme à l'oracle (${pm.ma})`)
}

// ─── Scénario 2 : jour ordinaire, sans passation (2026-09-04) ────────────

console.log("\n── 2026-09-04 : jour ordinaire, sans passation ──")

const day2 = dateOnly(2026, 9, 4)
const [maDay2] = custodySegments(maOnlyCtx(), day2, day2)
const [damienDay2] = custodySegments(damienOnlyCtx(), day2, day2)

if (maDay2.segments.length !== 1) {
  fail(`Marie-Alix : attendu 1 segment, obtenu ${maDay2.segments.length}`)
} else {
  ok("Marie-Alix : 1 seul segment (pas de passation)")
  if (maDay2.segments[0].personId !== null) {
    fail(`Marie-Alix : attendu personId=null (Clotilde chez l'autre parent), obtenu ${maDay2.segments[0].personId}`)
  } else {
    ok("Marie-Alix : personId=null (Clotilde chez l'autre parent, non suivi dans l'app)")
  }
}

if (damienDay2.segments.length !== 1) {
  fail(`Damien : attendu 1 segment, obtenu ${damienDay2.segments.length}`)
} else {
  ok("Damien : 1 seul segment (pas de passation)")
}

// ─── Scénario 3 : jour couvert par une exception "present" (2026-12-27) ──

console.log('\n── 2026-12-27 : jour couvert par une exception "present" (Noël) ──')

const day3 = dateOnly(2026, 12, 27)
const [damienDay3] = custodySegments(damienOnlyCtx(), day3, day3)

if (damienDay3.segments.length !== 1) {
  fail(`Damien : attendu 1 segment, obtenu ${damienDay3.segments.length}`)
} else {
  ok("Damien : 1 seul segment sur toute la journée")
  if (damienDay3.segments[0].personId !== DAMIEN_ID) {
    fail(`Damien : attendu personId=${DAMIEN_ID}, obtenu ${damienDay3.segments[0].personId}`)
  } else {
    ok('Damien a la garde toute la journée (exception "present" — Noël)')
  }
}

// ─── Scénario 4 : get_recurrence_rules filtré sur "Damien" ────────────────

console.log('\n── get_recurrence_rules(person_names: ["Damien"]) ──')

const rulesResult = getRecurrenceRules(ctx, { person_names: ["Damien"] })

if (rulesResult.rules.length !== 1) {
  fail(`Attendu 1 règle pour Damien, obtenu ${rulesResult.rules.length}`)
} else {
  ok("1 seule règle renvoyée pour Damien")
  const [rule] = rulesResult.rules
  if (rule.id !== "rule-damien" || rule.pattern_type !== "weekly_alternating") {
    fail(`Règle inattendue : ${JSON.stringify(rule)}`)
  } else {
    ok("pattern_type=weekly_alternating confirmé pour rule-damien")
  }
  if (rule.handoff_day !== 0 || rule.handoff_day_name !== "Lundi") {
    fail(`handoff_day_name attendu "Lundi" (0), obtenu ${rule.handoff_day_name} (${rule.handoff_day})`)
  } else {
    ok('handoff_day_name="Lundi" confirmé')
  }
  const maRuleLeaked = rulesResult.rules.some((r) => r.person_id === MA_ID)
  if (maRuleLeaked) {
    fail("Une règle de Marie-Alix a fuité dans le filtre 'Damien'")
  } else {
    ok("Aucune règle de Marie-Alix dans le filtre 'Damien'")
  }
}

// ─── Scénario 5 : get_exceptions sur la Toussaint de Damien ───────────────

console.log('\n── get_exceptions couvrant "Toussaint — sortie samedi 14h" ──')

const exceptionsResult = getExceptions(ctx, {
  start_date: "2026-10-24",
  end_date: "2026-10-26",
  person_names: ["Damien"],
})

const toussaint = exceptionsResult.exceptions.find((e) => e.reason === "Toussaint — sortie samedi 14h")
if (!toussaint) {
  fail(
    `Exception "Toussaint — sortie samedi 14h" introuvable dans ${JSON.stringify(
      exceptionsResult.exceptions.map((e) => e.reason)
    )}`
  )
} else {
  ok('Exception "Toussaint — sortie samedi 14h" trouvée')
  if (toussaint.type !== "absent" || toussaint.person_name !== "Damien") {
    fail(`type/person_name inattendus : ${JSON.stringify(toussaint)}`)
  } else {
    ok('type="absent" et person_name="Damien" confirmés')
  }
}

// ─── Bilan ──────────────────────────────────────────────────────────────────

console.log(
  failures === 0
    ? "\n✅ Aucun écart : passation croisée, oracle, jour ordinaire et exception present."
    : `\n❌ ${failures} écart(s).`
)

process.exitCode = failures === 0 ? 0 : 1

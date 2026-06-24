# Recurrence Engine

Computes custody periods (who has the kids, when) from a set of `RecurrenceRule`
templates plus one-off `RecurrenceException` overrides. Read this before touching
any file in this directory — the expansion logic is dense and easy to break
without understanding the model first.

## Mental model

1. A `RecurrenceRule` is a *template* with a `pattern_type` and a date range
   (`starts_at` / `ends_at`, the latter optional/open-ended).
2. `generateCustodyPeriods(rules, exceptions, from, to)` (`engine.ts`) expands
   every active rule into raw `GeneratedPeriod[]` within `[from, to]`, then
   applies that rule's exceptions on top, and returns everything sorted by
   start time.
3. `RecurrenceException` never edits a rule — it patches the *generated*
   periods after expansion by marking a date range as `present` (force
   custody for the rule's person, even outside generated periods) or
   `absent` (force the rule's person to NOT have custody, splitting/trimming/
   removing generated periods that overlap). There is no `person_id` on an
   exception — the person is always implicit via
   `recurrence_rule_id -> recurrence_rules.person_id`.

## The three pattern types (`engine.ts`)

- **`weekly_alternating`** — `expandWeeklyAlternating`. Custody alternates by
  ISO week parity (`even`/`odd`) relative to a `handoff_day` (0=Monday..6=Sunday,
  converted to date-fns' `weekStartsOn` which is 0=Sunday). The function finds
  the first valid handoff on/after `starts_at` matching the rule's parity, then
  steps forward 7 days at a time. Each period runs from one handoff to the next.
- **`custom_cycle`** — `expandCustomCycle`. A repeating cycle of
  `cycle_length_days`, where `custody_days` lists which day-indices in the
  cycle (0-based, relative to `starts_at`) belong to this rule. Consecutive
  matching days are merged into single periods by `groupConsecutiveDays`.
- **`manual`** — `expandManual`. A single explicit period bounded by
  `starts_at`/`ends_at` (defaults to a 1-day period if `ends_at` is unset).

All three end by calling `applyExceptions(periods, exceptions, rule)`.

## Exceptions (`applyExceptions` in `engine.ts`)

Matched to a rule's generated periods by overlap with `[start_at, end_at)`,
not by a single point in time. Behavior by `type`:

| type      | effect                                                                 |
|-----------|-------------------------------------------------------------------------|
| `absent`  | removes any overlap with `[start_at, end_at)` from generated periods — full removal, trimming from either end, or splitting into two periods if the absence falls in the middle of one |
| `present` | inserts a new standalone period `[start_at, end_at)` for the rule's person, regardless of what the rule would otherwise generate |

Processing order: all `absent` exceptions for a rule are applied first (in
array order, sequentially folded over the period list so a period can be
split/trimmed multiple times), then all `present` exceptions are appended as
new periods. Overlapping `present` exceptions are **not** merged — each
becomes its own period.

Periods created/modified by an exception get `source: "exception"` and carry
the `exception_id`; rule-derived periods have `source: "rule"`.

Exceptions only take effect within the `[from, to]` window passed to
`generateCustodyPeriods` (the same window used for rule expansion) — a
`present` exception dated outside that window is never considered.

## Other files in this directory

- **`availability.ts`** — turns `GeneratedPeriod[]` (plus events/transitions)
  into per-day `DayState`/`DisplayState` info used by the calendar UI
  (who's available, both/neither parent, etc). Merges overlapping intervals.
- **`display.ts`** — maps `DisplayState` to Tailwind color classes and labels
  for calendar cells and badges. Pure presentation, no scheduling logic.
- **`labels.ts`** — static French label maps for enums (`RecurrenceExceptionType`,
  `CustodyTransitionDirection`). Edit here when adding a new exception type.
- **`persist.ts`** — server-side glue (`"use server"`). Calls
  `generateCustodyPeriods` for a rule, then writes the resulting
  `ChildPresence` / `CustodyTransition` rows to Supabase. This is what
  `lib/actions/recurrence.ts` calls after a rule is created/edited.

## Where to make changes

- New scheduling pattern → add a case in `generateCustodyPeriods` + a new
  `expand*` function in `engine.ts`.
- New exception behavior → edit `applyExceptions`, plus a label in
  `labels.ts`.
- Calendar coloring/labels only → `display.ts`, not `engine.ts`.
- Persisting generated periods to the DB → `persist.ts`.

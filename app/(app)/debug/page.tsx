export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { generateCustodyPeriods } from "@/lib/recurrence/engine"
import { subDays, addDays, startOfToday } from "date-fns"
import type { RecurrenceRule, RecurrenceException } from "@/lib/types"

export default async function DebugPage() {
  const supabase = await createClient()
  const today = startOfToday()
  const from = subDays(today, 90)
  const to = addDays(today, 365)

  const [rulesRes, exceptionsRes] = await Promise.all([
    supabase.from("recurrence_rules").select("*"),
    supabase.from("recurrence_exceptions").select("*"),
  ])

  const rules = (rulesRes.data ?? []) as RecurrenceRule[]
  const exceptions = (exceptionsRes.data ?? []) as RecurrenceException[]

  const periods = generateCustodyPeriods(rules, exceptions, from, to)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Debug Recurrence Rules</h1>

      <section className="border rounded p-4 space-y-2">
        <h2 className="text-xl font-semibold">All Rules ({rules.length})</h2>
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="border rounded p-3 bg-slate-50 text-xs space-y-1 font-mono"
            >
              <div>
                <strong>ID:</strong> {rule.id}
              </div>
              <div>
                <strong>Name:</strong> {rule.name}
              </div>
              <div>
                <strong>Pattern Type:</strong>{" "}
                <span
                  className={
                    !rule.pattern_type
                      ? "bg-red-200 text-red-900"
                      : "bg-green-200 text-green-900"
                  }
                >
                  {rule.pattern_type || "NULL"}
                </span>
              </div>
              <div>
                <strong>Week Parity:</strong>{" "}
                <span
                  className={
                    !rule.week_parity
                      ? "bg-yellow-200 text-yellow-900"
                      : "bg-green-200 text-green-900"
                  }
                >
                  {rule.week_parity || "NULL"}
                </span>
              </div>
              <div>
                <strong>Starts:</strong> {rule.starts_at}
              </div>
              <div>
                <strong>Ends:</strong> {rule.ends_at || "NULL (indefinite)"}
              </div>
              <div>
                <strong>Active:</strong>{" "}
                <span className={rule.is_active ? "text-green-600" : "text-red-600"}>
                  {String(rule.is_active)}
                </span>
              </div>
              <div>
                <strong>Times:</strong> {rule.custody_start_time} → {rule.custody_end_time}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border rounded p-4 space-y-2">
        <h2 className="text-xl font-semibold">Generated Periods ({periods.length})</h2>
        <div className="space-y-2 max-h-96 overflow-auto">
          {periods.length === 0 ? (
            <div className="text-red-600 font-semibold">
              ⚠️ No periods generated! Check rules above for issues.
            </div>
          ) : (
            periods.slice(0, 20).map((p, i) => (
              <div key={i} className="text-xs bg-slate-50 p-2 rounded">
                {p.start_at.toLocaleString()} → {p.end_at.toLocaleString()}
              </div>
            ))
          )}
          {periods.length > 20 && <div className="text-xs text-slate-500">... and {periods.length - 20} more</div>}
        </div>
      </section>

      <section className="text-xs text-slate-900 bg-blue-50 p-4 rounded">
        <p>
          <strong>Query Range:</strong> {from.toDateString()} → {to.toDateString()}
        </p>
        <p>
          <strong>Today:</strong> {today.toDateString()}
        </p>
      </section>
    </div>
  )
}

export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { generateCustodyPeriods } from "@/lib/recurrence/engine"
import { subDays, addDays, startOfToday } from "date-fns"
import type { RecurrenceRule, RecurrenceException } from "@/lib/types"
import { Button } from "@/components/ui/button"

export default async function DebugPage() {
  const supabase = await createClient()
  const today = startOfToday()
  const from = subDays(today, 90)
  const to = addDays(today, 365)

  const [rulesRes, exceptionsRes, personsRes] = await Promise.all([
    supabase.from("recurrence_rules").select("*"),
    supabase.from("recurrence_exceptions").select("*"),
    supabase.from("persons").select("*").order("created_at"),
  ])

  const rules = (rulesRes.data ?? []) as RecurrenceRule[]
  const exceptions = (exceptionsRes.data ?? []) as RecurrenceException[]
  const persons = (personsRes.data ?? []) as any[]

  const periods = generateCustodyPeriods(rules, exceptions, from, to)

  // Create diagnostic report
  const report = {
    timestamp: new Date().toISOString(),
    environment: "production",
    dateRange: {
      from: from.toISOString(),
      to: to.toISOString(),
      today: today.toISOString(),
    },
    persons: persons.map((p) => ({ id: p.id, name: p.name })),
    rulesCount: rules.length,
    rules: rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      personId: rule.person_id,
      patternType: rule.pattern_type,
      weekParity: rule.week_parity,
      startsAt: rule.starts_at,
      endsAt: rule.ends_at,
      isActive: rule.is_active,
      custodyStartTime: rule.custody_start_time,
      custodyEndTime: rule.custody_end_time,
    })),
    periodCount: periods.length,
    periodsSample: periods.slice(0, 5).map((p) => ({
      personId: p.person_id,
      startAt: p.start_at.toISOString(),
      endAt: p.end_at.toISOString(),
    })),
    issues: {
      nullPatternTypes: rules.filter((r) => !r.pattern_type).length,
      nullWeekParity: rules.filter((r) => r.pattern_type === "weekly_alternating" && !r.week_parity)
        .length,
      inactiveRules: rules.filter((r) => !r.is_active).length,
      noPeriods: periods.length === 0,
    },
  }

  const downloadReport = () => {
    const json = JSON.stringify(report, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `recurrence-debug-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Recurrence Rules Diagnostic</h1>
        <button
          onClick={downloadReport}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Download JSON Report
        </button>
      </div>

      {/* Issues Summary */}
      {Object.values(report.issues).some((v) => v) && (
        <div className="border-2 border-red-300 bg-red-50 rounded p-4 space-y-2">
          <h2 className="text-lg font-bold text-red-900">⚠️ Issues Detected</h2>
          {report.issues.nullPatternTypes > 0 && (
            <p className="text-red-800">
              <strong>{report.issues.nullPatternTypes}</strong> rule(s) with NULL pattern_type
            </p>
          )}
          {report.issues.nullWeekParity > 0 && (
            <p className="text-red-800">
              <strong>{report.issues.nullWeekParity}</strong> weekly_alternating rule(s) with NULL
              week_parity
            </p>
          )}
          {report.issues.inactiveRules > 0 && (
            <p className="text-orange-800">
              <strong>{report.issues.inactiveRules}</strong> inactive rule(s)
            </p>
          )}
          {report.issues.noPeriods && (
            <p className="text-red-800">
              <strong>NO PERIODS GENERATED</strong> - Check pattern_type values above
            </p>
          )}
        </div>
      )}

      {/* Rules */}
      <section className="border rounded p-4 space-y-2">
        <h2 className="text-xl font-semibold">All Rules ({rules.length})</h2>
        <div className="space-y-4">
          {rules.length === 0 ? (
            <div className="text-slate-500">No rules found in database</div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="border rounded p-3 bg-slate-50 text-xs space-y-2 font-mono"
              >
                <div className="font-bold text-base text-slate-900">{rule.name}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <strong>ID:</strong> {rule.id.slice(0, 8)}...
                  </div>
                  <div>
                    <strong>Active:</strong>{" "}
                    <span className={rule.is_active ? "text-green-600 font-bold" : "text-red-600"}>
                      {String(rule.is_active)}
                    </span>
                  </div>
                  <div>
                    <strong>Pattern Type:</strong>{" "}
                    <span
                      className={
                        !rule.pattern_type
                          ? "bg-red-200 text-red-900 px-1 rounded"
                          : "bg-green-200 text-green-900 px-1 rounded"
                      }
                    >
                      {rule.pattern_type || "❌ NULL"}
                    </span>
                  </div>
                  <div>
                    <strong>Week Parity:</strong>{" "}
                    <span
                      className={
                        rule.pattern_type === "weekly_alternating" && !rule.week_parity
                          ? "bg-yellow-200 text-yellow-900 px-1 rounded"
                          : "bg-green-200 text-green-900 px-1 rounded"
                      }
                    >
                      {rule.week_parity || (rule.pattern_type === "weekly_alternating" ? "❌ NULL" : "N/A")}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <strong>Validity:</strong> {rule.starts_at?.slice(0, 10)} →{" "}
                    {rule.ends_at?.slice(0, 10) || "indefinite"}
                  </div>
                  <div className="col-span-2">
                    <strong>Times:</strong> {rule.custody_start_time} → {rule.custody_end_time}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Periods */}
      <section className="border rounded p-4 space-y-2">
        <h2 className="text-xl font-semibold">
          Generated Periods ({periods.length})
        </h2>
        {periods.length === 0 ? (
          <div className="text-red-600 font-bold bg-red-50 p-3 rounded">
            ❌ NO PERIODS GENERATED - Check rules above for NULL values
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-auto">
            {periods.slice(0, 20).map((p, i) => (
              <div key={i} className="text-xs bg-slate-50 p-2 rounded">
                {p.start_at.toLocaleDateString()} {p.start_at.toLocaleTimeString()} →{" "}
                {p.end_at.toLocaleDateString()} {p.end_at.toLocaleTimeString()}
              </div>
            ))}
            {periods.length > 20 && (
              <div className="text-xs text-slate-500 p-2">
                ... and {periods.length - 20} more periods
              </div>
            )}
          </div>
        )}
      </section>

      {/* JSON Report */}
      <section className="border rounded p-4 space-y-2">
        <h2 className="text-xl font-semibold">Full JSON Report</h2>
        <pre className="bg-slate-900 text-slate-100 p-4 rounded overflow-auto max-h-96 text-xs">
          {JSON.stringify(report, null, 2)}
        </pre>
      </section>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { addDays, format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import type { Person, RecurrenceRule } from "@/lib/types"
import { createRecurrenceRule, updateRecurrenceRule } from "@/lib/actions/recurrence"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, datetimeLocalToUTC } from "@/lib/utils"

const FULL_DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

interface RecurrenceRuleFormProps {
  persons: Person[]
  rule?: RecurrenceRule
  onSuccess?: () => void
}

export function RecurrenceRuleForm({ persons, rule, onSuccess }: RecurrenceRuleFormProps) {
  const adults = persons.filter((p) => !p.is_child)
  const [patternType, setPatternType] = useState<string>(rule?.pattern_type ?? "weekly_alternating")
  const [personId, setPersonId] = useState<string>(rule?.person_id ?? adults[0]?.id ?? "")
  const [cycleLengthDays, setCycleLengthDays] = useState(rule?.cycle_length_days ?? 14)
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    new Set(rule?.custody_days ?? [])
  )
  const [startsAt, setStartsAt] = useState(rule?.starts_at ? rule.starts_at.slice(0, 10) : "")
  const [handoffDay, setHandoffDay] = useState(String(rule?.handoff_day ?? 0))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCycleLengthChange(val: string) {
    const n = Math.max(2, Math.min(28, parseInt(val) || 14))
    setCycleLengthDays(n)
    setSelectedDays((prev) => new Set(Array.from(prev).filter((d) => d < n)))
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    const startsAt = formData.get("starts_at")
    if (startsAt && typeof startsAt === "string") {
      formData.set("starts_at", datetimeLocalToUTC(`${startsAt}T00:00:00`))
    }

    const endsAt = formData.get("ends_at")
    if (endsAt && typeof endsAt === "string") {
      formData.set("ends_at", datetimeLocalToUTC(`${endsAt}T00:00:00`))
    }

    startTransition(async () => {
      try {
        if (rule) {
          await updateRecurrenceRule(rule.id, formData)
        } else {
          await createRecurrenceRule(formData)
        }
        onSuccess?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      }
    })
  }

  const numWeeks = Math.ceil(cycleLengthDays / 7)
  const person = persons.find((p) => p.id === personId)
  const cycleStartDate = startsAt ? parseISO(startsAt) : null
  const dayLabels = Array.from({ length: 7 }, (_, d) =>
    cycleStartDate
      ? format(addDays(cycleStartDate, d), "EEE", { locale: fr })
      : ["Jour 0", "Jour 1", "Jour 2", "Jour 3", "Jour 4", "Jour 5", "Jour 6"][d]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Person */}
      <div className="space-y-2">
        <Label htmlFor="person_id">Personne</Label>
        <Select name="person_id" value={personId} onValueChange={setPersonId} required>
          <SelectTrigger id="person_id">
            <SelectValue placeholder="Choisir une personne" />
          </SelectTrigger>
          <SelectContent>
            {adults.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nom de la règle</Label>
        <Input
          id="name"
          name="name"
          defaultValue={rule?.name}
          placeholder="Ex: Garde alternée"
          required
        />
      </div>

      {/* Pattern type */}
      <div className="space-y-2">
        <Label htmlFor="pattern_type">Type de récurrence</Label>
        <Select name="pattern_type" value={patternType} onValueChange={setPatternType} required>
          <SelectTrigger id="pattern_type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly_alternating">1 semaine sur 2</SelectItem>
            <SelectItem value="custom_cycle">Cycle personnalisé (2+5, 3+4…)</SelectItem>
            <SelectItem value="manual">Manuel (date fixe)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Validity window */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="starts_at">Début de validité</Label>
          <Input
            id="starts_at"
            name="starts_at"
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ends_at">Fin de validité <span className="text-[var(--color-muted-foreground)] font-normal">(optionnel)</span></Label>
          <Input
            id="ends_at"
            name="ends_at"
            type="date"
            defaultValue={rule?.ends_at ? rule.ends_at.slice(0, 10) : ""}
          />
        </div>
      </div>

      {/* Custody times */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="custody_start_time">Heure début de garde</Label>
          <Input
            id="custody_start_time"
            name="custody_start_time"
            type="time"
            defaultValue={rule?.custody_start_time ?? "18:00"}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="custody_end_time">Heure fin de garde</Label>
          <Input
            id="custody_end_time"
            name="custody_end_time"
            type="time"
            defaultValue={rule?.custody_end_time ?? "18:00"}
            required
          />
        </div>
      </div>

      {/* weekly_alternating */}
      {patternType === "weekly_alternating" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="handoff_day">Jour de passation</Label>
            <Select name="handoff_day" value={handoffDay} onValueChange={setHandoffDay} required>
              <SelectTrigger id="handoff_day"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FULL_DAY_NAMES.map((name, i) => (
                  <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              La garde change de personne chaque semaine ce jour-là, à l&apos;heure de début de garde ci-dessus.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="week_parity">Parité de la semaine ISO</Label>
            <Select name="week_parity" defaultValue={rule?.week_parity ?? "odd"} required>
              <SelectTrigger id="week_parity"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="odd">Semaines impaires</SelectItem>
                <SelectItem value="even">Semaines paires</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Semaines ISO : la parité se calcule d&apos;après le numéro de semaine ISO de la semaine du jour de passation.
            </p>
          </div>
        </div>
      )}

      {/* custom_cycle */}
      {patternType === "custom_cycle" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="cycle_length_days">Durée du cycle (jours)</Label>
            <Input
              id="cycle_length_days"
              name="cycle_length_days"
              type="number"
              min={2}
              max={28}
              value={cycleLengthDays}
              onChange={(e) => handleCycleLengthChange(e.target.value)}
            />
          </div>

          {/* Visual day grid */}
          <div className="space-y-2">
            <Label>Jours de garde dans le cycle</Label>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Le jour 0 correspond au premier jour du cycle (= date de début ci-dessus).
              {!cycleStartDate && " Choisissez une date de début pour voir les jours de la semaine correspondants."}
            </p>
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] p-3">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left pb-2 pr-3 text-[var(--color-muted-foreground)] font-medium w-12" />
                    {dayLabels.map((d, i) => (
                      <th key={i} className="text-center pb-2 w-11 text-[var(--color-muted-foreground)] font-medium">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: numWeeks }, (_, w) => (
                    <tr key={w}>
                      <td className="pr-3 py-1 text-[var(--color-muted-foreground)] font-medium">S{w + 1}</td>
                      {Array.from({ length: 7 }, (_, d) => {
                        const dayIndex = w * 7 + d
                        if (dayIndex >= cycleLengthDays) {
                          return <td key={d} className="py-1 w-11" />
                        }
                        const checked = selectedDays.has(dayIndex)
                        return (
                          <td key={d} className="py-1 text-center">
                            <button
                              type="button"
                              onClick={() => toggleDay(dayIndex)}
                              aria-label={`Jour ${dayIndex} — ${dayLabels[d]}${checked ? ' (sélectionné)' : ''}`}
                              title={`Jour ${dayIndex} — ${dayLabels[d]}`}
                              className={cn(
                                "h-11 w-11 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                                checked
                                  ? "text-white"
                                  : "bg-[var(--color-accent)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
                              )}
                              style={checked ? { backgroundColor: person?.color ?? "#3b82f6" } : {}}
                            >
                              {d === 0 && w > 0 ? `+${w * 7}` : dayLabels[d].slice(0, 1)}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Sélectionnés : {Array.from(selectedDays).sort((a, b) => a - b).join(", ") || "aucun"}
            </p>
            <input
              type="hidden"
              name="custody_days"
              value={Array.from(selectedDays).sort((a, b) => a - b).join(",")}
            />
          </div>
        </>
      )}

      {/* Handoff location */}
      <div className="space-y-2">
        <Label htmlFor="handoff_location">Lieu de passation</Label>
        <Input
          id="handoff_location"
          name="handoff_location"
          defaultValue={rule?.handoff_location ?? ""}
          placeholder="École, Gare…"
        />
      </div>

      {error && (
        <div
          className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-[var(--color-destructive)]"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-[var(--color-destructive)] font-medium">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enregistrement…" : rule ? "Modifier" : "Créer la règle"}
      </Button>
    </form>
  )
}

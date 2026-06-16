"use client"

import { useState, useTransition } from "react"
import type { Person, RecurrenceRule } from "@/lib/types"
import { createRecurrenceRule, updateRecurrenceRule } from "@/lib/actions/recurrence"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface RecurrenceRuleFormProps {
  persons: Person[]
  rule?: RecurrenceRule
  onSuccess?: () => void
}

export function RecurrenceRuleForm({ persons, rule, onSuccess }: RecurrenceRuleFormProps) {
  const [patternType, setPatternType] = useState<string>(rule?.pattern_type ?? "weekly_alternating")
  const [personId, setPersonId] = useState<string>(rule?.person_id ?? persons[0]?.id ?? "")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Person */}
      <div className="space-y-2">
        <Label>Personne</Label>
        <Select name="person_id" value={personId} onValueChange={setPersonId} required>
          <SelectTrigger>
            <SelectValue placeholder="Choisir une personne" />
          </SelectTrigger>
          <SelectContent>
            {persons.map((p) => (
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
          placeholder="Ex: Garde alternée Damien"
          required
        />
      </div>

      {/* Pattern type */}
      <div className="space-y-2">
        <Label>Type de récurrence</Label>
        <Select name="pattern_type" value={patternType} onValueChange={setPatternType} required>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly_alternating">1 semaine sur 2</SelectItem>
            <SelectItem value="custom_cycle">Cycle personnalisé (3+4, 4+3…)</SelectItem>
            <SelectItem value="manual">Manuel (date fixe)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Start date */}
      <div className="space-y-2">
        <Label htmlFor="starts_at">Date de début</Label>
        <Input
          id="starts_at"
          name="starts_at"
          type="datetime-local"
          defaultValue={rule?.starts_at ? rule.starts_at.slice(0, 16) : ""}
          required
        />
      </div>

      {/* Custody times */}
      <div className="grid grid-cols-2 gap-3">
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

      {/* weekly_alternating fields */}
      {patternType === "weekly_alternating" && (
        <div className="space-y-2">
          <Label>Parité de la semaine ISO</Label>
          <Select name="week_parity" defaultValue={rule?.week_parity ?? "even"} required>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="even">Semaines paires</SelectItem>
              <SelectItem value="odd">Semaines impaires</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Semaines ISO : lundi = jour 1. La parité se calcule d'après le numéro de semaine ISO.
          </p>
        </div>
      )}

      {/* custom_cycle fields */}
      {patternType === "custom_cycle" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="cycle_length_days">Durée du cycle (jours)</Label>
            <Input
              id="cycle_length_days"
              name="cycle_length_days"
              type="number"
              min={2}
              max={30}
              defaultValue={rule?.cycle_length_days ?? 7}
              placeholder="Ex: 7 pour un cycle de 7 jours"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custody_days">Jours de garde dans le cycle</Label>
            <Input
              id="custody_days"
              name="custody_days"
              defaultValue={rule?.custody_days?.join(",") ?? "0,1,2"}
              placeholder="Ex: 0,1,2 = jours 0, 1 et 2 du cycle"
            />
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Indices des jours (0 = premier jour du cycle). Séparés par des virgules.
            </p>
          </div>
        </>
      )}

      {/* Handoff info (all types) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="handoff_time">Heure de changement</Label>
          <Input
            id="handoff_time"
            name="handoff_time"
            type="time"
            defaultValue={rule?.handoff_time ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="handoff_location">Lieu de changement</Label>
          <Input
            id="handoff_location"
            name="handoff_location"
            defaultValue={rule?.handoff_location ?? ""}
            placeholder="Ex: École, Gare…"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enregistrement…" : rule ? "Modifier" : "Créer la règle"}
      </Button>
    </form>
  )
}

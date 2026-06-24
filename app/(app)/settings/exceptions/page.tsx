"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  createRecurrenceException,
  updateRecurrenceException,
  deleteRecurrenceException,
} from "@/lib/actions/recurrence"
import type { RecurrenceException, RecurrenceRule, Person } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, ArrowLeft, AlertTriangle } from "lucide-react"
import { datetimeLocalToUTC, formatDatetimeLocal, indexById } from "@/lib/utils"
import { RECURRENCE_EXCEPTION_TYPE_LABELS } from "@/lib/recurrence/labels"
import { ExceptionDetail } from "@/components/custody/ExceptionDetail"
import { addYears } from "date-fns"

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<RecurrenceException[]>([])
  const [rules, setRules] = useState<RecurrenceRule[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editExc, setEditExc] = useState<RecurrenceException | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [excRes, rulesRes, persRes] = await Promise.all([
        supabase.from("recurrence_exceptions").select("*").order("created_at"),
        supabase.from("recurrence_rules").select("*"),
        supabase.from("persons").select("*"),
      ])
      setExceptions((excRes.data ?? []) as RecurrenceException[])
      setRules((rulesRes.data ?? []) as RecurrenceRule[])
      setPersons((persRes.data ?? []) as Person[])
    }
    load()
  }, [])

  const ruleById = indexById(rules)
  const personById = indexById(persons)

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteRecurrenceException(id)
      location.reload()
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <Link href="/settings">
        <Button variant="ghost" size="sm" className="gap-2 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Retour aux paramètres
        </Button>
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exceptions</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent closeOnOutsideClick={false} className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle exception</DialogTitle>
            </DialogHeader>
            <ExceptionForm
              rules={rules}
              exceptions={exceptions}
              onSuccess={() => {
                setCreateOpen(false)
                location.reload()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {exceptions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-[var(--color-muted-foreground)]">
            Aucune exception. Les gardes suivent les règles de récurrence.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exceptions.map((exc) => {
            const rule = ruleById[exc.recurrence_rule_id]
            const person = rule ? personById[rule.person_id] : undefined
            return (
              <Card key={exc.id}>
                <CardContent className="pt-4">
                  <ExceptionDetail
                    exception={exc}
                    rule={rule}
                    person={person}
                    actions={
                      <>
                        <Dialog
                          open={editExc?.id === exc.id}
                          onOpenChange={(o) => !o && setEditExc(null)}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditExc(exc)} aria-label="Modifier l'exception">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent closeOnOutsideClick={false} className="max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Modifier l&apos;exception</DialogTitle>
                            </DialogHeader>
                            <ExceptionForm
                              rules={rules}
                              exceptions={exceptions}
                              exception={exc}
                              onSuccess={() => {
                                setEditExc(null)
                                location.reload()
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-[var(--color-destructive)]"
                          disabled={isPending}
                          onClick={() => handleDelete(exc.id)}
                          aria-label="Supprimer l'exception"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    }
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface ExceptionFormProps {
  rules: RecurrenceRule[]
  exceptions: RecurrenceException[]
  exception?: RecurrenceException
  onSuccess?: () => void
}

function ExceptionForm({ rules, exceptions, exception, onSuccess }: ExceptionFormProps) {
  const [excType, setExcType] = useState<string>(exception?.type ?? "present")
  const [ruleId, setRuleId] = useState<string>(exception?.recurrence_rule_id ?? "")
  const [startAt, setStartAt] = useState<string>(
    exception?.start_at ? formatDatetimeLocal(exception.start_at) : ""
  )
  const [endAt, setEndAt] = useState<string>(
    exception?.end_at ? formatDatetimeLocal(exception.end_at) : ""
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const rule = rules.find((r) => r.id === ruleId)

  // The engine only ever considers exceptions inside the rule's own
  // generation window (starts_at..ends_at, or +2 years if open-ended —
  // see lib/recurrence/persist.ts). Outside of it, an exception is
  // silently ignored, so warn the user instead of letting it disappear
  // without explanation.
  let windowWarning: string | null = null
  if (rule && startAt && endAt) {
    const ruleStart = new Date(rule.starts_at)
    const ruleEnd = rule.ends_at ? new Date(rule.ends_at) : addYears(ruleStart, 2)
    const excStart = new Date(startAt)
    const excEnd = new Date(endAt)
    if (excEnd <= ruleStart || excStart >= ruleEnd) {
      windowWarning = "Cette plage est entièrement hors de la période couverte par la règle : l'exception n'aura aucun effet."
    }
  }

  // Overlap with another exception on the same rule is valid (the engine
  // handles it deterministically) but is easy to create by mistake, so
  // surface it instead of letting it pass silently.
  let overlapWarning: string | null = null
  if (ruleId && startAt && endAt) {
    const excStart = new Date(startAt)
    const excEnd = new Date(endAt)
    const overlapping = exceptions.some((other) => {
      if (other.id === exception?.id) return false
      if (other.recurrence_rule_id !== ruleId) return false
      return new Date(other.start_at) < excEnd && new Date(other.end_at) > excStart
    })
    if (overlapping) {
      overlapWarning = "Cette plage chevauche une autre exception existante pour cette règle."
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      setError("La date de fin doit être après la date de début.")
      return
    }

    const formData = new FormData(e.currentTarget)

    // Convert datetime-local values to UTC
    if (startAt && !startAt.includes("Z")) {
      formData.set("start_at", datetimeLocalToUTC(startAt))
    }
    if (endAt && !endAt.includes("Z")) {
      formData.set("end_at", datetimeLocalToUTC(endAt))
    }

    startTransition(async () => {
      try {
        if (exception) {
          await updateRecurrenceException(exception.id, formData)
        } else {
          await createRecurrenceException(formData)
        }
        onSuccess?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Règle concernée</Label>
        <Select name="recurrence_rule_id" value={ruleId} onValueChange={setRuleId} required>
          <SelectTrigger><SelectValue placeholder="Choisir une règle" /></SelectTrigger>
          <SelectContent>
            {rules.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Type d&apos;exception</Label>
        <Select name="type" value={excType} onValueChange={setExcType} required>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(RECURRENCE_EXCEPTION_TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="start_at">Début</Label>
          <Input
            id="start_at"
            name="start_at"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_at">Fin</Label>
          <Input
            id="end_at"
            name="end_at"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            required
          />
        </div>
      </div>

      {(windowWarning || overlapWarning) && (
        <div className="space-y-1.5 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {windowWarning && (
            <p className="flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              {windowWarning}
            </p>
          )}
          {overlapWarning && (
            <p className="flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              {overlapWarning}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Raison</Label>
        <Input
          id="reason"
          name="reason"
          defaultValue={exception?.reason ?? ""}
          placeholder="Vacances, accord ponctuel…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={exception?.notes ?? ""} rows={2} />
      </div>

      {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enregistrement…" : exception ? "Modifier" : "Créer l'exception"}
      </Button>
    </form>
  )
}

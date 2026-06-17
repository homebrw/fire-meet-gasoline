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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { datetimeLocalToUTC, formatDatetimeLocal } from "@/lib/utils"

const TYPE_LABELS: Record<string, string> = {
  cancel: "Annulation",
  move: "Déplacement",
  extend: "Prolongation",
  shorten: "Réduction",
  add: "Ajout",
}

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

  const ruleById = Object.fromEntries(rules.map((r) => [r.id, r]))
  const personById = Object.fromEntries(persons.map((p) => [p.id, p]))

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
              persons={persons}
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
            const person = personById[exc.person_id]
            return (
              <Card key={exc.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{TYPE_LABELS[exc.type]}</Badge>
                      <span className="text-[var(--color-muted-foreground)]">
                        {rule?.name ?? "Règle inconnue"} — {person?.name ?? "?"}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
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
                            persons={persons}
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
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-[var(--color-muted-foreground)] space-y-0.5">
                    {exc.original_start_at && (
                      <p>Période originale : {format(parseISO(exc.original_start_at), "d MMM yyyy HH:mm", { locale: fr })}</p>
                    )}
                    {exc.override_start_at && (
                      <p>Période : {format(parseISO(exc.override_start_at), "d MMM yyyy HH:mm", { locale: fr })}</p>
                    )}
                    {exc.reason && <p>Raison : {exc.reason}</p>}
                  </div>
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
  persons: Person[]
  exception?: RecurrenceException
  onSuccess?: () => void
}

function ExceptionForm({ rules, persons, exception, onSuccess }: ExceptionFormProps) {
  const [excType, setExcType] = useState<string>(exception?.type ?? "cancel")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    // Convert datetime-local values to UTC
    const originalStartAt = formData.get("original_start_at")
    if (originalStartAt && typeof originalStartAt === "string" && originalStartAt && !originalStartAt.includes("Z")) {
      formData.set("original_start_at", datetimeLocalToUTC(originalStartAt))
    }
    const overrideStartAt = formData.get("override_start_at")
    if (overrideStartAt && typeof overrideStartAt === "string" && overrideStartAt && !overrideStartAt.includes("Z")) {
      formData.set("override_start_at", datetimeLocalToUTC(overrideStartAt))
    }
    const overrideEndAt = formData.get("override_end_at")
    if (overrideEndAt && typeof overrideEndAt === "string" && overrideEndAt && !overrideEndAt.includes("Z")) {
      formData.set("override_end_at", datetimeLocalToUTC(overrideEndAt))
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
        <Select name="recurrence_rule_id" defaultValue={exception?.recurrence_rule_id ?? ""} required>
          <SelectTrigger><SelectValue placeholder="Choisir une règle" /></SelectTrigger>
          <SelectContent>
            {rules.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Personne</Label>
        <Select name="person_id" defaultValue={exception?.person_id ?? ""} required>
          <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
          <SelectContent>
            {persons.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Type d&apos;exception</Label>
        <Select name="type" value={excType} onValueChange={setExcType} required>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="original_start_at">Date originale à modifier</Label>
        <Input
          id="original_start_at"
          name="original_start_at"
          type="datetime-local"
          defaultValue={exception?.original_start_at ? formatDatetimeLocal(exception.original_start_at) : ""}
        />
      </div>

      {(excType === "move" || excType === "extend" || excType === "shorten" || excType === "add") && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="override_start_at">Début</Label>
            <Input
              id="override_start_at"
              name="override_start_at"
              type="datetime-local"
              defaultValue={exception?.override_start_at ? formatDatetimeLocal(exception.override_start_at) : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="override_end_at">Fin</Label>
            <Input
              id="override_end_at"
              name="override_end_at"
              type="datetime-local"
              defaultValue={exception?.override_end_at ? formatDatetimeLocal(exception.override_end_at) : ""}
            />
          </div>
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enregistrement…" : exception ? "Modifier" : "Créer l'exception"}
      </Button>
    </form>
  )
}

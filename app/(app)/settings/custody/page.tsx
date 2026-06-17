"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  createChildPresence, deleteChildPresence,
  createCustodyTransition, deleteCustodyTransition,
} from "@/lib/actions/custody"
import type { ChildPresence, CustodyTransition, Person, RecurrenceRule } from "@/lib/types"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, ArrowLeft, Lock } from "lucide-react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

export default function CustodyPage() {
  const [presences, setPresences] = useState<ChildPresence[]>([])
  const [transitions, setTransitions] = useState<CustodyTransition[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [rules, setRules] = useState<RecurrenceRule[]>([])
  const [presenceOpen, setPresenceOpen] = useState(false)
  const [transitionOpen, setTransitionOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [presRes, transRes, persRes, rulesRes] = await Promise.all([
        supabase.from("child_presences").select("*").order("start_at"),
        supabase.from("custody_transitions").select("*").order("transition_at"),
        supabase.from("persons").select("*"),
        supabase.from("recurrence_rules").select("*"),
      ])
      setPresences((presRes.data ?? []) as ChildPresence[])
      setTransitions((transRes.data ?? []) as CustodyTransition[])
      setPersons((persRes.data ?? []) as Person[])
      setRules((rulesRes.data ?? []) as RecurrenceRule[])
    }
    load()
  }, [])
  const personById = Object.fromEntries(persons.map((p) => [p.id, p]))
  const ruleById = Object.fromEntries(rules.map((r) => [r.id, r]))

  const generatedPresences = presences.filter((p) => p.recurrence_rule_id !== null)
  const manualPresences = presences.filter((p) => p.recurrence_rule_id === null)
  const generatedTransitions = transitions.filter((t) => t.recurrence_rule_id !== null)
  const manualTransitions = transitions.filter((t) => t.recurrence_rule_id === null)

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <Link href="/settings">
        <Button variant="ghost" size="sm" className="gap-2 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Retour aux paramètres
        </Button>
      </Link>

      <h1 className="text-2xl font-bold">Gardes et changements</h1>

      <Tabs defaultValue="presences">
        <TabsList className="w-full">
          <TabsTrigger value="presences" className="flex-1">Périodes de garde</TabsTrigger>
          <TabsTrigger value="transitions" className="flex-1">Changements</TabsTrigger>
        </TabsList>

        <TabsContent value="presences" className="space-y-3 mt-4">
          {generatedPresences.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)]">Périodes générées par les règles</h3>
              </div>
              {generatedPresences.map((p) => {
                const person = personById[p.person_id]
                const rule = p.recurrence_rule_id ? ruleById[p.recurrence_rule_id] : null
                return (
                  <Card key={p.id} className="opacity-75">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: person?.color }} />
                          {person?.name}
                        </div>
                        {rule && <span className="text-xs text-[var(--color-muted-foreground)]">{rule.name}</span>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {format(parseISO(p.start_at), "d MMM yyyy HH:mm", { locale: fr })} →{" "}
                        {format(parseISO(p.end_at), "d MMM yyyy HH:mm", { locale: fr })}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <div className="flex justify-end">
            <Dialog open={presenceOpen} onOpenChange={setPresenceOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />Ajouter une garde manuelle</Button>
              </DialogTrigger>
              <DialogContent closeOnOutsideClick={false} className="max-w-md">
                <DialogHeader><DialogTitle>Nouvelle période de garde manuelle</DialogTitle></DialogHeader>
                <PresenceForm
                  persons={persons}
                  onSuccess={() => {
                    setPresenceOpen(false)
                    location.reload()
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {manualPresences.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-[var(--color-muted-foreground)] text-sm">
              Aucune garde manuelle
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Périodes manuelles</h3>
              {manualPresences.map((p) => {
                const person = personById[p.person_id]
                return (
                  <Card key={p.id}>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: person?.color }} />
                          {person?.name}
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="text-[var(--color-destructive)]"
                          disabled={isPending}
                          onClick={() => startTransition(async () => { await deleteChildPresence(p.id); location.reload() })}
                          aria-label="Supprimer la période de garde"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {format(parseISO(p.start_at), "d MMM yyyy HH:mm", { locale: fr })} →{" "}
                        {format(parseISO(p.end_at), "d MMM yyyy HH:mm", { locale: fr })}
                      </p>
                      {p.notes && <p className="text-xs">{p.notes}</p>}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transitions" className="space-y-3 mt-4">
          {generatedTransitions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)]">Changements générés par les règles</h3>
              </div>
              {generatedTransitions.map((t) => {
                const person = personById[t.person_id]
                const rule = t.recurrence_rule_id ? ruleById[t.recurrence_rule_id] : null
                return (
                  <Card key={t.id} className="opacity-75">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                          {person?.name} — {t.direction === "pickup" ? "Récupération" : "Dépôt"}
                        </div>
                        {rule && <span className="text-xs text-[var(--color-muted-foreground)]">{rule.name}</span>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {format(parseISO(t.transition_at), "EEEE d MMM yyyy à HH:mm", { locale: fr })}
                        {t.location && ` — ${t.location}`}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <div className="flex justify-end">
            <Dialog open={transitionOpen} onOpenChange={setTransitionOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />Ajouter un changement manuel</Button>
              </DialogTrigger>
              <DialogContent closeOnOutsideClick={false} className="max-w-md">
                <DialogHeader><DialogTitle>Nouveau changement de garde manuel</DialogTitle></DialogHeader>
                <TransitionForm
                  persons={persons}
                  onSuccess={() => {
                    setTransitionOpen(false)
                    location.reload()
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {manualTransitions.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-[var(--color-muted-foreground)] text-sm">
              Aucun changement manuel
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Changements manuels</h3>
              {manualTransitions.map((t) => {
                const person = personById[t.person_id]
                return (
                  <Card key={t.id}>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                          {person?.name} — {t.direction === "pickup" ? "Récupération" : "Dépôt"}
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="text-[var(--color-destructive)]"
                          disabled={isPending}
                          onClick={() => startTransition(async () => { await deleteCustodyTransition(t.id); location.reload() })}
                          aria-label="Supprimer le changement de garde"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {format(parseISO(t.transition_at), "EEEE d MMM yyyy à HH:mm", { locale: fr })}
                        {t.location && ` — ${t.location}`}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PresenceForm({ persons, onSuccess }: { persons: Person[]; onSuccess: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createChildPresence(formData)
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Personne</Label>
        <Select name="person_id" required>
          <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
          <SelectContent>
            {persons.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="start_at">Début</Label>
          <Input id="start_at" name="start_at" type="datetime-local" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_at">Fin</Label>
          <Input id="end_at" name="end_at" type="datetime-local" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Optionnel" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "…" : "Créer"}
      </Button>
    </form>
  )
}

function TransitionForm({ persons, onSuccess }: { persons: Person[]; onSuccess: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createCustodyTransition(formData)
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Personne</Label>
        <Select name="person_id" required>
          <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
          <SelectContent>
            {persons.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="transition_at">Date et heure</Label>
        <Input id="transition_at" name="transition_at" type="datetime-local" required />
      </div>
      <div className="space-y-2">
        <Label>Direction</Label>
        <Select name="direction" required>
          <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pickup">Récupération</SelectItem>
            <SelectItem value="dropoff">Dépôt</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Lieu</Label>
        <Input id="location" name="location" placeholder="Ex: École, Gare…" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "…" : "Créer"}
      </Button>
    </form>
  )
}

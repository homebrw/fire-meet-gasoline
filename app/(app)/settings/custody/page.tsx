"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  createChildPresence, deleteChildPresence,
  createCustodyTransition, deleteCustodyTransition,
} from "@/lib/actions/custody"
import type { ChildPresence, CustodyTransition, Person } from "@/lib/types"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

export default function CustodyPage() {
  const [presences, setPresences] = useState<ChildPresence[]>([])
  const [transitions, setTransitions] = useState<CustodyTransition[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [presenceOpen, setPresenceOpen] = useState(false)
  const [transitionOpen, setTransitionOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function load() {
    const supabase = createClient()
    const [presRes, transRes, persRes] = await Promise.all([
      supabase.from("child_presences").select("*").order("start_at"),
      supabase.from("custody_transitions").select("*").order("transition_at"),
      supabase.from("persons").select("*"),
    ])
    setPresences((presRes.data ?? []) as ChildPresence[])
    setTransitions((transRes.data ?? []) as CustodyTransition[])
    setPersons((persRes.data ?? []) as Person[])
  }

  useEffect(() => { load() }, [])
  const personById = Object.fromEntries(persons.map((p) => [p.id, p]))

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Gardes et changements</h1>

      <Tabs defaultValue="presences">
        <TabsList className="w-full">
          <TabsTrigger value="presences" className="flex-1">Périodes de garde</TabsTrigger>
          <TabsTrigger value="transitions" className="flex-1">Changements</TabsTrigger>
        </TabsList>

        <TabsContent value="presences" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Dialog open={presenceOpen} onOpenChange={setPresenceOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />Ajouter une garde</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Nouvelle période de garde</DialogTitle></DialogHeader>
                <PresenceForm
                  persons={persons}
                  onSuccess={() => { setPresenceOpen(false); load() }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {presences.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-[var(--color-muted-foreground)] text-sm">
              Aucune garde manuelle
            </CardContent></Card>
          ) : (
            presences.map((p) => {
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
                        onClick={() => startTransition(async () => { await deleteChildPresence(p.id); load() })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {format(parseISO(p.start_at), "d MMM yyyy HH:mm", { locale: fr })} →{" "}
                      {format(parseISO(p.end_at), "d MMM yyyy HH:mm", { locale: fr })}
                    </p>
                    {p.notes && <p className="text-xs mt-1">{p.notes}</p>}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="transitions" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Dialog open={transitionOpen} onOpenChange={setTransitionOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />Ajouter un changement</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Nouveau changement de garde</DialogTitle></DialogHeader>
                <TransitionForm
                  persons={persons}
                  onSuccess={() => { setTransitionOpen(false); load() }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {transitions.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-[var(--color-muted-foreground)] text-sm">
              Aucun changement de garde
            </CardContent></Card>
          ) : (
            transitions.map((t) => {
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
                        onClick={() => startTransition(async () => { await deleteCustodyTransition(t.id); load() })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
            })
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

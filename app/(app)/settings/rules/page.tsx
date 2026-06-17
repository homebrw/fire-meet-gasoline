"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { RecurrenceRuleForm } from "@/components/forms/RecurrenceRuleForm"
import { deleteRecurrenceRule } from "@/lib/actions/recurrence"
import type { Person, RecurrenceRule } from "@/lib/types"
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
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react"
import { useTransition } from "react"

export default function RulesPage() {
  const [rules, setRules] = useState<RecurrenceRule[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [editRule, setEditRule] = useState<RecurrenceRule | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [rulesRes, personsRes] = await Promise.all([
        supabase.from("recurrence_rules").select("*").order("created_at"),
        supabase.from("persons").select("*"),
      ])
      setRules((rulesRes.data ?? []) as RecurrenceRule[])
      setPersons((personsRes.data ?? []) as Person[])
    }
    load()
  }, [])

  const personById = Object.fromEntries(persons.map((p) => [p.id, p]))

  const patternLabels = {
    weekly_alternating: "1 sem. / 2",
    custom_cycle: "Cycle personnalisé",
    manual: "Manuel",
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteRecurrenceRule(id)
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
        <h1 className="text-2xl font-bold">Règles de récurrence</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent closeOnOutsideClick={false} className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle règle de garde</DialogTitle>
            </DialogHeader>
            <RecurrenceRuleForm
              persons={persons}
              onSuccess={() => {
                setCreateOpen(false)
                location.reload()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-[var(--color-muted-foreground)]">
            Aucune règle de récurrence. Créez-en une pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const person = personById[rule.person_id]
            return (
              <Card key={rule.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: person?.color ?? 'var(--color-muted)' }}
                      />
                      {rule.name}
                    </div>
                    <div className="flex gap-1">
                      <Dialog
                        open={editRule?.id === rule.id}
                        onOpenChange={(o) => !o && setEditRule(null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setEditRule(rule)} aria-label="Modifier la règle">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent closeOnOutsideClick={false} className="max-w-lg max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Modifier la règle</DialogTitle>
                          </DialogHeader>
                          <RecurrenceRuleForm
                            persons={persons}
                            rule={rule}
                            onSuccess={() => {
                              setEditRule(null)
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
                        onClick={() => handleDelete(rule.id)}
                        aria-label="Supprimer la règle"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-xs text-[var(--color-muted-foreground)]">
                    <Badge variant="secondary">{person?.name ?? "?"}</Badge>
                    <Badge variant="outline">{patternLabels[rule.pattern_type]}</Badge>
                    {rule.pattern_type === "weekly_alternating" && rule.week_parity && (
                      <Badge variant="outline">
                        Sem. {rule.week_parity === "even" ? "paires" : "impaires"}
                      </Badge>
                    )}
                    {rule.pattern_type === "custom_cycle" && (
                      <Badge variant="outline">
                        Cycle {rule.cycle_length_days}j — jours {rule.custody_days?.join(",")}
                      </Badge>
                    )}
                    <Badge variant={rule.is_active ? "available" : "outline"}>
                      {rule.is_active ? "Active" : "Inactive"}
                    </Badge>
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

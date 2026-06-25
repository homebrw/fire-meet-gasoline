"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

export function GettingStartedHelp() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[var(--color-available)]" />
            Commencer en 3 étapes
          </CardTitle>
          <CardDescription>
            Configurez votre planning de garde familial en quelques minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-damien)] text-white text-xs font-semibold flex-shrink-0">
                1
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">Ajoutez vos enfants</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Allez dans Paramètres → Enfants. Chaque enfant aura une couleur unique.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-ma)] text-white text-xs font-semibold flex-shrink-0">
                2
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">Créez vos règles de garde</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Allez dans Paramètres → Règles de garde. Définissez qui a les enfants chaque semaine.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-both-kids)] text-white text-xs font-semibold flex-shrink-0">
                3
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">Consultez votre calendrier</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Retournez à Aujourd'hui ou Semaine pour voir votre planning.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions fréquentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-1">Que faire pour un échange de semaines?</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Utilisez Paramètres → Exceptions pour modifier la semaine exceptionnellement.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Comment synchroniser avec Google Agenda?</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Allez dans Paramètres → Synchronisation et connectez votre Google Agenda.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Où voir les heures de changement?</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Ajoutez-les dans Paramètres → Gardes manuelles avec l'heure et le lieu.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

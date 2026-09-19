"use client"

import { useState } from "react"
import { Copy, Check, RefreshCw } from "lucide-react"
import { Person } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { deleteChild, regenerateChildPairingCode } from "@/lib/actions/children"
import { ChildEditDialog } from "./child-edit-dialog"

export function ChildCard({ child }: { child: Person }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!child.pairing_code) return
    try {
      await navigator.clipboard.writeText(child.pairing_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error("Error copying pairing code:", error)
    }
  }

  const handleRegenerate = async () => {
    if (
      !confirm(
        "Régénérer le code ? L'ancien code ne fonctionnera plus pour un nouvel appairage, mais les appareils Checkmate déjà appairés continueront de fonctionner."
      )
    ) {
      return
    }

    setRegenerating(true)
    try {
      await regenerateChildPairingCode(child.id)
    } catch (error) {
      console.error("Error regenerating pairing code:", error)
      alert("Erreur lors de la régénération du code")
    } finally {
      setRegenerating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet enfant?")) {
      return
    }

    setDeleting(true)
    try {
      await deleteChild(child.id)
    } catch (error) {
      console.error("Error deleting child:", error)
      alert("Erreur lors de la suppression")
    } finally {
      setDeleting(false)
    }
  }

  const birthDate = child.date_of_birth
    ? new Date(child.date_of_birth).toLocaleDateString("fr-FR")
    : "Non défini"

  return (
    <>
      <Card className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="h-10 w-10 rounded-full"
              style={{ backgroundColor: child.color }}
              title={child.name}
            />
            <div>
              <p className="font-medium text-[var(--color-foreground)]">
                {child.name}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Né le {birthDate}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
            >
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-[var(--color-destructive)] hover:opacity-80"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "..." : "Supprimer"}
            </Button>
          </div>
        </div>

        {child.is_child && (
          <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[var(--color-muted-foreground)]">
                Code d&apos;appairage&nbsp;:
              </span>
              <code className="rounded-md bg-[var(--color-accent)] px-2 py-1 font-mono text-sm font-semibold tracking-widest text-[var(--color-foreground)]">
                {child.pairing_code ?? "…"}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopy}
                disabled={!child.pairing_code}
                aria-label="Copier le code d'appairage"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
                Régénérer
              </Button>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Ce code sert à relier {child.name} à l&apos;application de tâches Checkmate ;
              il se recopie dans Checkmate au moment de créer ou modifier l&apos;enfant.
            </p>
          </div>
        )}
      </Card>

      <ChildEditDialog
        child={child}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

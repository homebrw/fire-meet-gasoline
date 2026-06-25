"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Person } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HelpIcon } from "@/components/ui/help-icon"
import { FORM_HELP_TEXT } from "@/lib/form-help-text"
import { createChild, updateChild } from "@/lib/actions/children"

interface ChildFormProps {
  child?: Person
  onSuccess: () => void
}

export function ChildForm({ child, onSuccess }: ChildFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const isEdit = !!child

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const dateOfBirth = formData.get("dateOfBirth") as string

    try {
      if (isEdit) {
        await updateChild(child.id, {
          firstName,
          lastName,
          dateOfBirth: dateOfBirth || undefined,
        })
      } else {
        await createChild({
          firstName,
          lastName,
          dateOfBirth: dateOfBirth || undefined,
        })
      }
      router.refresh()
      onSuccess()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue"
      )
    } finally {
      setLoading(false)
    }
  }

  const [firstName, lastName] = child
    ? (() => {
        const parts = child.name.split(" ")
        return [parts[0], parts.slice(1).join(" ")] as const
      })()
    : ["", ""]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)] p-3 text-sm text-[var(--color-destructive)]" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <div>
        <div className="flex items-center gap-1">
          <Label htmlFor="firstName">Prénom</Label>
          <HelpIcon content={FORM_HELP_TEXT.children.name} />
        </div>
        <Input
          id="firstName"
          name="firstName"
          defaultValue={firstName}
          required
          placeholder="Prénom"
        />
      </div>

      <div>
        <div className="flex items-center gap-1">
          <Label htmlFor="lastName">Nom de famille</Label>
          <HelpIcon content={FORM_HELP_TEXT.children.name} />
        </div>
        <Input
          id="lastName"
          name="lastName"
          defaultValue={lastName}
          required
          placeholder="Nom de famille"
        />
      </div>

      <div>
        <div className="flex items-center gap-1">
          <Label htmlFor="dateOfBirth">Date de naissance</Label>
          <HelpIcon content={FORM_HELP_TEXT.children.dateOfBirth} />
        </div>
        <Input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          defaultValue={child?.date_of_birth || ""}
          placeholder="JJ/MM/AAAA"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "..." : isEdit ? "Mettre à jour" : "Créer"}
        </Button>
      </div>
    </form>
  )
}

"use client"

import { useState } from "react"
import { Person } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChangeBadge } from "@/components/ui/change-badge"
import { ItemTimestamp } from "@/components/ui/item-timestamp"
import { deleteChild } from "@/lib/actions/children"
import { ChildEditDialog } from "./child-edit-dialog"

export function ChildCard({ child }: { child: Person }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      <Card className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div
            className="h-10 w-10 rounded-full"
            style={{ backgroundColor: child.color }}
            title={child.name}
          />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-50">
              {child.name}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Né le {birthDate}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <ChangeBadge createdAt={child.created_at} updatedAt={child.updated_at} />
              <ItemTimestamp createdAt={child.created_at} />
            </div>
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
            className="text-red-600 hover:text-red-700"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "..." : "Supprimer"}
          </Button>
        </div>
      </Card>

      <ChildEditDialog
        child={child}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

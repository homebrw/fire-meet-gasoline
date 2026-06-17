"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChildForm } from "./child-form"

export function CreateChildButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Ajouter un enfant</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeOnOutsideClick={false}>
          <DialogHeader>
            <DialogTitle>Créer un enfant</DialogTitle>
          </DialogHeader>
          <ChildForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

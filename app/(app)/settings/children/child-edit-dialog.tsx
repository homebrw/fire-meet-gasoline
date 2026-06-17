"use client"

import { useState } from "react"
import { Person } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChildForm } from "./child-form"

interface ChildEditDialogProps {
  child: Person
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChildEditDialog({
  child,
  open,
  onOpenChange,
}: ChildEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier {child.name}</DialogTitle>
        </DialogHeader>
        <ChildForm
          child={child}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

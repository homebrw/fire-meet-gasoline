"use client"

import { EventAttachment } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { FileIcon, Trash2 } from "lucide-react"

interface EventAttachmentsListProps {
  attachments: EventAttachment[]
  canDelete?: boolean
  onDelete?: (attachmentId: string, storagePath: string) => Promise<void>
}

export function EventAttachmentsList({
  attachments,
  canDelete = false,
  onDelete,
}: EventAttachmentsListProps) {
  const handleDelete = async (id: string, path: string) => {
    if (!canDelete) return
    if (!confirm("Supprimer cette pièce jointe?")) return

    try {
      await onDelete?.(id, path)
    } catch (error) {
      console.error("Error deleting attachment:", error)
      alert("Erreur lors de la suppression")
    }
  }

  const getDownloadUrl = (storagePath: string) => {
    const encodedPath = storagePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")
    return `/api/attachments/download/${encodedPath}`
  }

  if (attachments.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[var(--color-foreground)]">
        Pièces jointes ({attachments.length})
      </p>
      <div className="space-y-1">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between rounded-lg bg-[var(--color-secondary-surface)] p-2 text-xs dark:bg-[var(--color-secondary-surface)]"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileIcon className="h-4 w-4 flex-shrink-0 text-[var(--color-muted-foreground)]" />
              <a
                href={getDownloadUrl(attachment.storage_path)}
                download={attachment.file_name}
                className="truncate text-[var(--color-primary)] hover:underline"
                title={attachment.file_name}
              >
                {attachment.file_name}
              </a>
              {attachment.file_size && (
                <span className="text-[var(--color-muted-foreground)] flex-shrink-0">
                  ({(attachment.file_size / 1024 / 1024).toFixed(1)} MB)
                </span>
              )}
            </div>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 -m-2.5 text-[var(--color-destructive)] hover:opacity-80"
                onClick={() => handleDelete(attachment.id, attachment.storage_path)}
                aria-label="Supprimer la pièce jointe"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

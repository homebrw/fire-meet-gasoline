"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { EventAttachment } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { FileIcon, Download, Trash2 } from "lucide-react"

interface EventAttachmentsListProps {
  eventId: string
  canDelete?: boolean
  onDelete?: (attachmentId: string, storagePath: string) => Promise<void>
}

export function EventAttachmentsList({
  eventId,
  canDelete = false,
  onDelete,
}: EventAttachmentsListProps) {
  const [attachments, setAttachments] = useState<EventAttachment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAttachments() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("event_attachments")
          .select("*")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false })

        if (error) throw error
        setAttachments((data || []) as EventAttachment[])
      } catch (error) {
        console.error("Error loading attachments:", error)
      } finally {
        setLoading(false)
      }
    }

    loadAttachments()
  }, [eventId])

  const handleDelete = async (id: string, path: string) => {
    if (!canDelete) return
    if (!confirm("Supprimer cette pièce jointe?")) return

    try {
      await onDelete?.(id, path)
      setAttachments((prev) => prev.filter((a) => a.id !== id))
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

  if (loading) {
    return <div className="text-xs text-gray-500">Chargement...</div>
  }

  if (attachments.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Pièces jointes ({attachments.length})
      </p>
      <div className="space-y-1">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-xs dark:bg-gray-800"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <a
                href={getDownloadUrl(attachment.storage_path)}
                download={attachment.file_name}
                className="truncate text-blue-600 hover:underline dark:text-blue-400"
                title={attachment.file_name}
              >
                {attachment.file_name}
              </a>
              {attachment.file_size && (
                <span className="text-gray-500 flex-shrink-0">
                  ({(attachment.file_size / 1024 / 1024).toFixed(1)} MB)
                </span>
              )}
            </div>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-600 hover:text-red-700"
                onClick={() => handleDelete(attachment.id, attachment.storage_path)}
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

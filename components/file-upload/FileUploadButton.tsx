"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Loader2 } from "lucide-react"

interface FileUploadButtonProps {
  eventId: string
  personId: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function FileUploadButton({
  eventId,
  personId,
  onSuccess,
  onError,
}: FileUploadButtonProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("event_id", eventId)
      formData.append("person_id", personId)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }

      onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed"
      onError?.(message)
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.currentTarget.files
    if (!files || files.length === 0) return

    const file = files[0]
    await handleUpload(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Envoi...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Ajouter PJ
          </>
        )}
      </Button>
    </>
  )
}

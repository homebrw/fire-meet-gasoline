"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Download, Eye, type LucideIcon } from "lucide-react"

export type DownloadFileKind = "pdf" | "image" | "spreadsheet"

interface DownloadFileCardProps {
  href: string
  icon: LucideIcon
  title: string
  description: string
  kind: DownloadFileKind
}

export function DownloadFileCard({ href, icon: Icon, title, description, kind }: DownloadFileCardProps) {
  const canPreview = kind === "pdf" || kind === "image"

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CardDescription>{description}</CardDescription>
        <div className="flex flex-wrap gap-2">
          {canPreview && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Aperçu
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-[var(--color-border)]">
                  {kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={href} alt={title} className="w-full h-auto" />
                  ) : (
                    <iframe src={href} title={title} className="w-full h-[75vh]" />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
          <a href={href} download>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

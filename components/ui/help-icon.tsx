"use client"

import * as React from "react"
import { HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface HelpIconProps {
  content: React.ReactNode
  className?: string
}

export function HelpIcon({ content, className }: HelpIconProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary-surface)] hover:text-[var(--color-foreground)] transition-colors",
              className
            )}
            type="button"
            aria-label="Help"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs text-sm">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, AlertTriangle, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToastProps {
  message: string
  type?: "success" | "error" | "info"
  onClose?: () => void
  autoCloseDuration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export function Toast({
  message,
  type = "info",
  onClose,
  autoCloseDuration = 4000,
  action,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoCloseDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, autoCloseDuration)
      return () => clearTimeout(timer)
    }
  }, [autoCloseDuration, onClose])

  if (!isVisible) return null

  const colorMap = {
    success: {
      bg: "bg-[var(--color-available-light)]",
      border: "border-[var(--color-available)]",
      text: "text-[var(--color-available-badge-text)]",
      icon: Check,
    },
    error: {
      bg: "bg-red-50 dark:bg-red-950",
      border: "border-[var(--color-destructive)]",
      text: "text-[var(--color-destructive)]",
      icon: AlertTriangle,
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-950",
      border: "border-blue-300 dark:border-blue-700",
      text: "text-blue-700 dark:text-blue-300",
      icon: AlertTriangle,
    },
  }

  const config = colorMap[type]
  const IconComponent = config.icon

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 max-w-sm border rounded-lg p-4 flex items-start gap-3 shadow-lg z-50",
        config.bg,
        config.border,
        config.text
      )}
      role="alert"
    >
      <IconComponent className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm font-medium">{message}</div>
      <div className="flex gap-2 flex-shrink-0">
        {action && (
          <Button
            size="sm"
            variant="ghost"
            onClick={action.onClick}
            className="text-xs"
          >
            {action.label}
          </Button>
        )}
        <button
          onClick={() => {
            setIsVisible(false)
            onClose?.()
          }}
          className="text-current opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
        secondary: "border-transparent bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]",
        destructive: "border-transparent bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)]",
        outline: "text-[var(--color-foreground)]",
        damien: "border-transparent bg-[var(--color-damien-badge-bg)] text-[var(--color-damien-badge-text)]",
        ma: "border-transparent bg-[var(--color-ma-badge-bg)] text-[var(--color-ma-badge-text)]",
        available: "border-transparent bg-[var(--color-available-badge-bg)] text-[var(--color-available-badge-text)]",
        transition: "border-transparent bg-[var(--color-transition-badge-bg)] text-[var(--color-transition-badge-text)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

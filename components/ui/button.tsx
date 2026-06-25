"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 disabled:hover:opacity-50",
        destructive: "bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] hover:opacity-90 disabled:hover:opacity-50",
        outline: "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)] disabled:hover:bg-transparent",
        secondary: "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:opacity-80 disabled:hover:opacity-50",
        ghost: "hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)] disabled:hover:bg-transparent",
        link: "text-[var(--color-primary)] underline-offset-4 hover:underline disabled:hover:no-underline",
      },
      size: {
        default: "h-10 px-4 py-2 md:h-10",
        sm: "h-9 rounded-md px-3 text-xs md:h-9",
        lg: "h-11 rounded-md px-8 md:h-11",
        icon: "h-10 w-10 md:h-10",
        mobile: "h-11 px-4 py-2 md:h-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

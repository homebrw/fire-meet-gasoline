"use client"

import Link, { useLinkStatus } from "next/link"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

/**
 * Lien de navigation avec retour visible tant que Next charge la destination.
 *
 * Même principe que Check Mate : le feedback de pression répond immédiatement
 * au toucher, puis useLinkStatus garde un signal sur le lien réellement
 * activé jusqu'à la fin de la navigation.
 */
export function NavigationLink({
  className,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link {...props} className={cn("press-feedback relative", className)}>
      {children}
      <NavigationLamp />
    </Link>
  )
}

function NavigationLamp() {
  const { pending } = useLinkStatus()
  if (!pending) return null

  return (
    <>
      <span
        data-pending
        aria-hidden
        className="route-loading-indicator pointer-events-none absolute inset-x-0 top-0 h-[3px] overflow-hidden"
      >
        <span className="route-loading-indicator-bar block h-full w-1/2 rounded-full bg-[var(--color-transition)]" />
      </span>
      <span role="status" className="sr-only">
        Chargement
      </span>
    </>
  )
}

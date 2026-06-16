"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, LayoutDashboard, CalendarRange, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/today", label: "Aujourd'hui", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/week", label: "Semaine", icon: CalendarRange },
  { href: "/settings", label: "Paramètres", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-background)] pb-safe md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors active:scale-95 transition-transform duration-75",
                active
                  ? "text-blue-500"
                  : "text-[var(--color-muted-foreground)]"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className={active ? "font-medium" : ""}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

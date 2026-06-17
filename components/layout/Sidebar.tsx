"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { CalendarDays, LayoutDashboard, CalendarRange, Settings, Heart, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const navItems = [
  { href: "/today", label: "Aujourd'hui", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/week", label: "Semaine", icon: CalendarRange },
  { href: "/settings", label: "Paramètres", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen border-r border-[var(--color-border)] bg-[var(--color-background)] p-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500">
          <Heart className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold">Famille Sync</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-medium"
                  : "text-[var(--color-foreground)] opacity-65 hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)] hover:opacity-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="flex gap-2 border-t border-[var(--color-border)] pt-4 mt-4">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start gap-3 text-[var(--color-muted-foreground)]"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </Button>
      </div>
    </aside>
  )
}

"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { CalendarDays, LayoutDashboard, CalendarRange, Settings, Heart, LogOut, CloudSun, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const navItems = [
  { href: "/today", label: "Aujourd'hui", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/week", label: "Semaine", icon: CalendarRange },
  { href: "/weather", label: "Météo", icon: CloudSun },
  { href: "/settings", label: "Paramètres", icon: Settings },
]

export function Sidebar({ pendingImportCount = 0 }: { pendingImportCount?: number }) {
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
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-transition)]">
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
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {href === "/settings" && pendingImportCount > 0 && (
                <span
                  className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-destructive)] px-1 text-[10px] font-medium text-white"
                  aria-label={`${pendingImportCount} événement${pendingImportCount > 1 ? "s" : ""} à valider`}
                >
                  {pendingImportCount > 9 ? "9+" : pendingImportCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="flex gap-2 border-t border-[var(--color-border)] pt-4 mt-4 flex-col">
        <div className="flex gap-2">
          <ThemeToggle />
          <Link href="/help" className="flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 text-[var(--color-muted-foreground)]"
              asChild
            >
              <span>
                <HelpCircle className="h-4 w-4" />
                Aide
              </span>
            </Button>
          </Link>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-[var(--color-muted-foreground)]"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </Button>
      </div>
    </aside>
  )
}

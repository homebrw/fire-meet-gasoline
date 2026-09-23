import { LoaderCircle } from "lucide-react"

export function RouteLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm font-medium text-[var(--color-foreground)]">
        <LoaderCircle className="h-5 w-5 animate-spin text-[var(--color-transition)]" aria-hidden />
        <span>Chargement…</span>
      </div>
    </div>
  )
}

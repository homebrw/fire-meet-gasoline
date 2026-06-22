import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { getGoogleCalendarConnection } from "@/lib/actions/calendar-integrations"
import { GoogleCalendarPanel } from "./google-calendar-panel"

export default async function IntegrationsPage() {
  const connection = await getGoogleCalendarConnection()

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <Link href="/settings">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour aux paramètres
        </Button>
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Intégrations</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Synchronisez votre agenda Google avec Famille Sync
        </p>
      </div>

      <GoogleCalendarPanel initialStatus={connection} />
    </div>
  )
}

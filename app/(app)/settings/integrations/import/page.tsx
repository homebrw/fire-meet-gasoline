import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import {
  getAcceptedGoogleImportCandidates,
  getPendingGoogleImportCandidates,
  getRejectedGoogleImportCandidates,
} from "@/lib/actions/calendar-integrations"
import { ImportCandidatesPanel } from "./import-candidates-panel"

export default async function GoogleImportPage() {
  const [candidates, rejected, accepted] = await Promise.all([
    getPendingGoogleImportCandidates(),
    getRejectedGoogleImportCandidates(),
    getAcceptedGoogleImportCandidates(),
  ])

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <Link href="/settings/integrations">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour aux intégrations
        </Button>
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Importer depuis Google Agenda</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Choisissez quels événements de votre Google Agenda doivent être ajoutés à
          Famille Sync. Rien n&apos;est importé automatiquement : acceptez ou refusez
          chaque événement individuellement.
        </p>
      </div>

      <ImportCandidatesPanel
        initialCandidates={candidates}
        initialRejected={rejected}
        initialAccepted={accepted}
      />
    </div>
  )
}

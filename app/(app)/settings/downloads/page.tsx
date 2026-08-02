import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Download, FileSpreadsheet, FileText, FileImage } from "lucide-react"

const files = [
  {
    href: "/downloads/calendars/calendrier_croise_matrice.xlsx",
    icon: FileSpreadsheet,
    title: "Matrice Excel",
    description:
      "Vue annuelle éditable (mois en colonnes, jours en lignes) des rythmes de garde croisés Damien / Marie-Alix, avec code couleur des 4 situations, cadres dorés sur les vacances scolaires, légende et décomptes. Format 1 page paysage.",
  },
  {
    href: "/downloads/calendars/calendrier_croise_matrice.pdf",
    icon: FileText,
    title: "Matrice PDF",
    description:
      "Version PDF A4 paysage de la matrice annuelle, prête à imprimer sur une seule page. Vue d'ensemble des 365 jours en un coup d'œil.",
  },
  {
    href: "/downloads/calendars/calendrier_croise_matrice.png",
    icon: FileImage,
    title: "Matrice (image)",
    description:
      "Image PNG haute résolution de la matrice annuelle, idéale pour un aperçu rapide à l'écran ou une intégration web.",
  },
  {
    href: "/downloads/calendars/calendrier_croise_12pages_mensuel.pdf",
    icon: FileText,
    title: "Livret mensuel (12 pages)",
    description:
      "Un mois par page, sous forme de grande grille calendrier avec halo doré sur les vacances et décompte détaillé en bas de page. Format confortable pour l'impression et l'affichage mensuel.",
  },
  {
    href: "/downloads/calendars/calendrier_croise_12mois_avec_entete.pdf",
    icon: FileText,
    title: "12 mois sur une page (avec en-tête)",
    description:
      "Vue synthétique des 12 mois en grille 4×3 sur une seule page A4 paysage, avec bandeau titre, halo doré sur les vacances et légende. Idéal pour une vision globale de l'année.",
  },
  {
    href: "/downloads/calendars/calendrier_croise_12mois_avec_entete.png",
    icon: FileImage,
    title: "12 mois avec en-tête (image)",
    description:
      "Image PNG de la vue annuelle 12 mois avec bandeau titre. Format prêt à partager ou à afficher sur un écran.",
  },
  {
    href: "/downloads/calendars/calendrier_croise_12mois_sans_entete.pdf",
    icon: FileText,
    title: "12 mois sur une page (sans en-tête)",
    description:
      "Même vue annuelle 12 mois en grille 4×3, sans le bandeau titre, pour une intégration épurée dans un document ou un cadre.",
  },
  {
    href: "/downloads/calendars/calendrier_croise_12mois_sans_entete.png",
    icon: FileImage,
    title: "12 mois sans en-tête (image)",
    description:
      "Image PNG de la vue annuelle 12 mois sans bandeau titre, format neutre pour insertion dans un site ou un support personnalisé.",
  },
]

export default function DownloadsPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <Link href="/settings">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour aux paramètres
        </Button>
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Téléchargements</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Calendrier croisé de garde 2026-2027 — téléchargez les différents formats
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {files.map(({ href, icon: Icon, title, description }) => (
          <Card key={href} className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription>{description}</CardDescription>
              <a href={href} download>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Télécharger
                </Button>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

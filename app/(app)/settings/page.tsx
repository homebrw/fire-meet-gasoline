import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarClock, AlertCircle, Baby, Calendar } from "lucide-react"

const sections = [
  {
    href: "/settings/rules",
    icon: CalendarClock,
    title: "Règles de récurrence",
    description: "Configurez les schémas de garde hebdomadaire ou cyclique",
  },
  {
    href: "/settings/exceptions",
    icon: AlertCircle,
    title: "Exceptions",
    description: "Gérez les changements ponctuels aux règles de récurrence",
  },
  {
    href: "/settings/custody",
    icon: Baby,
    title: "Gardes et changements",
    description: "Périodes de garde manuelles et transitions de garde",
  },
  {
    href: "/settings/events",
    icon: Calendar,
    title: "Événements",
    description: "Événements communs et individuels avec pièces jointes",
  },
]

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

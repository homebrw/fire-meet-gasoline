import { Sidebar } from "@/components/layout/Sidebar"
import { BottomNav } from "@/components/layout/BottomNav"
import { Header } from "@/components/layout/Header"
import { getPendingGoogleImportCount } from "@/lib/actions/calendar-integrations"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const pendingImportCount = await getPendingGoogleImportCount()

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Header />
      <Sidebar pendingImportCount={pendingImportCount} />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav pendingImportCount={pendingImportCount} />
    </div>
  )
}

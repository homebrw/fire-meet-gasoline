"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [validToken, setValidToken] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        setMessage({
          type: "error",
          text: "Lien de réinitialisation invalide ou expiré. Contactez un administrateur.",
        })
        setValidToken(false)
      } else {
        setValidToken(true)
      }
      setChecking(false)
    }

    checkSession()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas" })
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setMessage({ type: "error", text: "Le mot de passe doit contenir au moins 8 caractères" })
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage({ type: "error", text: error.message || "Erreur lors de la mise à jour" })
      setLoading(false)
      return
    }

    setMessage({ type: "success", text: "Mot de passe réinitialisé avec succès. Redirection…" })
    setPassword("")
    setConfirmPassword("")
    setTimeout(() => {
      router.push("/login")
      router.refresh()
    }, 2000)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-[var(--color-muted-foreground)]">Vérification du lien…</p>
      </div>
    )
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
        <header className="flex justify-end items-center p-4 border-b border-[var(--color-border)]">
          <ThemeToggle />
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Lien invalide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--color-destructive)]">
                Le lien de réinitialisation est invalide ou a expiré.
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Veuillez contacter un administrateur pour demander la réinitialisation de votre mot de passe.
              </p>
              <Button
                onClick={() => router.push("/login")}
                className="w-full"
              >
                Retour à la connexion
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <header className="flex justify-end items-center p-4 border-b border-[var(--color-border)]">
        <ThemeToggle />
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Réinitialiser votre mot de passe</CardTitle>
            <CardDescription>
              Entrez votre nouveau mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Au moins 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirmez votre mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              {message && (
                <p
                  className={`text-sm ${
                    message.type === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-[var(--color-destructive)]"
                  }`}
                >
                  {message.text}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Mise à jour…" : "Réinitialiser le mot de passe"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

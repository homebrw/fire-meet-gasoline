"use client"

import { useEffect, useRef, useState } from "react"
import { ErrorState, LoadingState } from "@/components/state"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const SUGGESTED_QUESTIONS = [
  "Qui a Juliette et Camille le 4 janvier 2027 ?",
  "Quelle est la prochaine passation ?",
  "Quelles exceptions sont prévues ce mois-ci ?",
  "Quand est le prochain week-end de Damien ?",
]

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const [transcriptError, setTranscriptError] = useState("")
  const [retryHistory, setRetryHistory] = useState<ChatMessage[] | null>(null)

  const transcriptRef = useRef<HTMLDivElement>(null)
  const accumulatedRef = useRef("")

  useEffect(() => {
    const el = transcriptRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight })
    }
  }, [messages])

  async function streamAssistantReply(history: ChatMessage[]) {
    setIsSending(true)
    accumulatedRef.current = ""

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      })

      // proxy.ts redirige toute requête /api/* non authentifiée en 307 vers
      // /login : il faut le détecter avant de tenter de lire le corps comme
      // un flux, sinon on obtient une erreur de parsing incompréhensible.
      if (response.redirected || response.url.includes("/login")) {
        setError("Votre session a expiré. Reconnectez-vous pour continuer.")
        setMessages((prev) => prev.slice(0, -1))
        return
      }

      if (!response.ok || !response.body) {
        throw new Error("Le serveur n'a pas pu traiter la demande.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        if (!chunk) continue

        accumulatedRef.current += chunk
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: "assistant", content: accumulatedRef.current }
          return updated
        })
      }

      if (!accumulatedRef.current) {
        throw new Error("Aucune réponse reçue de l'assistant.")
      }
    } catch (err) {
      if (!accumulatedRef.current) {
        setTranscriptError(
          err instanceof Error ? err.message : "Une erreur est survenue."
        )
      } else {
        setError("La réponse a été interrompue. Réessayez si besoin.")
      }
    } finally {
      setIsSending(false)
    }
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim()
    if (!text || isSending) return

    setError("")
    setTranscriptError("")

    const userMessage: ChatMessage = { role: "user", content: text }
    const history = [...messages, userMessage]

    setMessages([...history, { role: "assistant", content: "" }])
    setRetryHistory(history)

    await streamAssistantReply(history)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const text = (formData.get("message") as string) ?? ""
    e.currentTarget.reset()
    void sendMessage(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  function handleRetry() {
    if (!retryHistory) return
    setTranscriptError("")
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.role === "assistant" && last.content === "") return prev
      return [...prev, { role: "assistant", content: "" }]
    })
    void streamAssistantReply(retryHistory)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div
        ref={transcriptRef}
        className="overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-4 space-y-3"
        style={{ maxHeight: "60vh" }}
      >
        {isEmpty ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
            Posez une question sur les gardes, les passations ou les exceptions.
          </p>
        ) : (
          messages.map((message, index) => {
            const isPendingAssistantTurn =
              index === messages.length - 1 &&
              message.role === "assistant" &&
              message.content === ""

            if (isPendingAssistantTurn) {
              if (isSending) {
                return <LoadingState key={index} variant="list" count={1} className="max-w-[85%]" />
              }
              if (transcriptError) {
                return (
                  <ErrorState
                    key={index}
                    title="Erreur"
                    description={transcriptError}
                    onRetry={handleRetry}
                    className="max-w-[85%]"
                  />
                )
              }
              return null
            }

            return (
              <div
                key={index}
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm",
                    message.role === "user"
                      ? "rounded-br-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                      : "rounded-bl-sm bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]"
                  )}
                >
                  {message.content}
                </div>
              </div>
            )
          })
        )}
      </div>

      {error && (
        <div
          className="mt-3 rounded-md border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 p-3 text-sm text-[var(--color-destructive)]"
          role="alert"
          aria-live="polite"
        >
          {error}
          {error.startsWith("Votre session") && (
            <>
              {" "}
              <a href="/login" className="font-medium underline">
                Se reconnecter
              </a>
            </>
          )}
        </div>
      )}

      {isEmpty && (
        <div className="mb-1 mt-3 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              disabled={isSending}
              onClick={() => sendMessage(question)}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {question}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
        <Textarea
          name="message"
          placeholder="Écrivez votre question…"
          rows={1}
          disabled={isSending}
          onKeyDown={handleKeyDown}
          className="min-h-[44px] max-h-32 resize-none"
          aria-label="Votre message"
        />
        <Button type="submit" disabled={isSending}>
          {isSending ? "..." : "Envoyer"}
        </Button>
      </form>
    </div>
  )
}

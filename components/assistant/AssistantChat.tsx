"use client"

import { useEffect, useRef, useState } from "react"
import { ErrorState, LoadingState } from "@/components/state"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ASSISTANT_MODELS, DEFAULT_ASSISTANT_MODEL, type AssistantModelId } from "@/lib/assistant/models"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { ArrowRightLeft, CalendarDays, ChevronRight, UsersRound } from "lucide-react"

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

type AssistantCardKind = "handoff" | "custody" | "exception" | "event"

type AssistantCard = {
  kind: AssistantCardKind
  date: string
  time?: string
  title?: string
  primary?: string
  secondary?: string
}

const CARD_DEFAULT_TITLES: Record<AssistantCardKind, string> = {
  handoff: "Passation",
  custody: "Garde",
  exception: "Exception",
  event: "Événement",
}

function parseAssistantContent(content: string) {
  const cards: AssistantCard[] = []
  const cardPattern = /\[\[card:(handoff|custody|exception|event)\|([^\]]*)\]\]/g

  let visibleText = content.replace(cardPattern, (_match, kind: AssistantCardKind, payload: string) => {
    const fields: Record<string, string> = {}
    for (const item of payload.split("|")) {
      const separator = item.indexOf("=")
      if (separator <= 0) continue
      fields[item.slice(0, separator)] = item.slice(separator + 1).trim()
    }

    if (fields.date) {
      cards.push({
        kind,
        date: fields.date,
        time: fields.time || undefined,
        title: fields.title || undefined,
        primary: fields.primary || undefined,
        secondary: fields.secondary || undefined,
      })
    }

    return ""
  })

  // Pendant le streaming, masque aussi une balise en cours d'écriture pour
  // éviter de faire clignoter le protocole machine dans la conversation.
  const partialCardStart = visibleText.indexOf("[[card:")
  if (partialCardStart >= 0) {
    visibleText = visibleText.slice(0, partialCardStart)
  }

  return { text: visibleText.trim(), cards }
}

function AssistantFactCard({ card }: { card: AssistantCard }) {
  const Icon =
    card.kind === "handoff"
      ? ArrowRightLeft
      : card.kind === "event"
        ? CalendarDays
        : UsersRound

  let dateLabel = card.date
  try {
    dateLabel = format(parseISO(card.date + "T12:00:00"), "EEEE d MMMM yyyy", { locale: fr })
  } catch {
    // Garde la date ISO fournie par l'outil si elle n'est pas parseable.
  }

  const month = card.date.slice(0, 7)

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
      <div className="flex items-start gap-3 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {card.title || CARD_DEFAULT_TITLES[card.kind]}
          </p>
          <p className="mt-0.5 text-sm font-semibold capitalize text-[var(--color-foreground)]">
            {dateLabel}
            {card.time ? ` · ${card.time}` : ""}
          </p>
          {card.primary && (
            <p className="mt-1 text-sm text-[var(--color-foreground)]">{card.primary}</p>
          )}
          {card.secondary && (
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{card.secondary}</p>
          )}
        </div>
      </div>
      <a
        href={`/calendar?month=${month}&day=${card.date}#${card.date}`}
        className="press-feedback flex items-center justify-between border-t border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
      >
        Voir dans le calendrier
        <ChevronRight className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const [transcriptError, setTranscriptError] = useState("")
  const [retryHistory, setRetryHistory] = useState<ChatMessage[] | null>(null)
  const [model, setModel] = useState<AssistantModelId>(DEFAULT_ASSISTANT_MODEL)

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
        body: JSON.stringify({ messages: history, model }),
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
        let detail = ""
        try {
          const payload = (await response.json()) as { error?: unknown }
          if (typeof payload.error === "string") detail = payload.error
        } catch {
          // La route peut aussi répondre sans JSON (proxy, infrastructure).
        }
        throw new Error(detail || "Le serveur n'a pas pu traiter la demande.")
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

            if (message.role === "assistant") {
              const parsed = parseAssistantContent(message.content)
              return (
                <div key={index} className="flex justify-start">
                  <div className="max-w-[92%] space-y-2">
                    {parsed.text && (
                      <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-[var(--color-secondary)] px-4 py-2 text-sm text-[var(--color-secondary-foreground)]">
                        {parsed.text}
                      </div>
                    )}
                    {parsed.cards.map((card, cardIndex) => (
                      <AssistantFactCard
                        key={`${card.kind}-${card.date}-${card.time ?? ""}-${cardIndex}`}
                        card={card}
                      />
                    ))}
                  </div>
                </div>
              )
            }

            return (
              <div key={index} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary-foreground)]">
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
              className="press-feedback rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {question}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="assistant-model" className="text-xs text-[var(--color-muted-foreground)]">
          Modèle
        </label>
        <Select
          value={model}
          onValueChange={(value) => setModel(value as AssistantModelId)}
          disabled={isSending}
        >
          <SelectTrigger id="assistant-model" className="h-8 w-auto min-w-[220px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSISTANT_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <form onSubmit={handleSubmit} className="mt-2 flex items-end gap-2">
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

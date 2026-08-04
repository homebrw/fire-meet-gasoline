// Orchestration pour les fournisseurs "compatibles OpenAI" de l'assistant
// conversationnel — fetch natif, pas de SDK (aucune dépendance officielle
// n'existe déjà dans ce dépôt pour aucun des deux, et l'appel est assez
// simple pour ne pas en justifier une). Exécuté exclusivement côté serveur
// (importé uniquement par route.ts) : les clés d'API ne doivent jamais
// atteindre le client.
//
// "Compatible OpenAI" : OpenAI et Mistral exposent tous les deux un
// endpoint /v1/chat/completions au même format de fil (messages, tools,
// tool_calls streamés en fragments indexés, auth Bearer) — Mistral
// documente explicitement cette compatibilité. Un seul chemin
// d'orchestration suffit donc pour les deux ; seuls l'URL de base, la clé
// et le modèle de repli diffèrent (PROVIDER_CONFIG ci-dessous). Anthropic,
// lui, garde son propre chemin dans route.ts : le tool runner du SDK et ses
// blocs tool_use n'ont pas la même forme, une abstraction commune aux trois
// coûterait plus qu'elle n'apporterait.
//
// Miroir du chemin Anthropic sur un point essentiel : runTool()
// (lib/assistant/tools.ts) est réutilisé tel quel. Aucune requête SQL n'est
// générée par le modèle ici non plus — chaque fournisseur ne voit que les 4
// mêmes outils en lecture seule, avec les mêmes résultats déjà filtrés par
// lib/assistant/schedule.ts et la RLS Supabase.
//
// Chaque tour de conversation (négociation d'outils ou réponse finale) est
// streamé en une seule requête HTTP, avec accumulation des fragments de
// tool_calls par index (envoyés découpés sur plusieurs deltas SSE) —
// nécessaire pour éviter de rejouer une deuxième requête non streamée juste
// pour "connaître" le tour final, ce qui doublerait le coût facturé de
// chaque réponse.
import { assistantTools, runTool } from "@/lib/assistant/tools"
import type { ScheduleContext, SupabaseServerClient } from "@/lib/assistant/schedule"

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])
const MAX_TOOL_ITERATIONS = 8

export type OpenAICompatibleProvider = "openai" | "mistral"

// Nom de la variable d'environnement portant la clé API de chaque
// fournisseur — utilisé par route.ts pour vérifier sa présence avant
// d'ouvrir le flux.
export const OPENAI_COMPATIBLE_API_KEY_ENV_VAR: Record<OpenAICompatibleProvider, string> = {
  openai: "OPENAI_API_KEY",
  mistral: "MISTRAL_API_KEY",
}

// Modèles de repli en cas d'erreur réseau ou de statut retryable sur le
// modèle par défaut. À vérifier sur vos comptes OpenAI / Mistral avant
// mise en production : contrairement au catalogue Claude, ce dépôt n'a pas
// de référence à jour du catalogue de ces deux fournisseurs. `-latest` est
// l'alias roulant documenté par Mistral pour éviter justement ce genre de
// péremption — préféré ici à un identifiant daté.
const PROVIDER_CONFIG: Record<
  OpenAICompatibleProvider,
  { baseUrl: string; fallbackModel: string }
> = {
  openai: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    fallbackModel: "gpt-4o-mini",
  },
  mistral: {
    baseUrl: "https://api.mistral.ai/v1/chat/completions",
    fallbackModel: "open-mistral-nemo",
  },
}

type ChatRole = "system" | "user" | "assistant" | "tool"

type ToolCallParam = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

type MessageParam =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCallParam[] }
  | { role: "tool"; tool_call_id: string; content: string }

// ─── Schémas d'outils (adaptation du JSON Schema brut de tools.ts) ─────────
// Même contenu que buildRunnableTool() côté Anthropic (route.ts) : seule
// l'enveloppe diffère (input_schema -> function.parameters).

function chatCompletionTools() {
  return assistantTools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema as unknown as Record<string, unknown>,
      strict: true,
    },
  }))
}

// ─── max_tokens vs max_completion_tokens ───────────────────────────────────
// Spécifique à OpenAI : les modèles gpt-5* (raisonnement) utilisent
// max_completion_tokens ; les autres (gpt-4.1*, gpt-4o*), comme tout le
// catalogue Mistral, utilisent max_tokens. Sans cette distinction, l'appel
// échoue ou tronque mal sur un modèle de raisonnement OpenAI. Pas de
// paramètre reasoningEffort ici : aucune entrée gpt-5 n'est proposée pour
// l'instant (voir lib/assistant/models.ts), un seul modèle par défaut par
// fournisseur a été retenu pour ce premier jet.
function getTokenLimitParam(
  provider: OpenAICompatibleProvider,
  model: string,
  maxTokens: number
): Record<string, number> {
  const usesReasoningBudget = provider === "openai" && model.startsWith("gpt-5")
  return usesReasoningBudget ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }
}

// ─── Requête avec repli automatique ────────────────────────────────────────

async function postChatCompletion(
  baseUrl: string,
  apiKey: string,
  body: Record<string, unknown> & { model: string }
): Promise<Response> {
  return fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
}

async function fetchChatCompletionWithFallback(
  baseUrl: string,
  apiKey: string,
  fallbackModel: string,
  body: Record<string, unknown> & { model: string }
): Promise<Response> {
  // Déjà sur le modèle de repli : rien vers quoi se replier, une seule
  // tentative directe (évite une boucle infinie).
  if (body.model === fallbackModel) {
    return postChatCompletion(baseUrl, apiKey, body)
  }

  let primary: Response
  try {
    primary = await postChatCompletion(baseUrl, apiKey, body)
  } catch {
    return postChatCompletion(baseUrl, apiKey, { ...body, model: fallbackModel })
  }

  if (primary.ok || !RETRYABLE_STATUS_CODES.has(primary.status)) {
    return primary
  }

  return postChatCompletion(baseUrl, apiKey, { ...body, model: fallbackModel })
}

// ─── Un tour de conversation, streamé ──────────────────────────────────────

type ToolCallAccumulator = { id?: string; type?: "function"; function: { name?: string; arguments: string } }

type StreamedTurnResult =
  | { type: "text"; truncated: boolean }
  | {
      type: "tool_calls"
      assistantContent: string | null
      toolCalls: { id: string; name: string; arguments: string }[]
    }

async function streamChatCompletionTurn(params: {
  provider: OpenAICompatibleProvider
  apiKey: string
  model: string
  maxTokens: number
  messages: MessageParam[]
  controller: ReadableStreamDefaultController<Uint8Array>
  encoder: TextEncoder
}): Promise<StreamedTurnResult> {
  const { provider, apiKey, model, maxTokens, messages, controller, encoder } = params
  const { baseUrl, fallbackModel } = PROVIDER_CONFIG[provider]

  const response = await fetchChatCompletionWithFallback(baseUrl, apiKey, fallbackModel, {
    model,
    messages,
    tools: chatCompletionTools(),
    stream: true,
    ...getTokenLimitParam(provider, model, maxTokens),
  })

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "")
    throw new Error(
      `${provider} a répondu ${response.status}${detail ? ` : ${detail.slice(0, 200)}` : ""}`
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let content = ""
  let finishReason: string | null = null
  const toolCallsAcc: ToolCallAccumulator[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith("data:")) continue
      const payload = trimmed.slice(5).trim()
      if (payload === "[DONE]") continue

      let event: {
        choices?: {
          delta?: {
            content?: string | null
            tool_calls?: { index: number; id?: string; type?: "function"; function?: { name?: string; arguments?: string } }[]
          }
          finish_reason?: string | null
        }[]
      }
      try {
        event = JSON.parse(payload)
      } catch {
        continue
      }

      const choice = event.choices?.[0]
      if (!choice) continue
      const delta = choice.delta ?? {}

      // Émis au fil de l'eau dès réception : sur un tour qui se termine par
      // des tool_calls, il n'y a normalement aucun texte visible à
      // streamer, donc rien n'est perdu à ne pas attendre de connaître
      // finish_reason avant d'écrire dans le flux.
      if (typeof delta.content === "string" && delta.content.length > 0) {
        content += delta.content
        controller.enqueue(encoder.encode(delta.content))
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const fragment of delta.tool_calls) {
          const acc = (toolCallsAcc[fragment.index] ??= { function: { arguments: "" } })
          if (fragment.id) acc.id = fragment.id
          if (fragment.type) acc.type = fragment.type
          if (fragment.function?.name) {
            acc.function.name = (acc.function.name ?? "") + fragment.function.name
          }
          if (fragment.function?.arguments) {
            acc.function.arguments += fragment.function.arguments
          }
        }
      }

      if (choice.finish_reason) finishReason = choice.finish_reason
    }
  }

  if (finishReason === "tool_calls" && toolCallsAcc.length > 0) {
    return {
      type: "tool_calls",
      assistantContent: content || null,
      toolCalls: toolCallsAcc.map((tc, index) => ({
        id: tc.id ?? `call_${index}`,
        name: tc.function.name ?? "",
        arguments: tc.function.arguments,
      })),
    }
  }

  return { type: "text", truncated: finishReason === "length" }
}

// ─── Boucle complète ────────────────────────────────────────────────────────

export async function runOpenAICompatibleAssistant(params: {
  provider: OpenAICompatibleProvider
  apiKey: string
  model: string
  maxTokens: number
  systemPrompt: string
  history: { role: "user" | "assistant"; content: string }[]
  ctx: ScheduleContext
  supabase: SupabaseServerClient
  controller: ReadableStreamDefaultController<Uint8Array>
  encoder: TextEncoder
}): Promise<void> {
  const { provider, apiKey, model, maxTokens, systemPrompt, history, ctx, supabase, controller, encoder } =
    params

  const messages: MessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content }) as MessageParam),
  ]

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const turn = await streamChatCompletionTurn({
      provider,
      apiKey,
      model,
      maxTokens,
      messages,
      controller,
      encoder,
    })

    if (turn.type === "text") {
      if (turn.truncated) {
        throw new Error("Réponse tronquée : limite de tokens atteinte.")
      }
      return
    }

    messages.push({
      role: "assistant",
      content: turn.assistantContent,
      tool_calls: turn.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments },
      })),
    })

    for (const toolCall of turn.toolCalls) {
      let args: unknown = {}
      try {
        args = JSON.parse(toolCall.arguments || "{}")
      } catch {
        // Arguments malformés : on renvoie l'erreur au modèle (ci-dessous)
        // plutôt que de faire échouer tout le tour — il peut retenter avec
        // un JSON valide.
      }

      let result: unknown
      try {
        result = await runTool(toolCall.name, args, ctx, supabase)
      } catch (err) {
        result = { error: err instanceof Error ? err.message : "Erreur inconnue" }
      }

      messages.push({
        role: "tool" as ChatRole,
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      })
    }
  }

  throw new Error("Trop d'itérations d'outils sans réponse finale.")
}

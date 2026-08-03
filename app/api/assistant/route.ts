// Route API pour l'assistant conversationnel (questions en français sur les
// gardes d'enfants, ex. "qui a Juliette et Camille le 4 janvier 2027 ?").
//
// Principe directeur : les faits (dates, heures, prénoms) viennent toujours
// des outils de lib/assistant/tools.ts, eux-mêmes adossés à
// generateCustodyPeriods() (lib/recurrence/engine.ts) — jamais de la mémoire
// du modèle. Voir lib/assistant/schedule.ts pour le détail des invariants de
// fuseau horaire.
//
// maxDuration : aucune route de ce dépôt n'exportait jusqu'ici `runtime` ni
// `maxDuration`. Celle-ci en a besoin : une conversation avec plusieurs
// itérations d'outils peut dépasser le timeout par défaut de Vercel. Runtime
// Node par défaut (pas Edge — le SDK Anthropic en a besoin).
export const maxDuration = 60

import { NextResponse } from "next/server"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema"
import { createClient } from "@/lib/supabase/server"
import { loadScheduleContext, type ScheduleContext, type SupabaseServerClient } from "@/lib/assistant/schedule"
import { assistantTools, runTool } from "@/lib/assistant/tools"
import { ASSISTANT_MODEL_IDS, DEFAULT_ASSISTANT_MODEL, getAssistantModel } from "@/lib/assistant/models"
import { runOpenAIAssistant } from "@/lib/assistant/openai"

// ─── Corps de requête ───────────────────────────────────────────────────────
// `model` est validé contre l'allowlist de lib/assistant/models.ts — on ne
// fait jamais confiance à une valeur de modèle envoyée par le client sans
// la faire passer par ce zod.enum, même si le choix reste sans conséquence
// de sécurité ici (l'utilisateur ne fait que choisir avec quel modèle
// interroger ses propres données).

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .min(1),
  model: z.enum(ASSISTANT_MODEL_IDS).optional(),
})

// ─── Prompt système ─────────────────────────────────────────────────────────
// Ton "clair, calme, fiable" (PRODUCT.md — Brand Personality) : pas de
// familiarité excessive, pas de justification superflue, une information
// exacte avant tout.

const SYSTEM_PROMPT = `Tu es l'assistant de Famille Sync, une application de coordination de garde d'enfants pour familles séparées ou recomposées. Tu réponds en français à des questions sur les gardes, passations et événements.

Règles impératives :
- N'affirme jamais une date, une heure ou un prénom de mémoire : passe toujours par un outil (list_family, get_custody, get_handoffs, get_events) avant de répondre. Si l'information ne vient pas d'un appel d'outil, ne la donne pas.
- N'invente jamais un prénom qui n'existe pas dans la réponse de list_family. Utilise list_family pour résoudre les prénoms mentionnés par l'utilisateur (adultes et enfants) avant d'appeler get_custody.
- Quand get_custody renvoie un segment avec person_id=null, formule "chez l'autre parent, non suivi dans l'application" — jamais "personne" ni "disponible".
- Quand une journée est coupée en plusieurs segments (jour de passation), donne l'heure de bascule et les deux personnes concernées, dans l'ordre chronologique.
- Réponses courtes et factuelles, sans préambule ni justification excessive. Pas de formules type "Bien sûr !" ou "N'hésitez pas à demander".`

// ─── Outils ─────────────────────────────────────────────────────────────────

type RawTool = (typeof assistantTools)[number]

// betaTool() ne propage pas le champ `strict` du schéma brut (il attend
// {name, inputSchema, description, run}) : on le rajoute après coup sur
// l'objet retourné, qui reste un BetaRunnableTool valide (strict est un
// champ optionnel de BetaTool). Le cast sur inputSchema est nécessaire car
// nos schémas sont définis une fois pour toutes dans tools.ts (typage
// littéral via `as const`) et ne s'unifient pas proprement avec le
// générique `Schema extends JSONSchema` attendu ici — la validation réelle
// des entrées se fait côté API (strict: true) et dans runTool().
function buildRunnableTool(tool: RawTool, ctx: ScheduleContext, supabase: SupabaseServerClient) {
  const runnable = betaTool({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.input_schema as unknown as { type: "object"; [key: string]: unknown },
    run: async (args: unknown) => JSON.stringify(await runTool(tool.name, args, ctx, supabase)),
  })
  return { ...runnable, strict: true as const }
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  // Modèle choisi par l'utilisateur dans le menu déroulant (défaut Haiku
  // 4.5), validé plus haut contre ASSISTANT_MODEL_IDS. `provider` détermine
  // laquelle des deux boucles d'orchestration ci-dessous traite la requête —
  // les deux chemins sont volontairement séparés plutôt qu'unifiés derrière
  // une abstraction commune : Anthropic (tool runner du SDK, blocs
  // tool_use) et OpenAI (fetch natif, tool_calls) ont des formats de fil
  // trop différents pour qu'une couche commune apporte plus qu'elle ne
  // coûte, pour deux fournisseurs. Les deux convergent uniquement sur le
  // même contrat de sortie : un flux de texte brut, sans enveloppe SSE — le
  // client (components/assistant/AssistantChat.tsx) concatène directement
  // les chunks reçus dans la bulle de l'assistant, sans parser de format
  // d'événement. En cas d'erreur, les deux chemins font échouer le
  // ReadableStream (controller.error) plutôt que d'écrire un message
  // d'erreur en clair : le client distingue déjà "rien reçu encore" de
  // "réponse interrompue" via son état accumulé.
  const model = parsed.data.model ?? DEFAULT_ASSISTANT_MODEL
  const modelConfig = getAssistantModel(model)

  const ctx = await loadScheduleContext(supabase)
  const history = parsed.data.messages.map((m) => ({ role: m.role, content: m.content }))
  const encoder = new TextEncoder()

  if (modelConfig.provider === "openai") {
    // Vérifiée avant d'ouvrir le flux : une clé manquante doit produire une
    // erreur HTTP normale, pas un ReadableStream qui échoue après coup.
    // Jamais loggée, jamais renvoyée au client au-delà de ce message fixe.
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY non configurée" }, { status: 500 })
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          await runOpenAIAssistant({
            apiKey,
            model,
            maxTokens: 8192,
            systemPrompt: SYSTEM_PROMPT,
            history,
            ctx,
            supabase,
            controller,
            encoder,
          })
          controller.close()
        } catch (err) {
          controller.error(err instanceof Error ? err : new Error("Erreur inconnue"))
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    })
  }

  const tools = assistantTools.map((tool) => buildRunnableTool(tool, ctx, supabase))
  const client = new Anthropic()

  // output_config.effort n'est ajouté que pour les modèles qui le
  // supportent : Haiku 4.5 le rejette avec une erreur 400, contrairement à
  // Sonnet 5 / Opus 5.
  const runner = client.beta.messages.toolRunner({
    model,
    max_tokens: 8192,
    ...(modelConfig.supportsEffort ? { output_config: { effort: "medium" as const } } : {}),
    system: SYSTEM_PROMPT,
    messages: history,
    tools,
    stream: true,
    max_iterations: 8,
  })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const messageStream of runner) {
          for await (const event of messageStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err instanceof Error ? err : new Error("Erreur inconnue"))
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  })
}

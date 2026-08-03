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

// ─── Corps de requête ───────────────────────────────────────────────────────

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .min(1),
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

  const ctx = await loadScheduleContext(supabase)
  const tools = assistantTools.map((tool) => buildRunnableTool(tool, ctx, supabase))

  const client = new Anthropic()

  const runner = client.beta.messages.toolRunner({
    model: "claude-opus-5",
    max_tokens: 8192,
    output_config: { effort: "medium" },
    system: SYSTEM_PROMPT,
    messages: parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
    tools,
    stream: true,
    max_iterations: 8,
  })

  const encoder = new TextEncoder()

  // Flux texte brut, PAS d'enveloppe SSE ("event: .../data: ...") : le
  // client existant (components/assistant/AssistantChat.tsx) lit le corps de
  // la réponse chunk par chunk et concatène directement le texte reçu dans
  // la bulle de l'assistant (accumulatedRef.current += chunk), sans parser
  // de format d'événement. Émettre une enveloppe SSE ici afficherait
  // littéralement "event: text_delta\ndata: {...}" dans la conversation.
  // On garde néanmoins un flux progressif (boucle externe = itérations du
  // tool runner, boucle interne = événements du flux de chaque itération) :
  // c'est le mécanisme de streaming demandé, juste sans le framing SSE que
  // ce client ne consomme pas. En cas d'erreur, on fait échouer le
  // ReadableStream (controller.error) plutôt que d'écrire un message
  // d'erreur en clair : le client distingue déjà "rien reçu encore" de
  // "réponse interrompue" via son état accumulé (voir le bloc catch de
  // streamAssistantReply côté client).
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

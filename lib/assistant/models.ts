// Modèles proposés dans le sélecteur de l'assistant conversationnel.
// Source unique de vérité entre le front (options du menu déroulant,
// components/assistant/AssistantChat.tsx) et le back (allowlist de
// validation + branchement par provider, app/api/assistant/route.ts) —
// module sans "use client" ni "use server" pour rester importable des deux
// côtés. Ne contient que des littéraux fixes, aucune lecture de
// process.env : les variables d'environnement spécifiques à un provider
// (clés API, modèles de repli) restent dans les fichiers serveur qui les
// utilisent (route.ts, lib/assistant/openaiCompatible.ts), jamais ici — ce
// fichier est aussi importé par un composant client.
//
// `provider` détermine quelle boucle d'orchestration traite la requête :
// "anthropic" passe par le tool runner du SDK (route.ts), "openai" et
// "mistral" partagent la même boucle fetch native
// (lib/assistant/openaiCompatible.ts) puisque les deux exposent un
// /v1/chat/completions au même format de fil — seuls l'URL de base, la clé
// et le modèle de repli diffèrent. `supportsEffort` ne s'applique qu'au
// provider Anthropic : Haiku 4.5 rejette output_config.effort avec une
// erreur 400, contrairement à Sonnet 5 et Opus 5 ; laissé à false (ignoré)
// sur les entrées openai/mistral.
export const ASSISTANT_MODELS = [
  {
    id: "claude-haiku-4-5",
    provider: "anthropic",
    label: "Haiku 4.5 — rapide, économique",
    supportsEffort: false,
  },
  {
    id: "claude-sonnet-5",
    provider: "anthropic",
    label: "Sonnet 5 — équilibré",
    supportsEffort: true,
  },
  {
    id: "claude-opus-5",
    provider: "anthropic",
    label: "Opus 5 — le plus capable",
    supportsEffort: true,
  },
  {
    id: "gpt-4.1-mini",
    provider: "openai",
    label: "GPT-4.1 mini (OpenAI) — rapide, économique",
    supportsEffort: false,
  },
  {
    id: "mistral-small-latest",
    provider: "mistral",
    label: "Mistral Small (Mistral AI) — rapide, économique",
    supportsEffort: false,
  },
] as const satisfies readonly {
  id: string
  provider: "anthropic" | "openai" | "mistral"
  label: string
  supportsEffort: boolean
}[]

export type AssistantModelId = (typeof ASSISTANT_MODELS)[number]["id"]

export const ASSISTANT_MODEL_IDS = ASSISTANT_MODELS.map((m) => m.id) as [
  AssistantModelId,
  ...AssistantModelId[],
]

// Les faits viennent des outils, pas du modèle : sa seule tâche est de
// comprendre la question et reformuler en français. Haiku 4.5 suffit à ce
// rôle pour une fraction du coût d'Opus 5 — voir le reste de la conversation
// pour le raisonnement complet.
export const DEFAULT_ASSISTANT_MODEL: AssistantModelId = "claude-haiku-4-5"

export function getAssistantModel(id: AssistantModelId) {
  const model = ASSISTANT_MODELS.find((m) => m.id === id)
  if (!model) {
    throw new Error(`Modèle assistant inconnu : ${id}`)
  }
  return model
}

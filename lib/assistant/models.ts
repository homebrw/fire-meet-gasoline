// Modèles Claude proposés dans le sélecteur de l'assistant conversationnel.
// Source unique de vérité entre le front (options du menu déroulant,
// components/assistant/AssistantChat.tsx) et le back (allowlist de
// validation, app/api/assistant/route.ts) — module sans "use client" ni
// "use server" pour rester importable des deux côtés.
//
// `supportsEffort` : Haiku 4.5 rejette output_config.effort avec une erreur
// 400, contrairement à Sonnet 5 et Opus 5. Voir app/api/assistant/route.ts.
export const ASSISTANT_MODELS = [
  { id: "claude-haiku-4-5", label: "Haiku 4.5 — rapide, économique", supportsEffort: false },
  { id: "claude-sonnet-5", label: "Sonnet 5 — équilibré", supportsEffort: true },
  { id: "claude-opus-5", label: "Opus 5 — le plus capable", supportsEffort: true },
] as const satisfies readonly { id: string; label: string; supportsEffort: boolean }[]

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

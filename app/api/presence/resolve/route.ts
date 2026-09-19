// Route de résolution d'un code d'appairage (persons.pairing_code) vers
// l'UUID de l'enfant, appelée par Checkmate (autre dépôt, autre projet
// Supabase) UNE SEULE FOIS, au moment de l'appairage : Checkmate résout le
// code, mémorise l'UUID renvoyé, puis interroge /api/presence avec cet
// UUID comme aujourd'hui. Régénérer un code plus tard ne casse donc aucun
// appairage déjà fait.
//
// Même mécanique d'authentification que /api/presence : pas de session
// utilisateur, jeton partagé PRESENCE_FEED_TOKEN (lib/presence/auth.ts),
// client service-role (lib/supabase/admin.ts) — la RLS bloquerait tout
// sans session de toute façon.
//
// Confidentialité : entorse assumée à la règle habituelle du flux presence
// (« aucun prénom ne sort »), limitée à cette seule route. Elle sert
// exactement à ça : permettre à Checkmate d'afficher « Code reconnu :
// <prénom> » avant d'enregistrer l'appairage. Ne renvoie rien d'autre —
// pas de parent_id, pas de date de naissance, pas de liste.
//
// ⚠️ Pas de limitation de débit ici, volontairement. En serverless un
// compteur en mémoire ne survit pas d'une invocation à l'autre, et on
// n'ajoute pas de magasin externe (Redis ou équivalent) rien que pour ça.
// La seule protection est le jeton partagé : s'il fuite, un code à 5
// lettres (24^5 ≈ 8M combinaisons) ne résiste pas à une énumération là où
// l'UUID utilisé jusqu'ici résistait. Compromis assumé par le propriétaire
// du produit en échange de la simplicité d'appairage.
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkPresenceToken } from "@/lib/presence/auth"

// Même alphabet que generate_pairing_code() (supabase/migrations/021_add_pairing_code.sql) :
// 24 lettres majuscules, sans I ni O — un code se dicte au téléphone, I/1
// et O/0 se confondent.
const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/

function errorResponse(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

// trim, majuscules, retrait des espaces et tirets : un code recopié avec
// un espace de groupement ou un tiret doit quand même matcher la valeur
// stockée brute.
function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, "")
}

export async function GET(request: Request) {
  const auth = checkPresenceToken(request)
  if (!auth.ok) {
    return errorResponse(auth.status, auth.error)
  }

  const url = new URL(request.url)
  const code = normalizeCode(url.searchParams.get("code") ?? "")
  if (!CODE_RE.test(code)) {
    return errorResponse(400, "Code invalide.")
  }

  const supabase = createAdminClient()
  const { data: person, error } = await supabase
    .from("persons")
    .select("id, name, is_child")
    .eq("pairing_code", code)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!person || !person.is_child) {
    return errorResponse(404, "Code inconnu.")
  }

  return NextResponse.json({ child_id: person.id, display_name: person.name })
}

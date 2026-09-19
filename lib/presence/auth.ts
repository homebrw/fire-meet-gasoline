// Authentification partagée par les routes du flux presence
// (/api/presence, /api/presence/resolve) : pas de session Supabase, ces
// routes sont appelées serveur → serveur par Checkmate et protégées par un
// unique jeton porteur, PRESENCE_FEED_TOKEN.
import { timingSafeEqual } from "node:crypto"

export type PresenceAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string }

// Comparaison à temps constant. timingSafeEqual lève une exception si les
// deux Buffer n'ont pas la même longueur au lieu de renvoyer false : un
// jeton fourni plus court ou plus long que l'attendu doit donc être écarté
// AVANT l'appel, sans jamais laisser fuir l'information par une différence
// de timing entre "longueur différente" et "longueur identique mais faux".
function tokenMatches(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  if (providedBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(providedBuf, expectedBuf)
}

export function checkPresenceToken(request: Request): PresenceAuthResult {
  const expectedToken = process.env.PRESENCE_FEED_TOKEN
  if (!expectedToken) {
    // Fonctionnalité éteinte tant que le jeton n'est pas configuré côté
    // serveur — jamais de comportement "ouvert par défaut".
    return { ok: false, status: 503, error: "Fonctionnalité désactivée." }
  }

  const authHeader = request.headers.get("authorization") ?? ""
  const [scheme, token] = authHeader.split(" ")
  if (scheme !== "Bearer" || !token || !tokenMatches(token, expectedToken)) {
    return { ok: false, status: 401, error: "Jeton invalide ou absent." }
  }

  return { ok: true }
}

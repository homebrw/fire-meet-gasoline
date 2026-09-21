import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  // Skip during build / when env vars not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && !pathname.startsWith("/login") && !pathname.startsWith("/auth") && !pathname.startsWith("/reset-password")) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/today"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Trois chemins sont exclus parce qu'ils sont appelés **sans cookie de
    // session**, par des appelants qui n'en auront jamais un : sans
    // exclusion, le middleware les redirige vers /login, et l'appelant
    // reçoit la page de connexion en HTTP 200 au lieu de la réponse
    // attendue. La redirection étant suivie de façon transparente par
    // `fetch`, la panne est entièrement muette — rien dans les journaux de
    // l'application ne la signale, et la route n'est jamais atteinte.
    //
    // Chacun porte son propre contrôle d'accès, qui est celui qui convient :
    //   - `api/presence`                     jeton partagé (lib/presence/auth.ts),
    //                                        appelé serveur à serveur par Checkmate ;
    //   - `api/calendar/google/webhook`      en-têtes X-Goog-Channel-ID et
    //                                        X-Goog-Channel-Token, vérifiés contre la
    //                                        connexion enregistrée — Google n'a pas de
    //                                        session ;
    //   - `api/cron`                         Authorization: Bearer CRON_SECRET, appelé
    //                                        par le planificateur.
    //
    // `api/calendar/google/connect` et `/callback` restent volontairement
    // DANS le périmètre du middleware : ceux-là sont parcourus par le
    // navigateur d'un utilisateur connecté.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|api/presence|api/calendar/google/webhook|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

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
    // `api/presence` est exclu : le flux de présence consommé par Checkmate
    // (app/api/presence/, voir CLAUDE.md « Outgoing feed ») est appelé
    // serveur à serveur, sans cookie de session, et porte sa propre
    // authentification par jeton partagé. Sans cette exclusion, le middleware
    // redirigeait ces appels vers /login, et l'appelant recevait la page de
    // connexion en HTTP 200 au lieu du JSON attendu — une panne muette, la
    // redirection étant suivie de façon transparente par `fetch`.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|api/presence|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

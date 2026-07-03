import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "./env";

type CookieParaGravar = { name: string; value: string; options: CookieOptions };

// Rotas públicas: o portal ("/") e o login. Exatas evitam liberar tudo.
const PUBLICAS_EXATAS = ["/"];
const PUBLICAS_PREFIXO = ["/login", "/auth"];

function rotaPublica(pathname: string): boolean {
  return (
    PUBLICAS_EXATAS.includes(pathname) ||
    PUBLICAS_PREFIXO.some((rota) => pathname.startsWith(rota))
  );
}

/**
 * Atualiza a sessão a cada requisição e protege as rotas autenticadas.
 * Quando o Supabase ainda não está configurado, apenas deixa passar
 * (o app exibe instruções de configuração na tela de login).
 */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!supabaseConfigurado()) {
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieParaGravar[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const ehPublica = rotaPublica(pathname);

  if (!user && !ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

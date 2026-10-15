import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { concluirConexao } from "@/lib/canva";

export async function GET(req: NextRequest) {
  const origem = req.nextUrl.origin;
  const volta = (q: string) => {
    const r = NextResponse.redirect(`${origem}/criacao?canva=${q}`);
    r.cookies.delete("canva_verifier");
    r.cookies.delete("canva_state");
    return r;
  };

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origem}/login`);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const verifier = req.cookies.get("canva_verifier")?.value;
  const stateEsperado = req.cookies.get("canva_state")?.value;

  if (req.nextUrl.searchParams.get("error") || !code) return volta("negado");
  if (!verifier || !state || state !== stateEsperado) return volta("invalido");

  try {
    await concluirConexao(user.id, code, verifier, `${origem}/api/canva/callback`);
  } catch {
    return volta("erro");
  }
  return volta("conectado");
}

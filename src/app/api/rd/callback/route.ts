import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { concluirConexaoRD } from "@/lib/rd";

/** Volta do RD Station com o código de autorização: troca por tokens e guarda a conexão. */
export async function GET(req: NextRequest) {
  const origem = req.nextUrl.origin;
  const volta = (q: string) => {
    const r = NextResponse.redirect(`${origem}/relatorios?aba=rd&rd=${q}`);
    r.cookies.delete("rd_state");
    return r;
  };

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origem}/login`);
  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const papel = (eu as { role: string } | null)?.role;
  if (papel !== "gerente" && papel !== "lider") return NextResponse.redirect(`${origem}/relatorios`);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const esperado = req.cookies.get("rd_state")?.value;
  if (req.nextUrl.searchParams.get("error") || !code) return volta("negado");
  // O RD devolve o state na volta; se vier, precisa ser o que geramos.
  if (!esperado || (state && state !== esperado)) return volta("invalido");

  try {
    await concluirConexaoRD(code, user.id);
  } catch {
    return volta("erro");
  }
  return volta("conectado");
}

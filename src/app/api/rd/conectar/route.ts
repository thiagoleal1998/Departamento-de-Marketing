import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { RD_AUTORIZAR, rdConfigurado } from "@/lib/rd";

/** Início da conexão com o RD Station (só a liderança): leva a pessoa à tela de autorização do RD. */
export async function GET(req: NextRequest) {
  const origem = req.nextUrl.origin;
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origem}/login`);
  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const papel = (eu as { role: string } | null)?.role;
  if (papel !== "gerente" && papel !== "lider") return NextResponse.redirect(`${origem}/relatorios`);
  if (!rdConfigurado()) return NextResponse.redirect(`${origem}/relatorios?aba=rd&rd=nao_configurado`);

  const state = randomBytes(16).toString("base64url");
  const url = new URL(RD_AUTORIZAR);
  url.searchParams.set("client_id", process.env.RD_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${origem}/api/rd/callback`);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("rd_state", state, { httpOnly: true, secure: origem.startsWith("https"), sameSite: "lax", path: "/api/rd", maxAge: 600 });
  return res;
}

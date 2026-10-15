import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { CANVA_AUTORIZAR, CANVA_ESCOPOS, canvaConfigurado } from "@/lib/canva";

export async function GET(req: NextRequest) {
  const origem = req.nextUrl.origin;
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origem}/login`);
  if (!canvaConfigurado()) {
    return NextResponse.redirect(`${origem}/criacao?canva=nao_configurado`);
  }

  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(16).toString("base64url");

  const url = new URL(CANVA_AUTORIZAR);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.CANVA_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${origem}/api/canva/callback`);
  url.searchParams.set("scope", CANVA_ESCOPOS);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "s256");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  const opts = {
    httpOnly: true,
    secure: origem.startsWith("https"),
    sameSite: "lax" as const,
    path: "/api/canva",
    maxAge: 600,
  };
  res.cookies.set("canva_verifier", verifier, opts);
  res.cookies.set("canva_state", state, opts);
  return res;
}

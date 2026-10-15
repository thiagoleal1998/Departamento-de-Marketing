import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export const CANVA_AUTORIZAR = "https://www.canva.com/api/oauth/authorize";
const CANVA_API = "https://api.canva.com/rest/v1";
export const CANVA_ESCOPOS = [
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "asset:read",
  "asset:write",
  "profile:read",
  "folder:read",
  "folder:write",
  "brandtemplate:meta:read",
  "brandtemplate:content:read",
  "brandtemplate:content:write",
].join(" ");

export function canvaConfigurado(): boolean {
  return Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET);
}

function chave(): Buffer {
  const bruto = process.env.SENHAS_CHAVE?.trim() ?? "";
  const buf = /^[0-9a-fA-F]{64}$/.test(bruto)
    ? Buffer.from(bruto, "hex")
    : Buffer.from(bruto, "base64");
  if (buf.length !== 32) throw new Error("SENHAS_CHAVE inválida");
  return buf;
}

function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64")).join(".");
}

function decifrar(valor: string): string {
  const [iv, tag, dados] = valor.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
}

interface RespostaToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

function basicAuth(): string {
  const { CANVA_CLIENT_ID: id, CANVA_CLIENT_SECRET: secret } = process.env;
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function pedirToken(corpo: Record<string, string>): Promise<RespostaToken> {
  const res = await fetch(`${CANVA_API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(corpo),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Canva recusou o token (${res.status})`);
  return (await res.json()) as RespostaToken;
}

async function salvar(userId: string, t: RespostaToken, nome?: string | null) {
  const admin = criarClienteAdmin();
  const linha: Record<string, unknown> = {
    user_id: userId,
    access_cifrado: cifrar(t.access_token),
    refresh_cifrado: cifrar(t.refresh_token),
    expira_em: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (nome !== undefined) linha.canva_nome = nome;
  const { error } = await admin.from("canva_conexoes").upsert(linha);
  if (error) throw new Error(error.message);
}

/** Troca o código do OAuth por tokens e guarda a conexão da pessoa. */
export async function concluirConexao(
  userId: string,
  code: string,
  verifier: string,
  redirectUri: string
) {
  const t = await pedirToken({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
  });
  let nome: string | null = null;
  try {
    const r = await fetch(`${CANVA_API}/users/me/profile`, {
      headers: { Authorization: `Bearer ${t.access_token}` },
      cache: "no-store",
    });
    if (r.ok) {
      const j = (await r.json()) as { profile?: { display_name?: string } };
      nome = j.profile?.display_name ?? null;
    }
  } catch {
    nome = null;
  }
  await salvar(userId, t, nome);
}

export async function conexaoDoUsuario(userId: string) {
  const admin = criarClienteAdmin();
  const { data } = await admin
    .from("canva_conexoes")
    .select("canva_nome, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data as { canva_nome: string | null; created_at: string } | null;
}

export async function removerConexao(userId: string) {
  const admin = criarClienteAdmin();
  await admin.from("canva_conexoes").delete().eq("user_id", userId);
}

async function tokenValido(userId: string): Promise<string | null> {
  const admin = criarClienteAdmin();
  const { data } = await admin
    .from("canva_conexoes")
    .select("access_cifrado, refresh_cifrado, expira_em")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expira_em).getTime() > Date.now()) {
    return decifrar(data.access_cifrado);
  }
  try {
    const t = await pedirToken({
      grant_type: "refresh_token",
      refresh_token: decifrar(data.refresh_cifrado),
    });
    await salvar(userId, t);
    return t.access_token;
  } catch {
    await removerConexao(userId);
    return null;
  }
}

export async function canvaFetch<T>(
  userId: string,
  caminho: string,
  init?: RequestInit
): Promise<{ dados?: T; erro?: string }> {
  const token = await tokenValido(userId);
  if (!token) return { erro: "Conecte sua conta do Canva novamente." };
  const res = await fetch(`${CANVA_API}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) return { erro: `Canva respondeu ${res.status}.` };
  return { dados: (await res.json()) as T };
}

"use server";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoSenhaAcesso = { ok?: boolean; erro?: string };

/** Chave AES-256 (32 bytes) em SENHAS_CHAVE — hex (64 chars) ou base64. */
function obterChave(): Buffer | null {
  const bruto = process.env.SENHAS_CHAVE?.trim();
  if (!bruto) return null;
  const buf = /^[0-9a-fA-F]{64}$/.test(bruto)
    ? Buffer.from(bruto, "hex")
    : Buffer.from(bruto, "base64");
  return buf.length === 32 ? buf : null;
}

function cifrar(texto: string, chave: Buffer): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave, iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return [iv, tag, dados].map((b) => b.toString("base64")).join(".");
}

function decifrar(valor: string, chave: Buffer): string {
  const [iv, tag, dados] = valor.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", chave, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
}

async function exigirGerente() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null, erro: "Sessão expirada. Entre novamente." };
  }
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "gerente") {
    return { supabase, user, erro: "Apenas gerentes podem alterar senhas." };
  }
  return { supabase, user, erro: null as string | null };
}

/** Cria ou atualiza um acesso. Senha vazia na edição mantém a atual. */
export async function salvarSenhaAcesso(
  id: string | null,
  valores: {
    servico: string;
    url: string;
    usuario: string;
    senha: string;
    observacoes: string;
  }
): Promise<EstadoSenhaAcesso> {
  const { supabase, user, erro } = await exigirGerente();
  if (erro || !user) return { erro: erro ?? "Sessão expirada." };

  const servico = valores.servico.trim();
  if (!servico) return { erro: "Informe o serviço." };
  if (!id && !valores.senha) return { erro: "Informe a senha." };

  const payload: Record<string, string | null> = {
    servico,
    url: valores.url.trim() || null,
    usuario: valores.usuario.trim() || null,
    observacoes: valores.observacoes.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (valores.senha) {
    const chave = obterChave();
    if (!chave) {
      return {
        erro: "A chave de criptografia (SENHAS_CHAVE) não está configurada no servidor.",
      };
    }
    payload.senha_cifrada = cifrar(valores.senha, chave);
  }

  const q = id
    ? supabase.from("senhas_acesso").update(payload).eq("id", id)
    : supabase.from("senhas_acesso").insert({ ...payload, criado_por: user.id });
  const { error } = await q;
  if (error) return { erro: "Não foi possível salvar. Tente novamente." };

  revalidatePath("/operacional/senhas");
  return { ok: true };
}

export async function excluirSenhaAcesso(
  id: string
): Promise<EstadoSenhaAcesso> {
  const { supabase, erro } = await exigirGerente();
  if (erro) return { erro };
  const { error } = await supabase.from("senhas_acesso").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir." };
  revalidatePath("/operacional/senhas");
  return { ok: true };
}

/** Devolve a senha em texto (somente usuários autenticados, sob demanda). */
export async function revelarSenhaAcesso(
  id: string
): Promise<{ senha?: string; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const chave = obterChave();
  if (!chave) {
    return {
      erro: "A chave de criptografia (SENHAS_CHAVE) não está configurada.",
    };
  }
  const { data } = await supabase
    .from("senhas_acesso")
    .select("senha_cifrada")
    .eq("id", id)
    .single();
  if (!data?.senha_cifrada) return { erro: "Senha não encontrada." };
  try {
    return { senha: decifrar(data.senha_cifrada, chave) };
  } catch {
    return { erro: "Não foi possível descriptografar esta senha." };
  }
}

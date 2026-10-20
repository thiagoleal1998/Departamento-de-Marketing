"use server";

import { revalidatePath } from "next/cache";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import {
  BUCKET_PLANOS,
  MAX_ANEXOS_PLANO,
  MAX_BYTES_PLANO,
  TIPOS_PLANO,
  type DadosPlano,
} from "./plano-tipos";

const texto = (v: unknown, max = 5000) => String(v ?? "").slice(0, max);
const dataOuNulo = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : null);

/**
 * Salva o plano. A liderança edita tudo; o colaborador só marca o que já fez
 * (objetivos e checklist).
 */
export async function salvarPlano(
  planoId: string,
  dados: DadosPlano
): Promise<{ ok?: true; erro?: string }> {
  const usuario = await exigirUsuario();
  const supabase = await criarClienteServidor();

  const { data: atual } = await supabase
    .from("planos_acao")
    .select("id, colaborador_id, objetivos, checklist")
    .eq("id", planoId)
    .maybeSingle();
  if (!atual) return { erro: "Plano não encontrado ou sem permissão." };

  let alteracoes: Record<string, unknown>;

  if (ehLideranca(usuario.role)) {
    if (!texto(dados.descricao).trim()) return { erro: "Descreva o plano antes de salvar." };
    alteracoes = {
      titulo: texto(dados.titulo, 200).trim() || null,
      descricao: texto(dados.descricao, 20000).trim(),
      resultado_esperado: texto(dados.resultado_esperado, 5000).trim() || null,
      prazo: dataOuNulo(dados.prazo),
      proxima_conversa: dataOuNulo(dados.proxima_conversa),
      status: ["aberto", "em_andamento", "concluido"].includes(dados.status) ? dados.status : "aberto",
      objetivos: dados.objetivos
        .filter((o) => o.texto.trim())
        .map((o) => ({
          id: texto(o.id, 40),
          horizonte: ["curto", "medio", "longo"].includes(o.horizonte) ? o.horizonte : "curto",
          texto: texto(o.texto, 1000),
          prazo: dataOuNulo(o.prazo),
          feito: !!o.feito,
        })),
      checklist: dados.checklist
        .filter((i) => i.texto.trim())
        .map((i) => ({ id: texto(i.id, 40), texto: texto(i.texto, 500), feito: !!i.feito })),
      anexos: dados.anexos.slice(0, MAX_ANEXOS_PLANO).map((a) => ({
        caminho: texto(a.caminho, 300),
        nome: texto(a.nome, 200),
        tipo: texto(a.tipo, 100),
        tamanho: Number(a.tamanho) || 0,
      })),
      proficiencia: dados.proficiencia
        .filter((p) => p.competencia.trim())
        .map((p) => ({
          id: texto(p.id, 40),
          competencia: texto(p.competencia, 200),
          nota: Math.min(10, Math.max(0, Number(p.nota) || 0)),
          data: dataOuNulo(p.data) ?? new Date().toISOString().slice(0, 10),
          observacao: texto(p.observacao, 2000),
        })),
      updated_at: new Date().toISOString(),
    };
  } else {
    // Colaborador: só atualiza os "feitos" dos itens que já existem.
    const feitos = new Map(
      [...dados.objetivos, ...dados.checklist].map((x) => [x.id, !!x.feito])
    );
    const marca = <T extends { id: string; feito: boolean }>(lista: unknown) =>
      ((lista as T[] | null) ?? []).map((x) => ({ ...x, feito: feitos.has(x.id) ? feitos.get(x.id)! : x.feito }));
    alteracoes = {
      objetivos: marca(atual.objetivos),
      checklist: marca(atual.checklist),
      updated_at: new Date().toISOString(),
    };
  }

  const { data: gravado, error } = await supabase
    .from("planos_acao")
    .update(alteracoes)
    .eq("id", planoId)
    .select("id");
  if (!error && (gravado?.length ?? 0) === 0) return { erro: "Você não tem permissão para editar este plano." };
  if (error) return { erro: "Não foi possível salvar. Tente novamente." };

  revalidatePath(`/desenvolvimento/plano/${planoId}`);
  revalidatePath("/desenvolvimento");
  revalidatePath(`/desenvolvimento/colaborador/${atual.colaborador_id}`);
  return { ok: true };
}

/** Endereço de envio assinado: o arquivo vai direto do navegador para o armazenamento. */
export async function prepararEnvioPlano(
  planoId: string,
  nome: string,
  tipo: string,
  tamanho: number
): Promise<{ caminho?: string; token?: string; erro?: string }> {
  const usuario = await exigirUsuario();
  if (!ehLideranca(usuario.role)) return { erro: "Só a liderança pode anexar documentos." };
  if (!servicoDisponivel()) return { erro: "Envio de arquivos indisponível." };
  if (!TIPOS_PLANO.includes(tipo)) {
    return { erro: "Use PDF, imagens (PNG, JPG, GIF, WebP) ou documentos do Office." };
  }
  if (tamanho > MAX_BYTES_PLANO) return { erro: "Cada arquivo pode ter no máximo 25 MB." };

  // O plano precisa ser visível para quem envia (RLS).
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("planos_acao").select("id").eq("id", planoId).maybeSingle();
  if (!data) return { erro: "Plano não encontrado ou sem permissão." };

  const seguro = nome.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const caminho = `${planoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${seguro}`;
  const { data: url, error } = await criarClienteAdmin()
    .storage.from(BUCKET_PLANOS)
    .createSignedUploadUrl(caminho);
  if (error || !url) return { erro: "Não foi possível preparar o envio. Tente novamente." };
  return { caminho, token: url.token };
}

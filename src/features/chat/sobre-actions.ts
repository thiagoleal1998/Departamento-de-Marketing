"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarAtas, itemAberto } from "@/features/atas/data";
import { estadoVivoPorSerie } from "@/features/atas/vivo";
import { avisarNovaMensagem } from "./aviso";
import type { AlvoChat, SobreEscolhido } from "./sobre-tipos";

const FUSO = "America/Sao_Paulo";
const diaMes = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO }) : null;

/** Tarefas abertas do quadro e tópicos abertos da última ata, para a pessoa escolher sobre o que vai falar. */
export async function alvosParaChat(): Promise<AlvoChat[]> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: ts }, { data: ps }, { reunioes, itens }] = await Promise.all([
    supabase
      .from("tarefas")
      .select("id, titulo, prazo, responsavel_id, ata_serie")
      .neq("status", "concluida")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("profiles").select("id, nome"),
    carregarAtas(),
  ]);
  const nomes = new Map(((ps as { id: string; nome: string }[] | null) ?? []).map((p) => [p.id, p.nome.split(" ")[0]]));
  const detalhe = (resp: string | null | undefined, prazo: string | null) =>
    [resp ? nomes.get(resp) ?? resp : null, prazo ? "até " + diaMes(prazo) : null].filter(Boolean).join(" · ");

  const out: AlvoChat[] = [];

  // Tópicos da última ata ainda abertos (o andamento vale o da tarefa ligada).
  const ultima = reunioes[reunioes.length - 1];
  const daUltima = ultima ? itens.filter((i) => i.reuniao_id === ultima.id && i.secao === "ata") : [];
  const vivo = await estadoVivoPorSerie(daUltima);
  const seriesDaAta = new Set<string>();
  for (const it of daUltima) {
    const v = vivo.get(it.serie);
    if (!itemAberto(v?.status ?? it.status)) continue;
    seriesDaAta.add(it.serie);
    out.push({
      chave: "ata:" + it.id,
      tipo: "ata",
      titulo: it.titulo,
      tarefaId: v?.tarefa_id ?? null,
      detalhe: detalhe(v?.responsavel_id ?? it.responsavel_id, v?.prazo ?? it.prazo) || it.responsaveis_texto || "",
    });
  }

  // Demais tarefas abertas (as que já vieram da ata ficam só como tópico, sem repetir).
  const jaListadas = new Set(out.map((a) => a.tarefaId).filter(Boolean));
  for (const t of (ts as { id: string; titulo: string; prazo: string | null; responsavel_id: string | null; ata_serie: string | null }[] | null) ?? []) {
    if (jaListadas.has(t.id) || (t.ata_serie && seriesDaAta.has(t.ata_serie))) continue;
    out.push({ chave: "tarefa:" + t.id, tipo: "tarefa", titulo: t.titulo, tarefaId: t.id, detalhe: detalhe(t.responsavel_id, t.prazo) });
  }
  return out;
}

/** Envia uma mensagem comentando uma tarefa e/ou um tópico da ata. */
export async function enviarMensagemSobre(
  conversaId: string,
  texto: string,
  sobre: SobreEscolhido,
  respostaA: string | null = null
): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const limpo = texto.trim();
  if (!limpo) return { erro: "Escreva a mensagem." };

  let tarefaId: string | null = null;
  if (sobre.tarefaId) {
    const { data: t } = await supabase.from("tarefas").select("id").eq("id", sobre.tarefaId).maybeSingle();
    tarefaId = (t as { id: string } | null)?.id ?? null;
  }
  // Tópico da ata ou item do calendário: o título abre a mensagem (a tarefa ligada, se houver, mostra o cartão logo abaixo).
  const titulo = sobre.titulo.trim().slice(0, 200);
  const abertura = sobre.tipo === "ata" ? `📋 Tópico da ata: ${titulo}` : sobre.tipo === "calendario" ? `📅 Item do calendário: ${titulo}` : null;
  const mensagem = (abertura ? `${abertura}\n${limpo}` : limpo).slice(0, 2000);

  const base: { conversa_id: string; autor_id: string; texto: string; tarefa_id: string | null; resposta_a?: string } = { conversa_id: conversaId, autor_id: user.id, texto: mensagem, tarefa_id: tarefaId };
  let { error } = await supabase.from("chat_mensagens").insert(respostaA ? { ...base, resposta_a: respostaA } : base);
  if (error && respostaA && (error.code === "42703" || error.code === "PGRST204")) {
    ({ error } = await supabase.from("chat_mensagens").insert(base));
  }
  if (error) return { erro: "Não foi possível enviar. Tente novamente." };

  await avisarNovaMensagem(supabase, user.id, conversaId, mensagem);
  revalidatePath("/operacional");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { avisarNovaMensagem } from "./aviso";
import {
  BUCKET_SOLICITACOES,
  MAX_BYTES_PROVA,
  STATUS_SOLICITACAO_ROTULO,
  TIPOS_PROVA,
  metaDoTipo,
  type NovaSolicitacao,
  type SolicitacaoView,
  type StatusSolicitacao,
} from "./solicitacao-tipos";

type Resultado = { ok?: boolean; erro?: string };
const MIGRACAO = "As solicitações de criação ainda não foram ativadas no banco (migration 0055).";
const MIGRACAO_EDICAO = "A edição de solicitações ainda não foi ativada no banco (migration 0056).";
const semTabela = (c?: string) => c === "42P01" || c === "PGRST205" || c === "42703" || c === "PGRST204";

/** Situação da tarefa que acompanha cada situação da solicitação. */
const STATUS_TAREFA: Record<StatusSolicitacao, string | null> = {
  solicitada: "a_fazer",
  em_andamento: "em_andamento",
  concluida: "concluida",
  cancelada: null, // a tarefa é retirada do quadro
};

async function usuario() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function validar(d: NovaSolicitacao) {
  const meta = metaDoTipo(d.tipo);
  const produto = d.produto.trim().slice(0, 200);
  const solicitante = d.solicitante.trim().slice(0, 120);
  const link = d.linkReferencia.trim().slice(0, 1000);
  const detalhes = d.detalhes.trim().slice(0, 3000);
  const prazo = /^\d{4}-\d{2}-\d{2}$/.test(d.prazo ?? "") ? d.prazo : null;

  let erro: string | null = null;
  if (!produto) erro = `Informe: ${meta.rotuloProduto.toLowerCase()}.`;
  else if (!solicitante) erro = "Informe quem solicitou.";
  else if (meta.exigeReferencia && !link) erro = "Informe o link de referência.";
  else if (link && !/^https?:\/\//i.test(link)) erro = "O link de referência deve começar com http:// ou https://.";
  else if (meta.exigeProva && !d.prova) erro = "Anexe o print de prova da solicitação.";
  return { meta, produto, solicitante, link, detalhes, prazo, erro };
}

/** Descrição da tarefa criada a partir da solicitação. */
function descricaoTarefa(v: { solicitante: string; link: string; detalhes: string; prazo: string | null }): string {
  return [
    `Solicitado por: ${v.solicitante}`,
    v.link ? `Referência: ${v.link}` : null,
    v.detalhes ? `\n${v.detalhes}` : null,
    "\n(Pedido feito pelo chat; o print de prova está no cartão da solicitação.)",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Endereço de envio assinado para o print de prova (vai direto do navegador ao armazenamento). */
export async function prepararEnvioProva(
  nome: string,
  tipo: string,
  tamanho: number
): Promise<{ caminho?: string; token?: string; erro?: string }> {
  const { user } = await usuario();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!servicoDisponivel()) return { erro: "Envio de arquivos indisponível." };
  if (!TIPOS_PROVA.includes(tipo)) return { erro: "Use uma imagem (PNG, JPG, WebP, GIF) ou PDF." };
  if (tamanho > MAX_BYTES_PROVA) return { erro: "O arquivo pode ter no máximo 10 MB." };

  const seguro = nome.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const caminho = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${seguro}`;
  const { data, error } = await criarClienteAdmin().storage.from(BUCKET_SOLICITACOES).createSignedUploadUrl(caminho);
  if (error || !data) return { erro: "Não foi possível preparar o envio. Tente novamente." };
  return { caminho, token: data.token };
}

/** Cria a solicitação, mostra o cartão na conversa e (se houver executor) cria a tarefa no quadro. */
export async function criarSolicitacaoChat(conversaId: string, d: NovaSolicitacao): Promise<Resultado> {
  const { supabase, user } = await usuario();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const v = validar(d);
  if (v.erro) return { erro: v.erro };

  const { data: sol, error } = await supabase
    .from("chat_solicitacoes")
    .insert({
      conversa_id: conversaId,
      tipo: d.tipo,
      produto: v.produto,
      link_referencia: v.link || null,
      solicitante: v.solicitante,
      prazo: v.prazo,
      detalhes: v.detalhes || null,
      prova_caminho: d.prova?.caminho ?? null,
      prova_nome: d.prova?.nome?.slice(0, 200) ?? null,
      criado_por: user.id,
    })
    .select("id")
    .single();
  if (error || !sol) return { erro: semTabela(error?.code) ? MIGRACAO : "Não foi possível criar a solicitação." };
  const solId = (sol as { id: string }).id;

  // Tarefa para quem vai executar (criada com a chave de serviço: colaboradores também pedem).
  let tarefaId: string | null = null;
  if (d.executorId && servicoDisponivel()) {
    const admin = criarClienteAdmin();
    const { data: dest } = await admin.from("profiles").select("id").eq("id", d.executorId).eq("ativo", true).maybeSingle();
    if (dest) {
      const { data: t } = await admin
        .from("tarefas")
        .insert({
          titulo: `${v.meta.rotulo}: ${v.produto}`.slice(0, 200),
          descricao: descricaoTarefa(v),
          status: "a_fazer",
          responsavel_id: d.executorId,
          prazo: v.prazo ? `${v.prazo}T12:00:00-03:00` : null,
          tag: "Solicitação",
          link: v.link || null,
        })
        .select("id")
        .single();
      tarefaId = (t as { id: string } | null)?.id ?? null;
      if (tarefaId) {
        await supabase.from("chat_solicitacoes").update({ tarefa_id: tarefaId }).eq("id", solId); // coluna da 0056 (ignora se faltar)
        if (d.executorId !== user.id) {
          await admin.from("notificacoes").insert({
            destinatario_id: d.executorId,
            tipo: "tarefa",
            titulo: `Nova solicitação: ${v.meta.rotulo.toLowerCase()} — ${v.produto}`,
            link: "/operacional?tarefa=" + tarefaId,
          });
        }
      }
    }
  }

  const texto = `📋 Solicitação de ${v.meta.rotulo.toLowerCase()}: ${v.produto}`;
  const { error: errMsg } = await supabase
    .from("chat_mensagens")
    .insert({ conversa_id: conversaId, autor_id: user.id, texto, solicitacao_id: solId, ...(tarefaId ? { tarefa_id: tarefaId } : {}) });
  if (errMsg) return { erro: semTabela(errMsg.code) ? MIGRACAO : "A solicitação foi criada, mas não foi possível avisar na conversa." };

  await avisarNovaMensagem(supabase, user.id, conversaId, texto);
  revalidatePath("/chat");
  revalidatePath("/operacional");
  return { ok: true };
}

/** Quem criou a solicitação edita; o cartão passa a mostrar "Editado" e a tarefa acompanha. */
export async function editarSolicitacaoChat(id: string, d: NovaSolicitacao): Promise<Resultado> {
  const { supabase, user } = await usuario();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const { data: atual } = await supabase.from("chat_solicitacoes").select("id, criado_por, tarefa_id").eq("id", id).maybeSingle();
  const s = atual as { id: string; criado_por: string | null; tarefa_id?: string | null } | null;
  if (!s) return { erro: "Solicitação não encontrada." };
  if (s.criado_por !== user.id) return { erro: "Só quem fez a solicitação pode editá-la." };

  const v = validar(d);
  if (v.erro) return { erro: v.erro };

  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("chat_solicitacoes")
    .update({
      tipo: d.tipo,
      produto: v.produto,
      link_referencia: v.link || null,
      solicitante: v.solicitante,
      prazo: v.prazo,
      detalhes: v.detalhes || null,
      prova_caminho: d.prova?.caminho ?? null,
      prova_nome: d.prova?.nome?.slice(0, 200) ?? null,
      editado_em: agora,
      updated_at: agora,
    })
    .eq("id", id);
  if (error) return { erro: semTabela(error.code) ? MIGRACAO_EDICAO : "Não foi possível salvar a edição." };

  if (s.tarefa_id && servicoDisponivel()) {
    await criarClienteAdmin()
      .from("tarefas")
      .update({
        titulo: `${v.meta.rotulo}: ${v.produto}`.slice(0, 200),
        descricao: descricaoTarefa(v),
        prazo: v.prazo ? `${v.prazo}T12:00:00-03:00` : null,
        link: v.link || null,
      })
      .eq("id", s.tarefa_id);
  }

  revalidatePath("/chat");
  revalidatePath("/operacional");
  return { ok: true };
}

/** Dados da solicitação para o cartão (com link temporário do print). */
export async function dadosSolicitacao(id: string): Promise<SolicitacaoView | null> {
  const { supabase, user } = await usuario();
  if (!user) return null;

  const { data } = await supabase.from("chat_solicitacoes").select("*").eq("id", id).maybeSingle();
  const s = data as {
    id: string;
    tipo: string;
    produto: string;
    link_referencia: string | null;
    solicitante: string;
    prazo: string | null;
    detalhes: string | null;
    prova_caminho: string | null;
    prova_nome: string | null;
    status: StatusSolicitacao;
    criado_por: string | null;
    created_at: string;
    editado_em?: string | null;
    tarefa_id?: string | null;
  } | null;
  if (!s) return null;

  let provaUrl: string | null = null;
  if (s.prova_caminho && servicoDisponivel()) {
    const { data: u } = await criarClienteAdmin().storage.from(BUCKET_SOLICITACOES).createSignedUrl(s.prova_caminho, 3600);
    provaUrl = u?.signedUrl ?? null;
  }
  let criadoPorNome: string | null = null;
  if (s.criado_por && servicoDisponivel()) {
    const { data: p } = await criarClienteAdmin().from("profiles").select("nome").eq("id", s.criado_por).maybeSingle();
    criadoPorNome = (p as { nome: string } | null)?.nome ?? null;
  }

  return {
    id: s.id,
    tipo: s.tipo,
    produto: s.produto,
    linkReferencia: s.link_referencia,
    solicitante: s.solicitante,
    prazo: s.prazo,
    detalhes: s.detalhes,
    provaNome: s.prova_nome,
    provaCaminho: s.prova_caminho,
    provaUrl,
    provaEhImagem: /\.(png|jpe?g|webp|gif)$/i.test(s.prova_nome ?? s.prova_caminho ?? ""),
    status: s.status,
    criadoPorNome,
    criadoEm: s.created_at,
    editadoEm: s.editado_em ?? null,
    podeEditar: s.criado_por === user.id,
    tarefaId: s.tarefa_id ?? null,
  };
}

/** Atualiza o andamento da solicitação, acompanha a tarefa e avisa na conversa. */
export async function atualizarStatusSolicitacao(id: string, status: StatusSolicitacao): Promise<Resultado> {
  const { supabase, user } = await usuario();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!(status in STATUS_SOLICITACAO_ROTULO)) return { erro: "Situação inválida." };

  const { data, error } = await supabase
    .from("chat_solicitacoes")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error || !data) return { erro: "Não foi possível atualizar a solicitação." };
  const s = data as { conversa_id: string; produto: string; tipo: string; tarefa_id?: string | null };

  // A tarefa do quadro acompanha a situação da solicitação.
  if (s.tarefa_id && servicoDisponivel()) {
    const admin = criarClienteAdmin();
    const alvo = STATUS_TAREFA[status];
    if (alvo) await admin.from("tarefas").update({ status: alvo }).eq("id", s.tarefa_id);
    else await admin.from("tarefas").delete().eq("id", s.tarefa_id);
  }

  const { data: eu } = await supabase.from("profiles").select("nome").eq("id", user.id).single();
  const quem = (eu as { nome: string } | null)?.nome ?? "Alguém";
  const texto = `📋 ${quem} marcou a solicitação de ${metaDoTipo(s.tipo).rotulo.toLowerCase()} “${s.produto}” como ${STATUS_SOLICITACAO_ROTULO[status].toLowerCase()}.`;
  await supabase.from("chat_mensagens").insert({ conversa_id: s.conversa_id, autor_id: user.id, texto, solicitacao_id: id });
  await avisarNovaMensagem(supabase, user.id, s.conversa_id, texto);

  revalidatePath("/chat");
  revalidatePath("/operacional");
  return { ok: true };
}

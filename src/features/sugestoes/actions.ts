"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { idsPorPapel, notificar } from "@/features/notificacoes/enviar";
import { MAX_ANEXOS, TIPOS_ANEXO, type AnexoSugestao } from "./anexos";
import type { SugestaoStatus, SugestaoTipo } from "@/types/database";

const TIPOS: SugestaoTipo[] = ["ideia", "problema", "elogio"];
const STATUS: SugestaoStatus[] = [
  "nova",
  "em_analise",
  "planejada",
  "concluida",
  "descartada",
];

export type EstadoSugestao = { ok?: boolean; erro?: string };

/** Qualquer usuário autenticado envia uma sugestão/relato. */
export async function enviarSugestao(
  _prev: EstadoSugestao,
  formData: FormData
): Promise<EstadoSugestao> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const tipoRaw = String(formData.get("tipo") ?? "ideia") as SugestaoTipo;
  const tipo = TIPOS.includes(tipoRaw) ? tipoRaw : "ideia";
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();

  if (!titulo) return { erro: "Dê um título para o seu relato." };
  if (!descricao) return { erro: "Conte um pouco mais nos detalhes." };
  if (titulo.length > 140) return { erro: "O título está muito longo." };

  // Anexos já enviados ao armazenamento; só aceita arquivos da própria pessoa.
  let anexos: AnexoSugestao[] = [];
  try {
    const bruto = JSON.parse(String(formData.get("anexos") ?? "[]"));
    if (Array.isArray(bruto)) {
      anexos = bruto
        .filter(
          (x): x is AnexoSugestao =>
            typeof x?.caminho === "string" &&
            x.caminho.startsWith(`${user.id}/`) &&
            typeof x?.nome === "string" &&
            TIPOS_ANEXO.includes(x?.tipo)
        )
        .slice(0, MAX_ANEXOS)
        .map((x) => ({
          caminho: x.caminho,
          nome: x.nome.slice(0, 120),
          tipo: x.tipo,
          tamanho: Number(x.tamanho) || 0,
        }));
    }
  } catch {
    anexos = [];
  }

  const { error } = await supabase
    .from("sugestoes")
    .insert({
      tipo,
      titulo,
      descricao,
      autor_id: user.id,
      ...(anexos.length > 0 ? { anexos } : {}),
    });
  if (error) {
    console.error("[sugestoes] erro ao enviar:", error.code, error.message);
    // 42P01 / PGRST205: tabela inexistente (migration 0013 não aplicada).
    if (error.code === "42P01" || error.code === "PGRST205") {
      return {
        erro: "A área de feedback ainda não foi ativada no banco (migration 0013). Avise um gerente.",
      };
    }
    // 42501: bloqueado pela RLS (permissão).
    if (error.code === "42501") {
      return {
        erro: "Seu usuário não tem permissão para enviar. Avise um gerente.",
      };
    }
    return {
      erro: `Não foi possível enviar. Tente novamente. (código ${error.code ?? "?"})`,
    };
  }

  // Avisa a liderança (contador no menu + sino).
  const lideranca = await idsPorPapel(["gerente", "lider"], user.id);
  await notificar(lideranca, {
    tipo: "sugestao",
    titulo: `Novo feedback: ${titulo}`,
    link: "/sugestoes",
  });

  revalidatePath("/sugestoes");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Gerente atualiza o status e/ou responde. */
export async function atualizarSugestao(
  id: string,
  status: SugestaoStatus,
  resposta: string
): Promise<EstadoSugestao> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!STATUS.includes(status)) return { erro: "Status inválido." };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (perfil?.role !== "gerente") {
    return { erro: "Apenas gerentes podem responder." };
  }

  const texto = resposta.trim();
  const { data: anterior } = await supabase
    .from("sugestoes")
    .select("autor_id, titulo, status, resposta")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("sugestoes")
    .update({
      status,
      resposta: texto || null,
      respondido_por: texto ? user.id : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };

  // Avisa quem enviou quando houver resposta nova ou mudança de etapa.
  const ant = anterior as {
    autor_id: string;
    titulo: string;
    status: string;
    resposta: string | null;
  } | null;
  if (ant && ant.autor_id !== user.id) {
    const mudouStatus = ant.status !== status;
    const novaResposta = Boolean(texto) && texto !== (ant.resposta ?? "");
    if (mudouStatus || novaResposta) {
      await notificar([ant.autor_id], {
        tipo: "sugestao_resposta",
        titulo: novaResposta
          ? `Seu feedback "${ant.titulo}" foi respondido`
          : `Seu feedback "${ant.titulo}" mudou de etapa`,
        link: "/sugestoes",
      });
    }
  }

  revalidatePath("/sugestoes");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Gerente renomeia uma etapa do kanban do Feedback. */
export async function renomearEtapaSugestao(
  status: SugestaoStatus,
  nome: string
): Promise<EstadoSugestao> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };
  if (!STATUS.includes(status)) return { erro: "Etapa inválida." };

  const limpo = nome.trim();
  if (!limpo) return { erro: "Informe um nome para a etapa." };
  if (limpo.length > 40) return { erro: "O nome está muito longo (máx. 40)." };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (perfil?.role !== "gerente") {
    return { erro: "Apenas gerentes podem renomear etapas." };
  }

  const { error } = await supabase
    .from("sugestoes_etapas")
    .upsert({ status, nome: limpo }, { onConflict: "status" });
  if (error) {
    return {
      erro:
        error.code === "42P01" || error.code === "PGRST205"
          ? "Rode a migration 0020 para editar os nomes das etapas."
          : "Não foi possível salvar o nome.",
    };
  }

  revalidatePath("/sugestoes");
  return { ok: true };
}

/** Gerente exclui uma sugestão. */
export async function excluirSugestao(id: string): Promise<EstadoSugestao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("sugestoes").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir." };
  revalidatePath("/sugestoes");
  return { ok: true };
}

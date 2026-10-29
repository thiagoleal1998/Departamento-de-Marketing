import { criarClienteAdmin } from "@/lib/supabase/admin";
import { diaBrasilia } from "@/lib/utils";

const FUSO = "America/Sao_Paulo";

export interface ItemAprovacao {
  id: string;
  titulo: string;
  descricao: string | null;
  responsavel: string | null;
  prazo: string | null;
  link: string | null;
}

export interface ResumoExecutivo {
  geradoEm: string;
  numeros: {
    tarefasAtivas: number;
    atrasadas: number;
    emAprovacao: number;
    chamadosAbertos: number;
    projetosAndamento: number;
    itensZerados: number;
  };
  paraAprovar: ItemAprovacao[];
  atrasadas: { id: string; titulo: string; responsavel: string | null; prazo: string }[];
  semana: { id: string; nome: string; data: string; tipo: string | null; status: string }[];
  alteracoesComercial: { nome: string; secao: string; quando: string }[];
  estoqueZerado: string[];
  projetos: { id: string; nome: string; status: string; responsavel: string | null }[];
}

/** Data de hoje (AAAA-MM-DD) no horário de Brasília, deslocada em `dias`. */
export function dataBR(dias = 0): string {
  const d = new Date(Date.now() + dias * 86_400_000);
  return d.toLocaleDateString("en-CA", { timeZone: FUSO });
}

/**
 * Números e listas do marketing para a visão da diretoria. Lê com a chave de serviço (a página só
 * é aberta por quem tem a visão executiva), por isso a diretoria enxerga tudo sem editar nada.
 */
export async function obterResumoExecutivo(): Promise<ResumoExecutivo> {
  const admin = criarClienteAdmin();
  const hoje = dataBR();
  const fimSemana = dataBR(7);
  const setediasAtras = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [tarefasR, chamadosR, projetosR, calendarioR, alteracoesR, estoqueR, perfisR] = await Promise.all([
    admin
      .from("tarefas")
      .select("id, titulo, descricao, status, prazo, link, responsavel_id, responsaveis_notion")
      .neq("status", "concluida")
      .limit(1000),
    admin.from("chamados").select("id", { count: "exact", head: true }).not("status", "in", "(fechado,resolvido)"),
    admin.from("projetos").select("id, nome, status, responsavel_id").eq("status", "em_andamento").limit(30),
    admin
      .from("calendario_conteudo")
      .select("id, nome, data, tipo, status")
      .gte("data", hoje)
      .lte("data", fimSemana)
      .order("data", { ascending: true })
      .limit(40),
    admin
      .from("comercial_alteracoes")
      .select("nome, secao, detectado_em")
      .neq("tipo", "removido")
      .gte("detectado_em", setediasAtras)
      .order("detectado_em", { ascending: false })
      .limit(8),
    admin.from("estoque_itens").select("*").eq("ativo", true).lte("quantidade", 0).limit(60),
    admin.from("profiles").select("id, nome"),
  ]);

  const nomes = new Map(((perfisR.data as { id: string; nome: string }[] | null) ?? []).map((p) => [p.id, p.nome]));
  const tarefas =
    (tarefasR.data as {
      id: string;
      titulo: string;
      descricao: string | null;
      status: string;
      prazo: string | null;
      link: string | null;
      responsavel_id: string | null;
      responsaveis_notion: string | null;
    }[] | null) ?? [];
  const quem = (t: { responsavel_id: string | null; responsaveis_notion: string | null }) =>
    (t.responsavel_id ? nomes.get(t.responsavel_id) : null) ?? t.responsaveis_notion ?? null;

  const emAprovacao = tarefas.filter((t) => t.status.startsWith("aprovacao_"));
  const paraAprovar = tarefas
    .filter((t) => t.status === "aprovacao_marco")
    .map((t) => ({ id: t.id, titulo: t.titulo, descricao: t.descricao, responsavel: quem(t), prazo: t.prazo, link: t.link }));

  const atrasadas = tarefas
    .filter((t) => t.prazo && diaBrasilia(t.prazo) < hoje)
    .sort((a, b) => (a.prazo ?? "").localeCompare(b.prazo ?? ""))
    .map((t) => ({ id: t.id, titulo: t.titulo, responsavel: quem(t), prazo: t.prazo as string }));

  const projetos = ((projetosR.data as { id: string; nome: string; status: string; responsavel_id: string | null }[] | null) ?? []).map(
    (p) => ({ id: p.id, nome: p.nome, status: p.status, responsavel: p.responsavel_id ? nomes.get(p.responsavel_id) ?? null : null })
  );
  const zerados = ((estoqueR.data as { nome: string; cor: string | null; ignorar_alerta?: boolean }[] | null) ?? [])
    .filter((i) => !i.ignorar_alerta) // produtos pontuais não entram no aviso
    .slice(0, 20)
    .map((i) => (i.cor ? `${i.nome} (${i.cor})` : i.nome));

  return {
    geradoEm: new Date().toISOString(),
    numeros: {
      tarefasAtivas: tarefas.length,
      atrasadas: atrasadas.length,
      emAprovacao: emAprovacao.length,
      chamadosAbertos: chamadosR.count ?? 0,
      projetosAndamento: projetos.length,
      itensZerados: zerados.length,
    },
    paraAprovar,
    atrasadas: atrasadas.slice(0, 8),
    semana: (calendarioR.data as ResumoExecutivo["semana"] | null) ?? [],
    alteracoesComercial: (
      (alteracoesR.data as { nome: string; secao: string; detectado_em: string }[] | null) ?? []
    ).map((a) => ({ nome: a.nome, secao: a.secao, quando: a.detectado_em })),
    estoqueZerado: zerados,
    projetos,
  };
}

import "server-only";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import type { StatusItem } from "./data";

export interface EstadoVivo {
  /** Tarefa do quadro ligada ao item (para abrir o card direto). */
  tarefa_id: string | null;
  status: StatusItem;
  prazo: string | null;
  responsavel_id: string | null;
  prioridade: number | null;
}

export const tarefaParaItem = (s: string): StatusItem =>
  s === "concluida" ? "concluido" : s === "a_fazer" ? "nao_iniciado" : "em_andamento";

export const itemParaTarefa = (s: StatusItem | null) =>
  s === "concluido" || s === "cancelado"
    ? "concluida"
    : s === "em_andamento"
      ? "em_andamento"
      : "a_fazer";

/**
 * Estado atual de cada assunto da ata, vindo da tarefa vinculada (o
 * responsável atualiza no kanban). Service role: o colaborador não enxerga as
 * tarefas dos outros pela RLS, mas precisa ver o andamento real.
 */
const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Itens da ata que ainda não têm tarefa vinculada (a tarefa só nasce quando a reunião é concluída) são
 * cruzados pelo título: se existe um card de mesmo título criado depois de o assunto entrar na ata, o
 * andamento dele vale para o item. Ex.: o card "Arte da Parede" foi concluído no quadro de Tarefas.
 */
async function cruzarPorTitulo(mapa: Map<string, EstadoVivo>, itens: { serie: string; titulo: string }[]) {
  const sem = itens.filter((i) => !mapa.has(i.serie));
  if (sem.length === 0) return;
  const admin = criarClienteAdmin();

  // Data em que cada assunto apareceu pela primeira vez numa ata.
  const primeira = new Map<string, string>();
  const series = Array.from(new Set(sem.map((i) => i.serie)));
  for (let i = 0; i < series.length; i += 100) {
    const { data } = await admin.from("reuniao_itens").select("serie, reunioes(data)").in("serie", series.slice(i, i + 100));
    for (const r of (data as unknown as { serie: string; reunioes: { data: string } | null }[] | null) ?? []) {
      const d = r.reunioes?.data;
      if (d && (!primeira.has(r.serie) || d < primeira.get(r.serie)!)) primeira.set(r.serie, d);
    }
  }

  // Cards sem vínculo com ata, do mais novo para o mais antigo (vale o mais recente de cada título).
  const porTitulo = new Map<string, { id: string; status: string; prazo: string | null; responsavel_id: string | null; prioridade: number | null; created_at: string }>();
  for (let off = 0; off < 10_000; off += 1000) {
    const { data } = await admin
      .from("tarefas")
      .select("id, titulo, status, prazo, responsavel_id, prioridade, created_at")
      .is("ata_serie", null)
      .order("created_at", { ascending: false })
      .range(off, off + 999);
    const lote = (data as { id: string; titulo: string; status: string; prazo: string | null; responsavel_id: string | null; prioridade: number | null; created_at: string }[] | null) ?? [];
    for (const t of lote) {
      const k = normalizar(t.titulo);
      if (k && !porTitulo.has(k)) porTitulo.set(k, t);
    }
    if (lote.length < 1000) break;
  }

  for (const it of sem) {
    const t = porTitulo.get(normalizar(it.titulo));
    const desde = primeira.get(it.serie);
    if (!t || (desde && t.created_at.slice(0, 10) < desde)) continue;
    mapa.set(it.serie, {
      tarefa_id: t.id,
      status: tarefaParaItem(t.status),
      prazo: t.prazo,
      responsavel_id: t.responsavel_id,
      prioridade: t.prioridade,
    });
  }
}

export async function estadoVivoPorSerie(itens: { serie: string; titulo: string }[] = []): Promise<Map<string, EstadoVivo>> {
  const mapa = new Map<string, EstadoVivo>();
  if (!servicoDisponivel()) return mapa;
  const { data } = await criarClienteAdmin()
    .from("tarefas")
    .select("id, ata_serie, status, prazo, responsavel_id, prioridade")
    .not("ata_serie", "is", null);
  for (const t of (data as
    | {
        id: string;
        ata_serie: string;
        status: string;
        prazo: string | null;
        responsavel_id: string | null;
        prioridade: number | null;
      }[]
    | null) ?? []) {
    mapa.set(t.ata_serie, {
      tarefa_id: t.id,
      status: tarefaParaItem(t.status),
      prazo: t.prazo,
      responsavel_id: t.responsavel_id,
      prioridade: t.prioridade,
    });
  }
  await cruzarPorTitulo(mapa, itens);
  return mapa;
}

import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";
import { normalizarLembretes, quandoLembrete } from "@/lib/lembretes";

const FUSO = "America/Sao_Paulo";
const DIA_MS = 86_400_000;

const diaBR = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const emDias = (a: string, b: string) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / DIA_MS);
const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export interface ResultadoLembretes {
  hoje: string;
  tarefas: number;
  calendario: number;
  erro?: string;
}

/**
 * Lembretes diários (8h, Brasília): para cada tarefa/item do calendário com lembrete marcado cujo dia de aviso é
 * hoje, notifica no sino e no navegador. Tarefas: responsável e colaborador. Calendário: os responsáveis (nomes
 * cruzados com os perfis); se ninguém for identificado, a liderança. Cada lembrete sai uma vez (lembretes_enviados).
 */
export async function executarLembretes(agora = new Date()): Promise<ResultadoLembretes> {
  const admin = criarClienteAdmin();
  const hoje = diaBR(agora);
  const resultado: ResultadoLembretes = { hoje, tarefas: 0, calendario: 0 };

  async function avisar(origem: "tarefa" | "calendario", origemId: string, dias: number, destinos: string[], titulo: string, link: string) {
    const ids = Array.from(new Set(destinos.filter(Boolean)));
    if (ids.length === 0) return false;
    const { error } = await admin.from("lembretes_enviados").insert({ origem, origem_id: origemId, dias, dia: hoje });
    if (error) return false; // já enviado hoje
    await admin.from("notificacoes").insert(ids.map((destinatario_id) => ({ destinatario_id, tipo: "lembrete", titulo, link })));
    await enviarPush(ids, { titulo, url: link, tag: `lembrete-${origem}-${origemId}` });
    return true;
  }

  // ---- Tarefas: prazo ----
  const { data: tarefas, error: erroTarefas } = await admin
    .from("tarefas")
    .select("id, titulo, prazo, responsavel_id, colaborador_id, lembretes")
    .neq("status", "concluida")
    .not("prazo", "is", null)
    .neq("lembretes", "{}");
  if (erroTarefas) return { ...resultado, erro: "Rode a migration 0073 no Supabase." };

  for (const t of (tarefas as { id: string; titulo: string; prazo: string; responsavel_id: string | null; colaborador_id: string | null; lembretes: number[] }[] | null) ?? []) {
    const dias = emDias(diaBR(new Date(t.prazo)), hoje);
    if (!normalizarLembretes(t.lembretes).includes(dias)) continue;
    const ok = await avisar("tarefa", t.id, dias, [t.responsavel_id ?? "", t.colaborador_id ?? ""], `Lembrete: o prazo de “${t.titulo}” é ${quandoLembrete(dias)}.`, "/operacional?tarefa=" + t.id);
    if (ok) resultado.tarefas++;
  }

  // ---- Calendário: data do item ----
  const limite = diaBR(new Date(agora.getTime() + 8 * DIA_MS));
  const { data: itens } = await admin
    .from("calendario_conteudo")
    .select("id, nome, data, status, responsaveis, lembretes")
    .gte("data", hoje)
    .lte("data", limite)
    .neq("lembretes", "{}");

  const { data: perfis } = await admin.from("profiles").select("id, nome, role").eq("ativo", true);
  const lista = (perfis as { id: string; nome: string; role: string }[] | null) ?? [];
  const lideranca = lista.filter((p) => p.role === "gerente" || p.role === "lider").map((p) => p.id);
  const idsDe = (nomes: string[]) => {
    const achados: string[] = [];
    for (const n of nomes.map(normalizar).filter(Boolean)) {
      const exato = lista.find((p) => normalizar(p.nome) === n);
      if (exato) {
        achados.push(exato.id);
        continue;
      }
      const porPrimeiroNome = lista.filter((p) => normalizar(p.nome).split(" ")[0] === n.split(" ")[0]);
      if (porPrimeiroNome.length === 1) achados.push(porPrimeiroNome[0].id);
    }
    return achados;
  };

  for (const i of (itens as { id: string; nome: string; data: string; status: string; responsaveis: string[]; lembretes: number[] }[] | null) ?? []) {
    if (/postado|conclu/i.test(i.status)) continue;
    const dias = emDias(i.data, hoje);
    if (!normalizarLembretes(i.lembretes).includes(dias)) continue;
    const destinos = idsDe(i.responsaveis ?? []);
    const ok = await avisar("calendario", i.id, dias, destinos.length > 0 ? destinos : lideranca, `Lembrete: “${i.nome}” está programado para ${quandoLembrete(dias)}.`, "/operacional/calendario");
    if (ok) resultado.calendario++;
  }

  return resultado;
}

import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP } from "@/features/divulgacao/tipos";
import { CalendarioDashboard } from "./calendario-dashboard";
import type { ItemCalendario, ProjetoNoCalendario } from "./lista-calendario";

/** Busca o que entra no calendário do painel: itens do Calendário geral e projetos dos dois meses. */
export async function CalendarioMes() {
  const hoje = hojeSP();
  const a = Number(hoje.slice(0, 4));
  const m = Number(hoje.slice(5, 7)) - 1;
  const ini = new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10);
  const fim = new Date(Date.UTC(a, m + 2, 0)).toISOString().slice(0, 10); // último dia do mês seguinte

  const supabase = await criarClienteServidor();
  const [itensR, projsR, perfisR] = await Promise.all([
    supabase.from("calendario_conteudo").select("id, nome, data, status, tipo, canais, responsaveis, tipo_post, objetivo, publico, tags").gte("data", ini).lte("data", fim).order("data", { ascending: true }).limit(1500),
    supabase.from("projetos").select("id, nome, categoria, status, responsavel_id, data_inicio, data_fim").or("data_inicio.not.is.null,data_fim.not.is.null").limit(500),
    supabase.from("profiles").select("id, nome"),
  ]);
  const nomes = new Map(((perfisR.data as { id: string; nome: string }[] | null) ?? []).map((p) => [p.id, p.nome]));
  const projetos: ProjetoNoCalendario[] = ((projsR.data as { id: string; nome: string; categoria: string; status: string; responsavel_id: string | null; data_inicio: string | null; data_fim: string | null }[] | null) ?? [])
    // Só os projetos que encostam nos dois meses.
    .filter((p) => (p.data_fim ?? p.data_inicio ?? "") >= ini && (p.data_inicio ?? p.data_fim ?? "") <= fim)
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria,
      status: p.status,
      responsavel: p.responsavel_id ? nomes.get(p.responsavel_id) ?? null : null,
      inicio: p.data_inicio,
      fim: p.data_fim,
    }));

  return <CalendarioDashboard itens={(itensR.data as ItemCalendario[] | null) ?? []} projetos={projetos} hoje={hoje} />;
}

import "server-only";
import { revalidatePath } from "next/cache";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { lerStatusLps, mudancasStatusLps, type LpParaSync } from "./lps-planilha";

const PLANILHA_LPS = "1ghnypK1Pyaz3c-eEClk3FC9xfb-tIKb1P0hivodzf3g";

/** Espelha apenas os status da planilha de LPs, preservando os demais campos editados no painel. */
export async function sincronizarStatusLps(origem: string): Promise<number> {
  const r = await fetch(`https://docs.google.com/spreadsheets/d/${PLANILHA_LPS}/export?format=xlsx`, {
    cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`Não foi possível ler a planilha de LPs (HTTP ${r.status}).`);
  const linhas = lerStatusLps(Buffer.from(await r.arrayBuffer()));
  if (!linhas.length) throw new Error("Nenhum status reconhecido na planilha de LPs. Confira os cabeçalhos.");
  const admin = criarClienteAdmin();
  const lps: LpParaSync[] = [];
  for (let offset = 0; offset < 50_000; offset += 1000) {
    const { data, error } = await admin.from("landing_pages").select("id, nome, grupo, url, status_patrocinio").order("id").range(offset, offset + 999);
    if (error) throw new Error("Não foi possível consultar o cadastro das LPs.");
    lps.push(...((data ?? []) as LpParaSync[]));
    if (!data || data.length < 1000) break;
  }
  let atualizadas = 0;
  const mudancas = mudancasStatusLps(lps, linhas);
  // Lotes pequenos limitam as consultas simultâneas. Não remove ou cria LPs.
  try {
    for (let i = 0; i < mudancas.length; i += 4) {
      const resultados = await Promise.allSettled(mudancas.slice(i, i + 4).map(async ({ lp, status }) => {
      // Backup antes de escrever: se o histórico não estiver disponível, nenhuma alteração é feita nesta LP.
      const { error: backupErro } = await admin.from("landing_pages_historico").insert({
        landing_page_id: lp.id, lp_nome: lp.nome, acao: "anotacao", alteracoes: [], autor_id: null,
        nota: `Backup antes da sincronização de status (${origem}): ${JSON.stringify({ status_patrocinio: lp.status_patrocinio })}`,
      });
      if (backupErro) throw new Error("Sincronização de LPs requer o histórico (migrations 0057 e 0058). Nenhuma LP sem backup será alterada.");
      let query = admin.from("landing_pages").update({ status_patrocinio: status }).eq("id", lp.id);
      query = lp.status_patrocinio === null ? query.is("status_patrocinio", null) : query.eq("status_patrocinio", lp.status_patrocinio);
      const { data, error } = await query.select("id");
      if (error) throw new Error("Não foi possível atualizar o status de uma LP.");
      if (!data?.length) throw new Error("Uma LP mudou durante a sincronização. Sincronize novamente.");
      atualizadas++;
      const { error: historicoErro } = await admin.from("landing_pages_historico").insert({
        landing_page_id: lp.id, lp_nome: lp.nome, acao: "alterada", autor_id: null,
        alteracoes: [{ campo: "status_patrocinio", rotulo: "Status de patrocínio", de: lp.status_patrocinio, para: status }],
        nota: "Status espelhado da planilha de LPs · " + origem,
      });
      if (historicoErro) throw new Error("Status atualizado, mas não foi possível registrar a alteração. O backup anterior está no histórico.");
      }));
      const falha = resultados.find((r) => r.status === "rejected");
      if (falha?.status === "rejected") throw falha.reason;
    }
  } finally {
    if (atualizadas) {
      revalidatePath("/comercial");
      revalidatePath("/operacional/landing-pages");
      revalidatePath("/consulta");
    }
  }
  return atualizadas;
}

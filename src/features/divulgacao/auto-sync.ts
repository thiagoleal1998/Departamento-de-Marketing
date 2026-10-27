import "server-only";
import { after } from "next/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";

/** Se a última leitura da planilha for mais velha que isso, abrir o painel dispara uma nova. */
const INTERVALO_MIN = 45;

/**
 * A planilha é preenchida ao longo do dia, mas o agendador da Vercel (plano gratuito) só lê uma vez por dia, em
 * horário aproximado. Por isso, ao abrir o painel com a leitura "velha", atualiza em segundo plano: a próxima
 * abertura já mostra o que foi preenchido. A leitura é "reservada" antes (só uma abertura dispara por vez).
 */
export async function atualizarDivulgacaoSeDefasada(): Promise<void> {
  if (!servicoDisponivel()) return;
  try {
    const limite = new Date(Date.now() - INTERVALO_MIN * 60_000).toISOString();
    const { data } = await criarClienteAdmin()
      .from("divulgacao_sync")
      .update({ sincronizado_em: new Date().toISOString() })
      .eq("id", 1)
      .lt("sincronizado_em", limite)
      .select("id");
    if (!data || data.length === 0) return; // atualizada há pouco, ou outra abertura já está cuidando
    after(async () => {
      try {
        const { sincronizarDivulgacao } = await import("./sincronizar");
        await sincronizarDivulgacao("agendado");
      } catch {
        // a próxima tentativa acontece depois do intervalo; o botão "Atualizar" continua disponível
      }
    });
  } catch {
    // complementar: o painel segue normal
  }
}

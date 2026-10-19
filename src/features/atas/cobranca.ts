import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";

const FUSO = "America/Sao_Paulo";
const DIA_MS = 86_400_000;

/** Data (AAAA-MM-DD) no fuso de Brasília. */
function diaBR(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const emDias = (a: string, b: string) =>
  Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / DIA_MS);

interface TarefaAta {
  id: string;
  titulo: string;
  prazo: string;
  responsavel_id: string | null;
}

export interface ResultadoCobranca {
  hoje: string;
  avaliadas: number;
  avisos: number;
  gerente: number;
}

/**
 * Cobrança diária dos itens de ata (tarefas com ata_serie):
 *  • véspera e dia do prazo → responsável;
 *  • atrasado → responsável, todo dia útil;
 *  • atrasado há 3+ dias → gerente também (no 3º dia e a cada 7 dias depois).
 * Itens sem responsável vinculado NÃO são cobrados de ninguém (aparecem sinalizados
 * em Atas > Pendências). Cada aviso é registrado em cobrancas_log (uma vez por dia).
 */
export async function executarCobrancaAtas(
  agora = new Date()
): Promise<ResultadoCobranca> {
  const admin = criarClienteAdmin();
  const hoje = diaBR(agora);

  const { data: tarefas } = await admin
    .from("tarefas")
    .select("id, titulo, prazo, responsavel_id")
    .not("ata_serie", "is", null)
    .not("responsavel_id", "is", null)
    .neq("status", "concluida")
    .not("prazo", "is", null);

  const { data: gerentes } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "gerente")
    .eq("ativo", true);
  const idsGerente = ((gerentes as { id: string }[] | null) ?? []).map((g) => g.id);

  let avisos = 0;
  let paraGerente = 0;
  const lista = (tarefas as TarefaAta[] | null) ?? [];

  async function avisar(
    t: TarefaAta,
    tipo: string,
    destinos: string[],
    titulo: string,
    corpo: string
  ) {
    if (destinos.length === 0) return;
    // Registro único por tarefa + tipo + dia.
    const { error } = await admin
      .from("cobrancas_log")
      .insert({ tarefa_id: t.id, tipo, dia: hoje });
    if (error) return; // já avisado hoje
    await admin.from("notificacoes").insert(
      destinos.map((destinatario_id) => ({
        destinatario_id,
        tipo: "ata",
        titulo,
        link: "/atas",
      }))
    );
    await enviarPush(destinos, { titulo, corpo, url: "/atas" });
    if (tipo === "atraso_gerente") paraGerente++;
    else avisos++;
  }

  for (const t of lista) {
    const dias = emDias(diaBR(new Date(t.prazo)), hoje); // >0 futuro, <0 atraso
    const resp = t.responsavel_id ? [t.responsavel_id] : [];

    if (dias === 1) {
      await avisar(t, "vespera", resp, `Prazo amanhã: ${t.titulo}`, "Item da ata vence amanhã.");
    } else if (dias === 0) {
      await avisar(t, "hoje", resp, `Prazo hoje: ${t.titulo}`, "Item da ata vence hoje.");
    } else if (dias < 0) {
      const atraso = -dias;
      await avisar(
        t,
        "atraso",
        resp,
        `Atrasado há ${atraso} dia(s): ${t.titulo}`,
        "Item da ata com prazo vencido. Atualize o status ou o prazo."
      );
      if (atraso >= 3 && (atraso === 3 || (atraso - 3) % 7 === 0)) {
        await avisar(
          t,
          "atraso_gerente",
          idsGerente,
          `Atraso de ${atraso} dia(s): ${t.titulo}`,
          "Item da ata atrasado há mais de 3 dias."
        );
      }
    }
  }

  return { hoje, avaliadas: lista.length, avisos, gerente: paraGerente };
}

import "server-only";
import { headers } from "next/headers";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";

/** Registra a entrada ou a saída do sistema (com IP e navegador). Nunca interrompe o fluxo. */
export async function registrarLogin(usuarioId: string, evento: "login" | "logout") {
  if (!servicoDisponivel()) return;
  try {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
    const navegador = (h.get("user-agent") ?? "").slice(0, 200) || null;
    await criarClienteAdmin().from("atividade_logins").insert({ usuario_id: usuarioId, evento, ip, navegador });
  } catch {
    // o registro é complementar
  }
}

/** Registra uma ação do usuário (criar, editar, excluir…). Nunca interrompe o fluxo. */
export async function registrarAcao(usuarioId: string, acao: string, detalhe?: string | null, caminho?: string | null) {
  if (!servicoDisponivel()) return;
  try {
    await criarClienteAdmin()
      .from("atividade_log")
      .insert({ usuario_id: usuarioId, tipo: "acao", acao: acao.slice(0, 120), detalhe: detalhe ? detalhe.slice(0, 300) : null, caminho: caminho ?? null });
  } catch {
    // o registro é complementar
  }
}

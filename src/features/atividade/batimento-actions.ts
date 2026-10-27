"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";

const LIMITE_SESSAO_S = 300; // sem sinal por 5 min, a sessão termina e a próxima começa outra
const MAX_DELTA_S = 120; // tempo máximo creditado por sinal (o navegador manda um por minuto)
const ONLINE_S = 150; // online = sinal nos últimos 2,5 min

export interface PessoaOnline {
  id: string;
  nome: string;
  avatar_url: string | null;
  /** false = aberto mas sem mexer há alguns minutos (ausente). */
  ativo: boolean;
  caminho: string | null;
}

/** Só o caminho da tela, sem parâmetros, para o registro. */
const limparCaminho = (c: string) => {
  const s = String(c ?? "").split("?")[0].split("#")[0].slice(0, 200);
  return s.startsWith("/") && s !== "/login" ? s : "";
};

/**
 * Sinal do navegador (a cada minuto e a cada troca de tela): mantém a sessão, soma o tempo ativo ou inativo
 * e registra as telas abertas. Nada aqui interrompe o uso do sistema.
 */
export async function batimento(entrada: { ativo: boolean; caminho: string; visitas: string[] }): Promise<void> {
  try {
    const supabase = await criarClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !servicoDisponivel()) return;

    const admin = criarClienteAdmin();
    const agora = new Date();
    const caminho = limparCaminho(entrada.caminho) || null;

    const { data: s } = await admin
      .from("atividade_sessoes")
      .select("id, ultimo_sinal, segundos_ativo, segundos_inativo")
      .eq("usuario_id", user.id)
      .order("ultimo_sinal", { ascending: false })
      .limit(1)
      .maybeSingle();
    const atual = s as { id: string; ultimo_sinal: string; segundos_ativo: number; segundos_inativo: number } | null;
    const intervalo = atual ? (agora.getTime() - new Date(atual.ultimo_sinal).getTime()) / 1000 : Infinity;

    if (atual && intervalo < LIMITE_SESSAO_S) {
      const delta = Math.max(0, Math.min(Math.round(intervalo), MAX_DELTA_S));
      await admin
        .from("atividade_sessoes")
        .update({
          ultimo_sinal: agora.toISOString(),
          ativo_agora: entrada.ativo,
          caminho,
          segundos_ativo: atual.segundos_ativo + (entrada.ativo ? delta : 0),
          segundos_inativo: atual.segundos_inativo + (entrada.ativo ? 0 : delta),
        })
        .eq("id", atual.id);
    } else {
      await admin.from("atividade_sessoes").insert({ usuario_id: user.id, inicio: agora.toISOString(), ultimo_sinal: agora.toISOString(), ativo_agora: entrada.ativo, caminho });
    }

    const visitas = (entrada.visitas ?? []).slice(0, 20).map(limparCaminho).filter(Boolean);
    if (visitas.length > 0) {
      await admin.from("atividade_log").insert(visitas.map((c) => ({ usuario_id: user.id, tipo: "pagina", acao: "Abriu uma tela", caminho: c })));
    }
  } catch {
    // o registro é complementar
  }
}

/** Quem está online agora (só gerente e líder). */
export async function presencaAgora(): Promise<PessoaOnline[]> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !servicoDisponivel()) return [];
  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const papel = (eu as { role: string } | null)?.role;
  if (papel !== "gerente" && papel !== "lider") return [];

  const admin = criarClienteAdmin();
  const desde = new Date(Date.now() - ONLINE_S * 1000).toISOString();
  const { data: sessoes } = await admin
    .from("atividade_sessoes")
    .select("usuario_id, ultimo_sinal, ativo_agora, caminho")
    .gte("ultimo_sinal", desde)
    .order("ultimo_sinal", { ascending: false })
    .limit(200);
  const porUsuario = new Map<string, { ativo: boolean; caminho: string | null }>();
  for (const x of (sessoes as { usuario_id: string; ativo_agora: boolean; caminho: string | null }[] | null) ?? []) {
    if (!porUsuario.has(x.usuario_id)) porUsuario.set(x.usuario_id, { ativo: x.ativo_agora, caminho: x.caminho });
  }
  if (porUsuario.size === 0) return [];

  const { data: perfis } = await admin.from("profiles").select("id, nome, avatar_url").in("id", Array.from(porUsuario.keys())).eq("ativo", true);
  return ((perfis as { id: string; nome: string; avatar_url: string | null }[] | null) ?? [])
    .map((p) => ({ ...p, ...porUsuario.get(p.id)! }))
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, "pt-BR"));
}

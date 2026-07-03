import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  Chamado,
  ChamadoComentario,
  ChamadoHistorico,
  Profile,
} from "@/types/database";

/** Mapa id -> nome de perfis, para exibir responsáveis/solicitantes. */
export async function mapaDePerfis(): Promise<Map<string, Profile>> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("nome", { ascending: true });
  const mapa = new Map<string, Profile>();
  for (const p of (data as Profile[] | null) ?? []) mapa.set(p.id, p);
  return mapa;
}

export async function listarChamados(): Promise<Chamado[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("chamados")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Chamado[] | null) ?? [];
}

export async function obterChamado(id: string): Promise<Chamado | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("chamados")
    .select("*")
    .eq("id", id)
    .single();
  return (data as Chamado | null) ?? null;
}

export async function listarComentarios(
  chamadoId: string
): Promise<ChamadoComentario[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("chamado_comentarios")
    .select("*")
    .eq("chamado_id", chamadoId)
    .order("created_at", { ascending: true });
  return (data as ChamadoComentario[] | null) ?? [];
}

export async function listarHistorico(
  chamadoId: string
): Promise<ChamadoHistorico[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("chamado_historico")
    .select("*")
    .eq("chamado_id", chamadoId)
    .order("created_at", { ascending: false });
  return (data as ChamadoHistorico[] | null) ?? [];
}

import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  Feedback,
  UmAUm,
  PlanoAcao,
  Profile,
} from "@/types/database";

/** Perfis visíveis para a liderança (para escolher o colaborador). */
export async function listarColaboradores(): Promise<Profile[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  return (data as Profile[] | null) ?? [];
}

export async function obterPerfil(id: string): Promise<Profile | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  return (data as Profile | null) ?? null;
}

export async function listarFeedbacks(): Promise<Feedback[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("feedbacks")
    .select("*")
    .order("data", { ascending: false });
  return (data as Feedback[] | null) ?? [];
}

export async function obterFeedback(id: string): Promise<Feedback | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("feedbacks")
    .select("*")
    .eq("id", id)
    .single();
  return (data as Feedback | null) ?? null;
}

export async function listar1a1(): Promise<UmAUm[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("um_a_um")
    .select("*")
    .order("data", { ascending: false });
  return (data as UmAUm[] | null) ?? [];
}

export async function obter1a1(id: string): Promise<UmAUm | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("um_a_um")
    .select("*")
    .eq("id", id)
    .single();
  return (data as UmAUm | null) ?? null;
}

export async function listarPlanos(): Promise<PlanoAcao[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("planos_acao")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as PlanoAcao[] | null) ?? [];
}

/** Todos os registros de desenvolvimento de um colaborador. */
export async function historicoColaborador(colaboradorId: string) {
  const supabase = await criarClienteServidor();
  const [fb, um, pl] = await Promise.all([
    supabase
      .from("feedbacks")
      .select("*")
      .eq("colaborador_id", colaboradorId)
      .order("data", { ascending: false }),
    supabase
      .from("um_a_um")
      .select("*")
      .eq("colaborador_id", colaboradorId)
      .order("data", { ascending: false }),
    supabase
      .from("planos_acao")
      .select("*")
      .eq("colaborador_id", colaboradorId)
      .order("created_at", { ascending: false }),
  ]);
  return {
    feedbacks: (fb.data as Feedback[] | null) ?? [],
    conversas: (um.data as UmAUm[] | null) ?? [],
    planos: (pl.data as PlanoAcao[] | null) ?? [],
  };
}

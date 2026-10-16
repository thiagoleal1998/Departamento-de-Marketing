import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { BUCKET_FEEDBACK, type AnexoVisivel } from "./anexos";
import type { Sugestao, SugestaoStatus } from "@/types/database";

export const ETAPAS_PADRAO: Record<SugestaoStatus, string> = {
  nova: "Nova",
  em_analise: "Em análise",
  planejada: "Planejada",
  concluida: "Concluída",
  descartada: "Descartada",
};

/** Nomes das etapas (personalizados pelo gerente; cai no padrão se faltar). */
export async function obterNomesEtapas(): Promise<
  Record<SugestaoStatus, string>
> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("sugestoes_etapas")
    .select("status, nome");
  const nomes = { ...ETAPAS_PADRAO };
  const linhas =
    (data as { status: SugestaoStatus; nome: string }[] | null) ?? [];
  for (const e of linhas) {
    if (e.status in nomes && e.nome.trim()) nomes[e.status] = e.nome;
  }
  return nomes;
}

/** RLS já filtra: o usuário vê as próprias; a liderança vê todas. */
export async function listarSugestoes(): Promise<Sugestao[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("sugestoes")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Sugestao[] | null) ?? [];
}

/** Gera links temporários (1 h) para os anexos de cada envio, por id. */
export async function assinarAnexos(
  sugestoes: Sugestao[]
): Promise<Record<string, AnexoVisivel[]>> {
  const resultado: Record<string, AnexoVisivel[]> = {};
  const comAnexo = sugestoes.filter((s) => (s.anexos?.length ?? 0) > 0);
  if (comAnexo.length === 0 || !servicoDisponivel()) return resultado;

  const storage = criarClienteAdmin().storage.from(BUCKET_FEEDBACK);
  await Promise.all(
    comAnexo.map(async (s) => {
      const { data } = await storage.createSignedUrls(
        s.anexos.map((a) => a.caminho),
        3600
      );
      resultado[s.id] = s.anexos.flatMap((a, i) => {
        const url = data?.[i]?.signedUrl;
        return url ? [{ url, nome: a.nome, tipo: a.tipo }] : [];
      });
    })
  );
  return resultado;
}

import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { GestaoAbas } from "@/features/perfis/gestao-abas";
import { FolgasPainel } from "@/features/folgas/folgas-painel";
import { lerAutorizacoes, type AusenciaTime, type Folga } from "@/features/folgas/tipos";
import { hojeSP } from "@/features/divulgacao/tipos";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

const semTabela = (c?: string) => c === "42P01" || c === "PGRST205" || c === "42703" || c === "PGRST204";

/** Ausências avisadas ao time, sem justificativa nem autorizações (com ou sem a coluna "retorno"). */
function lerAusencias(admin: ReturnType<typeof criarClienteAdmin>, hoje: string, euId: string, comRetorno: boolean) {
  return admin
    .from("folgas")
    .select(comRetorno ? "id, profile_id, tipo, inicio, fim, retorno" : "id, profile_id, tipo, inicio, fim")
    .not("equipe_avisada_em", "is", null)
    .neq("profile_id", euId)
    .gte("fim", hoje)
    .order("inicio", { ascending: true })
    .then((r) => (r.error && comRetorno ? { data: null } : { data: r.data }));
}

export default async function FolgasPage() {
  const usuario = await exigirUsuario();
  const lideranca = ehLideranca(usuario.role);
  const hoje = hojeSP();
  const supabase = await criarClienteServidor();

  // A RLS devolve tudo para a liderança e só as folgas da própria pessoa para o colaborador.
  // Antes da migration 0091 a coluna "retorno" não existe: lê sem ela.
  const lerFolgas = (colunas: string) => supabase.from("folgas").select(colunas).order("inicio", { ascending: true });
  let lidas = await lerFolgas("id, profile_id, tipo, inicio, fim, retorno, justificativa, autorizacoes, equipe_avisada_em");
  if (lidas.error && semTabela(lidas.error.code)) lidas = await lerFolgas("id, profile_id, tipo, inicio, fim, justificativa, autorizacoes, equipe_avisada_em");
  const { data, error } = lidas;
  const folgas: Folga[] = ((data as unknown as (Omit<Folga, "autorizacoes" | "retorno"> & { autorizacoes: unknown; retorno?: string | null })[] | null) ?? []).map((f) => ({
    ...f,
    retorno: f.retorno ?? null,
    autorizacoes: lerAutorizacoes(f.autorizacoes),
  }));

  // Nomes (não sensíveis) de todos os ativos e, para o colaborador, as ausências que o time já foi avisado:
  // lidas com a chave de serviço e SEM justificativa nem autorizações.
  let pessoas: { id: string; nome: string }[] = [];
  let ausencias: AusenciaTime[] = [];
  if (servicoDisponivel()) {
    const admin = criarClienteAdmin();
    const [p, a] = await Promise.all([
      admin.from("profiles").select("id, nome").eq("ativo", true).order("nome", { ascending: true }),
      lideranca ? Promise.resolve({ data: [] as unknown[] }) : lerAusencias(admin, hoje, usuario.id, true),
    ]);
    pessoas = (p.data as { id: string; nome: string }[] | null) ?? [];
    let linhas = a.data as unknown as (Omit<AusenciaTime, "retorno"> & { retorno?: string | null })[] | null;
    if (!lideranca && !linhas) linhas = ((await lerAusencias(admin, hoje, usuario.id, false)).data as unknown as typeof linhas) ?? [];
    ausencias = (linhas ?? []).map((x) => ({ ...x, retorno: x.retorno ?? null }));
  } else {
    const { data: p } = await supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome", { ascending: true });
    pessoas = (p as { id: string; nome: string }[] | null) ?? [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={lideranca ? "Gestão" : "Minhas folgas"}
        descricao={
          lideranca
            ? "Indicadores da operação, perfis comportamentais, férias, folgas e escala de feriados do time."
            : "Suas folgas e as ausências avisadas ao time."
        }
      />
      {lideranca ? <GestaoAbas ativa="folgas" /> : null}
      <FolgasPainel folgas={folgas} pessoas={pessoas} ausencias={ausencias} hoje={hoje} indisponivel={Boolean(error && semTabela(error.code))} podeEditar={lideranca} />
    </div>
  );
}

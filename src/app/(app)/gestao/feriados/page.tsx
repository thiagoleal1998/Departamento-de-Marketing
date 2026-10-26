import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { GestaoAbas } from "@/features/perfis/gestao-abas";
import { feriadosDoAno, type Feriado } from "@/features/feriados/calendario";
import { EscalaPainel, type Escalado, type PeriodoFerias } from "@/features/feriados/escala-painel";
import { hojeSP } from "@/features/divulgacao/tipos";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function EscalaFeriadosPage() {
  const usuario = await exigirUsuario();
  // Área da liderança, como férias e perfis comportamentais.
  if (!ehLideranca(usuario.role)) redirect("/dashboard");

  const hoje = hojeSP();
  const anoAtual = Number(hoje.slice(0, 4));
  const supabase = await criarClienteServidor();

  const [escalaR, extrasR, feriasR, pessoasR] = await Promise.all([
    supabase.from("escala_feriados").select("id, data, profile_id").gte("data", hoje).lte("data", `${anoAtual + 1}-12-31`),
    supabase.from("feriados_extras").select("id, data, nome").gte("data", hoje).lte("data", `${anoAtual + 1}-12-31`),
    supabase.from("ferias").select("profile_id, inicio, fim").gte("fim", hoje).lte("inicio", `${anoAtual + 1}-12-31`),
    supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome", { ascending: true }),
  ]);

  // Feriados que restam do ano em curso e todos os do ano seguinte, mais os extras cadastrados.
  const base: Feriado[] = [...feriadosDoAno(anoAtual), ...feriadosDoAno(anoAtual + 1)].filter((f) => f.data >= hoje);
  const extras: Feriado[] = ((extrasR.data as { id: string; data: string; nome: string }[] | null) ?? []).map((e) => ({
    data: e.data,
    nome: e.nome,
    tipo: "extra",
    extraId: e.id,
  }));
  const feriados = [...base, ...extras].sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="space-y-6">
      <PageHeader titulo="Gestão" descricao="Indicadores da operação, perfis comportamentais, férias e escala de feriados do time." />
      <GestaoAbas ativa="feriados" />
      <EscalaPainel
        feriados={feriados}
        escala={(escalaR.data as Escalado[] | null) ?? []}
        pessoas={(pessoasR.data as { id: string; nome: string }[] | null) ?? []}
        ferias={(feriasR.data as PeriodoFerias[] | null) ?? []}
        hoje={hoje}
        indisponivel={Boolean(escalaR.error)}
      />
    </div>
  );
}

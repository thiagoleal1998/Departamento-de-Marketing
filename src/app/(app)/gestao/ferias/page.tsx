import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { GestaoAbas } from "@/features/perfis/gestao-abas";
import { FeriasPainel } from "@/features/ferias/ferias-painel";
import type { Ferias } from "@/features/ferias/tipos";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function FeriasPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const usuario = await exigirUsuario();
  // Liderança (gerente e líder) vê e gerencia o time todo; colaborador só vê as próprias férias
  // (o banco já filtra: a RLS só devolve as linhas dele).
  const lideranca = ehLideranca(usuario.role);

  const { ano: anoRaw } = await searchParams;
  const anoAtual = new Date().getFullYear();
  const pedido = Number(anoRaw);
  const ano = Number.isInteger(pedido) && pedido >= 2000 && pedido <= 2100 ? pedido : anoAtual;

  const supabase = await criarClienteServidor();
  const [{ data, error }, { data: pessoas }] = await Promise.all([
    supabase
      .from("ferias")
      .select("id, profile_id, inicio, fim, observacao")
      .lte("inicio", `${ano}-12-31`)
      .gte("fim", `${ano}-01-01`)
      .order("inicio", { ascending: true }),
    // Liderança lê todos os perfis; para o colaborador a RLS devolve só o dele.
    supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={lideranca ? "Gestão" : "Minhas férias"}
        descricao={
          lideranca
            ? "Indicadores da operação, perfis comportamentais e férias do time."
            : "Seus períodos de férias, registrados pela liderança."
        }
      />
      {lideranca ? <GestaoAbas ativa="ferias" /> : null}
      <FeriasPainel
        ferias={(data as Ferias[] | null) ?? []}
        pessoas={(pessoas as { id: string; nome: string }[] | null) ?? []}
        ano={ano}
        indisponivel={Boolean(error)}
        podeEditar={lideranca}
      />
    </div>
  );
}

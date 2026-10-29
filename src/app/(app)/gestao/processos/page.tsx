import { Workflow } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { diaBrasilia } from "@/lib/utils";
import { obterDiretorio } from "@/features/equipe/diretorio";
import { GestaoAbas } from "@/features/perfis/gestao-abas";
import { CatalogoProcessos, type ProcessoResumo } from "@/features/processos/catalogo-processos";
import { etapasSemProcedimento, pendenciasDoCadastro, pendenciasDoFluxo } from "@/features/processos/validacao";
import { FLUXO_VAZIO, STATUS_PROCESSO, type DadosFluxo, type Macroprocesso, type Processo, type StatusProcesso } from "@/features/processos/tipos";
import { BarrasHorizontais, Indicador } from "@/features/relatorios/graficos";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const dynamic = "force-dynamic";

export default async function ProcessosPage() {
  const usuario = await exigirUsuario();
  const editavel = ehLideranca(usuario.role);
  const supabase = await criarClienteServidor();

  const [macrosR, procsR, fluxosR, diretorio] = await Promise.all([
    supabase.from("proc_macroprocessos").select("*").order("ordem", { ascending: true }),
    supabase.from("proc_processos").select("*").order("codigo", { ascending: true }),
    supabase.from("proc_fluxos").select("processo_id, dados").eq("tipo", "atual"),
    obterDiretorio(),
  ]);

  const semTabela = !!macrosR.error || !!procsR.error;
  const cabecalho = (
    <>
      <PageHeader titulo="Gestão" descricao="Indicadores, fluxos e processos do departamento, perfis, férias e escala de feriados." />
      {editavel ? <GestaoAbas ativa="processos" /> : null}
    </>
  );

  if (semTabela) {
    return (
      <div className="space-y-6">
        {cabecalho}
        <EmptyState icone={Workflow} titulo="Fluxos e processos ainda não ativados" descricao="Rode a migration 0085 no SQL Editor do Supabase para ativar esta aba (ela já traz os macroprocessos e o exemplo “Produção de E-mail Marketing”)." />
      </div>
    );
  }

  const macros = (macrosR.data as Macroprocesso[] | null) ?? [];
  const processos = (procsR.data as Processo[] | null) ?? [];
  const fluxoDe = new Map(((fluxosR.data as { processo_id: string; dados: DadosFluxo }[] | null) ?? []).map((f) => [f.processo_id, f.dados ?? FLUXO_VAZIO]));
  const macroNome = new Map(macros.map((m) => [m.id, m.nome]));
  const hoje = diaBrasilia(new Date());

  const resumos: ProcessoResumo[] = processos.map((p) => {
    const fluxo = fluxoDe.get(p.id) ?? FLUXO_VAZIO;
    const pend = [...pendenciasDoCadastro(p), ...pendenciasDoFluxo(fluxo)].filter((x) => x.nivel === "erro").length;
    return {
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      macroId: p.macroprocesso_id,
      macroNome: p.macroprocesso_id ? macroNome.get(p.macroprocesso_id) ?? null : null,
      status: p.status,
      versao: p.versao,
      responsavelId: p.responsavel_id,
      responsavelNome: p.responsavel_id ? diretorio.get(p.responsavel_id)?.nome ?? null : null,
      etapas: fluxo.nodes.length,
      pendencias: pend,
      proximaRevisao: p.proxima_revisao,
      revisaoVencida: p.status !== "rascunho" && !!p.proxima_revisao && p.proxima_revisao < hoje,
    };
  });

  const porStatus = (s: StatusProcesso) => processos.filter((p) => p.status === s).length;
  const semResponsavel = processos.filter((p) => !p.responsavel_id).length;
  const vencidas = resumos.filter((r) => r.revisaoVencida).length;
  const semProcedimento = processos.reduce((n, p) => n + etapasSemProcedimento(fluxoDe.get(p.id) ?? FLUXO_VAZIO), 0);
  const porMacro = macros
    .map((m) => ({ rotulo: m.nome, valor: processos.filter((p) => p.macroprocesso_id === m.id).length }))
    .concat(processos.some((p) => !p.macroprocesso_id) ? [{ rotulo: "Sem macroprocesso", valor: processos.filter((p) => !p.macroprocesso_id).length }] : []);

  return (
    <div className="space-y-6">
      {cabecalho}

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Fluxos e processos</h2>
          <p className="text-xs text-muted-foreground">
            Como o Marketing trabalha: quem faz o quê, em que ordem, onde aprova e como executar. O <strong>processo</strong> é o modelo permanente; as <strong>tarefas</strong> do quadro são as execuções dele.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Indicador rotulo="Processos" valor={String(processos.length)} detalhe="cadastrados" />
          <Indicador rotulo={STATUS_PROCESSO.rascunho.rotulo} valor={String(porStatus("rascunho"))} detalhe="ainda em construção" />
          <Indicador rotulo={STATUS_PROCESSO.revisao.rotulo} valor={String(porStatus("revisao"))} detalhe="com mudanças a publicar" tom={porStatus("revisao") > 0 ? "atencao" : undefined} />
          <Indicador rotulo={STATUS_PROCESSO.publicado.rotulo} valor={String(porStatus("publicado"))} detalhe="em vigor" tom={porStatus("publicado") > 0 ? "bom" : undefined} />
          <Indicador rotulo="Sem responsável" valor={String(semResponsavel)} detalhe="processos sem dono" tom={semResponsavel > 0 ? "atencao" : "bom"} />
          <Indicador rotulo="Revisão vencida" valor={String(vencidas)} detalhe="da revisão periódica" tom={vencidas > 0 ? "atencao" : "bom"} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <BarrasHorizontais titulo="Processos por macroprocesso" itens={porMacro} vazio="Nenhum processo ainda." />
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Documentação pendente</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Etapas de atividade sem instruções nem procedimento ligado, somando todos os processos.</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{semProcedimento}</p>
            <p className="text-xs text-muted-foreground">etapa(s) para documentar</p>
          </div>
        </div>
      </section>

      <CatalogoProcessos processos={resumos} macros={macros} editavel={editavel} />
    </div>
  );
}

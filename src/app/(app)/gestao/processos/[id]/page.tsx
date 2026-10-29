import { notFound } from "next/navigation";
import Link from "@/components/shared/link";
import { AlertTriangle, ArrowLeft, CalendarClock, ClipboardList, History, Workflow } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { diaBrasilia, formatarDataHora } from "@/lib/utils";
import { obterDiretorio } from "@/features/equipe/diretorio";
import { AcoesProcesso, CadastroProcesso } from "@/features/processos/processo-cadastro";
import { ProcessoFluxo } from "@/features/processos/processo-fluxo";
import { pendenciasDoCadastro, pendenciasDoFluxo } from "@/features/processos/validacao";
import { FLUXO_VAZIO, STATUS_PROCESSO, type DadosFluxo, type Macroprocesso, type Processo } from "@/features/processos/tipos";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Aba = "fluxo" | "cadastro" | "pendencias" | "historico";

export default async function ProcessoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const { id } = await params;
  const { aba: abaRaw } = await searchParams;
  const aba: Aba = abaRaw === "cadastro" || abaRaw === "pendencias" || abaRaw === "historico" ? abaRaw : "fluxo";
  const usuario = await exigirUsuario();
  const editavel = ehLideranca(usuario.role);
  const supabase = await criarClienteServidor();

  const { data: p, error } = await supabase.from("proc_processos").select("*").eq("id", id).maybeSingle();
  if (error || !p) notFound();
  const processo = p as Processo;

  const [{ data: macrosData }, { data: fluxosData }, { data: histData }, diretorio] = await Promise.all([
    supabase.from("proc_macroprocessos").select("*").order("ordem", { ascending: true }),
    supabase.from("proc_fluxos").select("tipo, dados, publicado").eq("processo_id", id),
    supabase.from("proc_historico").select("id, autor_id, acao, detalhe, created_at").eq("processo_id", id).order("created_at", { ascending: false }).limit(60),
    obterDiretorio(),
  ]);
  const macros = (macrosData as Macroprocesso[] | null) ?? [];
  const fluxos = (fluxosData as { tipo: "atual" | "proposto"; dados: DadosFluxo; publicado: DadosFluxo | null }[] | null) ?? [];
  const atualLinha = fluxos.find((f) => f.tipo === "atual");
  const proposto = fluxos.find((f) => f.tipo === "proposto")?.dados ?? null;
  const publicado = atualLinha?.publicado ?? null;
  const rascunho = atualLinha?.dados ?? FLUXO_VAZIO;
  // Quem só lê vê o que está em vigor (a versão publicada); o rascunho só aparece enquanto nada foi publicado.
  const atual = editavel ? rascunho : publicado ?? rascunho;

  const pendencias = [...pendenciasDoCadastro(processo), ...pendenciasDoFluxo(rascunho)];
  const pessoas = Array.from(diretorio.values())
    .map((x) => ({ id: x.id, nome: x.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const macro = macros.find((m) => m.id === processo.macroprocesso_id);
  const dono = processo.responsavel_id ? diretorio.get(processo.responsavel_id)?.nome : null;
  const hoje = diaBrasilia(new Date());
  const vencida = processo.status !== "rascunho" && !!processo.proxima_revisao && processo.proxima_revisao < hoje;
  const st = STATUS_PROCESSO[processo.status];
  const dataBr = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

  const abas: { chave: Aba; rotulo: string; icone: typeof Workflow; extra?: string }[] = [
    { chave: "fluxo", rotulo: "Fluxo", icone: Workflow },
    { chave: "cadastro", rotulo: "Cadastro", icone: ClipboardList },
    { chave: "pendencias", rotulo: "Pendências", icone: AlertTriangle, extra: pendencias.filter((x) => x.nivel === "erro").length ? String(pendencias.filter((x) => x.nivel === "erro").length) : undefined },
    { chave: "historico", rotulo: "Histórico", icone: History },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Link href="/gestao/processos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Fluxos e processos
        </Link>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="font-mono text-xs text-muted-foreground">
              {processo.codigo} · {macro?.nome ?? "Sem macroprocesso"}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{processo.nome}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset", st.classe)}>{st.rotulo}</span>
              <span>v{processo.versao}</span>
              <span>· Responsável: {dono ?? <strong className="text-amber-700 dark:text-amber-400">não definido</strong>}</span>
              {processo.ultima_revisao ? <span>· Última revisão {dataBr(processo.ultima_revisao)}</span> : null}
              {processo.proxima_revisao ? (
                <span className={cn("inline-flex items-center gap-1", vencida && "font-semibold text-red-600 dark:text-red-400")}>
                  <CalendarClock className="size-3" /> {vencida ? "Revisão vencida em" : "Revisar até"} {dataBr(processo.proxima_revisao)}
                </span>
              ) : null}
            </div>
          </div>
        </header>
        <AcoesProcesso processo={processo} pendencias={pendencias} editavel={editavel} />
      </div>

      <nav aria-label="Seções do processo" className="flex flex-wrap gap-1 border-b">
        {abas.map((a) => {
          const Icone = a.icone;
          return (
            <Link
              key={a.chave}
              href={a.chave === "fluxo" ? `/gestao/processos/${id}` : `/gestao/processos/${id}?aba=${a.chave}`}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                a.chave === aba ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icone className="size-4" />
              {a.rotulo}
              {a.extra ? <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[11px] font-semibold text-amber-950">{a.extra}</span> : null}
            </Link>
          );
        })}
      </nav>

      {aba === "fluxo" ? (
        <ProcessoFluxo processoId={id} atual={atual} proposto={editavel ? proposto : null} publicado={editavel ? publicado : null} status={processo.status} versao={processo.versao} editavel={editavel} />
      ) : aba === "cadastro" ? (
        <Card>
          <CardContent className="pt-6">
            <CadastroProcesso processo={processo} macros={macros} pessoas={pessoas} editavel={editavel} />
          </CardContent>
        </Card>
      ) : aba === "pendencias" ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Regras para publicar: todo processo tem objetivo, entrega final e dono; toda atividade tem responsável; toda aprovação tem critério; toda decisão tem caminhos com nome; o fluxo tem início e fim.
              Rascunhos incompletos podem ser salvos à vontade.
            </p>
            {pendencias.length === 0 ? (
              <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">Nenhuma pendência: o processo está pronto para publicar.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {pendencias.map((x, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", x.nivel === "erro" ? "bg-destructive" : "bg-amber-500")} aria-hidden />
                    <span>
                      {x.texto} <span className="text-xs text-muted-foreground">{x.nivel === "erro" ? "(obrigatório para publicar)" : "(recomendado)"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {((histData as { id: string; autor_id: string | null; acao: string; detalhe: string | null; created_at: string }[] | null) ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
            ) : (
              <ul className="divide-y text-sm">
                {((histData as { id: string; autor_id: string | null; acao: string; detalhe: string | null; created_at: string }[] | null) ?? []).map((h) => (
                  <li key={h.id} className="flex items-start justify-between gap-3 py-2.5">
                    <span>
                      <span className="font-medium">{h.acao}</span>
                      {h.detalhe ? <span className="text-muted-foreground"> — {h.detalhe}</span> : null}
                      <span className="block text-xs text-muted-foreground">{h.autor_id ? diretorio.get(h.autor_id)?.nome ?? "—" : "—"}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatarDataHora(h.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

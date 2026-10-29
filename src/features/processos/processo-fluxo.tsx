"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, Copy, GitBranch, Layers, List, Loader2, Workflow } from "lucide-react";
import { BLOCOS, FLUXO_VAZIO, type DadosFluxo, type StatusProcesso, type TipoFluxo } from "./tipos";
import { agruparPorResponsavel, ordenarEtapas, pendenciasDoFluxo } from "./validacao";
import { adotarFluxoProposto, criarFluxoProposto, descartarFluxoProposto } from "./actions";
import { Button } from "@/components/ui/button";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { cn } from "@/lib/utils";

// O editor (React Flow) é pesado e só roda no navegador: carrega sob demanda.
const EditorFluxo = dynamic(() => import("./editor-fluxo").then((m) => m.EditorFluxo), {
  ssr: false,
  loading: () => (
    <div className="grid h-[68vh] min-h-[420px] place-items-center rounded-xl border text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Abrindo o editor…
      </span>
    </div>
  ),
});

type Visao = "fluxograma" | "lista" | "raias";
type Aba = TipoFluxo | "publicado";

const VISOES: { chave: Visao; rotulo: string; icone: typeof List }[] = [
  { chave: "fluxograma", rotulo: "Fluxograma", icone: Workflow },
  { chave: "lista", rotulo: "Lista de etapas", icone: List },
  { chave: "raias", rotulo: "Por responsável", icone: Layers },
];

function Etapa({ n, indice }: { n: ReturnType<typeof ordenarEtapas>[number]; indice: number }) {
  const meta = BLOCOS[n.data.tipo];
  return (
    <div className={cn("rounded-xl border-2 p-3 text-sm", meta.classe)}>
      <div className="flex items-start gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground/10 text-xs font-bold">{indice}</span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold leading-snug">{n.data.nome?.trim() || meta.rotulo}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-[11px] opacity-80">
            <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-medium">{meta.rotulo}</span>
            {n.data.responsavel ? <span>{n.data.responsavel}</span> : null}
            {n.data.prazo ? <span>· {n.data.prazo}</span> : null}
          </p>
          {n.data.instrucoes ? <p className="whitespace-pre-line text-xs opacity-90">{n.data.instrucoes}</p> : null}
          {n.data.criterio ? (
            <p className="text-xs">
              <span className="font-semibold">Critério: </span>
              {n.data.criterio}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ListaEtapas({ fluxo }: { fluxo: DadosFluxo }) {
  const etapas = ordenarEtapas(fluxo);
  const nome = (id: string) => etapas.find((e) => e.id === id)?.data.nome?.trim() || "—";
  if (etapas.length === 0) return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma etapa ainda.</p>;
  return (
    <ol className="space-y-2">
      {etapas.map((n, i) => {
        const saidas = fluxo.edges.filter((e) => e.source === n.id);
        return (
          <li key={n.id} className="space-y-1">
            <Etapa n={n} indice={i + 1} />
            {saidas.length > 0 ? (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-9 text-xs text-muted-foreground">
                <ArrowDown className="size-3" aria-hidden />
                {saidas.map((s) => (
                  <span key={s.id}>
                    {s.label ? <strong className="text-foreground">{s.label}: </strong> : null}
                    {nome(s.target)}
                  </span>
                ))}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Raias({ fluxo }: { fluxo: DadosFluxo }) {
  const grupos = agruparPorResponsavel(fluxo);
  const ordem = new Map(ordenarEtapas(fluxo).map((n, i) => [n.id, i + 1]));
  if (grupos.length === 0) return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma etapa ainda.</p>;
  return (
    <div className="flex items-start gap-3 overflow-x-auto pb-2">
      {grupos.map((g) => (
        <section key={g.responsavel} className="w-72 shrink-0 space-y-2 rounded-xl border bg-muted/30 p-3">
          <h3 className={cn("text-sm font-semibold", g.responsavel.startsWith("Sem responsável") && "text-amber-700 dark:text-amber-400")}>
            {g.responsavel} <span className="font-normal text-muted-foreground">· {g.etapas.length}</span>
          </h3>
          {g.etapas.map((n) => (
            <Etapa key={n.id} n={n} indice={ordem.get(n.id) ?? 0} />
          ))}
        </section>
      ))}
    </div>
  );
}

/** Fluxo do processo: o mesmo conteúdo em três visões (fluxograma, lista e por responsável), atual × proposto × publicado. */
export function ProcessoFluxo({
  processoId,
  atual,
  proposto,
  publicado,
  status,
  versao,
  editavel,
}: {
  processoId: string;
  atual: DadosFluxo;
  proposto: DadosFluxo | null;
  publicado: DadosFluxo | null;
  status: StatusProcesso;
  versao: number;
  editavel: boolean;
}) {
  const router = useRouter();
  const { confirmar, avisar } = useDialogo();
  const [aba, setAba] = useState<Aba>("atual");
  const [visao, setVisao] = useState<Visao>("fluxograma");
  const [dados, setDados] = useState<{ atual: DadosFluxo; proposto: DadosFluxo | null }>({ atual, proposto });
  const [pendente, startTransition] = useTransition();

  const temProposto = dados.proposto !== null;
  const emRevisao = status === "revisao" && publicado !== null;
  const mostrando: DadosFluxo = aba === "publicado" ? publicado ?? FLUXO_VAZIO : aba === "proposto" ? dados.proposto ?? FLUXO_VAZIO : dados.atual;
  const podeEditar = editavel && aba !== "publicado";
  const pend = pendenciasDoFluxo(mostrando);

  function rodar(acao: () => Promise<{ erro?: string }>, depois?: () => void) {
    startTransition(async () => {
      const r = await acao();
      if (r.erro) void avisar(r.erro, "Não foi possível concluir");
      else {
        depois?.();
        router.refresh();
      }
    });
  }

  const chip = (ativo: boolean) =>
    cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", ativo ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Qual fluxo">
          <button type="button" role="tab" aria-selected={aba === "atual"} onClick={() => setAba("atual")} className={chip(aba === "atual")}>
            Fluxo atual
          </button>
          {temProposto ? (
            <button type="button" role="tab" aria-selected={aba === "proposto"} onClick={() => setAba("proposto")} className={chip(aba === "proposto")}>
              <GitBranch className="size-3.5" /> Fluxo proposto
            </button>
          ) : null}
          {emRevisao ? (
            <button type="button" role="tab" aria-selected={aba === "publicado"} onClick={() => setAba("publicado")} className={chip(aba === "publicado")}>
              Versão publicada (v{versao})
            </button>
          ) : null}
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5" role="tablist" aria-label="Como ver">
          {VISOES.map((v) => {
            const Icone = v.icone;
            return (
              <button key={v.chave} type="button" role="tab" aria-selected={visao === v.chave} onClick={() => setVisao(v.chave)} className={chip(visao === v.chave)}>
                <Icone className="size-3.5" /> {v.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      {emRevisao && aba !== "publicado" ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Este processo está <strong>em revisão</strong>: as mudanças abaixo ainda não foram publicadas. A versão publicada (v{versao}) continua sendo a vigente — veja em &ldquo;Versão publicada&rdquo;.
        </p>
      ) : null}
      {aba === "proposto" ? (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground">Fluxo proposto</strong>: melhorias ainda não implantadas. Não é a regra de hoje.
        </p>
      ) : null}

      {editavel && aba !== "publicado" ? (
        <div className="flex flex-wrap items-center gap-2">
          {!temProposto ? (
            <Button type="button" size="sm" variant="outline" disabled={pendente} onClick={() => rodar(() => criarFluxoProposto(processoId), () => setAba("proposto"))}>
              <Copy className="size-3.5" /> Criar fluxo proposto (cópia do atual)
            </Button>
          ) : aba === "proposto" ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pendente}
                onClick={async () => {
                  if (await confirmar({ titulo: "Adotar o fluxo proposto?", descricao: "Ele substitui o fluxo atual e o processo fica em revisão até ser publicado.", confirmar: "Adotar" })) {
                    rodar(() => adotarFluxoProposto(processoId), () => {
                      setDados((d) => ({ atual: d.proposto ?? d.atual, proposto: null }));
                      setAba("atual");
                    });
                  }
                }}
              >
                Adotar como fluxo atual
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={pendente}
                onClick={async () => {
                  if (await confirmar({ titulo: "Descartar o fluxo proposto?", descricao: "O desenho proposto será apagado. O fluxo atual não muda.", confirmar: "Descartar", perigo: true })) {
                    rodar(() => descartarFluxoProposto(processoId), () => {
                      setDados((d) => ({ ...d, proposto: null }));
                      setAba("atual");
                    });
                  }
                }}
              >
                Descartar proposto
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {visao === "fluxograma" ? (
        <EditorFluxo
          key={aba + (aba === "publicado" ? versao : "")}
          processoId={processoId}
          tipo={aba === "proposto" ? "proposto" : "atual"}
          inicial={mostrando}
          editavel={podeEditar}
          aoMudar={(d) => {
            if (!podeEditar) return;
            setDados((x) => (aba === "proposto" ? { ...x, proposto: d } : { ...x, atual: d }));
          }}
        />
      ) : visao === "lista" ? (
        <ListaEtapas fluxo={mostrando} />
      ) : (
        <Raias fluxo={mostrando} />
      )}

      {pend.length > 0 && aba !== "publicado" ? (
        <details className="rounded-xl border p-3 text-sm">
          <summary className="flex cursor-pointer select-none items-center gap-2 font-medium">
            <AlertTriangle className="size-4 text-amber-500" /> {pend.length} ponto(s) de atenção no fluxo
          </summary>
          <ul className="mt-2 space-y-1 text-xs">
            {pend.map((p, i) => (
              <li key={i} className={cn("flex items-start gap-2", p.nivel === "erro" ? "text-foreground" : "text-muted-foreground")}>
                <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", p.nivel === "erro" ? "bg-destructive" : "bg-amber-500")} />
                {p.texto}
                {p.nivel === "erro" ? <span className="text-[10px] text-destructive">(impede publicar)</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

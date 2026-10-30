"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GripVertical, Link2, Plus, Search } from "lucide-react";
import { KanbanSquare } from "lucide-react";
import { moverTarefa, posicionarTarefa } from "./actions";
import { TarefaDetalhe } from "./tarefa-detalhe";
import { NovoCardDialogo } from "./novo-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatarData } from "@/lib/utils";
import { usePuxarParaRolar } from "@/lib/puxar-para-rolar";
import type { Unidades } from "@/lib/pastas";
import { TAREFA_STATUS_META, type TarefaStatus } from "@/types";

export interface TarefaView {
  id: string;
  titulo: string;
  descricao: string | null;
  status: TarefaStatus;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  responsaveis_notion: string | null;
  colaborador_id: string | null;
  colaborador_nome: string | null;
  /** Destino ao clicar em "abrir origem" (chamado/projeto). */
  origemHref: string | null;
  origemLabel: string | null;
  prazo: string | null;
  prioridade: number | null;
  tag: string | null;
  link: string | null;
  link_site: string | null;
  /** Quem pediu a tarefa (lista do organograma). */
  solicitante: string | null;
  /** TAFMKT - 001/2026 e a data de criação do card. */
  codigo: string | null;
  criada_em: string | null;
  lembretes: number[];
  conteudo: string | null;
  pasta_raiz: string | null;
  pasta_caminho: string | null;
  /** Liderança ou responsável: pode excluir o card. */
  podeExcluir?: boolean;
}

export interface PessoaOpcao {
  id: string;
  nome: string;
}

/** Colunas do quadro (iguais às do Notion). "Em revisão" só aparece se houver cards. */
const COLUNAS: TarefaStatus[] = [
  "a_fazer",
  "em_andamento",
  "alteracoes",
  "aprovacao_gustavo",
  "aprovacao_thiago",
  "aprovacao_marco",
  "concluida",
];

export function KanbanTarefas({
  tarefas,
  pessoas,
  abrirId = null,
  usuarioId,
  lideranca = false,
  unidades,
}: {
  unidades: Unidades;
  usuarioId: string;
  lideranca?: boolean;
  tarefas: TarefaView[];
  pessoas: PessoaOpcao[];
  /** Tarefa para abrir logo ao carregar (link vindo do chat). */
  abrirId?: string | null;
}) {
  const [lista, setLista] = useState(tarefas);
  // Tarefas criadas por outros caminhos (chat, ata) aparecem assim que a página atualiza.
  useEffect(() => {
    setLista(tarefas);
  }, [tarefas]);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<TarefaStatus | null>(null);
  // Onde o card arrastado vai cair: antes ou depois deste card.
  const [alvo, setAlvo] = useState<{ id: string; depois: boolean } | null>(null);
  const [aberta, setAberta] = useState<string | null>(abrirId);
  const [criando, setCriando] = useState<TarefaStatus | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroResp, setFiltroResp] = useState("");
  // A coluna "Concluído" mostra as mais recentes; o botão abre todas.
  const LIMITE_CONCLUIDAS = 30;
  const [todasConcluidas, setTodasConcluidas] = useState(() => {
    const alvo = abrirId ? tarefas.find((t) => t.id === abrirId) : null;
    if (!alvo || alvo.status !== "concluida") return false;
    const recentes = tarefas.filter((t) => t.status === "concluida").slice(0, LIMITE_CONCLUIDAS);
    return !recentes.some((t) => t.id === alvo.id);
  });
  const [, startTransition] = useTransition();
  const trilho = useRef<HTMLDivElement>(null);
  usePuxarParaRolar(trilho); // puxar o fundo do quadro para o lado

  const dialogoNovo =
    criando !== null ? (
      <NovoCardDialogo
        pessoas={pessoas}
        colunas={[...COLUNAS, "revisao"]}
        statusInicial={criando}
        usuarioId={usuarioId}
        lideranca={lideranca}
        unidades={unidades}
        aoFechar={() => setCriando(null)}
        aoCriar={(id) => {
          setCriando(null);
          setAberta(id);
        }}
      />
    ) : null;

  if (lista.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setCriando("a_fazer")}>
            <Plus className="size-4" /> Novo card
          </Button>
        </div>
        <EmptyState
          icone={KanbanSquare}
          titulo="Nenhuma tarefa ainda"
          descricao="Crie um card com o botão acima ou converta um chamado em tarefa."
        />
        {dialogoNovo}
      </div>
    );
  }

  function soltar(status: TarefaStatus) {
    const id = arrastando;
    setArrastando(null);
    setSobre(null);
    if (!id) return;
    const tarefa = lista.find((t) => t.id === id);
    if (!tarefa || tarefa.status === status) return;
    setLista((l) => l.map((t) => (t.id === id ? { ...t, status } : t)));
    startTransition(async () => {
      await moverTarefa(id, status);
    });
  }

  /** Põe o card em outra posição (e coluna): antes ou depois de outro card. Grava a ordem da coluna inteira. */
  function posicionar(id: string, status: TarefaStatus, refId: string, depois: boolean) {
    const tarefa = lista.find((t) => t.id === id);
    if (!tarefa || refId === id) return;
    const resto = lista.filter((t) => t.id !== id);
    const i = resto.findIndex((t) => t.id === refId);
    if (i < 0) return;
    const nova = [...resto.slice(0, depois ? i + 1 : i), { ...tarefa, status }, ...resto.slice(depois ? i + 1 : i)];
    setLista(nova);
    const ids = nova.filter((t) => t.status === status).map((t) => t.id);
    startTransition(async () => {
      await posicionarTarefa(id, status, ids);
    });
  }

  function soltarNoCard(status: TarefaStatus, refId: string) {
    const id = arrastando;
    const lado = alvo?.id === refId ? alvo.depois : false;
    setArrastando(null);
    setSobre(null);
    setAlvo(null);
    if (!id) return;
    // Com busca ou filtro ligado só aparece parte da coluna: aí o card só muda de coluna.
    if (filtrando) return soltarSemOrdem(id, status);
    posicionar(id, status, refId, lado);
  }

  function soltarSemOrdem(id: string, status: TarefaStatus) {
    const tarefa = lista.find((t) => t.id === id);
    if (!tarefa || tarefa.status === status) return;
    setLista((l) => l.map((t) => (t.id === id ? { ...t, status } : t)));
    startTransition(async () => {
      await moverTarefa(id, status);
    });
  }

  function rolar(direcao: 1 | -1) {
    trilho.current?.scrollBy({ left: direcao * 320, behavior: "smooth" });
  }

  const termo = busca.trim().toLowerCase();
  const filtrando = Boolean(termo || filtroResp);
  const visiveis = lista.filter(
    (t) =>
      (!filtroResp ||
        (filtroResp === "__sem__" ? !t.responsavel_id : t.responsavel_id === filtroResp || t.colaborador_id === filtroResp)) &&
      (!termo ||
        t.titulo.toLowerCase().includes(termo) ||
        (t.codigo ?? "").toLowerCase().includes(termo) ||
        (t.descricao ?? "").toLowerCase().includes(termo) ||
        (t.responsavel_nome ?? "").toLowerCase().includes(termo) ||
        (t.tag ?? "").toLowerCase().includes(termo))
  );

  const colunas: TarefaStatus[] = lista.some((t) => t.status === "revisao")
    ? [...COLUNAS.slice(0, -1), "revisao", "concluida"]
    : COLUNAS;

  const aberto = lista.find((t) => t.id === aberta) ?? null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar tarefa…"
            aria-label="Buscar tarefa"
            className="h-9 w-64 pl-8"
          />
        </div>
        <Select
          value={filtroResp}
          onChange={(e) => setFiltroResp(e.target.value)}
          aria-label="Filtrar por responsável"
          className="h-9 w-52"
        >
          <option value="">Todos os responsáveis</option>
          <option value="__sem__">Sem responsável</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
        <Button className="ml-auto h-9" onClick={() => setCriando("a_fazer")}>
          <Plus className="size-4" /> Novo card
        </Button>
        {termo || filtroResp ? (
          <span className="text-xs text-muted-foreground">
            {visiveis.length} de {lista.length} tarefas
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Clique em um card para abrir e editar. Arraste para mudar de coluna ou de posição (ou use as setas do card); puxe o fundo para andar para o lado.
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => rolar(-1)}
            aria-label="Rolar para a esquerda"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => rolar(1)}
            aria-label="Rolar para a direita"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div ref={trilho} className="flex cursor-grab gap-4 overflow-x-auto pb-3">
        {colunas.map((coluna) => {
          const todasDaColuna = visiveis.filter((t) => t.status === coluna);
          const limitada = coluna === "concluida" && !todasConcluidas && todasDaColuna.length > LIMITE_CONCLUIDAS;
          const daColuna = limitada ? todasDaColuna.slice(0, LIMITE_CONCLUIDAS) : todasDaColuna;
          return (
            <div
              key={coluna}
              onDragOver={(e) => {
                e.preventDefault();
                setSobre(coluna);
              }}
              onDragLeave={() => setSobre((s) => (s === coluna ? null : s))}
              onDrop={() => soltar(coluna)}
              className="w-72 shrink-0 space-y-3"
            >
              <div className="flex items-center justify-between px-1">
                <Badge variant={TAREFA_STATUS_META[coluna].variant}>
                  {TAREFA_STATUS_META[coluna].label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {todasDaColuna.length}
                </span>
              </div>
              <div
                className={cn(
                  "max-h-[calc(100vh-18rem)] min-h-24 space-y-2 overflow-y-auto rounded-lg border border-transparent bg-muted/40 p-2 transition-colors",
                  sobre === coluna && "border-primary/50 bg-primary/5"
                )}
              >
                {daColuna.map((t, posicao) => (
                  <Fragment key={t.id}>
                  {arrastando && alvo?.id === t.id && !alvo.depois && arrastando !== t.id ? <div className="h-1 rounded-full bg-primary" /> : null}
                  <div
                    draggable
                    onDragStart={() => setArrastando(t.id)}
                    onDragEnd={() => {
                      setArrastando(null);
                      setAlvo(null);
                      setSobre(null);
                    }}
                    onDragOver={(e) => {
                      if (!arrastando || filtrando) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setSobre(coluna);
                      const r = e.currentTarget.getBoundingClientRect();
                      const depois = e.clientY > r.top + r.height / 2;
                      setAlvo((a) => (a?.id === t.id && a.depois === depois ? a : { id: t.id, depois }));
                    }}
                    onDrop={(e) => {
                      if (filtrando) return; // cai no soltar da coluna
                      e.preventDefault();
                      e.stopPropagation();
                      soltarNoCard(coluna, t.id);
                    }}
                    onClick={() => setAberta(t.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setAberta(t.id);
                    }}
                    className={cn(
                      "group cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30",
                      arrastando === t.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      <div className="flex shrink-0 flex-col items-center gap-0.5">
                        <GripVertical className="mt-0.5 size-4 cursor-grab text-muted-foreground/50" />
                        {!filtrando ? (
                          <>
                            <button
                              type="button"
                              aria-label="Subir o card"
                              title="Subir"
                              disabled={posicao === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                posicionar(t.id, coluna, daColuna[posicao - 1].id, false);
                              }}
                              className="grid size-5 place-items-center rounded text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 disabled:hidden group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                            >
                              <ChevronUp className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Descer o card"
                              title="Descer"
                              disabled={posicao === daColuna.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                posicionar(t.id, coluna, daColuna[posicao + 1].id, true);
                              }}
                              className="grid size-5 place-items-center rounded text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 disabled:hidden group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                            >
                              <ChevronDown className="size-3.5" />
                            </button>
                          </>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        {t.codigo ? <p className="mb-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">{t.codigo}</p> : null}
                        <p className="text-sm font-medium leading-tight">
                          {t.titulo}
                        </p>
                        {t.descricao ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {t.descricao}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">
                            {t.responsavel_nome ?? "Sem responsável"}
                            {t.colaborador_nome ? ` + ${t.colaborador_nome.split(" ")[0]}` : ""}
                          </span>
                          {t.prazo ? (
                            <span className="shrink-0">
                              {formatarData(t.prazo)}
                            </span>
                          ) : null}
                        </div>
                        {t.link || t.link_site || t.origemHref ? (
                          <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary">
                            <Link2 className="size-3" />
                            {t.origemLabel ?? "Com link"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {arrastando && alvo?.id === t.id && alvo.depois && arrastando !== t.id ? <div className="h-1 rounded-full bg-primary" /> : null}
                  </Fragment>
                ))}
                {coluna === "concluida" && todasDaColuna.length > LIMITE_CONCLUIDAS ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setTodasConcluidas((v) => !v)}
                  >
                    {todasConcluidas
                      ? "Mostrar só as " + LIMITE_CONCLUIDAS + " mais recentes"
                      : "Mostrar todas as " + todasDaColuna.length + " concluídas"}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {aberto ? (
        <TarefaDetalhe
          key={aberto.id}
          tarefa={aberto}
          usuarioId={usuarioId}
          unidades={unidades}
          pessoas={pessoas}
          onFechar={() => setAberta(null)}
          onDuplicada={(id) => {
            setBusca("");
            setFiltroResp("");
            setAberta(id);
          }}
          podeExcluir={lideranca || aberto.responsavel_id === usuarioId}
          onExcluida={(id) => setLista((l) => l.filter((x) => x.id !== id))}
          onSalvo={(t) =>
            setLista((l) => l.map((x) => (x.id === t.id ? t : x)))
          }
        />
      ) : null}
      {dialogoNovo}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, GripVertical, Link2, Plus, Search } from "lucide-react";
import { KanbanSquare } from "lucide-react";
import { moverTarefa } from "./actions";
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

  function rolar(direcao: 1 | -1) {
    trilho.current?.scrollBy({ left: direcao * 320, behavior: "smooth" });
  }

  const termo = busca.trim().toLowerCase();
  const visiveis = lista.filter(
    (t) =>
      (!filtroResp ||
        (filtroResp === "__sem__" ? !t.responsavel_id : t.responsavel_id === filtroResp || t.colaborador_id === filtroResp)) &&
      (!termo ||
        t.titulo.toLowerCase().includes(termo) ||
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
          Clique em um card para abrir e editar. Arraste o card para mudar de coluna; puxe o fundo para andar para o lado.
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
                {daColuna.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setArrastando(t.id)}
                    onDragEnd={() => setArrastando(null)}
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
                      <GripVertical className="mt-0.5 size-4 shrink-0 cursor-grab text-muted-foreground/50" />
                      <div className="min-w-0 flex-1">
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
          podeExcluir={aberto.podeExcluir ?? false}
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

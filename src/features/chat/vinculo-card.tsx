"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarClock, CheckCircle2, ClipboardList, FolderKanban, Loader2, Package, Pencil, Reply } from "lucide-react";
import Link from "next/link";
import { atualizarProjetoPeloChat, dadosVinculo, responderVinculo } from "./vinculos-actions";
import { STATUS_PROJETO_ROTULO, STATUS_TAREFA_ROTULO, type DadosVinculo, type RefItem } from "./vinculo-tipos";
import { Select } from "@/components/ui/select";
import { NomeItemEditavel } from "@/features/estoque/nome-item-editavel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const dataBr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }) : null;

/** Cartão de tarefa / itens do estoque / projeto dentro da mensagem, com resposta rápida. */
export function VinculoCard({
  conversaId,
  tarefaId,
  itens: itensRef,
  projetoId,
  versao,
  nomes,
  minha,
}: {
  conversaId: string;
  tarefaId: string | null;
  itens: RefItem[];
  projetoId: string | null;
  /** Muda quando chega nova mensagem ligada ao mesmo vínculo (recarrega os dados). */
  versao: number;
  nomes: Record<string, string>;
  minha: boolean;
}) {
  const [d, setD] = useState<DadosVinculo | null>(null);
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [entradas, setEntradas] = useState<Record<string, string>>({});
  const [concluir, setConcluir] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const [atualizando, setAtualizando] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [textoProj, setTextoProj] = useState("");
  const [statusProj, setStatusProj] = useState("");

  const chaveItens = itensRef.map((r) => r.id + ":" + (r.qtd ?? "")).join(",");

  useEffect(() => {
    let vivo = true;
    void dadosVinculo(tarefaId, itensRef, projetoId).then((r) => vivo && setD(r));
    return () => {
      vivo = false;
    };
    // itensRef muda de identidade a cada render; a chave textual representa o conteúdo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarefaId, chaveItens, projetoId, versao, recarga]);

  if (!d || (!d.tarefa && d.itens.length === 0 && !d.projeto)) return null;
  const { tarefa, itens, projeto } = d;
  const concluida = tarefa?.status === "concluida";

  function atualizarProjeto() {
    if (!projeto) return;
    setErro(null);
    startTransition(async () => {
      const r = await atualizarProjetoPeloChat(conversaId, projeto.id, textoProj, statusProj || null);
      if (r.erro) setErro(r.erro);
      else {
        setAtualizando(false);
        setTextoProj("");
        setStatusProj("");
      }
    });
  }

  function enviar() {
    setErro(null);
    startTransition(async () => {
      const r = await responderVinculo(conversaId, tarefaId, itensRef, {
        texto,
        entradas: Object.entries(entradas).map(([itemId, q]) => ({ itemId, qtd: Number(q) || 0 })),
        concluir: !!tarefa && concluir,
        andamento: false,
      });
      if (r.erro) setErro(r.erro);
      else {
        setAberto(false);
        setTexto("");
        setEntradas({});
      }
    });
  }

  return (
    <div className={cn("mt-1.5 space-y-1.5 rounded-lg border p-2 text-xs", minha ? "border-white/30 bg-white/10" : "bg-background")}>
      {tarefa ? (
        <div className="space-y-0.5">
          <p className="flex flex-wrap items-center gap-x-1.5 font-semibold">
            <ClipboardList className="size-3.5 shrink-0" /> {tarefa.titulo}
            <Link
              href={"/operacional?tarefa=" + tarefa.id}
              className="text-[11px] font-medium underline underline-offset-2 opacity-90 hover:opacity-100"
            >
              Abrir no quadro
            </Link>
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 opacity-90">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-medium",
                concluida ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
              )}
            >
              {STATUS_TAREFA_ROTULO[tarefa.status]}
            </span>
            {tarefa.responsavel_id ? <span>Responsável: {nomes[tarefa.responsavel_id] ?? "—"}</span> : null}
            {tarefa.prazo ? (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3" /> até {dataBr(tarefa.prazo)}
              </span>
            ) : null}
          </p>
        </div>
      ) : null}

      {projeto ? (
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <FolderKanban className="size-3.5 shrink-0" />
            <Link href={"/projetos/" + projeto.id} className="font-semibold underline-offset-2 hover:underline">
              {projeto.nome}
            </Link>
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">{STATUS_PROJETO_ROTULO[projeto.status]}</span>
            {projeto.responsavel_id ? <span className="opacity-90">Responsável: {nomes[projeto.responsavel_id] ?? "—"}</span> : null}
          </p>
          {projeto.ultima ? (
            <p className="line-clamp-2 opacity-90">
              Última atualização ({dataBr(projeto.ultima.quando)}
              {projeto.ultima.autor_id ? " · " + (nomes[projeto.ultima.autor_id] ?? "") : ""}): {projeto.ultima.texto}
            </p>
          ) : null}
          {atualizando ? (
            <div className="space-y-1.5 rounded-md bg-muted/60 p-2 text-foreground">
              <Input
                value={textoProj}
                onChange={(e) => setTextoProj(e.target.value)}
                placeholder="O que mudou no projeto?"
                maxLength={500}
                className="h-8 text-xs"
                aria-label="Atualização do projeto"
              />
              {d.podeMudarStatusProjeto ? (
                <Select value={statusProj} onChange={(e) => setStatusProj(e.target.value)} className="h-8 text-xs" aria-label="Nova situação">
                  <option value="">Manter situação ({STATUS_PROJETO_ROTULO[projeto.status]})</option>
                  {Object.entries(STATUS_PROJETO_ROTULO)
                    .filter(([k]) => k !== projeto.status)
                    .map(([k, v]) => (
                      <option key={k} value={k}>
                        Mudar para: {v}
                      </option>
                    ))}
                </Select>
              ) : null}
              {erro ? <p className="text-destructive">{erro}</p> : null}
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={atualizarProjeto} disabled={pendente || !textoProj.trim()}>
                  {pendente ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Registrar
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAtualizando(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs text-foreground" onClick={() => setAtualizando(true)}>
              <Pencil className="size-3.5" /> Atualizar projeto
            </Button>
          )}
        </div>
      ) : null}

      {itens.length > 0 ? (
        <ul className="space-y-1">
          {itens.map((item) => {
            const baixo = item.quantidade <= item.estoque_minimo;
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <Package className="size-3.5 shrink-0" />
                <NomeItemEditavel
                  itemId={item.id}
                  nome={item.nome}
                  podeRenomear={d.podeRenomearItens}
                  conversaId={conversaId}
                  aoRenomear={() => setRecarga((n) => n + 1)}
                />
                {item.renomeado ? (
                  <span className="basis-full text-[11px] opacity-90">
                    ✏️ Nome trocado{item.renomeado.porNome ? " por " + item.renomeado.porNome : ""} em {dataBr(item.renomeado.quando)}
                    {": “" + item.renomeado.de + "” → “" + item.renomeado.para + "”"}
                  </span>
                ) : null}
                {item.pedido ? <span className="rounded bg-primary/15 px-1.5 py-0.5">pedido: {item.pedido} un.</span> : null}
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5",
                    item.quantidade <= 0
                      ? "bg-red-600 font-semibold text-white"
                      : baixo
                        ? "bg-red-100 text-red-800"
                        : "bg-muted text-foreground"
                  )}
                >
                  {item.quantidade <= 0 ? "estoque ZERADO" : `estoque: ${item.quantidade}`} (mín. {item.estoque_minimo})
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {d.podeResponder && !concluida ? (
        aberto ? (
          <div className="space-y-1.5 rounded-md bg-muted/60 p-2 text-foreground">
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Resposta (opcional)"
              maxLength={500}
              className="h-8 text-xs"
              aria-label="Resposta"
            />
            {itens.length > 0 ? (
              <div className="space-y-1">
                <p className="font-medium">Entrada no estoque (quantas chegaram de cada item)</p>
                {itens.map((item) => (
                  <label key={item.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate">{item.nome}</span>
                    <Input
                      type="number"
                      min={0}
                      value={entradas[item.id] ?? ""}
                      onChange={(e) => setEntradas((x) => ({ ...x, [item.id]: e.target.value }))}
                      placeholder={item.pedido ? String(item.pedido) : "qtd"}
                      className="h-8 w-20 text-xs"
                      aria-label={`Quantidade que entrou de ${item.nome}`}
                    />
                    <span className="text-muted-foreground">un.</span>
                  </label>
                ))}
              </div>
            ) : null}
            {tarefa ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={concluir} onChange={(e) => setConcluir(e.target.checked)} className="size-4 accent-emerald-600" />
                Concluir a tarefa
              </label>
            ) : null}
            {erro && !atualizando ? <p className="text-destructive">{erro}</p> : null}
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={enviar} disabled={pendente}>
                {pendente ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Enviar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs text-foreground" onClick={() => setAberto(true)}>
            <Reply className="size-3.5" /> Responder / dar baixa
          </Button>
        )
      ) : null}
    </div>
  );
}

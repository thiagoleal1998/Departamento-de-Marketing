"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, List, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { excluirItemCalendario } from "./actions";
import { ItemCalendarioForm, TIPOS, rotuloTipo } from "./item-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ItemCalendario {
  id: string;
  nome: string;
  data: string | null;
  status: string;
  tipo: string | null;
  canais: string[];
  responsaveis: string[];
  tipo_post: string | null;
  objetivo: string | null;
  publico: string[];
  tags: string | null;
  lembretes?: number[] | null;
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const POR_CELULA = 3;

function corStatus(s: string): string {
  if (/postado|conclu|agendado/i.test(s)) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  if (/aprova|editando|gravando|andamento/i.test(s)) return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
  return "bg-muted text-muted-foreground";
}

/** Cor de cada tipo: chip no calendário, ponto da legenda e borda do cartão. */
const TIPO_COR: Record<string, { chip: string; ponto: string; borda: string }> = {
  "Redes Sociais": { chip: "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200", ponto: "bg-purple-500", borda: "border-l-purple-500" },
  "E-mail Marketing": { chip: "bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-200", ponto: "bg-pink-500", borda: "border-l-pink-500" },
  Oferta: { chip: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200", ponto: "bg-green-500", borda: "border-l-green-500" },
  Podcast: { chip: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200", ponto: "bg-yellow-500", borda: "border-l-yellow-500" },
  Visita: { chip: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200", ponto: "bg-orange-500", borda: "border-l-orange-500" },
  ULV: { chip: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200", ponto: "bg-sky-500", borda: "border-l-sky-500" },
};
const COR_PADRAO = { chip: "bg-muted text-foreground", ponto: "bg-muted-foreground/60", borda: "border-l-muted-foreground/40" };
const corTipo = (t: string | null) => (t && TIPO_COR[t]) || COR_PADRAO;
const concluido = (s: string) => /postado|conclu/i.test(s);

const iso = (a: number, m: number, d: number) => new Date(Date.UTC(a, m, d)).toISOString().slice(0, 10);
const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

const diaExtenso = (data: string) => {
  const [a, m, d] = data.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d)).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Calendário geral: grade mensal (ou lista) com os conteúdos e eventos do time, com filtros. */
export function ListaCalendario({ itens, podeExcluir = false }: { itens: ItemCalendario[]; podeExcluir?: boolean }) {
  const { confirmar, avisar } = useDialogo();
  const hoje = hojeSP();
  const [formulario, setFormulario] = useState<{ item?: ItemCalendario; data: string } | null>(null);
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const [visao, setVisao] = useState<"mes" | "lista">("mes");
  const [cursor, setCursor] = useState(() => ({ a: Number(hoje.slice(0, 4)), m: Number(hoje.slice(5, 7)) - 1 }));
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [resp, setResp] = useState("");
  const [status, setStatus] = useState("");

  // Todos os tipos possíveis aparecem no filtro e na legenda, mesmo sem itens ainda.
  const tipos = useMemo(() => Array.from(new Set([...TIPOS, ...itens.map((i) => i.tipo).filter((x): x is string => !!x)])).sort((a, b) => a.localeCompare(b, "pt-BR")), [itens]);
  const resps = useMemo(() => Array.from(new Set(itens.flatMap((i) => i.responsaveis))).sort(), [itens]);
  const statuses = useMemo(() => Array.from(new Set(itens.map((i) => i.status))).sort(), [itens]);

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return itens.filter(
      (i) => (!tipo || i.tipo === tipo) && (!resp || i.responsaveis.includes(resp)) && (!status || i.status === status) && (!t || i.nome.toLowerCase().includes(t))
    );
  }, [itens, busca, tipo, resp, status]);

  const porData = useMemo(() => {
    const mapa = new Map<string, ItemCalendario[]>();
    for (const i of visiveis) if (i.data) mapa.set(i.data, [...(mapa.get(i.data) ?? []), i]);
    return mapa;
  }, [visiveis]);
  const semData = useMemo(() => visiveis.filter((i) => !i.data), [visiveis]);

  const prefixoMes = `${cursor.a}-${String(cursor.m + 1).padStart(2, "0")}`;
  const noMes = useMemo(() => visiveis.filter((i) => i.data?.startsWith(prefixoMes)).length, [visiveis, prefixoMes]);

  // 6 semanas a partir do domingo anterior (ou do próprio dia 1º).
  const celulas = useMemo(() => {
    const inicio = new Date(Date.UTC(cursor.a, cursor.m, 1)).getUTCDay();
    return Array.from({ length: 42 }, (_, n) => {
      const data = iso(cursor.a, cursor.m, 1 - inicio + n);
      return { data, dia: Number(data.slice(8)), doMes: data.startsWith(prefixoMes) };
    });
  }, [cursor, prefixoMes]);
  const semanas = celulas.slice(35).every((c) => !c.doMes) ? 5 : 6;

  const diasDaLista = useMemo(() => [...porData.keys()].filter((d) => d.startsWith(prefixoMes)).sort(), [porData, prefixoMes]);

  function mover(delta: number) {
    setCursor((c) => {
      const d = new Date(Date.UTC(c.a, c.m + delta, 1));
      return { a: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  }

  async function excluir(i: ItemCalendario) {
    const ok = await confirmar({ titulo: "Excluir este item?", descricao: i.nome, confirmar: "Excluir", perigo: true });
    if (!ok) return;
    const r = await excluirItemCalendario(i.id);
    if (r.erro) void avisar(r.erro, "Não foi possível excluir");
  }

  const sel = "h-9 rounded-md border bg-background px-2 text-sm";

  const cartao = (i: ItemCalendario) => (
    <li key={i.id} className={cn("space-y-1.5 rounded-lg border border-l-4 bg-card p-3", corTipo(i.tipo).borda)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{i.nome}</p>
        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium", corStatus(i.status))}>{i.status}</span>
      </div>
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" className="size-7" aria-label={`Editar ${i.nome}`} onClick={() => setFormulario({ item: i, data: i.data ?? hoje })}>
          <Pencil className="size-3.5" />
        </Button>
        {podeExcluir ? (
          <Button variant="ghost" size="icon" className="size-7" aria-label={`Excluir ${i.nome}`} onClick={() => void excluir(i)}>
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{[i.tipo ? rotuloTipo(i.tipo) : null, i.tipo_post, i.canais.join(", "), i.publico.join("/"), i.objetivo].filter(Boolean).join(" · ") || "—"}</p>
      {i.responsaveis.length > 0 ? <p className="text-xs">Responsável: {i.responsaveis.join(", ")}</p> : null}
    </li>
  );

  return (
    <div className="space-y-4">
      {/* Navegação do mês e ações */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" className="size-9" aria-label="Mês anterior" onClick={() => mover(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="min-w-44 text-center text-lg font-semibold">
          {MESES[cursor.m]} de {cursor.a}
        </h2>
        <Button variant="outline" size="icon" className="size-9" aria-label="Próximo mês" onClick={() => mover(1)}>
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-9" onClick={() => setCursor({ a: Number(hoje.slice(0, 4)), m: Number(hoje.slice(5, 7)) - 1 })}>
          Hoje
        </Button>
        <span className="text-xs text-muted-foreground">{noMes} no mês</span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            <Button variant={visao === "mes" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5" onClick={() => setVisao("mes")}>
              <CalendarDays className="size-4" /> Mês
            </Button>
            <Button variant={visao === "lista" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5" onClick={() => setVisao("lista")}>
              <List className="size-4" /> Lista
            </Button>
          </div>
          <Button onClick={() => setFormulario({ data: hoje })}>
            <Plus className="size-4" /> Novo item
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no calendário…" aria-label="Buscar" className="h-9 w-64 pl-8" />
        </div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo" className={sel}>
          <option value="">Todos os tipos</option>
          {tipos.map((t) => (
            <option key={t} value={t}>
              {rotuloTipo(t)}
            </option>
          ))}
        </select>
        <select value={resp} onChange={(e) => setResp(e.target.value)} aria-label="Responsável" className={sel}>
          <option value="">Todos os responsáveis</option>
          {resps.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className={sel}>
          <option value="">Todos os status</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <ul className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {tipos.map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-full", corTipo(t).ponto)} /> {rotuloTipo(t)}
            </li>
          ))}
        </ul>
      </div>

      {visao === "mes" ? (
        <div className="overflow-x-auto">
          <div className="min-w-[760px] overflow-hidden rounded-xl border bg-card">
            <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
              {DIAS.map((d) => (
                <div key={d} className="px-2 py-2 text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {celulas.slice(0, semanas * 7).map((c, n) => {
                const lista = porData.get(c.data) ?? [];
                const ehHoje = c.data === hoje;
                return (
                  <div
                    key={c.data}
                    className={cn(
                      "group min-h-28 space-y-1 border-b border-r p-1.5",
                      n % 7 === 6 && "border-r-0",
                      n >= (semanas - 1) * 7 && "border-b-0",
                      !c.doMes && "bg-muted/30",
                      n % 7 === 0 || n % 7 === 6 ? "bg-muted/20" : ""
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setDiaAberto(c.data)}
                        aria-label={`Abrir ${diaExtenso(c.data)}`}
                        className={cn(
                          "grid size-6 place-items-center rounded-full text-xs font-medium transition-colors hover:bg-accent",
                          !c.doMes && "text-muted-foreground/60",
                          ehHoje && "bg-primary text-primary-foreground hover:bg-primary"
                        )}
                      >
                        {c.dia}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormulario({ data: c.data })}
                        aria-label={`Novo item em ${diaExtenso(c.data)}`}
                        className="grid size-5 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    {lista.slice(0, POR_CELULA).map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => setFormulario({ item: i, data: c.data })}
                        title={`${i.nome} · ${i.status}`}
                        className={cn("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80", corTipo(i.tipo).chip, concluido(i.status) && "opacity-60")}
                      >
                        {i.nome}
                      </button>
                    ))}
                    {lista.length > POR_CELULA ? (
                      <button type="button" onClick={() => setDiaAberto(c.data)} className="w-full rounded px-1.5 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground">
                        +{lista.length - POR_CELULA} mais
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : diasDaLista.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nada neste mês.</p>
      ) : (
        diasDaLista.map((d) => (
          <section key={d} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{diaExtenso(d)}</h3>
            <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{(porData.get(d) ?? []).map(cartao)}</ul>
          </section>
        ))
      )}

      {semData.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Sem data definida ({semData.length})</h3>
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{semData.map(cartao)}</ul>
        </section>
      ) : null}

      {/* Dia aberto: todos os itens do dia */}
      {diaAberto ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && setDiaAberto(null)}>
          <div role="dialog" aria-modal="true" aria-label={diaExtenso(diaAberto)} className="w-full max-w-xl space-y-4 rounded-xl border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{diaExtenso(diaAberto)}</h2>
                <p className="text-sm text-muted-foreground">{(porData.get(diaAberto) ?? []).length} item(ns)</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={() => setDiaAberto(null)}>
                <X className="size-5" />
              </Button>
            </div>
            {(porData.get(diaAberto) ?? []).length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nada programado para este dia.</p>
            ) : (
              <ul className="space-y-2">{(porData.get(diaAberto) ?? []).map(cartao)}</ul>
            )}
            <Button
              onClick={() => {
                setFormulario({ data: diaAberto });
                setDiaAberto(null);
              }}
            >
              <Plus className="size-4" /> Novo item neste dia
            </Button>
          </div>
        </div>
      ) : null}

      {formulario !== null ? (
        <ItemCalendarioForm item={formulario.item} responsaveisConhecidos={resps} dataPadrao={formulario.data} aoFechar={() => setFormulario(null)} />
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, BellRing, Building2, CalendarPlus, Check, ChevronDown, Home, Loader2, Palmtree, Trash2, UserPlus, Users } from "lucide-react";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { adicionarFeriadoExtra, avisarFolga, definirEscala, removerFeriadoExtra } from "./actions";
import { caiNoFimDeSemana, dataBr, diaDaSemana, type Feriado } from "./calendario";
import { MODALIDADES, ROTULO_MODALIDADE, modalidadeOuPadrao, type ItemEscala, type Modalidade } from "./modalidade";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { InputData } from "@/components/ui/input-data";

export interface Escalado {
  id: string;
  data: string;
  profile_id: string;
  /** Presencial ou home office (ausente antes da migration 0089: vale presencial). */
  modalidade?: Modalidade;
}
export interface PeriodoFerias {
  profile_id: string;
  inicio: string;
  fim: string;
}

const ROTULO = { nacional: "Feriado nacional", facultativo: "Ponto facultativo", extra: "Feriado extra" } as const;
const COR = {
  nacional: "bg-emerald-100 text-emerald-900",
  facultativo: "bg-amber-100 text-amber-900",
  extra: "bg-sky-100 text-sky-900",
} as const;

const iniciais = (n: string) =>
  n
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

/** Escolha da modalidade de uma pessoa escalada: dois botões lado a lado (presencial ou home office). */
function SeletorModalidade({ valor, onChange, rotulo }: { valor: Modalidade; onChange: (m: Modalidade) => void; rotulo: string }) {
  return (
    <div className="flex shrink-0 rounded-lg border bg-background p-0.5" role="group" aria-label={rotulo}>
      {MODALIDADES.map((m) => {
        const Icone = m === "home_office" ? Home : Building2;
        const ativo = valor === m;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={ativo}
            title={ROTULO_MODALIDADE[m]}
            onClick={() => onChange(m)}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              ativo ? (m === "home_office" ? "bg-sky-500 text-white" : "bg-primary text-primary-foreground") : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Icone className="size-3" aria-hidden />
            {m === "home_office" ? "Home" : "Presencial"}
          </button>
        );
      })}
    </div>
  );
}

/** Etiqueta da modalidade ao lado do nome de quem está escalado. */
function EtiquetaModalidade({ modalidade }: { modalidade: Modalidade }) {
  const home = modalidade === "home_office";
  const Icone = home ? Home : Building2;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", home ? "bg-sky-500/15 text-sky-700 dark:text-sky-300" : "bg-muted text-muted-foreground")}>
      <Icone className="size-3" aria-hidden />
      {ROTULO_MODALIDADE[modalidade]}
    </span>
  );
}

/** Menu para escolher quem fica de plantão e COMO (presencial ou home office); só grava ao salvar. */
function MenuEscala({
  pessoas,
  atuais,
  deFerias,
  pendente,
  onSalvar,
  rotulo,
}: {
  pessoas: { id: string; nome: string }[];
  atuais: ItemEscala[];
  deFerias: (id: string) => boolean;
  pendente: boolean;
  onSalvar: (itens: ItemEscala[]) => void;
  rotulo: string;
}) {
  const [aberto, setAberto] = useState(false);
  const daEscala = () => Object.fromEntries(atuais.map((a) => [a.id, a.modalidade])) as Record<string, Modalidade>;
  const [sel, setSel] = useState<Record<string, Modalidade>>(daEscala);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const ids = Object.keys(sel);
  const todos = pessoas.length > 0 && ids.length === pessoas.length;
  const alternar = (id: string) =>
    setSel((s) => {
      if (id in s) {
        const { [id]: _removido, ...resto } = s;
        void _removido;
        return resto;
      }
      return { ...s, [id]: "presencial" };
    });
  const definir = (id: string, m: Modalidade) => setSel((s) => ({ ...s, [id]: m }));
  const todosComo = (m: Modalidade) => setSel((s) => Object.fromEntries(Object.keys(s).map((id) => [id, m])) as Record<string, Modalidade>);
  const mudou =
    ids.length !== atuais.length ||
    ids.some((id) => {
      const a = atuais.find((x) => x.id === id);
      return !a || a.modalidade !== sel[id];
    });
  const emHome = ids.filter((id) => sel[id] === "home_office").length;

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 rounded-full text-xs"
        aria-label={rotulo}
        aria-expanded={aberto}
        onClick={() => {
          setSel(daEscala());
          setAberto((a) => !a);
        }}
      >
        <UserPlus className="size-3.5" /> Escalar
        <ChevronDown className={cn("size-3.5 transition-transform", aberto && "rotate-180")} />
      </Button>
      {aberto ? (
        <div className="absolute left-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl">
          <button
            type="button"
            onClick={() => setSel(todos ? {} : Object.fromEntries(pessoas.map((p) => [p.id, sel[p.id] ?? "presencial"])) as Record<string, Modalidade>)}
            className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors hover:bg-muted", todos && "bg-primary/10")}
          >
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <Users className="size-4" />
            </span>
            <span className="flex-1">Todo o time</span>
            {todos ? <Check className="size-4 text-primary" /> : null}
          </button>
          <button
            type="button"
            onClick={() => setSel({})}
            className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors hover:bg-muted", ids.length === 0 && "bg-primary/10")}
          >
            <span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <Palmtree className="size-4" />
            </span>
            <span className="flex-1">Todos de folga</span>
            {ids.length === 0 ? <Check className="size-4 text-primary" /> : null}
          </button>
          <div className="my-1 h-px bg-border" />
          <ul className="max-h-64 overflow-y-auto">
            {pessoas.map((p) => {
              const on = p.id in sel;
              return (
                <li key={p.id} className={cn("flex items-center gap-2 rounded-lg pr-1.5 transition-colors", on && "bg-primary/10")}>
                  <button type="button" onClick={() => alternar(p.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {iniciais(p.nome)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{p.nome}</span>
                      {deFerias(p.id) ? (
                        <span className="flex items-center gap-1 text-[11px] text-amber-700">
                          <AlertTriangle className="size-3" /> de férias nesta data
                        </span>
                      ) : null}
                    </span>
                    {on ? <Check className="size-4 shrink-0 text-primary" /> : null}
                  </button>
                  {on ? <SeletorModalidade valor={sel[p.id]} onChange={(m) => definir(p.id, m)} rotulo={`Modalidade de ${p.nome}`} /> : null}
                </li>
              );
            })}
          </ul>
          {ids.length > 0 ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 border-t px-2 pt-2 text-xs text-muted-foreground">
              Todos os escalados:
              <button type="button" onClick={() => todosComo("presencial")} className="rounded-full border px-2.5 py-0.5 font-medium hover:bg-muted">
                Presencial
              </button>
              <button type="button" onClick={() => todosComo("home_office")} className="rounded-full border px-2.5 py-0.5 font-medium hover:bg-muted">
                Home office
              </button>
            </div>
          ) : null}
          <div className="mt-1 flex items-center justify-between gap-2 border-t p-2">
            <span className="text-xs text-muted-foreground">
              {ids.length} escalado(s){ids.length > 0 ? ` · ${emHome} em home office` : ""}
            </span>
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={pendente || !mudou}
              onClick={() => {
                onSalvar(ids.map((id) => ({ id, modalidade: sel[id] })));
                setAberto(false);
              }}
            >
              {pendente ? <Loader2 className="size-4 animate-spin" /> : null} Salvar escala
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Escala de feriados: quem fica de plantão em cada data (aviso se a pessoa estiver de férias). */
export function EscalaPainel({
  feriados,
  escala,
  pessoas,
  ferias,
  hoje,
  indisponivel,
  avisados = [],
}: {
  feriados: Feriado[];
  escala: Escalado[];
  pessoas: { id: string; nome: string }[];
  ferias: PeriodoFerias[];
  hoje: string;
  indisponivel?: boolean;
  avisados?: string[];
}) {
  const { confirmar, avisar } = useDialogo();
  const [pendente, start] = useTransition();
  const [novoNome, setNovoNome] = useState("");
  const [novaData, setNovaData] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const nome = new Map(pessoas.map((p) => [p.id, p.nome]));

  const deFerias = (profileId: string, data: string) => ferias.some((f) => f.profile_id === profileId && f.inicio <= data && data <= f.fim);

  const anos = Array.from(new Set(feriados.map((f) => f.data.slice(0, 4)))).sort();

  function salvarEscala(f: Feriado, itens: ItemEscala[]) {
    start(async () => {
      const r = await definirEscala(f.data, f.nome, itens);
      if (r.erro) void avisar(r.erro, "Não foi possível salvar a escala");
      else if (r.aviso) void avisar(r.aviso, "Escala salva");
      else if (r.avisados) void avisar(`${r.avisados} pessoa(s) receberam a notificação da escala.`, "Escala salva");
    });
  }

  async function avisarTime(f: Feriado) {
    const ok = await confirmar({
      titulo: "Avisar quem ficou de folga?",
      descricao: `Quem não está na escala de ${f.nome} (${dataBr(f.data)}) receberá a notificação de que estará de folga.`,
      confirmar: "Avisar",
    });
    if (!ok) return;
    start(async () => {
      const r = await avisarFolga(f.data, f.nome);
      if (r.erro) void avisar(r.erro, "Não foi possível avisar");
      else void avisar(`${r.avisados ?? 0} pessoa(s) avisadas de que estarão de folga.`, "Aviso enviado");
    });
  }

  async function removerExtra(f: Feriado) {
    if (!f.extraId) return;
    const ok = await confirmar({ titulo: "Remover este feriado extra?", descricao: `${f.nome} — ${dataBr(f.data)}`, confirmar: "Remover", perigo: true });
    if (!ok) return;
    const r = await removerFeriadoExtra(f.extraId);
    if (r.erro) void avisar(r.erro, "Não foi possível remover");
  }

  function adicionarExtra(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    start(async () => {
      const r = await adicionarFeriadoExtra(novaData, novoNome);
      if (r.erro) setErro(r.erro);
      else {
        setNovoNome("");
        setNovaData("");
      }
    });
  }

  return (
    <div className="space-y-6">
      {indisponivel ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">A escala ainda não foi ativada no banco. Rode as migrations 0067 e 0068 no Supabase para montar a escala (os feriados já aparecem abaixo).</p>
      ) : null}

      <Card>
        <CardContent className="p-4">
          <form onSubmit={adicionarExtra} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label htmlFor="fe-extra-nome" className="text-xs font-medium text-muted-foreground">
                Feriado extra (municipal, estadual, ponte)
              </label>
              <Input id="fe-extra-nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} maxLength={120} placeholder="Ex.: Aniversário da cidade" className="h-9 w-72" />
            </div>
            <div className="space-y-1">
              <label htmlFor="fe-extra-data" className="text-xs font-medium text-muted-foreground">
                Data
              </label>
              <InputData id="fe-extra-data"  value={novaData} onChange={(e) => setNovaData(e.target.value)} className="h-9 w-40" />
            </div>
            <Button type="submit" size="sm" className="h-9" disabled={pendente || !novoNome.trim() || !novaData || indisponivel}>
              {pendente ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />} Adicionar
            </Button>
            {erro ? <span className="text-sm text-destructive">{erro}</span> : null}
          </form>
        </CardContent>
      </Card>

      {anos.map((ano) => (
        <section key={ano} className="space-y-3">
          <h2 className="text-lg font-semibold">{ano === hoje.slice(0, 4) ? `Restantes de ${ano}` : ano}</h2>
          <ul className="space-y-2">
            {feriados
              .filter((f) => f.data.startsWith(ano))
              .map((f) => {
                const escalados = escala.filter((e) => e.data === f.data);
                const proximo = f.data >= hoje;
                return (
                  <li key={f.data + f.nome} className={cn("rounded-xl border bg-card p-4", f.data === hoje && "border-primary")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          {f.nome}
                          <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", COR[f.tipo])}>{ROTULO[f.tipo]}</span>
                          {caiNoFimDeSemana(f.data) ? <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">cai no fim de semana</span> : null}
                          {f.data === hoje ? <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Hoje</span> : null}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="capitalize">{diaDaSemana(f.data)}</span>, {dataBr(f.data)}
                        </p>
                      </div>
                      {f.tipo === "extra" ? (
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Remover ${f.nome}`} onClick={() => void removerExtra(f)}>
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Escala:</span>
                      {escalados.length === 0 ? <span className="text-xs text-muted-foreground">ninguém escalado (todos de folga)</span> : null}
                      {escalados.map((e) => {
                        const conflito = deFerias(e.profile_id, f.data);
                        return (
                          <span
                            key={e.id}
                            className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm", conflito ? "border-amber-400 bg-amber-50" : "bg-muted/50")}
                            title={conflito ? "Esta pessoa está de férias nesta data" : undefined}
                          >
                            {conflito ? <AlertTriangle className="size-3.5 text-amber-600" /> : null}
                            {nome.get(e.profile_id) ?? "—"}
                            <EtiquetaModalidade modalidade={modalidadeOuPadrao(e.modalidade)} />
                            {conflito ? <span className="text-[11px] text-amber-700">(de férias)</span> : null}
                          </span>
                        );
                      })}
                      {proximo && !indisponivel ? (
                        <>
                          <MenuEscala
                            key={escalados
                              .map((e) => e.profile_id + ":" + modalidadeOuPadrao(e.modalidade))
                              .sort()
                              .join(",")}
                            pessoas={pessoas}
                            atuais={escalados.map((e) => ({ id: e.profile_id, modalidade: modalidadeOuPadrao(e.modalidade) }))}
                            deFerias={(id) => deFerias(id, f.data)}
                            pendente={pendente}
                            onSalvar={(itens) => salvarEscala(f, itens)}
                            rotulo={`Escalar pessoas em ${f.nome}`}
                          />
                          <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" disabled={pendente} onClick={() => void avisarTime(f)}>
                            <BellRing className="size-3.5" /> {avisados.includes(f.data) ? "Folga avisada · avisar de novo" : "Avisar folga"}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}

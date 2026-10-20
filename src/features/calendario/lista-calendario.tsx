"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function corStatus(s: string): string {
  if (/postado|conclu|agendado/i.test(s)) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  if (/aprova|editando|gravando|andamento/i.test(s)) return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
  return "bg-muted text-muted-foreground";
}

function corTipo(t: string | null): string {
  switch (t) {
    case "Redes Sociais":
      return "border-l-purple-500";
    case "E-mail Marketing":
      return "border-l-pink-500";
    case "Oferta":
      return "border-l-green-500";
    case "Podcast":
      return "border-l-yellow-500";
    case "Visita":
      return "border-l-orange-500";
    default:
      return "border-l-muted-foreground/40";
  }
}

const dia = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  const sem = new Date(Date.UTC(a, m - 1, d)).toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" });
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")} · ${sem.replace(".", "")}`;
};

/** Calendário de conteúdo: itens agrupados por mês e dia, com filtros. */
export function ListaCalendario({ itens }: { itens: ItemCalendario[] }) {
  const [busca, setBusca] = useState("");
  const [mes, setMes] = useState(() => {
    const hoje = new Date().toISOString().slice(0, 7);
    return itens.some((i) => i.data?.startsWith(hoje)) ? hoje : "";
  });
  const [tipo, setTipo] = useState("");
  const [resp, setResp] = useState("");
  const [status, setStatus] = useState("");

  const meses = useMemo(
    () => Array.from(new Set(itens.map((i) => i.data?.slice(0, 7)).filter((m): m is string => !!m))).sort(),
    [itens]
  );
  const tipos = useMemo(() => Array.from(new Set(itens.map((i) => i.tipo).filter((x): x is string => !!x))).sort(), [itens]);
  const resps = useMemo(() => Array.from(new Set(itens.flatMap((i) => i.responsaveis))).sort(), [itens]);
  const statuses = useMemo(() => Array.from(new Set(itens.map((i) => i.status))).sort(), [itens]);

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return itens.filter(
      (i) =>
        (!mes || i.data?.startsWith(mes)) &&
        (!tipo || i.tipo === tipo) &&
        (!resp || i.responsaveis.includes(resp)) &&
        (!status || i.status === status) &&
        (!t || i.nome.toLowerCase().includes(t))
    );
  }, [itens, busca, mes, tipo, resp, status]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, ItemCalendario[]>();
    for (const i of visiveis) mapa.set(i.data ?? "sem-data", [...(mapa.get(i.data ?? "sem-data") ?? []), i]);
    return [...mapa.entries()].sort(([a], [b]) => (a === "sem-data" ? 1 : b === "sem-data" ? -1 : a.localeCompare(b)));
  }, [visiveis]);

  const sel = "h-9 rounded-md border bg-background px-2 text-sm";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no calendário…" aria-label="Buscar" className="h-9 w-64 pl-8" />
        </div>
        <select value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Mês" className={sel}>
          <option value="">Todos os meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {MESES[Number(m.slice(5)) - 1]} de {m.slice(0, 4)}
            </option>
          ))}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo" className={sel}>
          <option value="">Todos os tipos</option>
          {tipos.map((t) => (
            <option key={t}>{t}</option>
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
        <span className="text-xs text-muted-foreground">
          {visiveis.length} de {itens.length} itens
        </span>
      </div>

      {porDia.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nada encontrado.</p>
      ) : (
        porDia.map(([d, lista]) => (
          <section key={d} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{d === "sem-data" ? "Sem data definida" : dia(d)}</h2>
            <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {lista.map((i) => (
                <li key={i.id} className={cn("space-y-1.5 rounded-lg border border-l-4 bg-card p-3", corTipo(i.tipo))}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{i.nome}</p>
                    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium", corStatus(i.status))}>{i.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[i.tipo, i.tipo_post, i.canais.join(", "), i.publico.join("/"), i.objetivo].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {i.responsaveis.length > 0 ? <p className="text-xs">Responsável: {i.responsaveis.join(", ")}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

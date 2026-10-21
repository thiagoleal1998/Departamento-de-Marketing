"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface LpPublica {
  id: string;
  nome: string;
  grupo: string | null;
  url: string | null;
  status_patrocinio: string | null;
}

const dominio = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").split(/[/?#]/)[0];
const comProtocolo = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

/** Lista pública e pesquisável das landing pages ativas. */
export function ConsultaLps({ lps }: { lps: LpPublica[] }) {
  const [busca, setBusca] = useState("");
  const [site, setSite] = useState("");
  const [situacao, setSituacao] = useState("");

  const sites = useMemo(
    () => Array.from(new Set(lps.filter((l) => l.url).map((l) => dominio(l.url!)))).sort(),
    [lps]
  );

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return lps.filter(
      (l) =>
        (!situacao || l.status_patrocinio === situacao) &&
        (!site || (l.url && dominio(l.url) === site)) &&
        (!t || l.nome.toLowerCase().includes(t) || (l.grupo ?? "").toLowerCase().includes(t))
    );
  }, [lps, busca, site, situacao]);
  const nAtivas = lps.filter((l) => l.status_patrocinio === "ativo").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar landing page…"
            aria-label="Buscar landing page"
            className="h-9 w-72 pl-8"
          />
        </div>
        <select
          value={site}
          onChange={(e) => setSite(e.target.value)}
          aria-label="Site"
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Todos os sites</option>
          {sites.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={situacao}
          onChange={(e) => setSituacao(e.target.value)}
          aria-label="Situação"
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Ativas e inativas</option>
          <option value="ativo">Só ativas</option>
          <option value="inativo">Só inativas</option>
        </select>
        <span className="text-xs text-muted-foreground">
          {visiveis.length} de {lps.length} landing pages ({nAtivas} ativas · {lps.length - nAtivas} inativas)
        </span>
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma landing page encontrada.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visiveis.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4">
              <div className="min-w-0 space-y-0.5">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{l.nome}</span>
                  <span
                    className={
                      "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold " +
                      (l.status_patrocinio === "ativo" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900")
                    }
                  >
                    {l.status_patrocinio === "ativo" ? "Ativa" : "Inativa"}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {l.grupo ? `${l.grupo} · ` : ""}
                  {l.url ? dominio(l.url) : "sem link"}
                </p>
              </div>
              {l.url ? (
                <a
                  href={comProtocolo(l.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Abrir <ExternalLink className="size-3.5" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

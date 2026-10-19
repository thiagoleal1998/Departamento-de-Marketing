"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface PaginaSite {
  id: string;
  titulo: string;
  pagina_url: string | null;
  categoria: string | null;
  estrelas: string | null;
  abrangencia: string | null;
}

const naoSeAplica = (v: string | null) => !v || /n[aã]o se aplica/i.test(v);

/** Consulta pública das páginas e conteúdos publicados no site da LV. */
export function ConsultaSite({ paginas }: { paginas: PaginaSite[] }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [abrangencia, setAbrangencia] = useState("");

  const categorias = useMemo(
    () => Array.from(new Set(paginas.map((p) => p.categoria).filter((c): c is string => !!c))).sort(),
    [paginas]
  );
  const abrangencias = useMemo(
    () => Array.from(new Set(paginas.map((p) => p.abrangencia).filter((c): c is string => !naoSeAplica(c)))).sort(),
    [paginas]
  );

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return paginas.filter(
      (p) =>
        (!categoria || p.categoria === categoria) &&
        (!abrangencia || p.abrangencia === abrangencia) &&
        (!t || p.titulo.toLowerCase().includes(t))
    );
  }, [paginas, busca, categoria, abrangencia]);

  const selecao = "h-9 rounded-md border bg-background px-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no site da LV…"
            aria-label="Buscar no site da LV"
            className="h-9 w-72 pl-8"
          />
        </div>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria" className={selecao}>
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={abrangencia}
          onChange={(e) => setAbrangencia(e.target.value)}
          aria-label="Abrangência"
          className={selecao}
        >
          <option value="">Nacional e internacional</option>
          {abrangencias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {visiveis.length} de {paginas.length} páginas
        </span>
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nada encontrado.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visiveis.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4">
              <div className="min-w-0 space-y-0.5">
                <p className="line-clamp-2 font-medium leading-snug">{p.titulo}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[p.categoria, naoSeAplica(p.estrelas) ? null : p.estrelas, naoSeAplica(p.abrangencia) ? null : p.abrangencia]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {p.pagina_url ? (
                <a
                  href={p.pagina_url}
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

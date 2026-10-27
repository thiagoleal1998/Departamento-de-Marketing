/* eslint-disable @next/next/no-img-element */
import { ExternalLink, Newspaper } from "lucide-react";
import { noticiasDoTurismo } from "./turismo";
import { cn } from "@/lib/utils";

const COR_FONTE: Record<string, string> = {
  Panrotas: "bg-sky-600 text-white",
  "Mercado & Eventos": "bg-violet-600 text-white",
  "Revista Hotéis": "bg-emerald-600 text-white",
};

function quando(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

/** Principais notícias do turismo no painel (Panrotas e outras fontes do setor). */
export async function NoticiasTurismo() {
  const noticias = await noticiasDoTurismo();
  if (noticias.length === 0) return null; // fontes fora do ar: o quadro simplesmente não aparece
  const [destaque, ...demais] = noticias;

  return (
    <section aria-label="Notícias do turismo" className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Newspaper className="size-5 text-primary" /> Notícias do turismo
        </h2>
        <a href="https://www.panrotas.com.br" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Ver mais na Panrotas <ExternalLink className="size-3" />
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Destaque: a notícia mais recente, com foto grande */}
        <a href={destaque.link} target="_blank" rel="noopener noreferrer" className="group relative block min-h-56 overflow-hidden rounded-xl border bg-muted">
          {destaque.imagem ? <img src={destaque.imagem} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="relative flex h-full min-h-56 flex-col justify-end gap-1.5 p-4 text-white">
            <div className="flex items-center gap-2 text-[11px]">
              <span className={cn("rounded px-1.5 py-0.5 font-semibold", COR_FONTE[destaque.fonte] ?? "bg-black/50")}>{destaque.fonte}</span>
              {destaque.categoria ? <span className="opacity-80">{destaque.categoria}</span> : null}
              <span className="opacity-80">· {quando(destaque.data)}</span>
            </div>
            <h3 className="text-lg font-semibold leading-snug group-hover:underline">{destaque.titulo}</h3>
            {destaque.resumo ? <p className="line-clamp-2 text-sm opacity-85">{destaque.resumo}</p> : null}
          </div>
        </a>

        {/* Demais notícias */}
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {demais.slice(0, 8).map((n) => (
            <li key={n.link}>
              <a href={n.link} target="_blank" rel="noopener noreferrer" className="group flex h-full gap-3 rounded-xl border p-2.5 transition-colors hover:border-primary/40 hover:bg-accent/30">
                {n.imagem ? <img src={n.imagem} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-16 shrink-0 rounded-lg bg-muted object-cover" /> : <div className="size-16 shrink-0 rounded-lg bg-muted" />}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className={cn("rounded px-1 py-px font-semibold", COR_FONTE[n.fonte] ?? "bg-muted")}>{n.fonte}</span>
                    {quando(n.data)}
                  </p>
                  <h3 className="mt-0.5 line-clamp-3 text-sm font-medium leading-snug group-hover:underline">{n.titulo}</h3>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

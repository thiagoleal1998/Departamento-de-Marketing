/* eslint-disable @next/next/no-img-element */
import { Landmark, TrendingUp, type LucideIcon } from "lucide-react";
import { noticiasGerais } from "./geral";
import type { NoticiaFeed } from "./rss";
import { cn } from "@/lib/utils";

const COR_FONTE: Record<string, string> = {
  G1: "bg-red-600 text-white",
  Folha: "bg-sky-700 text-white",
  Estadão: "bg-slate-700 text-white",
  "Agência Brasil": "bg-emerald-700 text-white",
};

function quando(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

function Coluna({ titulo, icone: Icone, noticias, cor }: { titulo: string; icone: LucideIcon; noticias: NoticiaFeed[]; cor: string }) {
  const [primeira, ...demais] = noticias;
  return (
    <div className="min-w-0 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className={cn("grid size-7 place-items-center rounded-lg text-white", cor)}>
          <Icone className="size-4" />
        </span>
        {titulo}
      </h3>
      {!primeira ? (
        <p className="text-sm text-muted-foreground">Sem notícias no momento.</p>
      ) : (
        <>
          {/* A mais recente, com foto quando o jornal manda */}
          <a href={primeira.link} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-xl border transition-colors hover:border-primary/40">
            {primeira.imagem ? <img src={primeira.imagem} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-36 w-full bg-muted object-cover" /> : null}
            <div className="space-y-1 p-3">
              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className={cn("rounded px-1 py-px font-semibold", COR_FONTE[primeira.fonte] ?? "bg-muted")}>{primeira.fonte}</span>
                {quando(primeira.data)}
              </p>
              <h4 className="text-sm font-semibold leading-snug group-hover:underline">{primeira.titulo}</h4>
              {primeira.resumo ? <p className="line-clamp-2 text-xs text-muted-foreground">{primeira.resumo}</p> : null}
            </div>
          </a>
          <ul className="divide-y rounded-xl border">
            {demais.slice(0, 6).map((n) => (
              <li key={n.link}>
                <a href={n.link} target="_blank" rel="noopener noreferrer" className="group flex gap-2.5 p-2.5 transition-colors hover:bg-accent/30">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className={cn("rounded px-1 py-px font-semibold", COR_FONTE[n.fonte] ?? "bg-muted")}>{n.fonte}</span>
                      {quando(n.data)}
                    </p>
                    <h4 className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug group-hover:underline">{n.titulo}</h4>
                  </div>
                  {n.imagem ? <img src={n.imagem} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-12 shrink-0 rounded-lg bg-muted object-cover" /> : null}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Principais notícias de política e economia dos grandes jornais, para o painel de gerente e líder. */
export async function NoticiasGerais() {
  const { politica, economia } = await noticiasGerais();
  if (politica.length === 0 && economia.length === 0) return null; // fontes fora do ar: o quadro não aparece

  return (
    <section aria-label="Notícias de política e economia" className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Política e economia</h2>
        <p className="text-xs text-muted-foreground">G1, Folha, Estadão e Agência Brasil · atualiza a cada 15 min</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Coluna titulo="Política" icone={Landmark} noticias={politica} cor="bg-indigo-600" />
        <Coluna titulo="Economia" icone={TrendingUp} noticias={economia} cor="bg-emerald-600" />
      </div>
    </section>
  );
}

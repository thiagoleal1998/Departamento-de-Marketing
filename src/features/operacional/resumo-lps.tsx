import Link from "next/link";
import { CADASTROS } from "./cadastros";
import { cn } from "@/lib/utils";

type Linha = Record<string, string | null>;
type Filtro = Record<string, string>;

const campo = (nome: string) => CADASTROS.landing_pages.campos.find((c) => c.name === nome)!;
const opcoes = (nome: string) => campo(nome).opcoes ?? [];

const hrefLista = (f: Filtro) => {
  const q = new URLSearchParams({ aba: "lps" });
  for (const [k, v] of Object.entries(f)) if (v) q.set(k, v);
  return `/operacional/landing-pages?${q.toString()}`;
};

const pct = (parte: number, total: number) =>
  total === 0
    ? "0,0%"
    : `${((parte / total) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const COR_STATUS: Record<string, string> = {
  ativo: "bg-emerald-600",
  inativo: "bg-amber-500",
  cancelado: "bg-red-700",
  desativado: "bg-zinc-500",
};

function Tabela({
  titulo,
  itens,
  total,
}: {
  titulo: string;
  itens: { rotulo: string; qtd: number; href: string }[];
  total: number;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <p className="bg-muted px-3 py-1.5 text-center text-sm font-semibold">{titulo}</p>
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {itens.map((i) => (
            <tr key={i.rotulo} className="hover:bg-accent/50">
              <td className="p-0">
                <Link href={i.href} className="block px-3 py-1">
                  {i.rotulo}
                </Link>
              </td>
              <td className="p-0 text-right tabular-nums">
                <Link href={i.href} className="block px-3 py-1">
                  {i.qtd}
                </Link>
              </td>
              <td className="w-20 p-0 text-right tabular-nums text-muted-foreground">
                <Link href={i.href} className="block px-3 py-1">
                  {pct(i.qtd, total)}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Dados gerais das landing pages: quantas são, de onde, em que situação e por quê. */
export function ResumoLps({ linhas }: { linhas: Linha[] }) {
  const total = linhas.length;
  const por = (nome: string, v: string) => linhas.filter((l) => (l[nome] ?? "") === v).length;

  const porOpcao = (nome: string) =>
    opcoes(nome).map((o) => ({ rotulo: o.label, qtd: por(nome, o.value), href: hrefLista({ [nome]: o.value }) }));

  const semInfo = (nome: string) => linhas.filter((l) => !(l[nome] ?? "").trim()).length;

  const sim = (nome: string) => [
    { rotulo: "Sim", qtd: por(nome, "Sim"), href: hrefLista({ [nome]: "Sim" }) },
    { rotulo: "Não", qtd: por(nome, "Não"), href: hrefLista({ [nome]: "Não" }) },
    { rotulo: "Não informado", qtd: semInfo(nome), href: hrefLista({}) },
  ];

  const estados = Array.from(
    linhas.reduce((m, l) => {
      const e = (l.estado ?? "").trim();
      if (e) m.set(e, (m.get(e) ?? 0) + 1);
      return m;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, 10)
    .map(([rotulo, qtd]) => ({ rotulo, qtd, href: hrefLista({ estado: rotulo }) }));

  const statusPatrocinio = opcoes("status_patrocinio");
  const grupos = opcoes("grupo").filter((g) => !["antigas", "epic", "feriados"].includes(g.value));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between rounded-md bg-muted px-4 py-2">
        <h2 className="text-base font-semibold">Dados gerais de landing pages</h2>
        <span className="text-lg font-bold">{total}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statusPatrocinio.map((s) => {
          const qtd = por("status_patrocinio", s.value);
          return (
            <Link
              key={s.value}
              href={hrefLista({ status_patrocinio: s.value })}
              className={cn("rounded-md px-4 py-3 text-white transition-opacity hover:opacity-90", COR_STATUS[s.value] ?? "bg-zinc-500")}
            >
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-2xl font-bold tabular-nums">{qtd}</p>
              <p className="text-xs opacity-90">{pct(qtd, total)} das LPs</p>
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <p className="bg-muted px-3 py-1.5 text-center text-sm font-semibold">Grupo × Status de patrocínio</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="px-3 py-1.5 text-left font-medium">Grupo</th>
              {statusPatrocinio.map((s) => (
                <th key={s.value} className="px-3 py-1.5 text-right font-medium">
                  {s.label}
                </th>
              ))}
              <th className="px-3 py-1.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {grupos.map((g) => {
              const doGrupo = linhas.filter((l) => l.grupo === g.value);
              return (
                <tr key={g.value} className="hover:bg-accent/50">
                  <td className="p-0">
                    <Link href={hrefLista({ grupo: g.value })} className="block px-3 py-1">
                      {g.label}
                    </Link>
                  </td>
                  {statusPatrocinio.map((s) => (
                    <td key={s.value} className="p-0 text-right tabular-nums">
                      <Link href={hrefLista({ grupo: g.value, status_patrocinio: s.value })} className="block px-3 py-1">
                        {doGrupo.filter((l) => l.status_patrocinio === s.value).length}
                      </Link>
                    </td>
                  ))}
                  <td className="p-0 text-right font-semibold tabular-nums">
                    <Link href={hrefLista({ grupo: g.value })} className="block px-3 py-1">
                      {doGrupo.length}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Tabela titulo="Destino (de onde)" itens={porOpcao("destino")} total={total} />
          <Tabela titulo="Tipo de página" itens={porOpcao("tipo_pagina")} total={total} />
          <Tabela titulo="Estados com mais LPs" itens={estados} total={total} />
        </div>
        <div className="space-y-4">
          <Tabela titulo="Banner obrigatório?" itens={sim("banner_obrigatorio")} total={total} />
          <Tabela titulo="Banner no ar (Comercial)" itens={sim("banner_no_ar")} total={total} />
          <Tabela titulo="Tem link de casamento?" itens={sim("tem_link_casamento")} total={total} />
          <Tabela titulo="TAG no ADM MKT" itens={sim("tag_adm_mkt")} total={total} />
        </div>
      </div>
    </section>
  );
}

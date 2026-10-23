import Link from "@/components/shared/link";
import { cn } from "@/lib/utils";

/** Abre a aba Páginas já filtrada. */
function hrefPaginas(f: {
  categoria?: string;
  abrangencia?: string;
  estrelas?: string;
}) {
  const q = new URLSearchParams({ aba: "paginas" });
  for (const [k, v] of Object.entries(f)) if (v) q.set(k, v);
  return `/operacional/conteudos-site?${q.toString()}`;
}

type LinhaConteudo = Record<string, string | null>;

/** Cartões por tipo de produto (a chave é a categoria gravada no cadastro). */
const PRODUTOS: {
  categoria: string;
  rotulo: string;
  cor: string;
  apenasInternacional?: boolean;
}[] = [
  { categoria: "Destino", rotulo: "Destinos", cor: "bg-green-600" },
  { categoria: "Resort", rotulo: "Resorts", cor: "bg-blue-600" },
  {
    categoria: "Redes corporativas",
    rotulo: "Redes Corporativas",
    cor: "bg-purple-600",
  },
  {
    categoria: "Viagens Exóticas",
    rotulo: "Viagens Exóticas",
    cor: "bg-pink-500",
  },
  { categoria: "Hotel", rotulo: "Hotéis", cor: "bg-red-900" },
  {
    categoria: "Capitais pelo Mundo",
    rotulo: "Minhas Capitais",
    cor: "bg-orange-500",
  },
  { categoria: "Circuitos", rotulo: "Circuitos", cor: "bg-green-500" },
  {
    categoria: "Casamento em Resort",
    rotulo: "Casamentos em Resorts",
    cor: "bg-blue-700",
  },
  {
    categoria: "Grupos e Eventos",
    rotulo: "Grupos e Eventos",
    cor: "bg-pink-400",
  },
  {
    categoria: "Hotéis em Portugal",
    rotulo: "Hotéis em Portugal",
    cor: "bg-pink-400",
    apenasInternacional: true,
  },
];

const norm = (v: string | null | undefined) =>
  (v ?? "").trim().toLowerCase();

const pct = (parte: number, total: number) =>
  total === 0
    ? "0,00%"
    : `${((parte / total) * 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`;

function contar(
  linhas: LinhaConteudo[],
  categoria: string,
  abrangencia?: string
) {
  return linhas.filter(
    (l) =>
      norm(l.categoria) === norm(categoria) &&
      (abrangencia === undefined || norm(l.abrangencia) === norm(abrangencia))
  ).length;
}

function Cabecalho({
  rotulo,
  total,
  cor,
  href,
}: {
  rotulo: string;
  total: number;
  cor: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-t-md px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90",
        cor
      )}
    >
      <span>{rotulo}</span>
      <span>{total}</span>
    </Link>
  );
}

function Par({
  rotulos,
  valores,
  total,
  hrefs,
}: {
  rotulos: string[];
  valores: number[];
  total: number;
  hrefs: string[];
}) {
  return (
    <div
      className="grid divide-x rounded-b-md border border-t-0 text-center text-xs"
      style={{ gridTemplateColumns: `repeat(${rotulos.length}, 1fr)` }}
    >
      {rotulos.map((r, i) => (
        <Link
          key={r}
          href={hrefs[i]}
          className="space-y-0.5 py-1.5 transition-colors hover:bg-accent/50"
        >
          <p className="text-muted-foreground">{r}</p>
          <p className="text-base font-semibold">{valores[i]}</p>
          <p className="text-muted-foreground">{pct(valores[i], total)}</p>
        </Link>
      ))}
    </div>
  );
}

function TabelaGeral({
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
      <p className="bg-muted px-3 py-1.5 text-center text-sm font-semibold">
        {titulo}
      </p>
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

/** Dados gerais dos conteúdos do site, calculados a partir do cadastro. */
export function ResumoConteudos({ linhas }: { linhas: LinhaConteudo[] }) {
  const total = linhas.length;

  const porSegmento = ["Nacional", "Internacional", "Não se aplica"].map(
    (rotulo) => ({
      rotulo,
      qtd: linhas.filter((l) => norm(l.abrangencia) === norm(rotulo)).length,
      href: hrefPaginas({ abrangencia: rotulo }),
    })
  );

  const porTipo = [
    ["Capitais pelo Mundo", "Capitais pelo Mundo"],
    ["Casamento em Resort", "Casamento em Resort"],
    ["Circuitos", "Circuitos"],
    ["Destino", "Destino"],
    ["Grupos e Eventos", "Grupos e Eventos"],
    ["Hotéis em Portugal", "Hotéis em Portugal"],
    ["Hotel", "Hotel"],
    ["Redes corporativas", "Redes corporativas"],
    ["Resort", "Resort"],
    ["Viagens Exóticas", "Viagens Exóticas"],
    ["LV Magazine", "LV Magazine"],
  ].map(([rotulo, categoria]) => ({
    rotulo,
    qtd: contar(linhas, categoria),
    href: hrefPaginas({ categoria }),
  }));

  const porEstrelas = [
    "Não se aplica",
    "4 Estrela",
    "4.5 Estrela",
    "5 Estrela",
    "3.5 Estrela",
    "3 Estrela",
  ].map((rotulo) => ({
    rotulo,
    qtd: linhas.filter((l) => norm(l.estrelas) === norm(rotulo)).length,
    href: hrefPaginas({ estrelas: rotulo }),
  }));

  const mag = {
    sobre: contar(linhas, "LV Magazine", "Não se aplica"),
    nacional: contar(linhas, "LV Magazine", "Nacional"),
    internacional: contar(linhas, "LV Magazine", "Internacional"),
  };
  const magTotal = contar(linhas, "LV Magazine");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between rounded-md bg-muted px-4 py-2">
        <h2 className="text-base font-semibold">
          Dados gerais de conteúdos do site
        </h2>
        <span className="text-lg font-bold">{total}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="rounded-md bg-muted px-3 py-1.5 text-center text-sm font-semibold">
            Tipo de produto × Segmento
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRODUTOS.map((p) => {
              const nac = contar(linhas, p.categoria, "Nacional");
              const inter = contar(linhas, p.categoria, "Internacional");
              const tot = contar(linhas, p.categoria);
              return (
                <div key={p.categoria}>
                  <Cabecalho
                    rotulo={p.rotulo}
                    total={tot}
                    cor={p.cor}
                    href={hrefPaginas({ categoria: p.categoria })}
                  />
                  {p.apenasInternacional ? (
                    <Par
                      rotulos={["Internacionais"]}
                      valores={[inter]}
                      total={tot}
                      hrefs={[
                        hrefPaginas({
                          categoria: p.categoria,
                          abrangencia: "Internacional",
                        }),
                      ]}
                    />
                  ) : (
                    <Par
                      rotulos={["Nacionais", "Internacionais"]}
                      valores={[nac, inter]}
                      total={tot}
                      hrefs={[
                        hrefPaginas({
                          categoria: p.categoria,
                          abrangencia: "Nacional",
                        }),
                        hrefPaginas({
                          categoria: p.categoria,
                          abrangencia: "Internacional",
                        }),
                      ]}
                    />
                  )}
                </div>
              );
            })}
            <div className="sm:col-span-2">
              <Cabecalho
                rotulo="LV Magazine"
                total={magTotal}
                cor="bg-green-800"
                href={hrefPaginas({ categoria: "LV Magazine" })}
              />
              <Par
                rotulos={[
                  "Sobre a Litoral",
                  "Dicas · Nacional",
                  "Dicas · Internacional",
                ]}
                valores={[mag.sobre, mag.nacional, mag.internacional]}
                total={magTotal}
                hrefs={[
                  hrefPaginas({
                    categoria: "LV Magazine",
                    abrangencia: "Não se aplica",
                  }),
                  hrefPaginas({
                    categoria: "LV Magazine",
                    abrangencia: "Nacional",
                  }),
                  hrefPaginas({
                    categoria: "LV Magazine",
                    abrangencia: "Internacional",
                  }),
                ]}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="rounded-md bg-muted px-3 py-1.5 text-center text-sm font-semibold">
            Geral
          </p>
          <TabelaGeral titulo="Segmento" itens={porSegmento} total={total} />
          <TabelaGeral titulo="Tipo" itens={porTipo} total={total} />
          <TabelaGeral
            titulo="Quantidade de hotéis × Pontuação"
            itens={porEstrelas}
            total={total}
          />
        </div>
      </div>
    </section>
  );
}

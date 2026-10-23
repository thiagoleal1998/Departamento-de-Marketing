import Link from "@/components/shared/link";
import { redirect } from "next/navigation";
import { BarChart3, Download, FileBarChart, Plug } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { pode } from "@/lib/permissions";
import { agregar } from "@/features/relatorios/agregar";
import { divulgacoesDoPeriodo, lerFiltro } from "@/features/relatorios/dados";
import { dataBr } from "@/features/divulgacao/tipos";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Sp = { aba?: string; de?: string; ate?: string; tipo?: string; q?: string };

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (m: string) => `${MESES[Number(m.slice(5)) - 1]}/${m.slice(2, 4)}`;

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const usuario = await exigirUsuario();
  if (!pode(usuario.role, "ver_relatorios_gerais")) redirect("/dashboard");
  const sp = await searchParams;
  const aba = sp.aba === "rd" ? "rd" : "divulgacao";

  const abas = [
    { chave: "divulgacao", href: "/relatorios", label: "Divulgação", icone: FileBarChart },
    { chave: "rd", href: "/relatorios?aba=rd", label: "RD Station", icone: Plug },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader titulo="Relatórios" descricao="O que foi divulgado, em que formato e quando, por produto, tipo e período." />
      <nav aria-label="Seções dos relatórios" className="flex flex-wrap gap-1 border-b">
        {abas.map((a) => {
          const Icone = a.icone;
          return (
            <Link
              key={a.chave}
              href={a.href}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                a.chave === aba ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icone className="size-4" />
              {a.label}
            </Link>
          );
        })}
      </nav>
      {aba === "divulgacao" ? await RelatorioDivulgacao(sp) : <RelatorioRD />}
    </div>
  );
}

async function RelatorioDivulgacao(sp: Sp) {
  const f = lerFiltro(sp);
  const { linhas, indisponivel } = await divulgacoesDoPeriodo(f);
  if (indisponivel) {
    return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">A divulgação diária ainda não foi ativada no banco (migration 0064).</p>;
  }
  const r = agregar(linhas);
  const maxMes = Math.max(1, ...r.porMes.map((m) => m.nacional + m.internacional));
  const csv = new URLSearchParams({ de: f.de, ate: f.ate });
  if (f.tipo) csv.set("tipo", f.tipo);
  if (f.busca) csv.set("q", f.busca);

  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          De <Input type="date" name="de" defaultValue={f.de} className="h-9 w-36" />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Até <Input type="date" name="ate" defaultValue={f.ate} className="h-9 w-36" />
        </label>
        <select name="tipo" defaultValue={f.tipo} aria-label="Tipo" className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">Nacional e internacional</option>
          <option value="nacional">Só nacional</option>
          <option value="internacional">Só internacional</option>
        </select>
        <Input name="q" defaultValue={f.busca} placeholder="Produto, destino ou tipo…" aria-label="Buscar" className="h-9 w-56" />
        <Button type="submit" size="sm" className="h-9">
          Aplicar
        </Button>
        <Button asChild variant="outline" size="sm" className="h-9">
          <a href={`/relatorios/exportar?${csv.toString()}`}>
            <Download className="size-4" /> Exportar CSV
          </a>
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {dataBr(f.de)} a {dataBr(f.ate)}
        </span>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { rotulo: "Divulgações", valor: r.total },
          { rotulo: "Produtos / destinos distintos", valor: r.produtosDistintos },
          { rotulo: "Nacional · Internacional", valor: `${r.nacional} · ${r.internacional}` },
          { rotulo: "Dias com divulgação", valor: r.diasComDivulgacao },
        ].map((k) => (
          <Card key={k.rotulo}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.rotulo}</p>
              <p className="text-2xl font-bold tabular-nums">{k.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {r.total === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma divulgação encontrada neste período e filtro.</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-3 p-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <BarChart3 className="size-4 text-primary" /> Por tipo de divulgação
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-1.5 font-medium">Tipo</th>
                      <th className="py-1.5 text-right font-medium">Divulgações</th>
                      <th className="py-1.5 text-right font-medium">Produtos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {r.porTipo.map((t) => (
                      <tr key={t.tipo}>
                        <td className="py-1.5">{t.tipo}</td>
                        <td className="py-1.5 text-right tabular-nums">{t.qtd}</td>
                        <td className="py-1.5 text-right tabular-nums">{t.produtos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <BarChart3 className="size-4 text-primary" /> Por mês
                </h2>
                <ul className="space-y-2">
                  {r.porMes.map((m) => (
                    <li key={m.mes} className="flex items-center gap-3 text-sm">
                      <span className="w-14 shrink-0 text-xs text-muted-foreground">{rotuloMes(m.mes)}</span>
                      <div className="flex h-5 flex-1 overflow-hidden rounded bg-muted">
                        <div className="bg-emerald-500" style={{ width: `${(m.nacional / maxMes) * 100}%` }} title={`Nacional: ${m.nacional}`} />
                        <div className="bg-sky-500" style={{ width: `${(m.internacional / maxMes) * 100}%` }} title={`Internacional: ${m.internacional}`} />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs tabular-nums">{m.nacional + m.internacional}</span>
                    </li>
                  ))}
                </ul>
                <p className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block size-2 rounded-full bg-emerald-500" /> Nacional
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block size-2 rounded-full bg-sky-500" /> Internacional
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <div className="flex items-center justify-between px-4 pt-4">
                <h2 className="text-sm font-semibold">Por produto / destino</h2>
                <span className="text-xs text-muted-foreground">
                  {Math.min(r.porProduto.length, 80)} de {r.porProduto.length} · mais divulgados primeiro (o CSV traz tudo)
                </span>
              </div>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Produto / destino</th>
                    <th className="px-4 py-2 font-medium">Origem</th>
                    <th className="px-4 py-2 text-right font-medium">Vezes</th>
                    <th className="px-4 py-2 font-medium">Primeira</th>
                    <th className="px-4 py-2 font-medium">Última</th>
                    <th className="px-4 py-2 font-medium">Tipos de divulgação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {r.porProduto.slice(0, 80).map((p) => (
                    <tr key={p.nome + p.tipo}>
                      <td className="px-4 py-2 font-medium">{p.nome}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{p.tipo === "nacional" ? "Nacional" : "Internacional"}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.qtd}</td>
                      <td className="px-4 py-2 tabular-nums">{dataBr(p.primeira)}</td>
                      <td className="px-4 py-2 tabular-nums">{dataBr(p.ultima)}</td>
                      <td className="px-4 py-2 text-xs">{p.tipos.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

function RelatorioRD() {
  const itens = [
    { t: "E-mails", d: "Para cada campanha: enviados, entregues, aberturas, cliques, descadastros e spam, com as taxas." },
    { t: "Landing pages, pop-ups e formulários", d: "Visitas, conversões e taxa de conversão de cada um, por período." },
    { t: "Funil de vendas", d: "Leads, oportunidades e vendas no período." },
  ];
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Plug className="size-5 text-primary" />
          <h2 className="text-base font-semibold">RD Station Marketing</h2>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">Ainda não conectado</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Assim que a conta do RD Station for conectada, os números abaixo entram aqui, cruzados com os produtos e o período da divulgação.
        </p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {itens.map((i) => (
            <li key={i.t} className="rounded-lg border p-3">
              <p className="text-sm font-semibold">{i.t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{i.d}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-1 rounded-md bg-muted/50 p-3 text-sm">
          <p className="font-medium">O que falta para conectar</p>
          <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
            <li>Os relatórios de e-mail, landing pages, pop-ups e funil só existem nos planos <strong>Pro e Advanced</strong> do RD Station (no Pro, só os últimos 45 dias).</li>
            <li>Criar um aplicativo no RD Station (App Store › Desenvolvedor) para gerar as credenciais e autorizar o acesso do painel.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

import Link from "@/components/shared/link";
import { redirect } from "next/navigation";
import { Activity, BarChart3, Download, FileBarChart, Mail, Plug } from "lucide-react";
import { RelatorioAtividade } from "@/features/atividade/relatorio-atividade";
import { exigirUsuario } from "@/lib/auth";
import { pode } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { conexaoRD, rdConfigurado } from "@/lib/rd";
import { agregar, agregarItens, itensDaLinha, type ItemRelatorio } from "@/features/relatorios/agregar";
import { divulgacoesDoPeriodo, lerFiltro } from "@/features/relatorios/dados";
import { AtualizarEmails } from "@/features/relatorios/atualizar-emails";
import { dataBr, hojeSP, somarDias } from "@/features/divulgacao/tipos";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Sp = { usuario?: string; aba?: string; de?: string; ate?: string; tipo?: string; q?: string; periodo?: string; regime?: string; rd?: string; publico?: string };

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (m: string) => `${MESES[Number(m.slice(5)) - 1]}/${m.slice(2, 4)}`;
const PERIODOS = ["Feriado", "Férias", "Baixa temporada", "Data comemorativa", "Last minute", "Sem período informado"];
const REGIMES = ["All Inclusive", "Pensão completa", "Meia pensão", "Café da manhã", "Sem alimentação", "Não informado"];
const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const dataSP = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const usuario = await exigirUsuario();
  if (!pode(usuario.role, "ver_relatorios_gerais")) redirect("/dashboard");
  const sp = await searchParams;
  const aba = sp.aba === "rd" ? "rd" : sp.aba === "atividade" ? "atividade" : "divulgacao";

  const abas = [
    { chave: "divulgacao", href: "/relatorios", label: "Divulgação", icone: FileBarChart },
    { chave: "rd", href: "/relatorios?aba=rd", label: "E-mails (RD Station)", icone: Mail },
    { chave: "atividade", href: "/relatorios?aba=atividade", label: "Acessos e atividade", icone: Activity },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader titulo="Relatórios" descricao="O que foi divulgado, como os e-mails performaram e quem acessou o sistema, por quanto tempo e fazendo o quê." />
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
      {aba === "divulgacao" ? await RelatorioDivulgacao(sp) : aba === "rd" ? await RelatorioEmails(sp) : <RelatorioAtividade sp={sp} />}
    </div>
  );
}

const sel = "h-9 rounded-md border bg-background px-2 text-sm";

function FormFiltro({ f, aba }: { f: ReturnType<typeof lerFiltro>; aba: "divulgacao" | "rd" }) {
  return (
    <>
      {aba === "rd" ? <input type="hidden" name="aba" value="rd" /> : null}
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        De <Input type="date" name="de" defaultValue={f.de} className="h-9 w-36" />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Até <Input type="date" name="ate" defaultValue={f.ate} className="h-9 w-36" />
      </label>
      <select name="tipo" defaultValue={f.tipo} aria-label="Tipo" className={sel}>
        <option value="">Nacional e internacional</option>
        <option value="nacional">Só nacional</option>
        <option value="internacional">Só internacional</option>
      </select>
      <select name="periodo" defaultValue={f.periodo} aria-label="Período" className={sel}>
        <option value="">Todos os períodos</option>
        {PERIODOS.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <select name="regime" defaultValue={f.regime} aria-label="Regime" className={sel}>
        <option value="">Todos os regimes</option>
        {REGIMES.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <Input name="q" defaultValue={f.busca} placeholder="Produto, destino ou tipo…" aria-label="Buscar" className="h-9 w-48" />
      <Button type="submit" size="sm" className="h-9">
        Aplicar
      </Button>
    </>
  );
}

function TabelaRotulos({ titulo, linhas, vazio }: { titulo: string; linhas: { rotulo: string; qtd: number }[]; vazio?: string }) {
  const total = linhas.reduce((t, l) => t + l.qtd, 0) || 1;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="size-4 text-primary" /> {titulo}
        </h2>
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">{vazio ?? "Sem dados."}</p>
        ) : (
          <ul className="space-y-1.5">
            {linhas.slice(0, 12).map((l) => (
              <li key={l.rotulo} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 truncate" title={l.rotulo}>
                  {l.rotulo}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
                  <div className="h-full bg-primary/70" style={{ width: `${(l.qtd / total) * 100}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums">{l.qtd}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

async function RelatorioDivulgacao(sp: Sp) {
  const f = lerFiltro(sp);
  const { linhas, indisponivel } = await divulgacoesDoPeriodo(f);
  if (indisponivel) {
    return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">A divulgação diária ainda não foi ativada no banco (migration 0064).</p>;
  }
  const r = agregar(linhas);
  const ag = agregarItens(linhas, f.periodo, f.regime);
  const maxMes = Math.max(1, ...r.porMes.map((m) => m.nacional + m.internacional));
  const csv = new URLSearchParams({ de: f.de, ate: f.ate });
  for (const [k, v] of Object.entries({ tipo: f.tipo, q: f.busca, periodo: f.periodo, regime: f.regime })) if (v) csv.set(k, v);

  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <FormFiltro f={f} aba="divulgacao" />
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
            <TabelaRotulos titulo="Por período (feriado, férias, baixa temporada)" linhas={ag.porPeriodo} />
            <TabelaRotulos titulo="Por regime (all inclusive, pensão…)" linhas={ag.porRegime} />
            <TabelaRotulos titulo="Por temporada (detalhe)" linhas={ag.porTemporada} vazio="Nenhuma temporada informada no período." />
            <TabelaRotulos titulo="Por tipo de divulgação" linhas={r.porTipo.map((t) => ({ rotulo: t.tipo, qtd: t.qtd }))} />
          </div>

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

interface EmailLinha {
  campaign_id: number;
  nome: string;
  enviado_em: string | null;
  entregues: number | null;
  abertos: number | null;
  cliques: number | null;
  descadastros: number | null;
  taxa_abertura: number | null;
  taxa_clique: number | null;
}

async function RelatorioEmails(sp: Sp) {
  const filtro = lerFiltro(sp);
  // O RD só entrega dados até ontem.
  const ontem = somarDias(hojeSP(), -1);
  const f = { ...filtro, ate: filtro.ate > ontem ? ontem : filtro.ate, de: sp.de ? filtro.de : somarDias(hojeSP(), -30) };
  const aviso =
    sp.rd === "conectado" ? "RD Station conectado! Clique em “Buscar e-mails do período”." : sp.rd === "negado" ? "A autorização no RD Station foi cancelada." : sp.rd === "erro" || sp.rd === "invalido" ? "Não foi possível concluir a conexão com o RD Station. Tente de novo." : sp.rd === "nao_configurado" ? "As credenciais do RD Station ainda não foram configuradas no sistema." : null;

  const configurado = rdConfigurado();
  const conexao = configurado ? await conexaoRD().catch(() => null) : null;

  if (!configurado || !conexao) {
    return (
      <>
        {aviso ? <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{aviso}</p> : null}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Plug className="size-5 text-primary" />
              <h2 className="text-base font-semibold">RD Station Marketing</h2>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">{configurado ? "Não conectado" : "Falta configurar"}</span>
            </div>
            {configurado ? (
              <>
                <p className="text-sm text-muted-foreground">Conecte a conta para trazer os números de cada e-mail (enviados, aberturas, cliques, descadastros) e cruzar com o produto, o período e o regime divulgados no mesmo dia.</p>
                <Button asChild>
                  <a href="/api/rd/conectar">
                    <Plug className="size-4" /> Conectar ao RD Station
                  </a>
                </Button>
              </>
            ) : (
              <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium">Para conectar</p>
                <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                  <li>
                    Entre em <strong>appstore.rdstation.com/pt-BR/publisher</strong> com a conta do RD Station e clique em <strong>Quero criar um aplicativo</strong>.
                  </li>
                  <li>Dê um nome (por exemplo, “Painel Marketing LV”) e escolha <strong>Aplicativo privado</strong>.</li>
                  <li>
                    No campo <strong>URL de callback</strong>, informe: <code className="rounded bg-muted px-1 py-0.5">https://departamento-de-marketing-lv.vercel.app/api/rd/callback</code>
                  </li>
                  <li>Salve e anote o <strong>client_id</strong> e o <strong>client_secret</strong>; depois é só enviá-los ao desenvolvedor para configurar no sistema.</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  const supabase = await criarClienteServidor();
  const { data: emailsBrutos, error } = await supabase
    .from("rd_emails")
    .select("campaign_id, nome, enviado_em, entregues, abertos, cliques, descadastros, taxa_abertura, taxa_clique")
    .gte("enviado_em", `${f.de}T00:00:00-03:00`)
    .lte("enviado_em", `${f.ate}T23:59:59-03:00`)
    .order("enviado_em", { ascending: false })
    .limit(1000);
  const { data: sync } = await supabase.from("rd_sync").select("sincronizado_em, erro").eq("id", 1).maybeSingle();
  // Público do e-mail: o nome da campanha traz a marca (B2B) ou (B2C).
  const publicoDe = (nome: string) => (/b2b/i.test(nome) ? "B2B" : /b2c/i.test(nome) ? "B2C" : "Sem público no nome");
  const todosEmails = (emailsBrutos as EmailLinha[] | null) ?? [];
  const publicoSel = ["B2B", "B2C", "Sem público no nome"].includes(sp.publico ?? "") ? sp.publico! : "";
  const emails = publicoSel ? todosEmails.filter((e) => publicoDe(e.nome) === publicoSel) : todosEmails;
  const ultima = (sync as { sincronizado_em: string | null; erro: string | null } | null) ?? null;

  // Divulgação do mesmo dia de cada e-mail (produto, período, regime).
  const { linhas } = await divulgacoesDoPeriodo({ de: f.de, ate: f.ate, tipo: "", busca: "", periodo: "", regime: "" });
  const itensPorDia = new Map<string, ItemRelatorio[]>();
  for (const l of linhas) for (const i of itensDaLinha(l)) itensPorDia.set(i.data, [...(itensPorDia.get(i.data) ?? []), i]);

  const soma = (k: "entregues" | "abertos" | "cliques" | "descadastros") => emails.reduce((t, e) => t + (e[k] ?? 0), 0);
  const entregues = soma("entregues");
  const abertos = soma("abertos");
  const cliques = soma("cliques");

  interface Grupo {
    emails: number;
    entregues: number;
    abertos: number;
    cliques: number;
  }
  const grupos = {
    publico: new Map<string, Grupo>(),
    periodo: new Map<string, Grupo>(),
    regime: new Map<string, Grupo>(),
    produto: new Map<string, Grupo>(),
  };
  const somar = (m: Map<string, Grupo>, k: string, e: EmailLinha) => {
    const g = m.get(k) ?? { emails: 0, entregues: 0, abertos: 0, cliques: 0 };
    g.emails++;
    g.entregues += e.entregues ?? 0;
    g.abertos += e.abertos ?? 0;
    g.cliques += e.cliques ?? 0;
    m.set(k, g);
  };
  for (const e of emails) {
    if (!e.enviado_em) continue;
    somar(grupos.publico, publicoDe(e.nome), e);
    const itens = itensPorDia.get(dataSP(e.enviado_em)) ?? [];
    for (const k of new Set(itens.map((i) => i.grupoPeriodo))) somar(grupos.periodo, k, e);
    for (const k of new Set(itens.map((i) => i.regime))) somar(grupos.regime, k, e);
    for (const k of new Set(itens.map((i) => i.produto))) somar(grupos.produto, k, e);
  }
  const ordenar = (m: Map<string, Grupo>) =>
    Array.from(m.entries())
      .map(([rotulo, g]) => ({ rotulo, ...g, abertura: g.entregues ? g.abertos / g.entregues : 0, clique: g.entregues ? g.cliques / g.entregues : 0 }))
      .filter((x) => x.entregues > 0)
      .sort((a, b) => b.abertura - a.abertura);

  const tabelaGrupo = (titulo: string, m: Map<string, Grupo>, max = 12) => {
    const linhasG = ordenar(m);
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">{titulo}</h2>
          {linhasG.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem e-mails em dias com divulgação cadastrada.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1.5 font-medium">&nbsp;</th>
                  <th className="py-1.5 text-right font-medium">E-mails</th>
                  <th className="py-1.5 text-right font-medium">Abertura</th>
                  <th className="py-1.5 text-right font-medium">Clique</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {linhasG.slice(0, max).map((g) => (
                  <tr key={g.rotulo}>
                    <td className="max-w-[14rem] truncate py-1.5" title={g.rotulo}>
                      {g.rotulo}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{g.emails}</td>
                    <td className="py-1.5 text-right tabular-nums">{pct(g.abertura)}</td>
                    <td className="py-1.5 text-right tabular-nums">{pct(g.clique)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {aviso ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{aviso}</p> : null}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <FormFiltro f={{ ...f, tipo: "", periodo: "", regime: "", busca: "" }} aba="rd" />
        <select name="publico" defaultValue={publicoSel} aria-label="Público" className={sel}>
          <option value="">B2B e B2C</option>
          <option value="B2B">Só B2B</option>
          <option value="B2C">Só B2C</option>
          <option value="Sem público no nome">Sem público no nome</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {ultima?.sincronizado_em ? `E-mails atualizados em ${new Date(ultima.sincronizado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Ainda sem e-mails: clique em buscar"}
        </span>
      </form>
      <AtualizarEmails de={f.de} ate={f.ate} />
      {ultima?.erro ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">Última atualização falhou: {ultima.erro}</p> : null}
      {error ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Os e-mails do RD ainda não foram ativados no banco (migration 0066).</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { rotulo: "E-mails enviados", valor: emails.length.toLocaleString("pt-BR") },
          { rotulo: "Entregues", valor: entregues.toLocaleString("pt-BR") },
          { rotulo: "Abertura (únicas / entregues)", valor: entregues ? pct(abertos / entregues) : "—" },
          { rotulo: "Clique (únicos / entregues)", valor: entregues ? pct(cliques / entregues) : "—" },
        ].map((k) => (
          <Card key={k.rotulo}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.rotulo}</p>
              <p className="text-2xl font-bold tabular-nums">{k.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {emails.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum e-mail neste período. Use “Buscar e-mails do período” para trazer do RD Station.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Nas tabelas abaixo, cada e-mail é ligado às divulgações do <strong>mesmo dia</strong> da planilha. É uma aproximação: se o dia teve vários produtos, o e-mail conta para cada um.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {tabelaGrupo("Por público (B2B × B2C)", grupos.publico)}
            {tabelaGrupo("Por período (feriado, férias, baixa temporada)", grupos.periodo)}
            {tabelaGrupo("Por regime (all inclusive, pensão…)", grupos.regime)}
          </div>
          {tabelaGrupo("Por produto divulgado no dia", grupos.produto, 15)}

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <h2 className="px-4 pt-4 text-sm font-semibold">E-mails do período</h2>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">E-mail / campanha</th>
                    <th className="px-4 py-2 font-medium">Público</th>
                    <th className="px-4 py-2 font-medium">Enviado em</th>
                    <th className="px-4 py-2 text-right font-medium">Entregues</th>
                    <th className="px-4 py-2 text-right font-medium">Abertura</th>
                    <th className="px-4 py-2 text-right font-medium">Clique</th>
                    <th className="px-4 py-2 text-right font-medium">Descadastros</th>
                    <th className="px-4 py-2 font-medium">Divulgado no dia</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {emails.map((e) => {
                    const dia = e.enviado_em ? dataSP(e.enviado_em) : null;
                    const produtos = Array.from(new Set((dia ? itensPorDia.get(dia) ?? [] : []).map((i) => i.produto))).slice(0, 3);
                    return (
                      <tr key={e.campaign_id}>
                        <td className="max-w-[18rem] px-4 py-2 font-medium">{e.nome}</td>
                        <td className="px-4 py-2">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                              publicoDe(e.nome) === "B2B" ? "bg-indigo-100 text-indigo-900" : publicoDe(e.nome) === "B2C" ? "bg-emerald-100 text-emerald-900" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {publicoDe(e.nome) === "Sem público no nome" ? "—" : publicoDe(e.nome)}
                          </span>
                        </td>
                        <td className="px-4 py-2 tabular-nums">{dia ? dataBr(dia) : "—"}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{(e.entregues ?? 0).toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{e.taxa_abertura !== null ? `${e.taxa_abertura.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{e.taxa_clique !== null ? `${e.taxa_clique.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{e.descadastros ?? 0}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{produtos.join(" · ") || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

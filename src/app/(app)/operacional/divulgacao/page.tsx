import Link from "@/components/shared/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { listarCadastro, listarPessoasOpcoes } from "@/features/operacional/cadastros-data";
import { CadastroCrud } from "@/features/operacional/cadastro-crud";
import { AbasDivulgacao, type AbaDivulgacao } from "@/features/divulgacao/abas-divulgacao";
import { NovaOferta, OfertasLista, type Dia } from "@/features/divulgacao/ofertas-lista";
import { POR_PAGINA, historicoOfertas, ofertasDoPeriodo } from "@/features/divulgacao/data";
import { dataBr, dataCurta, hojeSP, inicioDaSemana, somarDias, type Oferta } from "@/features/divulgacao/tipos";
import { AtualizarPlanilha } from "@/features/divulgacao/atualizar-planilha";
import { criarClienteServidor } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

type Sp = { aba?: string; semana?: string; q?: string; tipo?: string; de?: string; ate?: string; pagina?: string };

const AVISO_MIGRACAO = (
  <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
    A divulgação diária ainda não foi ativada no banco. Rode a migration 0064 no Supabase e importe a planilha.
  </p>
);

export default async function DivulgacaoPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const usuario = await exigirUsuario();
  const aba: AbaDivulgacao = sp.aba === "historico" ? "historico" : sp.aba === "condicoes" ? "condicoes" : "semana";
  const podeExcluir = ehLideranca(usuario.role);
  const hoje = hojeSP();

  // Quando a planilha foi lida pela última vez (a tabela só existe depois da migration 0065).
  let ultimaLeitura: string | null = null;
  if (podeExcluir) {
    const supabase = await criarClienteServidor();
    const { data } = await supabase.from("divulgacao_sync").select("sincronizado_em").eq("id", 1).maybeSingle();
    ultimaLeitura = (data as { sincronizado_em: string | null } | null)?.sincronizado_em ?? null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Divulgação diária"
        descricao="Ofertas do dia (nacional e internacional): produto, temporada, vantagem, concorrência e condições dos hotéis."
        acoes={
          aba !== "condicoes" ? (
            <>
              {podeExcluir ? <AtualizarPlanilha ultima={ultimaLeitura} /> : null}
              <NovaOferta dataPadrao={hoje} />
            </>
          ) : undefined
        }
      />
      <AbasDivulgacao ativa={aba} />

      {aba === "semana" ? await Semana(sp, hoje, podeExcluir) : null}
      {aba === "historico" ? await Historico(sp, podeExcluir) : null}
      {aba === "condicoes" ? await Condicoes(podeExcluir) : null}
    </div>
  );
}

async function Semana(sp: Sp, hoje: string, podeExcluir: boolean) {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(sp.semana ?? "") ? sp.semana! : hoje;
  const seg = inicioDaSemana(base);
  const dom = somarDias(seg, 6);
  const { itens, indisponivel } = await ofertasDoPeriodo(seg, dom);

  const dias: Dia[] = Array.from({ length: 7 }, (_, i) => {
    const data = somarDias(seg, i);
    return { data, hoje: data === hoje, itens: itens.filter((o) => o.data === data) };
  });
  // Fim de semana vazio não ocupa espaço.
  const visiveis = dias.filter((d, i) => i < 5 || d.itens.length > 0);
  const href = (s: string) => `/operacional/divulgacao?semana=${s}`;
  const total = itens.length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="icon" className="size-9" aria-label="Semana anterior">
          <Link href={href(somarDias(seg, -7))}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <span className="min-w-44 text-center text-sm font-semibold tabular-nums">
          {dataCurta(seg)} a {dataBr(dom)}
        </span>
        <Button asChild variant="outline" size="icon" className="size-9" aria-label="Próxima semana">
          <Link href={href(somarDias(seg, 7))}>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
        {seg !== inicioDaSemana(hoje) ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/operacional/divulgacao">Voltar para esta semana</Link>
          </Button>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">{total} oferta(s) na semana</span>
      </div>
      {indisponivel ? AVISO_MIGRACAO : <OfertasLista dias={visiveis} podeExcluir={podeExcluir} lado />}
    </>
  );
}

async function Historico(sp: Sp, podeExcluir: boolean) {
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const f = { q: sp.q ?? "", tipo: sp.tipo ?? "", de: sp.de ?? "", ate: sp.ate ?? "", pagina };
  const { itens, total, indisponivel } = await historicoOfertas(f);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const dias: Dia[] = [];
  for (const o of itens as Oferta[]) {
    const ult = dias[dias.length - 1];
    if (ult && ult.data === o.data) ult.itens.push(o);
    else dias.push({ data: o.data, itens: [o] });
  }

  const link = (p: number) => {
    const q = new URLSearchParams({ aba: "historico" });
    for (const [k, v] of Object.entries({ q: f.q, tipo: f.tipo, de: f.de, ate: f.ate })) if (v) q.set(k, v);
    if (p > 1) q.set("pagina", String(p));
    return `/operacional/divulgacao?${q.toString()}`;
  };

  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="aba" value="historico" />
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input name="q" defaultValue={f.q} placeholder="Buscar produto, destino, vantagem…" aria-label="Buscar" className="h-9 w-72 pl-8" />
        </div>
        <select name="tipo" defaultValue={f.tipo} aria-label="Tipo" className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">Nacional e internacional</option>
          <option value="nacional">Só nacional</option>
          <option value="internacional">Só internacional</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          De <Input type="date" name="de" defaultValue={f.de} className="h-9 w-36" />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Até <Input type="date" name="ate" defaultValue={f.ate} className="h-9 w-36" />
        </label>
        <Button type="submit" size="sm" className="h-9">
          Filtrar
        </Button>
        {f.q || f.tipo || f.de || f.ate ? (
          <Button asChild variant="ghost" size="sm" className="h-9">
            <Link href="/operacional/divulgacao?aba=historico">Limpar</Link>
          </Button>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">{total.toLocaleString("pt-BR")} oferta(s)</span>
      </form>

      {indisponivel ? AVISO_MIGRACAO : <OfertasLista dias={dias} podeExcluir={podeExcluir} vazio="Nenhuma oferta encontrada com esses filtros." />}

      {paginas > 1 ? (
        <nav className="flex items-center justify-center gap-3 text-sm" aria-label="Páginas">
          {pagina > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={link(pagina - 1)}>
                <ChevronLeft className="size-4" /> Anterior
              </Link>
            </Button>
          ) : null}
          <span className="text-muted-foreground">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? (
            <Button asChild variant="outline" size="sm">
              <Link href={link(pagina + 1)}>
                Próxima <ChevronRight className="size-4" />
              </Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}

async function Condicoes(podeExcluir: boolean) {
  const [linhas, pessoas] = await Promise.all([listarCadastro("divulgacao_condicoes"), listarPessoasOpcoes()]);
  return (
    <CadastroCrud
      chave="divulgacao_condicoes"
      linhas={linhas}
      pessoas={pessoas}
      lps={[]}
      podeExcluir={podeExcluir}
      rotuloNovo="Nova condição"
      vazio="Nenhuma condição de hotel cadastrada ainda."
    />
  );
}

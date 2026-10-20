import Link from "next/link";
import { AlertTriangle, ExternalLink, Handshake } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaProdutos, type ProdutoView } from "@/features/comercial/cards";
import { BotaoSincronizar } from "@/features/comercial/botao-sincronizar";
import { ConferenciaPainel } from "@/features/comercial/conferencia-painel";
import { conferir, type LpSistema } from "@/features/comercial/conferencia";
import { achaComplexos, mesclarDuplicados, nomeCorreto } from "@/features/comercial/ajustes";
import { MarcarVisto } from "@/features/notificacoes/marcar-visto";
import {
  DIAS_DESTAQUE,
  PLANILHA_URL,
  type AlteracaoComercial,
  type InfoSincronizacao,
  type ProdutoComercial,
} from "@/features/comercial/tipos";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FUSO = "America/Sao_Paulo";

function quando(iso: string | null, curto = false): string {
  if (!iso) return "nunca";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    ...(curto ? {} : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tipo (manual ou automática) e detalhe da última sincronização. */
const ORIGEM: Record<string, { tipo: "Manual" | "Automática"; detalhe: string }> = {
  manual: { tipo: "Manual", detalhe: "botão Sincronizar agora" },
  planilha: { tipo: "Automática", detalhe: "ao editar a planilha" },
  agendado: { tipo: "Automática", detalhe: "horário agendado" },
};

interface Linha {
  chave: string;
  secao: string;
  nome: string;
  ordem: number;
  tag: string | null;
  tag_cor: string | null;
  campos: ProdutoComercial["campos"];
}

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; alterados?: string }>;
}) {
  const { aba: abaRaw, alterados } = await searchParams;
  const usuario = await exigirUsuario();
  const supabase = await criarClienteServidor();

  const desde = new Date(Date.now() - DIAS_DESTAQUE * 86_400_000).toISOString();
  const [{ data: prodData }, { data: altData }, { data: infoData }, { data: lpData }] = await Promise.all([
    supabase.from("comercial_produtos").select("chave, secao, nome, ordem, tag, tag_cor, campos").order("ordem", { ascending: true }).limit(2000),
    supabase.from("comercial_alteracoes").select("*").gte("detectado_em", desde).order("detectado_em", { ascending: false }).limit(500),
    supabase.from("comercial_sync").select("*").eq("id", 1).maybeSingle(),
    supabase.from("landing_pages").select("id, nome, grupo, status_patrocinio, url").limit(3000),
  ]);
  // A conferência ignora as LPs do grupo "antigas" (aba LP's antigas da planilha de LPs).
  const lps = ((lpData as LpSistema[] | null) ?? []).filter((l) => (l.grupo ?? "").trim().toLowerCase() !== "antigas");
  const linhas = (prodData as Linha[] | null) ?? [];
  const alteracoes = (altData as AlteracaoComercial[] | null) ?? [];
  const info = (infoData as InfoSincronizacao | null) ?? null;

  // Alteração mais recente de cada produto.
  const recente = new Map<string, AlteracaoComercial>();
  for (const a of alteracoes) if (!recente.has(a.chave) && a.tipo !== "removido") recente.set(a.chave, a);
  const removidos = alteracoes.filter((a) => a.tipo === "removido");

  const secoes = Array.from(new Set(linhas.map((l) => l.secao)));
  const ATIVOS = "Produtos ativos";
  const CONFERENCIA = "Conferência com as LPs";
  const abas = secoes.length > 0 ? [ATIVOS, ...secoes, CONFERENCIA] : [];
  const primeiraComAlteracao = linhas.find((l) => recente.has(l.chave))?.secao;
  const ativa = abas.includes(abaRaw ?? "")
    ? (abaRaw as string)
    : alterados === "1" && primeiraComAlteracao
      ? primeiraComAlteracao
      : abas[0];

  const complexos = achaComplexos(linhas);
  const emitidos = new Set<string>();
  const todos: ProdutoView[] = [];
  for (const l of linhas) {
    const cx = complexos.get(l.chave);
    if (cx) {
      // Complexo: um único card, com cada hotel separado dentro dele.
      if (emitidos.has(cx.nome)) continue;
      emitidos.add(cx.nome);
      const membros = cx.partes.map((pt) => ({ pt, l: linhas.find((x) => x.chave === pt.chave)! }));
      const mudancas = membros.flatMap(({ pt, l: m }) =>
        (recente.get(m.chave)?.mudancas ?? []).map((x) => ({ ...x, campo: `${pt.nome} · ${x.campo}` }))
      );
      const a = membros.map(({ l: m }) => recente.get(m.chave)).find(Boolean);
      todos.push({
        chave: membros[0].l.chave,
        secao: l.secao,
        nome: cx.nome,
        tag: membros[0].l.tag,
        tagCor: membros[0].l.tag_cor,
        campos: membros.flatMap(({ l: m }) => m.campos),
        partes: membros.map(({ pt, l: m }) => ({ nome: pt.nome, campos: m.campos })),
        conferencia: conferir(l.secao, cx.nome, membros[0].l.campos, lps),
        alteracao: a
          ? { tipo: a.tipo === "novo" ? "novo" : "alterado", quando: quando(a.detectado_em, true), mudancas }
          : undefined,
      });
      continue;
    }
    const a = recente.get(l.chave);
    const nome = nomeCorreto(l.nome);
    todos.push({
      chave: l.chave,
      secao: l.secao,
      nome,
      tag: l.tag,
      tagCor: l.tag_cor,
      campos: l.campos,
      conferencia: conferir(l.secao, nome, l.campos, lps),
      alteracao: a
        ? { tipo: a.tipo === "novo" ? "novo" : "alterado", quando: quando(a.detectado_em, true), mudancas: a.mudancas }
        : undefined,
    });
  }
  // "Produtos ativos": um card por produto (o mesmo hotel pode repetir ou estar em mais de uma aba).
  const ativosUnicos = mesclarDuplicados(todos.filter((p) => p.conferencia.situacao === "ativa"));
  const produtos = ativa === ATIVOS ? ativosUnicos : todos.filter((p) => p.secao === ativa);

  // LPs ativas que nenhum produto do Comercial referencia.
  const lpsUsadas = new Set(todos.flatMap((p) => p.conferencia.lps.map((l) => l.id)));
  const lpsAtivas = lps.filter((l) => l.status_patrocinio === "ativo");
  const lpsAtivasSemProduto = lpsAtivas
    .filter((l) => !lpsUsadas.has(l.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const divergentes = todos.filter((p) => p.conferencia.divergencia).length;

  // Alterações recentes por aba (para o aviso das abas).
  const alteradosPorSecao = new Map<string, number>();
  for (const l of linhas) if (recente.has(l.chave)) alteradosPorSecao.set(l.secao, (alteradosPorSecao.get(l.secao) ?? 0) + 1);
  const totalAlterados = recente.size;
  const ativosReais = ativosUnicos.length;
  const resumo = Array.from(recente.values()).slice(0, 8);

  return (
    <div className="space-y-6">
      <MarcarVisto prefixo="/comercial" />
      <PageHeader
        titulo="Comercial"
        descricao="Condições e disponibilidades de cada produto, atualizadas automaticamente a partir da planilha oficial."
        acoes={
          <Button asChild variant="outline">
            <a href={PLANILHA_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> Abrir planilha
            </a>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex flex-wrap items-center gap-2">
          Última sincronização: <strong className="text-foreground">{quando(info?.sincronizado_em ?? null)}</strong>
          {info?.origem && ORIGEM[info.origem] ? (
            <>
              <Badge variant={ORIGEM[info.origem].tipo === "Manual" ? "info" : "success"}>
                {ORIGEM[info.origem].tipo}
              </Badge>
              <span>({ORIGEM[info.origem].detalhe})</span>
            </>
          ) : null}
          {info?.erro ? <span className="text-destructive">Erro: {info.erro}</span> : null}
        </span>
        {ehLideranca(usuario.role) ? <BotaoSincronizar /> : null}
      </div>

      {totalAlterados > 0 || removidos.length > 0 ? (
        <div className="space-y-2 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 dark:bg-amber-950/40">
          <p className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="size-5" />
            {totalAlterados} produto(s) com condições alteradas nos últimos {DIAS_DESTAQUE} dias
            {removidos.length > 0 ? ` · ${removidos.length} removido(s) da planilha` : ""}
          </p>
          <ul className="space-y-1 text-sm">
            {resumo.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/comercial?aba=${encodeURIComponent(a.secao)}&alterados=1`}
                  className="hover:underline"
                >
                  <strong>{a.nome}</strong>{" "}
                  <span className="text-muted-foreground">({a.secao.toLowerCase()})</span>
                  {" — "}
                  {a.tipo === "novo"
                    ? "produto novo"
                    : `alterou: ${a.mudancas.map((m) => m.campo).join(", ")}`}
                  <span className="text-xs text-muted-foreground"> · {quando(a.detectado_em, true)}</span>
                </Link>
              </li>
            ))}
            {removidos.slice(0, 4).map((a) => (
              <li key={a.id} className="text-muted-foreground">
                <strong>{a.nome}</strong> foi removido da planilha · {quando(a.detectado_em, true)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {secoes.length === 0 ? (
        <EmptyState
          icone={Handshake}
          titulo="Planilha ainda não sincronizada"
          descricao="Rode a migration 0044 no Supabase e clique em Sincronizar agora (gerente ou líder)."
        />
      ) : (
        <>
          <nav aria-label="Abas" className="flex flex-wrap gap-1 border-b">
            {abas.map((s) => (
              <Link
                key={s}
                href={`/comercial?aba=${encodeURIComponent(s)}`}
                className={cn(
                  "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  s === ativa
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
                {s === ATIVOS ? (
                  <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    {ativosReais}
                  </span>
                ) : null}
                {s === CONFERENCIA && divergentes > 0 ? (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    {divergentes}
                  </span>
                ) : null}
                {alteradosPorSecao.get(s) ? (
                  <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[11px] font-semibold text-amber-950">
                    {alteradosPorSecao.get(s)}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          {ativa === CONFERENCIA ? (
            <ConferenciaPainel
              produtos={todos}
              lpsAtivasSemProduto={lpsAtivasSemProduto}
              totalLpsAtivas={lpsAtivas.length}
              lpsIgnoradas={((lpData as LpSistema[] | null) ?? []).length - lps.length}
            />
          ) : (
            <>
              {ativa === ATIVOS ? (
                <p className="text-sm text-muted-foreground">
                  Somente produtos cuja landing page está com patrocínio <strong>ativo</strong> no sistema (conferido
                  com Operacional &gt; Landing Pages).
                </p>
              ) : null}
              <ListaProdutos
                key={`${ativa}-${alterados ?? ""}`}
                produtos={produtos}
                somenteAlterados={alterados === "1"}
                mostrarAba={ativa === ATIVOS}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

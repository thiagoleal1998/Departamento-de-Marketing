import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import {
  listarCadastro,
  listarPessoasOpcoes,
  listarLpsOpcoes,
} from "@/features/operacional/cadastros-data";
import { CadastroCrud } from "@/features/operacional/cadastro-crud";
import {
  ControleLpsMatriz,
  type LinhaMatriz,
} from "@/features/operacional/controle-lps-matriz";
import { ABAS_CONTROLE } from "@/features/operacional/controle-lps-config";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ControleLpsPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba: abaRaw } = await searchParams;
  const usuario = await exigirUsuario();
  const [registros, pessoas, lps] = await Promise.all([
    listarCadastro("lp_conteudos"),
    listarPessoasOpcoes(),
    listarLpsOpcoes(),
  ]);

  const lista = abaRaw === "lista";
  const abaAtual =
    ABAS_CONTROLE.find((a) => a.chave === abaRaw) ?? ABAS_CONTROLE[0];

  // Matriz da aba atual: um produto por linha, um item por coluna.
  const doVersao = registros.filter((r) => r.versao === abaAtual.chave);
  const nomes = new Map(lps.map((l) => [l.id, l.nome]));
  const porLp = new Map<string, Record<string, string>>();
  const extras = new Set<string>();
  for (const r of doVersao) {
    const lpId = r.landing_page_id ?? "";
    if (!nomes.has(lpId) || !r.elemento) continue;
    const celulas = porLp.get(lpId) ?? {};
    celulas[r.elemento] = r.conteudo ?? "";
    porLp.set(lpId, celulas);
    if (!abaAtual.colunas.includes(r.elemento)) extras.add(r.elemento);
  }
  const colunas = [...abaAtual.colunas, ...Array.from(extras).sort()];
  const linhas: LinhaMatriz[] = lps
    .filter((l) => porLp.has(l.id))
    .map((l) => ({ id: l.id, nome: l.nome, celulas: porLp.get(l.id)! }));

  const abas = [
    ...ABAS_CONTROLE.map((a) => ({
      chave: a.chave,
      rotulo: a.rotulo,
      href: `/operacional/controle-lps?aba=${encodeURIComponent(a.chave)}`,
    })),
    {
      chave: "lista",
      rotulo: "Lista de registros",
      href: "/operacional/controle-lps?aba=lista",
    },
  ];
  const ativa = lista ? "lista" : abaAtual.chave;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Controle de conteúdo das LPs"
        descricao="Cada produto em uma linha e as etapas do controle em colunas, como na planilha."
      />

      <nav
        aria-label="Abas do controle"
        className="flex flex-wrap gap-1 border-b"
      >
        {abas.map((a) => (
          <Link
            key={a.chave}
            href={a.href}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              a.chave === ativa
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>

      {lista ? (
        <CadastroCrud
          chave="lp_conteudos"
          linhas={registros}
          pessoas={pessoas}
          lps={lps}
          podeExcluir={ehLideranca(usuario.role)}
          rotuloNovo="Novo controle"
          filtros={["landing_page_id", "versao"]}
          vazio="Nenhum controle registrado. Cadastre antes uma landing page em Landing Pages."
        />
      ) : linhas.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum dado nesta aba ainda. Importe a planilha (migrations 0036 e
          0037) ou cadastre pela aba Lista de registros.
        </p>
      ) : (
        <ControleLpsMatriz
          key={abaAtual.chave}
          versao={abaAtual.chave}
          colunas={colunas}
          linhas={linhas}
        />
      )}
    </div>
  );
}

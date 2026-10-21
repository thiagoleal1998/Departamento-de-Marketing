import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import {
  listarCadastro,
  listarPessoasOpcoes,
  listarLpsOpcoes,
} from "@/features/operacional/cadastros-data";
import { CadastroCrud } from "@/features/operacional/cadastro-crud";
import { AbasLps, type AbaLps } from "@/features/operacional/abas-lps";
import { ResumoLps } from "@/features/operacional/resumo-lps";
import { HistoricoGeralLps } from "@/features/operacional/historico-lps-ui";
import { historicoGeralLps } from "@/features/operacional/historico-lps-actions";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

/** Grupos fora da gestão atual: não aparecem na lista nem nas contagens (os dados continuam no banco). */
const GRUPOS_OCULTOS = ["antigas", "epic", "feriados"];

const FILTROS_URL = ["grupo", "status_patrocinio", "destino", "tipo_pagina", "estado", "banner_obrigatorio", "banner_no_ar", "tem_link_casamento", "tag_adm_mkt"];

export default async function LandingPagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const usuario = await exigirUsuario();
  const aba: AbaLps = sp.aba === "lps" ? "lps" : sp.aba === "historico" ? "historico" : "dados";

  const filtrosIniciais: Record<string, string> = {};
  for (const k of FILTROS_URL) if (sp[k]) filtrosIniciais[k] = sp[k]!;

  const [todas, pessoas, lps, historico] = await Promise.all([
    listarCadastro("landing_pages"),
    aba === "lps" ? listarPessoasOpcoes() : Promise.resolve([]),
    aba === "lps" ? listarLpsOpcoes() : Promise.resolve([]),
    aba === "historico" ? historicoGeralLps() : Promise.resolve(null),
  ]);

  const linhas = todas.filter((l) => !GRUPOS_OCULTOS.includes(l.grupo ?? ""));

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Landing Pages"
        descricao="Dados gerais, a lista de landing pages (grupo, patrocínio, destino, URL, códigos, banner e canal) e o histórico de modificações."
      />
      <AbasLps ativa={aba} />

      {aba === "dados" ? (
        <>
          <p className="text-sm text-muted-foreground">Clique em um número ou grupo para ver as landing pages correspondentes.</p>
          <ResumoLps linhas={linhas} />
        </>
      ) : aba === "historico" ? (
        <HistoricoGeralLps itens={historico?.itens ?? []} indisponivel={historico?.indisponivel} />
      ) : (
        <CadastroCrud
          // Recria o componente quando o filtro vindo da URL muda.
          key={JSON.stringify(filtrosIniciais)}
          chave="landing_pages"
          linhas={linhas}
          pessoas={pessoas}
          lps={lps}
          podeExcluir={ehLideranca(usuario.role)}
          rotuloNovo="Nova landing page"
          vazio="Nenhuma landing page cadastrada ainda."
          filtros={["grupo", "status_patrocinio", "destino", "tipo_pagina"]}
          filtrosIniciais={filtrosIniciais}
          linkExterno={{
            label: "Editar LP",
            href: "https://admin.resortsallinclusive.com.br/login#tabConteudo",
          }}
        />
      )}
    </div>
  );
}

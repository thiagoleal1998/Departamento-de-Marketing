import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import {
  listarCadastro,
  listarPessoasOpcoes,
} from "@/features/operacional/cadastros-data";
import { CadastroCrud } from "@/features/operacional/cadastro-crud";
import { ResumoConteudos } from "@/features/operacional/resumo-conteudos";
import { AbasConteudos } from "@/features/operacional/abas-conteudos";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function ConteudosSitePage({
  searchParams,
}: {
  searchParams: Promise<{
    aba?: string;
    categoria?: string;
    abrangencia?: string;
    estrelas?: string;
  }>;
}) {
  const { aba: abaRaw, categoria, abrangencia, estrelas } = await searchParams;
  const usuario = await exigirUsuario();
  const [linhas, pessoas] = await Promise.all([
    listarCadastro("conteudos_site"),
    listarPessoasOpcoes(),
  ]);

  const aba = abaRaw === "paginas" ? "paginas" : "dados";
  const filtrosIniciais: Record<string, string> = {};
  if (categoria) filtrosIniciais.categoria = categoria;
  if (abrangencia) filtrosIniciais.abrangencia = abrangencia;
  if (estrelas) filtrosIniciais.estrelas = estrelas;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Conteúdos do site"
        descricao="Tudo o que está no site: destinos, resorts, hotéis, circuitos, casamentos e LV Magazine."
      />
      <AbasConteudos ativa={aba} />

      {aba === "dados" ? (
        <>
          <p className="text-sm text-muted-foreground">
            Clique em um número, tipo ou segmento para ver as páginas
            correspondentes.
          </p>
          <ResumoConteudos linhas={linhas} />
        </>
      ) : (
        <CadastroCrud
          // Recria o componente quando o filtro vindo da URL muda.
          key={JSON.stringify(filtrosIniciais)}
          chave="conteudos_site"
          linhas={linhas}
          pessoas={pessoas}
          lps={[]}
          podeExcluir={ehLideranca(usuario.role)}
          rotuloNovo="Novo conteúdo"
          vazio="Nenhum conteúdo cadastrado ainda."
          filtros={["categoria", "abrangencia", "estrelas", "status"]}
          filtrosIniciais={filtrosIniciais}
        />
      )}
    </div>
  );
}

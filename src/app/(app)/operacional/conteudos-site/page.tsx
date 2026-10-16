import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import {
  listarCadastro,
  listarPessoasOpcoes,
} from "@/features/operacional/cadastros-data";
import { CadastroCrud } from "@/features/operacional/cadastro-crud";
import { ResumoConteudos } from "@/features/operacional/resumo-conteudos";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function ConteudosSitePage() {
  const usuario = await exigirUsuario();
  const [linhas, pessoas] = await Promise.all([
    listarCadastro("conteudos_site"),
    listarPessoasOpcoes(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Conteúdos do site"
        descricao="Tudo o que está no site: destinos, resorts, hotéis, circuitos, casamentos e LV Magazine."
      />
      <ResumoConteudos linhas={linhas} />
      <CadastroCrud
        chave="conteudos_site"
        linhas={linhas}
        pessoas={pessoas}
        lps={[]}
        podeExcluir={ehLideranca(usuario.role)}
        rotuloNovo="Novo conteúdo"
        vazio="Nenhum conteúdo cadastrado ainda."
        filtros={["categoria", "abrangencia", "estrelas", "status"]}
      />
    </div>
  );
}

import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import {
  listarCadastro,
  listarPessoasOpcoes,
} from "@/features/operacional/cadastros-data";
import { CadastroCrud } from "@/features/operacional/cadastro-crud";
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
        descricao="Textos, banners e posts do site: responsável, status e prazo."
      />
      <CadastroCrud
        chave="conteudos_site"
        linhas={linhas}
        pessoas={pessoas}
        lps={[]}
        podeExcluir={ehLideranca(usuario.role)}
        rotuloNovo="Novo conteúdo"
        vazio="Nenhum conteúdo cadastrado ainda."
      />
    </div>
  );
}

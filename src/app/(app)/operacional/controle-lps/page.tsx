import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import {
  listarCadastro,
  listarPessoasOpcoes,
  listarLpsOpcoes,
} from "@/features/operacional/cadastros-data";
import { CadastroCrud } from "@/features/operacional/cadastro-crud";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function ControleLpsPage() {
  const usuario = await exigirUsuario();
  const [linhas, pessoas, lps] = await Promise.all([
    listarCadastro("lp_conteudos"),
    listarPessoasOpcoes(),
    listarLpsOpcoes(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Controle de conteúdo das LPs"
        descricao="O que está no ar em cada landing page: elemento, conteúdo, versão e quem alterou por último."
      />
      <CadastroCrud
        chave="lp_conteudos"
        linhas={linhas}
        pessoas={pessoas}
        lps={lps}
        podeExcluir={ehLideranca(usuario.role)}
        rotuloNovo="Novo controle"
        vazio="Nenhum controle registrado. Cadastre antes uma landing page em Landing Pages."
      />
    </div>
  );
}

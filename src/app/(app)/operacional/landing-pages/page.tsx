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

export default async function LandingPagesPage() {
  const usuario = await exigirUsuario();
  const [linhas, pessoas, lps] = await Promise.all([
    listarCadastro("landing_pages"),
    listarPessoasOpcoes(),
    listarLpsOpcoes(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Landing Pages"
        descricao="Todas as landing pages: grupo, status de patrocínio, destino, URL, códigos, banner e canal."
      />
      <CadastroCrud
        chave="landing_pages"
        linhas={linhas}
        pessoas={pessoas}
        lps={lps}
        podeExcluir={ehLideranca(usuario.role)}
        rotuloNovo="Nova landing page"
        vazio="Nenhuma landing page cadastrada ainda."
        filtros={["grupo", "status_patrocinio", "destino"]}
      />
    </div>
  );
}

import { historicoColaborador } from "./data";
import { HistoricoView } from "./historico-view";
import { PageHeader } from "@/components/shared/page-header";
import type { Profile } from "@/types/database";

/** Visão do próprio desenvolvimento para colaboradores (somente leitura). */
export async function MeuDesenvolvimento({ usuario }: { usuario: Profile }) {
  const { feedbacks, conversas, planos } = await historicoColaborador(
    usuario.id
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Meu desenvolvimento"
        descricao="Seus feedbacks, conversas 1:1 e planos de ação."
      />
      <HistoricoView
        feedbacks={feedbacks}
        conversas={conversas}
        planos={planos}
        podeEditarPlano={false}
      />
    </div>
  );
}

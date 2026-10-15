import { Boxes } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import {
  listarItensEstoque,
  listarMovimentosRecentes,
  listarOpcoesVinculo,
} from "@/features/estoque/data";
import { obterDiretorio } from "@/features/equipe/diretorio";
import { NovoItemForm } from "@/features/estoque/novo-item-form";
import { ItemCard } from "@/features/estoque/item-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EstoquePage() {
  const usuario = await exigirUsuario();
  const ehGerente = usuario.role === "gerente";

  const [itens, movimentos, vinculos, perfis] = await Promise.all([
    listarItensEstoque(),
    listarMovimentosRecentes(),
    listarOpcoesVinculo(),
    obterDiretorio(),
  ]);

  const nomeItem = new Map(
    itens.map((i) => [i.id, i.cor ? `${i.nome} (${i.cor})` : i.nome])
  );
  const rotuloChamado = new Map(vinculos.chamados.map((c) => [c.id, c.rotulo]));
  const rotuloProjeto = new Map(vinculos.projetos.map((p) => [p.id, p.rotulo]));
  const abaixoMinimo = itens.filter((i) => i.quantidade <= i.estoque_minimo);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Estoque"
        descricao="Brindes, flyers e banners: entradas, saídas e histórico."
        acoes={ehGerente ? <NovoItemForm /> : undefined}
      />

      {abaixoMinimo.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Estoque baixo:</strong>{" "}
          {abaixoMinimo.map((i) => `${i.nome} (${i.quantidade})`).join(", ")}
        </div>
      ) : null}

      {itens.length === 0 ? (
        <EmptyState
          icone={Boxes}
          titulo="Nenhum item no estoque"
          descricao={
            ehGerente
              ? "Cadastre brindes, flyers e banners para começar a controlar entradas e saídas."
              : "Peça a um gerente para cadastrar os itens do estoque."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {itens.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              chamados={vinculos.chamados}
              projetos={vinculos.projetos}
              ehGerente={ehGerente}
            />
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Histórico recente</h2>
        {movimentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma movimentação registrada ainda.
          </p>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {movimentos.map((m) => {
                const vinculo =
                  (m.chamado_id && rotuloChamado.get(m.chamado_id)) ||
                  (m.projeto_id && rotuloProjeto.get(m.projeto_id)) ||
                  null;
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
                  >
                    <Badge variant={m.tipo === "entrada" ? "secondary" : "outline"}>
                      {m.tipo === "entrada" ? "Entrada" : "Saída"}
                    </Badge>
                    <span className="font-medium">
                      {m.tipo === "entrada" ? "+" : "−"}
                      {m.quantidade} {nomeItem.get(m.item_id) ?? "Item removido"}
                    </span>
                    {m.motivo ? (
                      <span className="text-muted-foreground">{m.motivo}</span>
                    ) : null}
                    {vinculo ? (
                      <span className="text-xs text-muted-foreground">
                        · {vinculo}
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {m.usuario_id ? perfis.get(m.usuario_id)?.nome ?? "—" : "—"}{" "}
                      · {formatarDataHora(m.created_at)} · saldo {m.saldo_apos}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

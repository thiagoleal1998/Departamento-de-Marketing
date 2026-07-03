import Link from "next/link";
import { HeartHandshake, MessageCircle, Target } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  FeedbackStatusBadge,
  PlanoStatusBadge,
} from "@/components/shared/status-badge";
import { PlanoStatusControl } from "./plano-status-control";
import { formatarData } from "@/lib/utils";
import type { Feedback, UmAUm, PlanoAcao } from "@/types/database";

export function HistoricoView({
  feedbacks,
  conversas,
  planos,
  podeEditarPlano,
}: {
  feedbacks: Feedback[];
  conversas: UmAUm[];
  planos: PlanoAcao[];
  podeEditarPlano: boolean;
}) {
  const vazio =
    feedbacks.length === 0 && conversas.length === 0 && planos.length === 0;

  if (vazio) {
    return (
      <EmptyState
        icone={HeartHandshake}
        titulo="Ainda não há registros"
        descricao="Feedbacks, conversas 1:1 e planos de ação aparecerão aqui."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Planos de ação em destaque */}
      <Card className="lg:col-span-2">
        <CardContent className="pt-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Target className="size-4 text-warm" /> Planos de ação
          </h3>
          {planos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum plano ativo.</p>
          ) : (
            <ul className="space-y-2">
              {planos.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{p.descricao}</p>
                    {p.resultado_esperado ? (
                      <p className="text-xs text-muted-foreground">
                        Resultado esperado: {p.resultado_esperado}
                      </p>
                    ) : null}
                    {p.prazo ? (
                      <p className="text-xs text-muted-foreground">
                        Prazo: {formatarData(p.prazo)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <PlanoStatusBadge status={p.status} />
                    <PlanoStatusControl
                      planoId={p.id}
                      status={p.status}
                      podeEditar={podeEditarPlano}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Feedbacks */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <HeartHandshake className="size-4 text-warm" /> Feedbacks
          </h3>
          {feedbacks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum feedback.</p>
          ) : (
            <ul className="space-y-2">
              {feedbacks.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/desenvolvimento/feedback/${f.id}`}
                    className="flex items-center justify-between gap-2 rounded-md border p-3 transition-colors hover:bg-accent/30"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Feedback de {formatarData(f.data)}
                      </p>
                      {f.resumo ? (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {f.resumo}
                        </p>
                      ) : null}
                    </div>
                    <FeedbackStatusBadge status={f.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Conversas 1:1 */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <MessageCircle className="size-4 text-warm" /> Conversas 1:1
          </h3>
          {conversas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conversa.</p>
          ) : (
            <ul className="space-y-2">
              {conversas.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/desenvolvimento/1a1/${c.id}`}
                    className="flex items-center justify-between gap-2 rounded-md border p-3 transition-colors hover:bg-accent/30"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {c.tema ?? "Conversa 1:1"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatarData(c.data)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

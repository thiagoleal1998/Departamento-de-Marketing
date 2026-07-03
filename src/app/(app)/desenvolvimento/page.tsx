import Link from "next/link";
import {
  Plus,
  HeartHandshake,
  MessageCircle,
  Target,
  Users,
} from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import {
  listarFeedbacks,
  listar1a1,
  listarPlanos,
  listarColaboradores,
} from "@/features/desenvolvimento/data";
import { PlanoStatusControl } from "@/features/desenvolvimento/plano-status-control";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FeedbackStatusBadge,
  PlanoStatusBadge,
} from "@/components/shared/status-badge";
import { formatarData } from "@/lib/utils";
import { FRASE_GUIA } from "@/features/desenvolvimento/roteiro-config";
import { PAPEL_LABEL } from "@/types";
import { MeuDesenvolvimento } from "@/features/desenvolvimento/meu-desenvolvimento";

export const dynamic = "force-dynamic";

export default async function DesenvolvimentoPage() {
  const usuario = await exigirUsuario();

  // Colaborador vê apenas o próprio desenvolvimento.
  if (!ehLideranca(usuario.role)) {
    return <MeuDesenvolvimento usuario={usuario} />;
  }

  const [feedbacks, conversas, planos, pessoas] = await Promise.all([
    listarFeedbacks(),
    listar1a1(),
    listarPlanos(),
    listarColaboradores(),
  ]);
  const nomePorId = new Map(pessoas.map((p) => [p.id, p.nome] as const));

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Feedbacks e Desenvolvimento"
        descricao={FRASE_GUIA}
        acoes={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/desenvolvimento/nova-1a1">
                <MessageCircle className="size-4" /> Nova 1:1
              </Link>
            </Button>
            <Button asChild variant="warm">
              <Link href="/desenvolvimento/novo-feedback">
                <Plus className="size-4" /> Novo feedback
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="feedbacks">
        <TabsList>
          <TabsTrigger value="feedbacks">Feedbacks</TabsTrigger>
          <TabsTrigger value="conversas">1:1</TabsTrigger>
          <TabsTrigger value="planos">Planos de ação</TabsTrigger>
          <TabsTrigger value="pessoas">Colaboradores</TabsTrigger>
        </TabsList>

        {/* Feedbacks */}
        <TabsContent value="feedbacks">
          {feedbacks.length === 0 ? (
            <EmptyState
              icone={HeartHandshake}
              titulo="Nenhum feedback registrado"
              descricao="Estruture uma conversa de desenvolvimento com o roteiro guiado."
              acao={
                <Button asChild variant="warm">
                  <Link href="/desenvolvimento/novo-feedback">Novo feedback</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {feedbacks.map((f) => (
                <Link
                  key={f.id}
                  href={`/desenvolvimento/feedback/${f.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/30"
                >
                  <div className="flex items-center gap-3">
                    <Avatar nome={nomePorId.get(f.colaborador_id)} className="size-8" />
                    <div>
                      <p className="text-sm font-medium">
                        {nomePorId.get(f.colaborador_id) ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatarData(f.data)}
                      </p>
                    </div>
                  </div>
                  <FeedbackStatusBadge status={f.status} />
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 1:1 */}
        <TabsContent value="conversas">
          {conversas.length === 0 ? (
            <EmptyState
              icone={MessageCircle}
              titulo="Nenhuma conversa 1:1"
              descricao="Registre conversas de futuro, carreira e alinhamento."
              acao={
                <Button asChild variant="outline">
                  <Link href="/desenvolvimento/nova-1a1">Nova 1:1</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {conversas.map((c) => (
                <Link
                  key={c.id}
                  href={`/desenvolvimento/1a1/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/30"
                >
                  <div className="flex items-center gap-3">
                    <Avatar nome={nomePorId.get(c.colaborador_id)} className="size-8" />
                    <div>
                      <p className="text-sm font-medium">
                        {nomePorId.get(c.colaborador_id) ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.tema ?? "Conversa 1:1"} · {formatarData(c.data)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Planos */}
        <TabsContent value="planos">
          {planos.length === 0 ? (
            <EmptyState
              icone={Target}
              titulo="Nenhum plano de ação"
              descricao="Planos de ação são criados a partir dos feedbacks e conversas."
            />
          ) : (
            <div className="space-y-2">
              {planos.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {nomePorId.get(p.colaborador_id) ?? "—"}
                        {p.prazo ? ` · prazo ${formatarData(p.prazo)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PlanoStatusBadge status={p.status} />
                      <PlanoStatusControl
                        planoId={p.id}
                        status={p.status}
                        podeEditar
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Colaboradores */}
        <TabsContent value="pessoas">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pessoas.map((p) => (
              <Link
                key={p.id}
                href={`/desenvolvimento/colaborador/${p.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
              >
                <Avatar nome={p.nome} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.cargo ?? PAPEL_LABEL[p.role]}
                  </p>
                </div>
                <Users className="ml-auto size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

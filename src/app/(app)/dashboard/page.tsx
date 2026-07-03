import Link from "next/link";
import {
  Ticket,
  Clock,
  CheckCircle2,
  HeartHandshake,
  ArrowRight,
  ListTodo,
} from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehLideranca } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { DataCard } from "@/components/shared/data-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChamadoStatusBadge, ChamadoPrioridadeBadge } from "@/components/shared/status-badge";
import { formatarData } from "@/lib/utils";
import type { Chamado } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const usuario = await exigirUsuario();
  const supabase = await criarClienteServidor();
  const lideranca = ehLideranca(usuario.role);

  // Chamados visíveis pelo usuário (a RLS já limita o escopo).
  const { data: chamadosData } = await supabase
    .from("chamados")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  const chamados = (chamadosData as Chamado[] | null) ?? [];

  const abertos = chamados.filter(
    (c) => c.status !== "fechado" && c.status !== "resolvido"
  );
  const emAndamento = chamados.filter((c) => c.status === "em_andamento");
  const resolvidos = chamados.filter(
    (c) => c.status === "resolvido" || c.status === "fechado"
  );
  const recentes = chamados.slice(0, 5);

  // Planos de ação em aberto do usuário (ou da equipe, se liderança).
  const { count: planosAbertos } = await supabase
    .from("planos_acao")
    .select("*", { count: "exact", head: true })
    .neq("status", "concluido");

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={`Olá, ${usuario.nome.split(" ")[0]} 👋`}
        descricao={
          lideranca
            ? "Veja o panorama da operação e o que precisa da sua atenção."
            : "Aqui está o resumo do seu dia."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DataCard
          titulo="Chamados abertos"
          valor={abertos.length}
          icone={Ticket}
          descricao="Aguardando ou em andamento"
          href="/chamados?situacao=abertos"
        />
        <DataCard
          titulo="Em andamento"
          valor={emAndamento.length}
          icone={Clock}
          href="/chamados?situacao=em_andamento"
        />
        <DataCard
          titulo="Resolvidos"
          valor={resolvidos.length}
          icone={CheckCircle2}
          href="/chamados?situacao=resolvidos"
        />
        <DataCard
          titulo="Planos de ação"
          valor={planosAbertos ?? 0}
          icone={HeartHandshake}
          descricao="Em acompanhamento"
          href="/desenvolvimento"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Chamados recentes</CardTitle>
              <CardDescription>Últimas solicitações registradas</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/chamados">
                Ver todos <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentes.length === 0 ? (
              <EmptyState
                icone={Ticket}
                titulo="Nenhum chamado ainda"
                descricao="Quando houver solicitações, elas aparecerão aqui."
                acao={
                  <Button asChild size="sm">
                    <Link href="/chamados/novo">Abrir chamado</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {recentes.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/chamados/${c.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-accent/40 -mx-2 px-2 rounded-md"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          <span className="text-muted-foreground">
                            #{c.numero}
                          </span>{" "}
                          {c.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Aberto em {formatarData(c.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <ChamadoPrioridadeBadge prioridade={c.prioridade} />
                        <ChamadoStatusBadge status={c.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
            <CardDescription>Ações rápidas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/chamados/novo">
                <Ticket className="size-4" /> Abrir chamado
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/operacional">
                <ListTodo className="size-4" /> Minhas tarefas
              </Link>
            </Button>
            {lideranca ? (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/desenvolvimento/novo-feedback">
                  <HeartHandshake className="size-4" /> Novo feedback
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/desenvolvimento">
                  <HeartHandshake className="size-4" /> Meu desenvolvimento
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

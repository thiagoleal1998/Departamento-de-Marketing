import Link from "next/link";
import { Lightbulb, List, Columns3 } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { listarSugestoes } from "@/features/sugestoes/data";
import { mapaDePerfis } from "@/features/chamados/data";
import { SugestaoForm } from "@/features/sugestoes/sugestao-form";
import {
  GerenciarSugestao,
  STATUS_LABEL,
} from "@/features/sugestoes/gerenciar-sugestao";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Sugestao, SugestaoStatus, SugestaoTipo } from "@/types/database";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<SugestaoTipo, string> = {
  ideia: "Ideia",
  problema: "Problema",
  elogio: "Elogio",
};

const COLUNAS: SugestaoStatus[] = [
  "nova",
  "em_analise",
  "planejada",
  "concluida",
  "descartada",
];

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SugestoesPage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string }>;
}) {
  const { visao: visaoRaw } = await searchParams;
  const usuario = await exigirUsuario();
  const ehGerente = usuario.role === "gerente";
  const verTodas = ehLideranca(usuario.role);
  const visao = verTodas && visaoRaw === "kanban" ? "kanban" : "lista";

  const [sugestoes, perfis] = await Promise.all([
    listarSugestoes(),
    mapaDePerfis(),
  ]);

  const autor = (s: Sugestao) =>
    verTodas ? `${perfis.get(s.autor_id)?.nome ?? "—"} · ` : "";

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Feedback"
        descricao="Relate um problema, sugira uma melhoria ou deixe um elogio. A liderança acompanha e responde por aqui."
      />

      <SugestaoForm />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {verTodas ? "Todos os envios" : "Meus envios"}
          </h2>
          {verTodas ? (
            <div className="flex gap-1">
              <Button
                asChild
                size="sm"
                variant={visao === "lista" ? "default" : "outline"}
              >
                <Link href="/sugestoes?visao=lista">
                  <List className="size-4" /> Lista
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant={visao === "kanban" ? "default" : "outline"}
              >
                <Link href="/sugestoes?visao=kanban">
                  <Columns3 className="size-4" /> Kanban
                </Link>
              </Button>
            </div>
          ) : null}
        </div>

        {sugestoes.length === 0 ? (
          <EmptyState
            icone={Lightbulb}
            titulo="Nenhum envio ainda"
            descricao="Use o formulário acima para enviar sua primeira ideia ou relato."
          />
        ) : visao === "kanban" ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {COLUNAS.map((status) => {
              const doStatus = sugestoes.filter((s) => s.status === status);
              return (
                <div
                  key={status}
                  className="w-72 shrink-0 space-y-3 rounded-lg bg-muted/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {STATUS_LABEL[status]}
                    </h3>
                    <Badge variant="secondary">{doStatus.length}</Badge>
                  </div>
                  {doStatus.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Nada aqui
                    </p>
                  ) : (
                    doStatus.map((s) => (
                      <Card key={s.id}>
                        <CardContent className="space-y-2 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold leading-tight">
                              {s.titulo}
                            </h4>
                            <Badge variant="secondary">
                              {TIPO_LABEL[s.tipo]}
                            </Badge>
                          </div>
                          <p className="line-clamp-3 text-xs text-muted-foreground">
                            {s.descricao}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {autor(s)}
                            {formatarDataHora(s.created_at)}
                          </p>
                          {ehGerente ? (
                            <details className="text-sm">
                              <summary className="cursor-pointer text-xs font-medium text-primary">
                                Responder / mover
                              </summary>
                              <div className="mt-2">
                                <GerenciarSugestao
                                  id={s.id}
                                  statusInicial={s.status}
                                  respostaInicial={s.resposta}
                                />
                              </div>
                            </details>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {sugestoes.map((s) => (
              <Card key={s.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{TIPO_LABEL[s.tipo]}</Badge>
                        <h3 className="font-semibold leading-tight">
                          {s.titulo}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {autor(s)}
                        {formatarDataHora(s.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline">{STATUS_LABEL[s.status]}</Badge>
                  </div>

                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {s.descricao}
                  </p>

                  {s.resposta && !ehGerente ? (
                    <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                      <p className="mb-1 text-xs font-medium text-primary">
                        Resposta da liderança
                      </p>
                      <p className="whitespace-pre-line">{s.resposta}</p>
                    </div>
                  ) : null}

                  {ehGerente ? (
                    <GerenciarSugestao
                      id={s.id}
                      statusInicial={s.status}
                      respostaInicial={s.resposta}
                    />
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

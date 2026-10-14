import { Lightbulb } from "lucide-react";
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
import type { SugestaoTipo } from "@/types/database";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<SugestaoTipo, string> = {
  ideia: "Ideia",
  problema: "Problema",
  elogio: "Elogio",
};

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SugestoesPage() {
  const usuario = await exigirUsuario();
  const ehGerente = usuario.role === "gerente";
  const verTodas = ehLideranca(usuario.role);

  const [sugestoes, perfis] = await Promise.all([
    listarSugestoes(),
    mapaDePerfis(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Sugestões e ideias"
        descricao="Relate um problema, sugira uma melhoria ou deixe um elogio. A liderança acompanha e responde por aqui."
      />

      <SugestaoForm />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {verTodas ? "Todos os envios" : "Meus envios"}
        </h2>

        {sugestoes.length === 0 ? (
          <EmptyState
            icone={Lightbulb}
            titulo="Nenhum envio ainda"
            descricao="Use o formulário acima para enviar sua primeira ideia ou relato."
          />
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
                        {verTodas
                          ? `${perfis.get(s.autor_id)?.nome ?? "—"} · `
                          : ""}
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

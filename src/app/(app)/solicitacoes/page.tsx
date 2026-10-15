import { CalendarClock } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterDiretorio } from "@/features/equipe/diretorio";
import { SolicitacaoForm } from "@/features/solicitacoes/solicitacao-form";
import {
  CancelarSolicitacao,
  DecidirSolicitacao,
} from "@/features/solicitacoes/acoes-solicitacao";
import {
  STATUS_META,
  TIPO_LABEL,
  type Solicitacao,
} from "@/features/solicitacoes/tipos";
import { MarcarVisto } from "@/features/notificacoes/marcar-visto";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatarData } from "@/lib/utils";

export const dynamic = "force-dynamic";

function periodo(s: Solicitacao): string {
  const ini = formatarData(s.data_inicio);
  const base =
    s.data_fim && s.data_fim !== s.data_inicio
      ? `${ini} a ${formatarData(s.data_fim)}`
      : ini;
  return s.hora ? `${base} · ${s.hora}` : base;
}

function CartaoSolicitacao({
  s,
  nome,
  mostrarPessoa,
  children,
}: {
  s: Solicitacao;
  nome: string;
  mostrarPessoa: boolean;
  children?: React.ReactNode;
}) {
  const meta = STATUS_META[s.status];
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-0.5">
            <p className="font-semibold leading-tight">
              {TIPO_LABEL[s.tipo]}
              {mostrarPessoa ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {nome}
                </span>
              ) : null}
            </p>
            <p className="text-sm text-muted-foreground">{periodo(s)}</p>
          </div>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        {s.motivo ? <p className="text-sm">{s.motivo}</p> : null}
        {s.resposta ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm">
            <span className="font-medium">Resposta: </span>
            {s.resposta}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Enviada em {formatarData(s.created_at)}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

export default async function SolicitacoesPage() {
  const usuario = await exigirUsuario();
  const lideranca = ehLideranca(usuario.role);
  const ehGerente = usuario.role === "gerente";
  const supabase = await criarClienteServidor();

  const [{ data }, diretorio] = await Promise.all([
    supabase
      .from("solicitacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
    obterDiretorio(),
  ]);
  const todas = (data as Solicitacao[] | null) ?? [];
  const nomeDe = (id: string) => diretorio.get(id)?.nome ?? "—";

  const minhas = todas.filter((s) => s.solicitante_id === usuario.id);
  const doTime = todas.filter((s) => s.solicitante_id !== usuario.id);
  const paraDecidir = doTime.filter((s) => s.status === "pendente");
  const historicoTime = doTime.filter((s) => s.status !== "pendente");

  return (
    <div className="space-y-8">
      <MarcarVisto prefixo="/solicitacoes" />
      <PageHeader
        titulo="Solicitações"
        descricao="Peça folga, férias, saída mais cedo e outros ajustes. O gerente responde por aqui."
      />

      <SolicitacaoForm />

      {ehGerente && paraDecidir.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Aguardando sua decisão ({paraDecidir.length})
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {paraDecidir.map((s) => (
              <CartaoSolicitacao
                key={s.id}
                s={s}
                nome={nomeDe(s.solicitante_id)}
                mostrarPessoa
              >
                <DecidirSolicitacao id={s.id} />
              </CartaoSolicitacao>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Minhas solicitações</h2>
        {minhas.length === 0 ? (
          <EmptyState
            icone={CalendarClock}
            titulo="Você ainda não fez solicitações"
            descricao="Use o formulário acima para pedir folga, férias ou ajuste de horário."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {minhas.map((s) => (
              <CartaoSolicitacao
                key={s.id}
                s={s}
                nome={usuario.nome}
                mostrarPessoa={false}
              >
                {s.status === "pendente" ? (
                  <div className="flex justify-end border-t pt-3">
                    <CancelarSolicitacao id={s.id} />
                  </div>
                ) : null}
              </CartaoSolicitacao>
            ))}
          </div>
        )}
      </section>

      {lideranca && !ehGerente && paraDecidir.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Pendentes do time ({paraDecidir.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Aguardando a decisão do gerente.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {paraDecidir.map((s) => (
              <CartaoSolicitacao
                key={s.id}
                s={s}
                nome={nomeDe(s.solicitante_id)}
                mostrarPessoa
              />
            ))}
          </div>
        </section>
      ) : null}

      {lideranca && historicoTime.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Histórico do time</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {historicoTime.map((s) => (
              <CartaoSolicitacao
                key={s.id}
                s={s}
                nome={nomeDe(s.solicitante_id)}
                mostrarPessoa
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

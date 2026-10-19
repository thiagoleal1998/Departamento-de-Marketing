import Link from "next/link";
import { ExternalLink, Handshake } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { GradeComercial } from "@/features/comercial/grade";
import { BotaoSincronizar } from "@/features/comercial/botao-sincronizar";
import {
  PLANILHA_URL,
  type AbaComercial,
  type InfoSincronizacao,
} from "@/features/comercial/tipos";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function quando(iso: string | null): string {
  if (!iso) return "nunca";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ORIGEM: Record<string, string> = {
  planilha: "ao editar a planilha",
  agendado: "sincronização diária",
  manual: "botão Sincronizar agora",
};

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba: abaRaw } = await searchParams;
  const usuario = await exigirUsuario();
  const supabase = await criarClienteServidor();

  const [{ data: abasData }, { data: infoData }] = await Promise.all([
    supabase.from("comercial_abas").select("*").order("ordem", { ascending: true }),
    supabase.from("comercial_sync").select("*").eq("id", 1).maybeSingle(),
  ]);
  const abas = (abasData as AbaComercial[] | null) ?? [];
  const info = (infoData as InfoSincronizacao | null) ?? null;
  const ativa = abas.find((a) => a.nome === abaRaw) ?? abas[0];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Comercial"
        descricao="Condições e disponibilidades por produto, espelhadas da planilha oficial e atualizadas automaticamente."
        acoes={
          <Button asChild variant="outline">
            <a href={PLANILHA_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> Abrir planilha
            </a>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Última sincronização: <strong>{quando(info?.sincronizado_em ?? null)}</strong>
          {info?.origem ? ` (${ORIGEM[info.origem] ?? info.origem})` : ""}
          {info?.erro ? <span className="ml-2 text-destructive">Erro: {info.erro}</span> : null}
        </span>
        {ehLideranca(usuario.role) ? <BotaoSincronizar /> : null}
      </div>

      {abas.length === 0 ? (
        <EmptyState
          icone={Handshake}
          titulo="Planilha ainda não sincronizada"
          descricao="Rode a migration 0043 no Supabase e clique em Sincronizar agora (gerente ou líder)."
        />
      ) : (
        <>
          <nav aria-label="Abas da planilha" className="flex flex-wrap gap-1 border-b">
            {abas.map((a) => (
              <Link
                key={a.nome}
                href={`/comercial?aba=${encodeURIComponent(a.nome)}`}
                className={cn(
                  "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  a.nome === ativa?.nome
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {a.nome}
              </Link>
            ))}
          </nav>
          {ativa ? <GradeComercial key={ativa.nome} dados={ativa.dados} /> : null}
        </>
      )}
    </div>
  );
}

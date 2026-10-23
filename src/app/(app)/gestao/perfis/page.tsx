import Link from "@/components/shared/link";
import { redirect } from "next/navigation";
import { Brain, ArrowRight } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { GestaoAbas } from "@/features/perfis/gestao-abas";
import { SincronizarDisc } from "@/features/perfis/sincronizar-disc";
import {
  FATOR_META,
  type FatorDisc,
  type PerfilComportamental,
} from "@/features/perfis/tipos";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FATORES: FatorDisc[] = ["D", "I", "S", "C"];

export default async function PerfisPage() {
  const usuario = await exigirUsuario();
  // Colaboradores não têm acesso a esta área.
  if (!ehLideranca(usuario.role)) redirect("/dashboard");

  const supabase = await criarClienteServidor();
  // A RLS já garante: gerente vê todos; líder não vê o gerente.
  const { data } = await supabase
    .from("perfis_comportamentais")
    .select("*")
    .order("nome", { ascending: true });
  const perfis = (data as PerfilComportamental[] | null) ?? [];

  // Fotos dos membros (perfil vinculado ao usuário do sistema).
  const idsUsuarios = perfis
    .map((p) => p.profile_id)
    .filter((v): v is string => Boolean(v));
  const fotos = new Map<string, string | null>();
  if (idsUsuarios.length > 0) {
    const { data: usuarios } = await supabase
      .from("profiles")
      .select("id, avatar_url")
      .in("id", idsUsuarios);
    for (const u of (usuarios as
      | { id: string; avatar_url: string | null }[]
      | null) ?? []) {
      fotos.set(u.id, u.avatar_url);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Gestão"
        descricao="Indicadores da operação e perfis comportamentais do time."
      />
      <GestaoAbas ativa="perfis" />

      <p className="text-sm text-muted-foreground">
        {usuario.role === "gerente"
          ? "Você vê os perfis de toda a equipe."
          : "Você vê os perfis dos colaboradores."}{" "}
        Informações confidenciais: use para apoiar o desenvolvimento das
        pessoas.
      </p>

      {usuario.role === "gerente" ? <SincronizarDisc /> : null}

      {perfis.length === 0 ? (
        <EmptyState
          icone={Brain}
          titulo="Nenhum perfil disponível"
          descricao="Os perfis comportamentais aparecem aqui assim que forem cadastrados."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {perfis.map((p) => {
            const meta = FATOR_META[p.perfil_primario];
            return (
              <Link key={p.id} href={`/gestao/perfis/${p.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/30">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          nome={p.nome}
                          src={p.profile_id ? fotos.get(p.profile_id) : null}
                          className="size-12 text-sm"
                        />
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold leading-tight">
                            {p.nome}
                          </h3>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.pesquisa ?? "—"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={cn("shrink-0 text-white", meta.cor)}
                      >
                        {p.perfil_primario}
                        {p.perfil_secundario ? ` / ${p.perfil_secundario}` : ""}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      {FATORES.map((f) => {
                        const v = p.dados.pontuacoes?.[f] ?? 0;
                        // Escala -24..+24 -> 0..100%
                        const pct = Math.max(0, Math.min(100, ((v + 24) / 48) * 100));
                        return (
                          <div key={f} className="flex items-center gap-2 text-xs">
                            <span
                              className={cn("w-4 font-bold", FATOR_META[f].texto)}
                            >
                              {f}
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn("h-full", FATOR_META[f].cor)}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-8 text-right tabular-nums text-muted-foreground">
                              {v}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <p className="flex items-center gap-1 text-xs font-medium text-primary">
                      Ver relatório completo <ArrowRight className="size-3" />
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

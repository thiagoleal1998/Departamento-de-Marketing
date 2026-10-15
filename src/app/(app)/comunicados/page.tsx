import { Megaphone, Pin } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { mapaDePerfis } from "@/features/chamados/data";
import { ComunicadoForm } from "@/features/comunicados/comunicado-form";
import { AcoesComunicado } from "@/features/comunicados/acoes-comunicado";
import { MarcarVisto } from "@/features/notificacoes/marcar-visto";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface Comunicado {
  id: string;
  titulo: string;
  corpo: string;
  fixado: boolean;
  autor_id: string;
  created_at: string;
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ComunicadosPage() {
  const usuario = await exigirUsuario();
  const lideranca = ehLideranca(usuario.role);
  const supabase = await criarClienteServidor();

  const [{ data }, perfis] = await Promise.all([
    supabase
      .from("comunicados")
      .select("*")
      .order("fixado", { ascending: false })
      .order("created_at", { ascending: false }),
    mapaDePerfis(),
  ]);
  const comunicados = (data as Comunicado[] | null) ?? [];

  return (
    <div className="space-y-6">
      <MarcarVisto prefixo="/comunicados" />
      <PageHeader
        titulo="Comunicados"
        descricao="Avisos importantes da liderança para todo o time."
      />

      {lideranca ? <ComunicadoForm /> : null}

      {comunicados.length === 0 ? (
        <EmptyState
          icone={Megaphone}
          titulo="Nenhum comunicado ainda"
          descricao={
            lideranca
              ? "Publique o primeiro aviso para o time usando o formulário acima."
              : "Quando a liderança publicar um aviso, ele aparecerá aqui."
          }
        />
      ) : (
        <div className="space-y-3">
          {comunicados.map((c) => (
            <Card key={c.id} className={c.fixado ? "border-primary/40" : undefined}>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {c.fixado ? (
                        <Badge variant="secondary" className="gap-1">
                          <Pin className="size-3" /> Fixado
                        </Badge>
                      ) : null}
                      <h2 className="text-base font-semibold leading-tight">
                        {c.titulo}
                      </h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {perfis.get(c.autor_id)?.nome ?? "—"} ·{" "}
                      {formatarDataHora(c.created_at)}
                    </p>
                  </div>
                  {lideranca ? (
                    <AcoesComunicado id={c.id} fixado={c.fixado} />
                  ) : null}
                </div>
                <p className="whitespace-pre-line text-sm">{c.corpo}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

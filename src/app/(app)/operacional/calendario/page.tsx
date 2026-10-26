import { CalendarRange } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaCalendario, type ItemCalendario } from "@/features/calendario/lista-calendario";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const usuario = await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("calendario_conteudo")
    .select("*")
    .order("data", { ascending: true, nullsFirst: false })
    .limit(3000);
  const itens = (data as ItemCalendario[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Calendário geral"
        descricao="E-mails, redes sociais, ofertas, podcasts e visitas do time em um só calendário. Clique em um dia para ver tudo o que está programado ou para incluir um item."
      />
      {itens.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <CalendarRange className="size-8" />
          Nenhum item ainda. Rode a migration 0048 para importar o calendário do Notion.
        </div>
      ) : (
        <ListaCalendario itens={itens} podeExcluir={ehLideranca(usuario.role)} />
      )}
    </div>
  );
}

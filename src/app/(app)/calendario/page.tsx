import { CalendarRange } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaCalendario, type ItemCalendario } from "@/features/calendario/lista-calendario";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("calendario_conteudo")
    .select("id, nome, data, status, tipo, canais, responsaveis, tipo_post, objetivo, publico, tags")
    .order("data", { ascending: true, nullsFirst: false })
    .limit(3000);
  const itens = (data as ItemCalendario[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Calendário de conteúdo"
        descricao="Posts, e-mails, ofertas e podcasts planejados, por dia, tipo e responsável."
      />
      {itens.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <CalendarRange className="size-8" />
          Nenhum item ainda. Rode a migration 0048 para importar o calendário do Notion.
        </div>
      ) : (
        <ListaCalendario itens={itens} />
      )}
    </div>
  );
}

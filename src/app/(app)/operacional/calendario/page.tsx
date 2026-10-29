import { CalendarRange } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaCalendario, type ItemCalendario } from "@/features/calendario/lista-calendario";
import { PageHeader } from "@/components/shared/page-header";
import { AvisosCalendario, type AvisoCalendario } from "@/features/calendario/avisos-calendario";
import { mapaDePerfis } from "@/features/chamados/data";
import type { ProjetoNoCalendario } from "@/features/calendario/lista-calendario";

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

  // Eventos, famtours, feiras, VTs e projetos com data entram no calendário (clicar abre o projeto).
  const { data: projs } = await supabase
    .from("projetos")
    .select("id, nome, categoria, status, responsavel_id, data_inicio, data_fim")
    .or("data_inicio.not.is.null,data_fim.not.is.null")
    .limit(500);
  const perfis = await mapaDePerfis();

  // Avisos não vistos deste calendário: são eles que formam o número vermelho do menu.
  const { data: avisosData } = await supabase
    .from("notificacoes")
    .select("id, titulo, created_at")
    .eq("destinatario_id", usuario.id)
    .eq("lida", false)
    .like("link", "/operacional/calendario%")
    .order("created_at", { ascending: false })
    .limit(50);
  const avisos: AvisoCalendario[] = ((avisosData as { id: string; titulo: string; created_at: string }[] | null) ?? []).map((a) => ({
    id: a.id,
    titulo: a.titulo,
    quando: new Date(a.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
  }));
  const projetos: ProjetoNoCalendario[] = ((projs as { id: string; nome: string; categoria: string; status: string; responsavel_id: string | null; data_inicio: string | null; data_fim: string | null }[] | null) ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    categoria: p.categoria,
    status: p.status,
    responsavel: p.responsavel_id ? perfis.get(p.responsavel_id)?.nome ?? null : null,
    inicio: p.data_inicio,
    fim: p.data_fim,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Calendário geral"
        descricao="E-mails, redes sociais, ofertas, podcasts e visitas do time em um só calendário. Clique em um dia para ver tudo o que está programado ou para incluir um item."
      />
      <AvisosCalendario avisos={avisos} />
      {itens.length === 0 && projetos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <CalendarRange className="size-8" />
          Nenhum item ainda. Rode a migration 0048 para importar o calendário do Notion.
        </div>
      ) : (
        <ListaCalendario itens={itens} projetos={projetos} usuarioId={usuario.id} usuarioNome={usuario.nome} lideranca={ehLideranca(usuario.role)} />
      )}
    </div>
  );
}

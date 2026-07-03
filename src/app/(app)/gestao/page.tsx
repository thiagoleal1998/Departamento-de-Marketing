import { redirect } from "next/navigation";
import {
  Megaphone,
  CalendarRange,
  FileBarChart,
  Users,
  Ticket,
  Clock,
} from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { pode } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataCard } from "@/components/shared/data-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Chamado } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function GestaoPage() {
  const usuario = await exigirUsuario();
  if (!pode(usuario.role, "ver_relatorios_gerais")) redirect("/dashboard");

  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("chamados").select("*");
  const chamados = (data as Chamado[] | null) ?? [];

  const abertos = chamados.filter(
    (c) => c.status !== "fechado" && c.status !== "resolvido"
  ).length;
  const emAndamento = chamados.filter((c) => c.status === "em_andamento").length;
  const semResponsavel = chamados.filter((c) => !c.responsavel_id).length;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Gestão"
        descricao="Acompanhamento estratégico, performance e campanhas."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DataCard titulo="Total de chamados" valor={chamados.length} icone={Ticket} />
        <DataCard titulo="Em aberto" valor={abertos} icone={Clock} />
        <DataCard titulo="Em andamento" valor={emAndamento} icone={Megaphone} />
        <DataCard
          titulo="Sem responsável"
          valor={semResponsavel}
          icone={Users}
          descricao="Aguardando triagem"
        />
      </div>

      <Tabs defaultValue="campanhas">
        <TabsList>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="produtividade">Produtividade</TabsTrigger>
        </TabsList>

        <TabsContent value="campanhas">
          <EmptyState
            icone={Megaphone}
            titulo="Campanhas"
            descricao="Visão por campanha, canal, responsável e status. (Em construção nesta etapa.)"
          />
        </TabsContent>
        <TabsContent value="calendario">
          <EmptyState
            icone={CalendarRange}
            titulo="Calendário de campanhas"
            descricao="Planejamento e datas das campanhas aparecerão aqui."
          />
        </TabsContent>
        <TabsContent value="relatorios">
          <EmptyState
            icone={FileBarChart}
            titulo="Relatórios por período"
            descricao="Indicadores e exportações por período serão disponibilizados aqui."
          />
        </TabsContent>
        <TabsContent value="produtividade">
          <EmptyState
            icone={Users}
            titulo="Produtividade por colaborador"
            descricao="Visão de produtividade por pessoa ou área."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

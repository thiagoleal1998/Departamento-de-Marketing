import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { pode } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterConfig } from "@/lib/config";
import { AparenciaForm } from "@/features/configuracoes/aparencia-form";
import { CriarUsuarioForm } from "@/features/configuracoes/criar-usuario-form";
import { UsuarioRow } from "@/features/configuracoes/usuario-row";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Profile, Area } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const usuario = await exigirUsuario();
  if (!pode(usuario.role, "gerir_usuarios")) redirect("/dashboard");

  const supabase = await criarClienteServidor();
  const [{ data: perfisData }, { data: areasData }, config] = await Promise.all([
    supabase.from("profiles").select("*").order("nome", { ascending: true }),
    supabase.from("areas").select("*").order("nome", { ascending: true }),
    obterConfig(),
  ]);
  const perfis = (perfisData as Profile[] | null) ?? [];
  const areas = (areasData as Area[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Configurações"
        descricao="Gerencie usuários, papéis, permissões e a aparência do sistema."
      />

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência e textos</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          <div className="space-y-3">
            <CriarUsuarioForm areas={areas} />
            {perfis.map((p) => (
              <UsuarioRow
                key={p.id}
                p={p}
                areas={areas}
                podeExcluir={p.id !== usuario.id}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="aparencia">
          <AparenciaForm
            cor={config.cor}
            logo={config.logo}
            departamentos={config.departamentos}
            segmentos={config.segmentos}
            canais={config.canais}
            textos={config.textos}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

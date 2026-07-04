import { redirect } from "next/navigation";
import { Save } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { pode } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterConfig } from "@/lib/config";
import { atualizarPerfilUsuario } from "@/features/configuracoes/actions";
import { AparenciaForm } from "@/features/configuracoes/aparencia-form";
import { ExcluirUsuarioButton } from "@/features/configuracoes/excluir-usuario-button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
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
        {perfis.map((p) => (
          <Card key={p.id}>
            <CardContent className="pt-6">
              <form
                action={atualizarPerfilUsuario}
                className="grid items-end gap-4 md:grid-cols-[1fr_auto]"
              >
                <input type="hidden" name="id" value={p.id} />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
                    <Avatar nome={p.nome} src={p.avatar_url} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.email}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`role-${p.id}`}>Papel</Label>
                    <Select
                      id={`role-${p.id}`}
                      name="role"
                      defaultValue={p.role}
                    >
                      <option value="gerente">Gerente</option>
                      <option value="lider">Líder</option>
                      <option value="colaborador">Colaborador</option>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`cargo-${p.id}`}>Cargo</Label>
                    <Input
                      id={`cargo-${p.id}`}
                      name="cargo"
                      defaultValue={p.cargo ?? ""}
                      placeholder="Ex.: Analista"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`area-${p.id}`}>Área</Label>
                    <Select
                      id={`area-${p.id}`}
                      name="area_id"
                      defaultValue={p.area_id ?? ""}
                    >
                      <option value="">Sem área</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="ativo"
                      defaultChecked={p.ativo}
                      className="size-4 rounded border-input"
                    />
                    Ativo
                  </label>
                  <Button type="submit" size="sm">
                    <Save className="size-4" /> Salvar
                  </Button>
                  {p.id !== usuario.id ? (
                    <ExcluirUsuarioButton id={p.id} nome={p.nome} />
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>
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

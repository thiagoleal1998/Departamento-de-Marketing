import { redirect } from "next/navigation";
import { Network } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { GestaoAbas } from "@/features/perfis/gestao-abas";
import { SetoresEditor } from "@/features/setores/setores-editor";
import { lerMembros, type Setor } from "@/features/setores/tipos";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const dynamic = "force-dynamic";

export default async function SetoresPage() {
  const usuario = await exigirUsuario();
  if (!ehLideranca(usuario.role)) redirect("/dashboard");

  const supabase = await criarClienteServidor();
  const [setoresR, pessoasR] = await Promise.all([
    supabase.from("setores").select("id, nome, descricao, membros, ordem").order("ordem"),
    supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  const setores: Setor[] = ((setoresR.data as Setor[] | null) ?? []).map((s) => ({ ...s, membros: lerMembros(s.membros) }));

  return (
    <div className="space-y-6">
      <PageHeader titulo="Gestão" descricao="Setores do departamento, mostrados na página inicial." />
      <GestaoAbas ativa="setores" />
      <p className="text-sm text-muted-foreground">
        Estes textos aparecem na <strong>página inicial pública</strong> (antes do login): não escreva informações internas.
        {usuario.role !== "gerente" ? " Somente o gerente edita." : ""}
      </p>
      {setoresR.error ? (
        <EmptyState icone={Network} titulo="Falta rodar a migration 0093" descricao="Rode o arquivo 0093_setores.sql no SQL Editor do Supabase para liberar esta tela." />
      ) : (
        <SetoresEditor setores={setores} pessoas={(pessoasR.data as { id: string; nome: string }[] | null) ?? []} podeEditar={usuario.role === "gerente"} />
      )}
    </div>
  );
}

import { FolderOpen, Plus } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { adicionarDocumento } from "@/features/documentos/actions";
import { ListaDocumentos } from "@/features/documentos/lista-documentos";
import { CATEGORIAS_DOCUMENTO, type DocumentoCentral } from "@/features/documentos/tipos";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const usuario = await exigirUsuario();
  const lideranca = ehLideranca(usuario.role);

  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("central_documentos")
    .select("id, nome, categoria, url, notion_url")
    .order("nome")
    .limit(2000);
  const docs = (data as DocumentoCentral[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Documentos"
        descricao="Planilhas, controles, modelos e links usados pelo time de marketing."
      />

      {lideranca ? (
        <Card>
          <CardContent className="pt-6">
            <form action={adicionarDocumento} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_180px_auto]">
              <Input name="nome" placeholder="Nome do documento" required aria-label="Nome do documento" />
              <Input name="url" placeholder="Link (https://…)" required aria-label="Link" />
              <Select name="categoria" defaultValue="Documentos" aria-label="Categoria">
                {CATEGORIAS_DOCUMENTO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Button type="submit">
                <Plus className="size-4" /> Adicionar
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {docs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <FolderOpen className="size-8" />
          Nenhum documento cadastrado ainda. Rode a migration 0047 para importar os do Notion.
        </div>
      ) : (
        <ListaDocumentos docs={docs} podeEditar={lideranca} />
      )}
    </div>
  );
}

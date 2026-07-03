import { Palette, FolderOpen, CheckCircle2, Library } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { GeradorPeca } from "@/features/criacao/gerador-peca";
import { TEMPLATES } from "@/features/criacao/templates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CriacaoPage() {
  await exigirUsuario();

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Criação"
        descricao="Crie materiais de marketing a partir de modelos pré-definidos."
      />

      <Tabs defaultValue="gerar">
        <TabsList>
          <TabsTrigger value="gerar">Gerar peça</TabsTrigger>
          <TabsTrigger value="templates">Modelos</TabsTrigger>
          <TabsTrigger value="minhas">Minhas peças</TabsTrigger>
          <TabsTrigger value="aprovacoes">Aprovações</TabsTrigger>
          <TabsTrigger value="biblioteca">Biblioteca</TabsTrigger>
        </TabsList>

        <TabsContent value="gerar">
          <GeradorPeca />
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((t) => (
              <Card key={t.id}>
                <CardContent className="space-y-3 p-4">
                  <div
                    className={cn(
                      "flex h-24 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                      t.tema
                    )}
                  >
                    <Palette className="size-8 opacity-80" />
                  </div>
                  <div>
                    <p className="font-medium">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.descricao}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{t.categoria}</Badge>
                    <Badge variant="outline">{t.canal}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="minhas">
          <EmptyState
            icone={FolderOpen}
            titulo="Histórico de peças"
            descricao="As peças que você gerar ficarão salvas aqui. (Persistência conecta na próxima etapa.)"
          />
        </TabsContent>

        <TabsContent value="aprovacoes">
          <EmptyState
            icone={CheckCircle2}
            titulo="Fluxo de aprovação"
            descricao="Peças enviadas para aprovação de líderes e gerentes aparecerão aqui."
          />
        </TabsContent>

        <TabsContent value="biblioteca">
          <EmptyState
            icone={Library}
            titulo="Biblioteca de aprovados"
            descricao="Materiais aprovados ficam disponíveis para toda a equipe."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

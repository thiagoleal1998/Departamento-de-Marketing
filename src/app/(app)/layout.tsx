import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { ProgressoNavegacao } from "@/components/layout/progresso-navegacao";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { exigirUsuario } from "@/lib/auth";
import { obterConfig } from "@/lib/config";
import { contagensDoMenu } from "@/features/notificacoes/menu";
import { obterDiretorio } from "@/features/equipe/diretorio";
import { ChatFlutuante } from "@/features/chat/chat-flutuante";
import { RastreadorAtividade } from "@/features/atividade/rastreador";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await exigirUsuario();
  const [{ textos, logo }, contagens, diretorio] = await Promise.all([
    obterConfig(),
    contagensDoMenu(),
    obterDiretorio(),
  ]);
  const colegas = Array.from(diretorio.values())
    .filter((p) => p.id !== usuario.id)
    .map((p) => ({ id: p.id, nome: p.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Suspense fallback={null}>
        <ProgressoNavegacao />
      </Suspense>
      <Sidebar
        papel={usuario.role}
        nomePainel={textos.painel_nome}
        logoUrl={logo}
        contagens={contagens}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar usuario={usuario} nomePainel={textos.painel_nome} chatNaoLidas={contagens["/chat"] ?? 0} />
        <MobileNav papel={usuario.role} contagens={contagens} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      <RastreadorAtividade />
      <ChatFlutuante usuarioId={usuario.id} pessoas={colegas} naoLidas={contagens["/chat"] ?? 0} />
    </div>
  );
}

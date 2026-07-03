import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { exigirUsuario } from "@/lib/auth";
import { obterConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await exigirUsuario();
  const { textos } = await obterConfig();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar papel={usuario.role} nomePainel={textos.painel_nome} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar usuario={usuario} nomePainel={textos.painel_nome} />
        <MobileNav papel={usuario.role} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

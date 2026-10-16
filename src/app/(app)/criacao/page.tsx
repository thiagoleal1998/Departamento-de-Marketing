import { exigirUsuario } from "@/lib/auth";
import { CanvaPainel } from "@/features/criacao/canva-painel";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function CriacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ canva?: string }>;
}) {
  const usuario = await exigirUsuario();
  const { canva } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Criação"
        descricao="Crie peças no Canva com a ajuda dos assistentes de texto e de design."
      />
      <CanvaPainel userId={usuario.id} aviso={canva} />
    </div>
  );
}

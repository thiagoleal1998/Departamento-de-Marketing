import { exigirUsuario } from "@/lib/auth";
import { PerfilForm } from "@/features/perfil/perfil-form";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const usuario = await exigirUsuario();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        titulo="Meu perfil"
        descricao="Atualize seus dados e sua foto."
      />
      <PerfilForm
        nome={usuario.nome}
        cargo={usuario.cargo}
        email={usuario.email}
        papel={usuario.role}
        avatarUrl={usuario.avatar_url}
      />
    </div>
  );
}

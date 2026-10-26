import { exigirUsuario } from "@/lib/auth";
import { SenhaForm } from "@/features/perfil/senha-form";
import { PerfilForm } from "@/features/perfil/perfil-form";
import { PageHeader } from "@/components/shared/page-header";
import { unidadesDe } from "@/lib/pastas";

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
        unidades={unidadesDe(usuario.pasta_unidades)}
      />
      <SenhaForm />
    </div>
  );
}

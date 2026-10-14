import { exigirUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { SenhasCofre, type AcessoView } from "@/features/operacional/senhas-cofre";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function SenhasPage() {
  const usuario = await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("senhas_acesso")
    .select("id, servico, url, usuario, observacoes, senha_cifrada")
    .order("servico", { ascending: true });

  // A senha (mesmo cifrada) nunca vai para o client: só um indicador.
  const acessos: AcessoView[] = (
    (data ?? []) as {
      id: string;
      servico: string;
      url: string | null;
      usuario: string | null;
      observacoes: string | null;
      senha_cifrada: string | null;
    }[]
  ).map((a) => ({
    id: a.id,
    servico: a.servico,
    url: a.url,
    usuario: a.usuario,
    observacoes: a.observacoes,
    temSenha: Boolean(a.senha_cifrada),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Senhas"
        descricao="Acessos compartilhados do time. As senhas são armazenadas criptografadas; só gerentes cadastram e alteram."
      />
      <SenhasCofre acessos={acessos} ehGerente={usuario.role === "gerente"} />
    </div>
  );
}

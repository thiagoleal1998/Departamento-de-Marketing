import { exigirUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { SenhasCofre, type AcessoView } from "@/features/operacional/senhas-cofre";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

/**
 * Quem é o dono do acesso. Vem da planilha de origem, gravada nas observações
 * ("Acessos — Thiago", "Acesso antigo — Jessica"); nos acessos criados no painel, de quem cadastrou.
 */
function donoDe(observacoes: string | null, criador: string | undefined): { dono: string; donoNaPlanilha: boolean } {
  const m = observacoes?.match(/^(Acessos?(?: antigo)?)\s+—\s+(.+)$/m);
  if (m) {
    const nome = m[2].trim();
    return { dono: /antigo/i.test(m[1]) ? `${nome} (antigo)` : nome, donoNaPlanilha: true };
  }
  if (observacoes?.startsWith("Redes sociais")) return { dono: "Redes sociais", donoNaPlanilha: true };
  return { dono: criador?.split(" ")[0] ?? "Sem responsável", donoNaPlanilha: false };
}

export default async function SenhasPage() {
  const usuario = await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("senhas_acesso")
    .select("id, servico, url, usuario, observacoes, senha_cifrada, criado_por")
    .order("servico", { ascending: true });

  const { data: perfis } = await supabase.from("profiles").select("id, nome");
  const nomes = new Map(((perfis ?? []) as { id: string; nome: string }[]).map((p) => [p.id, p.nome]));

  // A senha (mesmo cifrada) nunca vai para o client: só um indicador.
  const acessos: AcessoView[] = (
    (data ?? []) as {
      id: string;
      servico: string;
      url: string | null;
      usuario: string | null;
      observacoes: string | null;
      senha_cifrada: string | null;
      criado_por: string | null;
    }[]
  ).map((a) => ({
    id: a.id,
    servico: a.servico,
    url: a.url,
    usuario: a.usuario,
    observacoes: a.observacoes,
    temSenha: Boolean(a.senha_cifrada),
    criadoPor: a.criado_por,
    ...donoDe(a.observacoes, a.criado_por ? nomes.get(a.criado_por) : undefined),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Senhas"
        descricao="Acessos compartilhados do time. As senhas são armazenadas criptografadas; cada pessoa altera e exclui as que cadastrou; o gerente mexe em todas."
      />
      <SenhasCofre acessos={acessos} ehGerente={usuario.role === "gerente"} meuId={usuario.id} />
    </div>
  );
}

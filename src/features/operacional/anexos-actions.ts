"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { BUCKET_ANEXOS, MAX_BYTES_ANEXO, TIPOS_ANEXO, type AnexoView } from "./anexos-tipos";

type Resultado = { ok?: boolean; erro?: string };
const MIGRACAO = "Os anexos ainda não foram ativados no banco (migration 0061).";
const semTabela = (c?: string) => c === "42P01" || c === "PGRST205";

async function usuario() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Endereço de envio assinado: o arquivo vai direto do navegador ao armazenamento. */
export async function prepararEnvioAnexo(
  tarefaId: string,
  nome: string,
  tipo: string,
  tamanho: number
): Promise<{ caminho?: string; token?: string; erro?: string }> {
  const { supabase, user } = await usuario();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!servicoDisponivel()) return { erro: "Envio de arquivos indisponível." };
  if (!TIPOS_ANEXO.includes(tipo)) return { erro: "Tipo de arquivo não permitido. Use imagem, PDF, Word, Excel, PowerPoint, texto ou ZIP." };
  if (tamanho > MAX_BYTES_ANEXO) return { erro: "O arquivo pode ter no máximo 20 MB." };

  // A leitura passa pela RLS: só quem enxerga o card pode anexar.
  const { data: tarefa } = await supabase.from("tarefas").select("id").eq("id", tarefaId).maybeSingle();
  if (!tarefa) return { erro: "Você não tem acesso a este card." };

  const seguro = nome.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const caminho = `${tarefaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${seguro}`;
  const { data, error } = await criarClienteAdmin().storage.from(BUCKET_ANEXOS).createSignedUploadUrl(caminho);
  if (error || !data) return { erro: "Não foi possível preparar o envio. A migration 0061 já foi aplicada?" };
  return { caminho, token: data.token };
}

/** Registra o arquivo já enviado como anexo do card. */
export async function registrarAnexo(
  tarefaId: string,
  a: { caminho: string; nome: string; tipo: string; tamanho: number }
): Promise<Resultado> {
  const { supabase, user } = await usuario();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!a.caminho.startsWith(`${tarefaId}/`)) return { erro: "Arquivo inválido." };

  const { error } = await supabase.from("tarefa_anexos").insert({
    tarefa_id: tarefaId,
    caminho: a.caminho,
    nome: a.nome.slice(0, 200),
    tipo: a.tipo,
    tamanho: a.tamanho,
    criado_por: user.id,
  });
  if (error) return { erro: semTabela(error.code) ? MIGRACAO : "Não foi possível anexar o arquivo." };
  return { ok: true };
}

/** Anexos do card, com links temporários para abrir/baixar. */
export async function listarAnexos(tarefaId: string): Promise<{ itens: AnexoView[]; indisponivel?: boolean }> {
  const { supabase, user } = await usuario();
  if (!user) return { itens: [] };

  const { data, error } = await supabase
    .from("tarefa_anexos")
    .select("id, caminho, nome, tipo, tamanho, criado_por, created_at")
    .eq("tarefa_id", tarefaId)
    .order("created_at", { ascending: false });
  if (error) return { itens: [], indisponivel: semTabela(error.code) };

  const linhas = (data ?? []) as {
    id: string;
    caminho: string;
    nome: string;
    tipo: string | null;
    tamanho: number | null;
    criado_por: string | null;
    created_at: string;
  }[];

  const urls = new Map<string, string>();
  const nomes = new Map<string, string>();
  let lideranca = false;
  if (servicoDisponivel() && linhas.length > 0) {
    const admin = criarClienteAdmin();
    const { data: assinadas } = await admin.storage.from(BUCKET_ANEXOS).createSignedUrls(
      linhas.map((l) => l.caminho),
      3600
    );
    for (const s of assinadas ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);

    const ids = Array.from(new Set(linhas.map((l) => l.criado_por).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: ps } = await admin.from("profiles").select("id, nome").in("id", ids);
      for (const p of (ps ?? []) as { id: string; nome: string }[]) nomes.set(p.id, p.nome);
    }
  }
  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const papel = (eu as { role: string } | null)?.role;
  lideranca = papel === "gerente" || papel === "lider";

  return {
    itens: linhas.map((l) => ({
      id: l.id,
      nome: l.nome,
      tipo: l.tipo,
      tamanho: l.tamanho,
      url: urls.get(l.caminho) ?? null,
      ehImagem: (l.tipo ?? "").startsWith("image/"),
      criadoPorNome: l.criado_por ? nomes.get(l.criado_por) ?? null : null,
      criadoEm: l.created_at,
      podeExcluir: lideranca || l.criado_por === user.id,
    })),
  };
}

/** Remove o anexo (quem anexou ou a liderança). */
export async function removerAnexo(id: string): Promise<Resultado> {
  const { supabase, user } = await usuario();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const { data: linha } = await supabase.from("tarefa_anexos").select("caminho").eq("id", id).maybeSingle();
  if (!linha) return { erro: "Anexo não encontrado." };

  const { data, error } = await supabase.from("tarefa_anexos").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) return { erro: "Só quem anexou ou a liderança pode remover." };

  if (servicoDisponivel()) {
    await criarClienteAdmin().storage.from(BUCKET_ANEXOS).remove([(linha as { caminho: string }).caminho]);
  }
  return { ok: true };
}

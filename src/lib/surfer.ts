import "server-only";

const API = "https://app.surferseo.com/api/v2";
const WORKSPACE_PADRAO = 1209274;

export type EditorSurfer = {
  id: number;
  main_keyword: string;
  location: string;
  state: string;
  inserted_at: string;
  updated_at?: string;
  content_score: { total: number | null; seo: number | null; ai_search: number | null };
};

type RespostaEditores = {
  data?: EditorSurfer[];
  meta?: { total?: number; total_pages?: number };
};

export function surferConfigurado(): boolean {
  return Boolean(process.env.SURFER_API_KEY?.trim());
}

export function workspaceSurfer(): number {
  const id = Number(process.env.SURFER_WORKSPACE_ID ?? WORKSPACE_PADRAO);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("O ID do workspace do Surfer é inválido.");
  return id;
}

/** Leitura sob demanda dos Content Editors. A chave nunca é enviada ao navegador. */
export async function listarEditoresSurfer(): Promise<{ editores: EditorSurfer[]; total: number; consultadoEm: string }> {
  const chave = process.env.SURFER_API_KEY?.trim();
  if (!chave) throw new Error("A chave da API do Surfer ainda não foi configurada.");

  const editores: EditorSurfer[] = [];
  let total = 0;
  for (let pagina = 1; pagina <= 10; pagina++) {
    const url = new URL(`${API}/workspaces/${workspaceSurfer()}/content_editors`);
    url.searchParams.set("page", String(pagina));
    url.searchParams.set("page_size", "100");
    const resposta = await fetch(url, {
      headers: { "API-KEY": chave, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (resposta.status === 401 || resposta.status === 403) {
      throw new Error("O Surfer recusou a chave ou o plano não permite acesso à API.");
    }
    if (resposta.status === 429) throw new Error("O Surfer limitou as consultas. Tente novamente em alguns minutos.");
    if (!resposta.ok) throw new Error(`Não foi possível consultar o Surfer (HTTP ${resposta.status}).`);

    const dados = (await resposta.json()) as RespostaEditores;
    if (!Array.isArray(dados.data)) throw new Error("O Surfer retornou um formato de dados inesperado.");
    editores.push(...dados.data);
    total = dados.meta?.total ?? editores.length;
    if (pagina >= (dados.meta?.total_pages ?? 1)) break;
  }
  return { editores, total, consultadoEm: new Date().toISOString() };
}

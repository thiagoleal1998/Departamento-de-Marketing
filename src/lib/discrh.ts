import "server-only";

const BASE = "https://discrh.com.br/api/v1";

export function discRhConfigurado(): boolean {
  return Boolean(process.env.DISCRH_API_KEY);
}

export interface DiscParticipante {
  id: string;
  name?: string | null;
  email: string;
  status: string;
  completedAt?: string | null;
  discProfile?: {
    dominant?: string | null;
    secondary?: string | null;
    scores?: { d?: number; i?: number; s?: number; c?: number };
  } | null;
}

export interface DiscPesquisa {
  id: string;
  name: string;
}

async function get<T>(caminho: string): Promise<T> {
  const res = await fetch(`${BASE}${caminho}`, {
    headers: { Authorization: `Bearer ${process.env.DISCRH_API_KEY}` },
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("Chave da DISC RH inválida ou expirada.");
  if (res.status === 403) throw new Error("A chave da DISC RH não tem permissão de leitura.");
  if (res.status === 429) throw new Error("Limite de requisições da DISC RH atingido. Tente mais tarde.");
  if (!res.ok) throw new Error(`DISC RH respondeu ${res.status}.`);
  return (await res.json()) as T;
}

interface Pagina {
  pagination?: { page: number; totalPages: number };
}

async function todasPaginas<T>(
  caminho: string,
  campo: string
): Promise<T[]> {
  const itens: T[] = [];
  const sep = caminho.includes("?") ? "&" : "?";
  for (let pagina = 1; pagina <= 50; pagina++) {
    const r = await get<Pagina & Record<string, unknown>>(
      `${caminho}${sep}page=${pagina}&limit=100`
    );
    itens.push(...((r[campo] as T[] | undefined) ?? []));
    if (!r.pagination || pagina >= r.pagination.totalPages) break;
  }
  return itens;
}

export const listarPesquisas = () =>
  todasPaginas<DiscPesquisa>("/surveys", "surveys");

export const listarConcluidos = (pesquisaId: string) =>
  todasPaginas<DiscParticipante>(
    `/surveys/${encodeURIComponent(pesquisaId)}/participants?status=completed`,
    "participants"
  );

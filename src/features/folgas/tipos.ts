export const TIPOS_FOLGA = {
  tre: "Folga TRE",
  compensacao: "Compensação (banco de horas)",
  abono: "Abono",
  outro: "Outro motivo",
} as const;

export type TipoFolga = keyof typeof TIPOS_FOLGA;
export const CHAVES_TIPO = Object.keys(TIPOS_FOLGA) as TipoFolga[];
export const ehTipoFolga = (v: string): v is TipoFolga => v in TIPOS_FOLGA;
export const rotuloTipo = (v: string) => (ehTipoFolga(v) ? TIPOS_FOLGA[v] : "Folga");

/** Funções de quem autoriza a folga, na ordem em que aparecem no formulário. */
export const FUNCOES_AUTORIZACAO = ["Supervisão", "Liderança operacional", "Gerência", "RH"] as const;

/** Pessoas do RH que autorizam folgas (não usam o painel: entram pelo nome, não por perfil). */
export const PESSOAS_RH = ["Raquel Sampaio", "Luiza Zanelatto", "Rayane Gomes"] as const;

/** Quem autorizou: uma pessoa do painel (profile_id) ou, no RH, o nome da pessoa. */
export interface Autorizacao {
  funcao: string;
  profile_id?: string;
  nome?: string;
}

/** Valor que identifica a escolha no formulário (perfil ou nome do RH). */
export const valorAutorizacao = (a: Autorizacao) => a.nome ?? a.profile_id ?? "";

/** Nome a mostrar de quem autorizou. */
export const nomeAutorizador = (a: Autorizacao, nomes: Map<string, string>) => a.nome ?? (a.profile_id ? nomes.get(a.profile_id) : undefined) ?? "—";

export interface Folga {
  id: string;
  profile_id: string;
  tipo: string;
  inicio: string; // yyyy-mm-dd
  fim: string; // yyyy-mm-dd
  /** Dia em que volta ao trabalho. */
  retorno: string | null;
  justificativa: string | null;
  autorizacoes: Autorizacao[];
  equipe_avisada_em: string | null;
}

/** Ausência já avisada ao time: sem justificativa nem autorizações. */
export interface AusenciaTime {
  id: string;
  profile_id: string;
  tipo: string;
  inicio: string;
  fim: string;
  retorno: string | null;
}

const utc = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
};

export const diasDeFolga = (f: { inicio: string; fim: string }) => Math.round((utc(f.fim) - utc(f.inicio)) / 86_400_000) + 1;

const dm = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

/** "03/12", "03/12 e 04/12" ou "03/12 a 06/12" (com o ano só se o período atravessa anos). */
export function textoPeriodo(f: { inicio: string; fim: string }): string {
  if (f.inicio === f.fim) return dm(f.inicio);
  const n = diasDeFolga(f);
  const ano = f.inicio.slice(0, 4) !== f.fim.slice(0, 4);
  const a = ano ? `${dm(f.inicio)}/${f.inicio.slice(0, 4)}` : dm(f.inicio);
  const b = ano ? `${dm(f.fim)}/${f.fim.slice(0, 4)}` : dm(f.fim);
  return n === 2 ? `${a} e ${b}` : `${a} a ${b}`;
}

/** Dia seguinte ao último dia, pulando sábado e domingo (feriados não entram: a liderança ajusta se precisar). */
export function proximoDiaUtil(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + 1));
  while (dt.getUTCDay() === 0 || dt.getUTCDay() === 6) dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

/** "dd/mm" do retorno (com o ano se for outro ano que o do último dia). */
export function textoRetorno(f: { fim: string; retorno: string | null }): string {
  if (!f.retorno) return "";
  return f.retorno.slice(0, 4) === f.fim.slice(0, 4) ? dm(f.retorno) : `${dm(f.retorno)}/${f.retorno.slice(0, 4)}`;
}

/** Tolera o que vem do banco (jsonb). */
export function lerAutorizacoes(v: unknown): Autorizacao[] {
  if (!Array.isArray(v)) return [];
  const saida: Autorizacao[] = [];
  for (const x of v) {
    const a = x as Partial<Autorizacao> | null;
    if (!a || typeof a.funcao !== "string") continue;
    if (typeof a.nome === "string" && a.nome) saida.push({ funcao: a.funcao.slice(0, 60), nome: a.nome.slice(0, 80) });
    else if (typeof a.profile_id === "string" && a.profile_id) saida.push({ funcao: a.funcao.slice(0, 60), profile_id: a.profile_id });
  }
  return saida;
}

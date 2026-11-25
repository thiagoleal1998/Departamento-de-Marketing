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

export interface Autorizacao {
  funcao: string;
  profile_id: string;
}

export interface Folga {
  id: string;
  profile_id: string;
  tipo: string;
  inicio: string; // yyyy-mm-dd
  fim: string; // yyyy-mm-dd
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

/** Tolera o que vem do banco (jsonb). */
export function lerAutorizacoes(v: unknown): Autorizacao[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((a): a is Autorizacao => !!a && typeof (a as Autorizacao).funcao === "string" && typeof (a as Autorizacao).profile_id === "string")
    .map((a) => ({ funcao: a.funcao.slice(0, 60), profile_id: a.profile_id }));
}

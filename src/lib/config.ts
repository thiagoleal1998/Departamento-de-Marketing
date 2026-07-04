import { criarClientePublico } from "@/lib/supabase/public";
import { supabaseConfigurado } from "@/lib/supabase/env";

/** Textos editáveis da interface (login, portal e painel). */
export interface TextosConfig {
  painel_nome: string;
  login_titulo: string;
  login_subtitulo: string;
  portal_titulo: string;
  portal_subtitulo: string;
  portal_descricao: string;
  portal_form_titulo: string;
}

export interface ConfigSistema {
  cor: string;
  logo: string | null;
  departamentos: string[];
  segmentos: string[];
  textos: TextosConfig;
}

/** Segmentos / público-alvo (padrão). */
export const SEGMENTOS_PADRAO: string[] = [
  "B2C (Contempla todos os B2C)",
  "B2C - Repeaters",
  "B2B (Contempla os três segmentos repeaters)",
  "B2B - Agências",
  "B2B - Agentes",
  "B2B - Promotores",
  "Interno - Toda a empresa",
  "Interno - Reservas",
  "Interno - Back Office",
];

/** Departamentos/setores solicitantes (padrão, em ordem alfabética). */
export const DEPARTAMENTOS_PADRAO: string[] = [
  "Administrativo",
  "Business Intelligence (BI)",
  "Comercial Internacional",
  "Comercial Nacional",
  "Financeiro",
  "Grupos",
  "Infraestrutura",
  "Operações",
  "Promotor",
  "Recursos Humanos (RH)",
  "Reservas",
  "Sistemas",
  "Transportes",
];

export const TEXTOS_PADRAO: TextosConfig = {
  painel_nome: "Painel de Marketing",
  login_titulo: "Painel do Departamento de Marketing",
  login_subtitulo: "Gestão, criação, operação e desenvolvimento do time.",
  portal_titulo: "Central de Solicitações do Marketing",
  portal_subtitulo:
    "Precisa de uma arte, um material ou uma campanha? Abra um chamado.",
  portal_descricao:
    "Envie sua solicitação para o time de marketing. Você recebe um número de acompanhamento e a nossa equipe cuida do resto.",
  portal_form_titulo: "Abrir um chamado",
};

export const COR_PADRAO = "#4f46e5";

/** Rótulos amigáveis para o editor de textos. */
export const TEXTOS_LABELS: Record<keyof TextosConfig, string> = {
  painel_nome: "Nome do painel (menu lateral)",
  login_titulo: "Título da tela de login",
  login_subtitulo: "Subtítulo da tela de login",
  portal_titulo: "Título do portal público",
  portal_subtitulo: "Subtítulo do portal público",
  portal_descricao: "Descrição do portal público",
  portal_form_titulo: "Título do formulário de chamado",
};

/** Lê a configuração (marca) de forma tolerante — retorna defaults se faltar. */
export async function obterConfig(): Promise<ConfigSistema> {
  if (!supabaseConfigurado()) {
    return {
      cor: COR_PADRAO,
      logo: null,
      departamentos: DEPARTAMENTOS_PADRAO,
      segmentos: SEGMENTOS_PADRAO,
      textos: TEXTOS_PADRAO,
    };
  }
  try {
    const supabase = criarClientePublico();
    const { data } = await supabase
      .from("config_sistema")
      .select("cor_primaria, textos")
      .eq("id", true)
      .single();

    // Logo e listas (departamentos, segmentos) ficam dentro do jsonb `textos`
    // para não exigir alteração de schema.
    const raw = (data?.textos ?? {}) as Partial<TextosConfig> & {
      logo_url?: string | null;
      departamentos?: string[];
      segmentos?: string[];
    };
    const { logo_url, departamentos, segmentos, ...textosDb } = raw;
    return {
      cor: data?.cor_primaria || COR_PADRAO,
      logo: logo_url ?? null,
      departamentos:
        Array.isArray(departamentos) && departamentos.length > 0
          ? departamentos
          : DEPARTAMENTOS_PADRAO,
      segmentos:
        Array.isArray(segmentos) && segmentos.length > 0
          ? segmentos
          : SEGMENTOS_PADRAO,
      textos: { ...TEXTOS_PADRAO, ...textosDb },
    };
  } catch {
    return {
      cor: COR_PADRAO,
      logo: null,
      departamentos: DEPARTAMENTOS_PADRAO,
      segmentos: SEGMENTOS_PADRAO,
      textos: TEXTOS_PADRAO,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Conversão de cor HEX -> HSL (para as CSS variables do tema)         */
/* ------------------------------------------------------------------ */
function hexParaHsl(hex: string): { h: number; s: number; l: number } {
  let limpo = hex.replace("#", "").trim();
  if (limpo.length === 3) {
    limpo = limpo
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(limpo.slice(0, 2), 16) / 255;
  const g = parseInt(limpo.slice(2, 4), 16) / 255;
  const b = parseInt(limpo.slice(4, 6), 16) / 255;
  if ([r, g, b].some((v) => Number.isNaN(v))) return { h: 243, s: 75, l: 59 };

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/** Gera o CSS que sobrescreve as variáveis de tema com a cor escolhida. */
export function estiloDeCor(hex: string): string {
  const { h, s } = hexParaHsl(hex);
  const primaria = `${h} ${s}% 59%`;
  const anel = `${h} ${s}% 59%`;
  return `:root{--primary:${primaria};--ring:${anel};--accent:${h} ${s}% 96%;--accent-foreground:${h} ${s}% 35%;}.dark{--primary:${h} ${s}% 66%;--ring:${h} ${s}% 66%;--accent:${h} 40% 22%;--accent-foreground:${h} ${s}% 85%;}`;
}

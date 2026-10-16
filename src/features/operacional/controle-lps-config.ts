/** Abas (versões) do controle e a ordem das colunas, como na planilha. */
export const ABAS_CONTROLE: { chave: string; rotulo: string; colunas: string[] }[] = [
  {
    chave: "LP´s",
    rotulo: "LP´s",
    colunas: [
      "Segmento",
      "Automação - E-mail de boas-vidas",
      "Quantidade de colunas",
      "Asksuite",
      "Letalk",
      "Motor de busca B2C",
      "Imagem Whatsapp",
      "Vídeos Wpp",
      "Está aparecendo imagem e texto no link que enviamos no wpp?",
      "Segmentação WPP",
      "Segmentação Contato",
      "Segmentação Pop Up",
      "Capa do Youtube",
      "Pop Up de Saída",
      "Indexação",
      "SEO Imagens",
      "SEO Quack",
      "RANK Ranger",
      "PageSpeed Insights Desktop",
      "PageSpeed Insights Mobile",
      "Página no site LV",
      "Checkout Site",
      "Revisão GPT",
      "Campos personalizados <> Formulário LP",
      "Vídeo na Home",
      "FAQS",
      "Logo na LP",
      "Regime de pensão",
    ],
  },
  {
    chave: "Automações RD",
    rotulo: "Automações RD",
    colunas: [
      "Automação Formulário",
      "Automação AskSuite",
      "Automação Grupos",
      "Automação Quase Lá",
    ],
  },
  {
    chave: "Formulário Grupos",
    rotulo: "Formulário Grupos",
    colunas: [
      "Email de boas-vidas de grupos",
      "Automação",
      "Segmentação Grupos",
    ],
  },
  {
    chave: "Epic Pages",
    rotulo: "Epic Pages",
    colunas: [
      "Automação",
      "Huggy",
      "Imagem Whatsapp",
      "Segmentação WPP",
      "Segmentação Contato",
      "Segmentação Pop Up",
      "Capa do Youtube",
      "Pop Up de Saída",
      "Indexação",
      "SEO Imagens",
      "SEO Quake",
      "Ranger",
      "PageSpeed Insights Desktop",
      "PageSpeed Insights Mobile",
      "Página no site LV",
      "Checkout Site",
      "Revisão Redator",
      "Campos personalizados <> Formulário LP",
    ],
  },
];

export type TomCelula = "ok" | "andamento" | "pendente" | "nao_se_aplica" | "neutro";

const OK = ["concluido", "feito", "sim", "indexado", "instalado", "ok"];
const ANDAMENTO = ["em andamento", "parcial"];
const PENDENTE = ["nao", "nao concluido", "nao feito", "nao instalado", "desativado"];

const norm = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/** Cor da célula conforme o valor (status ou nota do PageSpeed). */
export function tomDe(coluna: string, valor: string): TomCelula {
  const n = norm(valor);
  if (!n) return "neutro";
  if (OK.includes(n)) return "ok";
  if (ANDAMENTO.includes(n)) return "andamento";
  if (PENDENTE.includes(n)) return "pendente";
  if (n === "nao se aplica") return "nao_se_aplica";
  if (/pagespeed/i.test(coluna) && /^\d+$/.test(n)) {
    const nota = parseInt(n, 10);
    return nota >= 90 ? "ok" : nota >= 50 ? "andamento" : "pendente";
  }
  return "neutro";
}

/** Valores sugeridos ao editar uma célula. */
export const SUGESTOES_VALOR = [
  "Concluído",
  "Em Andamento",
  "Não Concluído",
  "Não se aplica",
  "Feito",
  "Não Feito",
  "Sim",
  "Não",
];

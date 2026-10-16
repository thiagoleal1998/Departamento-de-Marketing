"use server";

import { Type, type Content, type FunctionDeclaration } from "@google/genai";
import { MODELO_IA, iaDisponivel, obterClienteIA } from "@/lib/ai/gemini";
import { canvaFetch } from "@/lib/canva";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  exportarDesign,
  iniciarCriacao,
  organizarEmPasta,
  redimensionarDesign,
  statusJob,
  type Job,
  type ResultadoJob,
} from "./canva-briefing-actions";

export type MensagemAgente = { papel: "usuario" | "agente"; texto: string };
export type LinkAgente = { rotulo: string; url: string };
export type RespostaAgente = {
  texto: string;
  links: LinkAgente[];
  erro?: string;
};

const SISTEMA = `Você é o assistente de criação do departamento de Marketing da LV Resorts (resorts all inclusive).
Fala português do Brasil, tom acolhedor e objetivo.
Ajuda de duas formas: (1) escrevendo textos de marketing (títulos, legendas, CTAs, e-mails) e (2) comandando o Canva por ferramentas.
Regras:
- Se faltar informação essencial para criar uma peça (formato, campanha, mensagem), pergunte antes de agir.
- Ao criar algo no Canva, use as ferramentas e depois conte o que foi feito, sem inventar links: os links já aparecem para a pessoa.
- Formatos disponíveis: story, feed, quadrado, banner, email (telas em branco no tamanho certo) e presentation, doc (gerados pela IA do Canva).
- Telas em branco não têm texto: entregue os textos prontos na conversa para a pessoa colar no Canva.
- Nunca invente preços, datas ou condições comerciais; use só o que a pessoa informar.`;

const FERRAMENTAS: FunctionDeclaration[] = [
  {
    name: "criar_design",
    description:
      "Cria um design no Canva. Formatos em branco: story, feed, quadrado, banner, email. Gerados pela IA do Canva: presentation, doc.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        formato: { type: Type.STRING },
        titulo: { type: Type.STRING },
        campanha: {
          type: Type.STRING,
          description: "Nome da campanha; vira uma pasta no Canva.",
        },
        publico: { type: Type.STRING },
        tom: { type: Type.STRING },
        oferta: { type: Type.STRING },
        texto: { type: Type.STRING, description: "Textos obrigatórios." },
        visual: { type: Type.STRING, description: "Direção visual." },
      },
      required: ["formato"],
    },
  },
  {
    name: "exportar_design",
    description: "Exporta um design em png ou pdf e devolve o link de download.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        design_id: { type: Type.STRING },
        formato: { type: Type.STRING, description: "png ou pdf" },
      },
      required: ["design_id", "formato"],
    },
  },
  {
    name: "redimensionar_design",
    description:
      "Cria uma cópia do design em outro formato: story, feed, quadrado, banner ou email.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        design_id: { type: Type.STRING },
        formato: { type: Type.STRING },
      },
      required: ["design_id", "formato"],
    },
  },
  {
    name: "listar_designs",
    description: "Lista os 10 designs mais recentes da pessoa no Canva.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
];

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function aguardar(job: Job): Promise<ResultadoJob> {
  for (let i = 0; i < 16; i++) {
    await espera(3000);
    const r = await statusJob(job);
    if (r.status !== "in_progress") return r;
  }
  return { status: "failed", erro: "Ainda em processamento no Canva." };
}

async function executar(
  nome: string,
  args: Record<string, unknown>,
  links: LinkAgente[]
): Promise<Record<string, unknown>> {
  const s = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : "");

  if (nome === "criar_design") {
    const form = new FormData();
    for (const k of ["formato", "titulo", "campanha", "publico", "tom", "oferta", "texto", "visual"]) {
      form.set(k, s(k));
    }
    const ini = await iniciarCriacao(form);
    if (ini.erro) return { erro: ini.erro };
    let design = ini.design;
    if (ini.job) {
      const r = await aguardar(ini.job);
      if (r.status !== "success" || !r.design) {
        return { erro: r.erro ?? "O Canva não concluiu a geração." };
      }
      design = r.design;
    }
    if (!design) return { erro: "Nenhum design retornado." };
    let pasta = "";
    if (s("campanha").trim()) {
      const o = await organizarEmPasta(design.id, s("campanha"));
      pasta = o.erro ? `pasta falhou: ${o.erro}` : `na pasta ${s("campanha")}`;
    }
    links.push({ rotulo: design.titulo || "Abrir no Canva", url: design.url });
    return { ok: true, design_id: design.id, titulo: design.titulo, pasta };
  }

  if (nome === "exportar_design") {
    const fmt = s("formato") === "pdf" ? "pdf" : "png";
    const ini = await exportarDesign(s("design_id"), fmt);
    if (ini.erro || !ini.job) return { erro: ini.erro ?? "Falha ao exportar." };
    const r = await aguardar(ini.job);
    if (r.status !== "success") return { erro: r.erro ?? "Exportação não concluída." };
    (r.urls ?? []).forEach((u, i) =>
      links.push({ rotulo: `Baixar ${fmt.toUpperCase()} ${i + 1} (24h)`, url: u })
    );
    return { ok: true, arquivos: r.urls?.length ?? 0 };
  }

  if (nome === "redimensionar_design") {
    const ini = await redimensionarDesign(s("design_id"), s("formato"));
    if (ini.erro || !ini.job) return { erro: ini.erro ?? "Falha ao redimensionar." };
    const r = await aguardar(ini.job);
    if (r.status !== "success" || !r.design) {
      return { erro: r.erro ?? "Redimensionamento não concluído." };
    }
    links.push({ rotulo: r.design.titulo || "Cópia redimensionada", url: r.design.url });
    return { ok: true, design_id: r.design.id };
  }

  if (nome === "listar_designs") {
    const supabase = await criarClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { erro: "Sessão expirada." };
    const r = await canvaFetch<{
      items: { id: string; title?: string; urls?: { edit_url?: string } }[];
    }>(user.id, "/designs?limit=10&sort_by=modified_descending");
    if (r.erro || !r.dados) return { erro: r.erro };
    return {
      designs: r.dados.items.map((d) => ({ id: d.id, titulo: d.title ?? "Sem título" })),
    };
  }

  return { erro: `Ferramenta desconhecida: ${nome}` };
}

export async function conversarAgente(
  historico: MensagemAgente[]
): Promise<RespostaAgente> {
  const links: LinkAgente[] = [];
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { texto: "", links, erro: "Sessão expirada. Entre novamente." };

  const ia = obterClienteIA();
  if (!iaDisponivel() || !ia) {
    return {
      texto: "",
      links,
      erro: "A IA ainda não foi ativada (falta a chave GEMINI_API_KEY no servidor).",
    };
  }

  const contents: Content[] = historico.slice(-20).map((m) => ({
    role: m.papel === "usuario" ? "user" : "model",
    parts: [{ text: m.texto }],
  }));

  try {
    for (let passo = 0; passo < 5; passo++) {
      const res = await ia.models.generateContent({
        model: MODELO_IA,
        contents,
        config: {
          systemInstruction: SISTEMA,
          tools: [{ functionDeclarations: FERRAMENTAS }],
        },
      });

      const chamadas = res.functionCalls ?? [];
      if (chamadas.length === 0) {
        return { texto: res.text ?? "", links };
      }

      contents.push({
        role: "model",
        parts: chamadas.map((c) => ({ functionCall: c })),
      });
      const respostas = [];
      for (const c of chamadas) {
        const resultado = await executar(c.name ?? "", c.args ?? {}, links);
        respostas.push({
          functionResponse: { name: c.name ?? "", response: resultado },
        });
      }
      contents.push({ role: "user", parts: respostas });
    }
    return { texto: "Não consegui concluir o pedido. Pode reformular?", links };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const limite = /429|quota|RESOURCE_EXHAUSTED/i.test(msg);
    return {
      texto: "",
      links,
      erro: limite
        ? "Limite gratuito da IA atingido por agora. Tente novamente em alguns minutos."
        : "A IA não respondeu. Tente novamente.",
    };
  }
}

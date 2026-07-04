"use server";

import { obterClienteIA, iaDisponivel, MODELO_IA } from "@/lib/ai/anthropic";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ETAPAS_FEEDBACK, FRASE_GUIA, MOMENTO_OPCOES } from "./roteiro-config";
import type {
  DadosRoteiro,
  ResultadoPlano,
  RespostaAnalise,
  RespostaPlano,
} from "./ai-types";

const MSG_SEM_CHAVE =
  "A IA ainda não está configurada. Peça para adicionar a chave ANTHROPIC_API_KEY no arquivo .env.local para ativar o assistente.";

const MSG_ERRO =
  "Não consegui falar com a IA agora. Tente novamente em instantes.";

/** Garante que apenas quem está logado use as funções de IA. */
async function autenticado(): Promise<boolean> {
  try {
    const supabase = await criarClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

/** Monta um texto legível do roteiro para enviar à IA. */
function textoDoRoteiro(dados: DadosRoteiro): string {
  const linhas: string[] = [];
  for (const etapa of ETAPAS_FEEDBACK) {
    const campos = etapa.campos
      .filter((c) => c.tipo !== "checkbox")
      .map((c) => ({ label: c.label, valor: (dados[String(c.chave)] ?? "").trim() }))
      .filter((c) => c.valor);
    if (campos.length === 0) continue;
    linhas.push(`## ${etapa.titulo}`);
    for (const c of campos) linhas.push(`- ${c.label}: ${c.valor}`);
  }
  return linhas.join("\n");
}

function rotuloMomento(dados: DadosRoteiro): string {
  const op = MOMENTO_OPCOES.find((m) => m.valor === dados.momento);
  return op ? op.titulo.toLowerCase() : "antes da conversa";
}

const CONTEXTO_METODO = `Você é um assistente de comunicação para líderes que conduzem conversas de feedback de desenvolvimento no departamento de marketing.

Princípio central: "${FRASE_GUIA}" O valor real está em lidar com a percepção da pessoa e ajudá-la a mudar a ação — nunca em convencer ou julgar.

Boas práticas que você defende:
- Fatos observados e exemplos concretos, sem interpretações ou rótulos.
- Reconhecer o positivo de forma específica antes das melhorias.
- Clareza sobre o que se espera e por quê (impacto ampliado + benefício pessoal).
- Escuta ativa, regulação emocional e checagem de entendimento.
- Construir a solução junto com a pessoa e fechar transmitindo confiança.
Responda sempre em português (pt-BR), com tom acolhedor, direto e prático.`;

/**
 * Analisa o que o líder escreveu e diz se está claro ou confuso,
 * sugerindo ajustes de comunicação. Retorna markdown curto.
 */
export async function analisarComunicacao(
  dados: DadosRoteiro
): Promise<RespostaAnalise> {
  if (!(await autenticado())) return { ok: false, erro: MSG_ERRO };
  if (!iaDisponivel()) return { ok: false, erro: MSG_SEM_CHAVE };

  const roteiro = textoDoRoteiro(dados);
  if (!roteiro.trim()) {
    return {
      ok: false,
      erro: "Escreva algumas anotações no roteiro antes de pedir a análise.",
    };
  }

  const cliente = obterClienteIA();
  if (!cliente) return { ok: false, erro: MSG_SEM_CHAVE };

  const momento = rotuloMomento(dados);

  try {
    const resposta = await cliente.messages.create({
      model: MODELO_IA,
      max_tokens: 1600,
      system: CONTEXTO_METODO,
      messages: [
        {
          role: "user",
          content: `O líder está preparando esta conversa ${momento}. Abaixo está o rascunho do roteiro dele.

Sua tarefa: avaliar se a comunicação está clara ou confusa e ajudar a ajustar. Seja breve e útil.

Responda em markdown, exatamente nesta estrutura:

**Avaliação geral:** (uma frase — está claro, precisa de atenção, ou está confuso e por quê)

**O que já está bom:**
- (1 a 3 pontos)

**Sugestões de ajuste:**
- (para cada trecho confuso, aponte a etapa e sugira uma forma mais clara, específica ou acolhedora de dizer. Se um exemplo reescrito ajudar, mostre entre aspas.)

Não invente informações que não estão no roteiro. Se algo importante estiver faltando (ex.: fatos concretos, benefício pessoal), aponte de forma gentil.

Roteiro:
${roteiro}`,
        },
      ],
    });

    const texto = resposta.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    if (!texto) return { ok: false, erro: MSG_ERRO };
    return { ok: true, texto };
  } catch {
    return { ok: false, erro: MSG_ERRO };
  }
}

const SCHEMA_PLANO = {
  type: "object",
  additionalProperties: false,
  properties: {
    resumo: {
      type: "string",
      description: "Resumo curto e acolhedor do que foi conversado e combinado.",
    },
    resultado_esperado: {
      type: "string",
      description: "O que estará diferente e como saberemos que evoluiu.",
    },
    plano_acao: {
      type: "array",
      description: "Ações concretas, de preferência propostas pela própria pessoa.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          acao: { type: "string" },
          prazo_sugestao: {
            type: "string",
            description: "Sugestão de prazo em linguagem natural (ex.: 'em 2 semanas').",
          },
        },
        required: ["acao", "prazo_sugestao"],
      },
    },
    pontos_acompanhamento: {
      type: "array",
      description: "O que o líder deve observar até a próxima conversa.",
      items: { type: "string" },
    },
    proxima_conversa_sugestao: {
      type: "string",
      description: "Sugestão de quando e sobre o que deve ser a próxima conversa.",
    },
  },
  required: [
    "resumo",
    "resultado_esperado",
    "plano_acao",
    "pontos_acompanhamento",
    "proxima_conversa_sugestao",
  ],
} as const;

/**
 * Gera um resultado da conversa: resumo, plano de ação, pontos de
 * acompanhamento e sugestão de próxima conversa — a partir do roteiro.
 */
export async function gerarResumoEPlano(
  dados: DadosRoteiro
): Promise<RespostaPlano> {
  if (!(await autenticado())) return { ok: false, erro: MSG_ERRO };
  if (!iaDisponivel()) return { ok: false, erro: MSG_SEM_CHAVE };

  const roteiro = textoDoRoteiro(dados);
  if (!roteiro.trim()) {
    return {
      ok: false,
      erro: "Preencha o roteiro antes de gerar o plano de ação.",
    };
  }

  const cliente = obterClienteIA();
  if (!cliente) return { ok: false, erro: MSG_SEM_CHAVE };

  const momento = rotuloMomento(dados);

  try {
    const resposta = await cliente.messages.create({
      model: MODELO_IA,
      max_tokens: 2000,
      system: CONTEXTO_METODO,
      output_config: { format: { type: "json_schema", schema: SCHEMA_PLANO } },
      messages: [
        {
          role: "user",
          content: `Com base no roteiro de feedback abaixo (preenchido ${momento}), gere um resultado da conversa que ajude no plano de ação.

Regras:
- Baseie-se apenas no que está no roteiro; não invente fatos.
- As ações devem ser concretas e, sempre que possível, refletir o que a própria pessoa propôs.
- Tom acolhedor e orientado ao desenvolvimento.

Roteiro:
${roteiro}`,
        },
      ],
    });

    const texto = resposta.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    if (!texto) return { ok: false, erro: MSG_ERRO };

    const plano = JSON.parse(texto) as ResultadoPlano;
    return { ok: true, plano };
  } catch {
    return { ok: false, erro: MSG_ERRO };
  }
}

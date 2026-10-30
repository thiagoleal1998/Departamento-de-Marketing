import "server-only";
import { createHash } from "node:crypto";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";
import { lerProdutos } from "./parser";
import { sincronizarSazonais } from "./sazonal";
import { sincronizarStatusLps } from "./lps-sync";
import {
  PLANILHA_ID,
  type CampoProduto,
  type MudancaCampo,
  type ProdutoComercial,
} from "./tipos";

const EXPORTACAO = `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/export?format=xlsx`;

async function baixarPlanilha(): Promise<Buffer> {
  const res = await fetch(EXPORTACAO, { cache: "no-store", redirect: "follow" });
  if (!res.ok) {
    throw new Error(
      `Não foi possível ler a planilha (HTTP ${res.status}). Ela precisa estar compartilhada por link.`
    );
  }
  return Buffer.from(await res.arrayBuffer());
}

const normLinha = (s: string) => s.replace(/\s+/g, " ").trim();

const hashDe = (p: Pick<ProdutoComercial, "nome" | "tag" | "campos">) =>
  createHash("sha1")
    .update(JSON.stringify({ n: p.nome, t: p.tag, c: p.campos }))
    .digest("hex");

/** Diferenças (só de texto) entre o que havia e o que está agora. */
function compararCampos(
  antes: CampoProduto[],
  depois: CampoProduto[],
  tagAntes: string | null,
  tagDepois: string | null
): MudancaCampo[] {
  const mudancas: MudancaCampo[] = [];
  const a = new Map(antes.map((c) => [c.rotulo, c.linhas.map((l) => normLinha(l.t))]));
  const d = new Map(depois.map((c) => [c.rotulo, c.linhas.map((l) => normLinha(l.t))]));
  for (const rotulo of new Set([...a.keys(), ...d.keys()])) {
    const la = a.get(rotulo) ?? [];
    const ld = d.get(rotulo) ?? [];
    if (JSON.stringify(la) !== JSON.stringify(ld)) {
      mudancas.push({ campo: rotulo, antes: la, depois: ld });
    }
  }
  if ((tagAntes ?? "") !== (tagDepois ?? "")) {
    mudancas.push({
      campo: "Marcação do produto",
      antes: tagAntes ? [tagAntes] : [],
      depois: tagDepois ? [tagDepois] : [],
    });
  }
  return mudancas;
}

interface Existente {
  chave: string;
  nome: string;
  tag: string | null;
  hash: string;
  campos: CampoProduto[];
  ordem: number | null;
}

export interface ResultadoSync {
  produtos: number;
  alteradas: number;
  lpsAtualizadas: number;
  avisoLps?: string;
}

/** Avisa todos os usuários ativos (sino, contador do menu e notificação do navegador). */
async function avisarEquipe(
  admin: ReturnType<typeof criarClienteAdmin>,
  eventos: { nome: string; secao: string; tipo: string }[]
) {
  const { data } = await admin.from("profiles").select("id").eq("ativo", true);
  const ids = ((data as { id: string }[] | null) ?? []).map((p) => p.id);
  if (ids.length === 0) return;

  const nomes = Array.from(new Set(eventos.map((e) => e.nome)));
  const titulo =
    nomes.length === 1
      ? `Comercial: condições alteradas — ${nomes[0]}`
      : `Comercial: ${nomes.length} produtos com condições alteradas`;
  const corpo = nomes.slice(0, 5).join(", ") + (nomes.length > 5 ? ` e mais ${nomes.length - 5}` : "");

  await admin.from("notificacoes").insert(
    ids.map((destinatario_id) => ({
      destinatario_id,
      tipo: "comercial",
      titulo,
      link: "/comercial?alterados=1",
    }))
  );
  await enviarPush(ids, { titulo, corpo, url: "/comercial?alterados=1" });
}

/** Baixa a planilha, compara com a leitura anterior e grava produtos, mudanças e avisos. */
export async function sincronizarComercial(origem: string): Promise<ResultadoSync> {
  const admin = criarClienteAdmin();
  try {
    const produtos = lerProdutos(await baixarPlanilha());
    if (produtos.length === 0) {
      throw new Error("Nenhum produto encontrado na planilha (o cabeçalho \"Hotéis\" mudou de lugar?).");
    }

    const { data } = await admin
      .from("comercial_produtos")
      .select("chave, nome, tag, hash, campos, ordem");
    const existentes = (data as Existente[] | null) ?? [];
    const primeiraCarga = existentes.length === 0; // não gera "alteração" na carga inicial
    const antigos = new Map(existentes.map((e) => [e.chave, e]));

    const eventos: {
      chave: string;
      secao: string;
      nome: string;
      tipo: "novo" | "alterado" | "removido";
      mudancas: MudancaCampo[];
    }[] = [];
    const gravar: Record<string, unknown>[] = [];

    for (const p of produtos) {
      const hash = hashDe(p);
      const ant = antigos.get(p.chave);
      if (ant && ant.hash === hash) continue;

      if (!ant) {
        if (!primeiraCarga) {
          eventos.push({ chave: p.chave, secao: p.secao, nome: p.nome, tipo: "novo", mudancas: [] });
        }
      } else {
        const mudancas = compararCampos(ant.campos ?? [], p.campos, ant.tag, p.tag);
        if (mudancas.length > 0) {
          eventos.push({ chave: p.chave, secao: p.secao, nome: p.nome, tipo: "alterado", mudancas });
        }
      }
      gravar.push({
        chave: p.chave,
        secao: p.secao,
        nome: p.nome,
        ordem: p.ordem,
        tag: p.tag,
        tag_cor: p.tagCor,
        campos: p.campos,
        hash,
        atualizado_em: new Date().toISOString(),
      });
    }

    // Ordem pode mudar sem alterar o conteúdo: mantém a ordem da planilha.
    // (só grava quando a posição de fato mudou: antes isso fazia uma chamada ao banco por produto, a cada sincronização)
    const gravarChaves = new Set(gravar.map((g) => g.chave));
    const ordens = produtos
      .filter((p) => !gravarChaves.has(p.chave))
      .filter((p) => antigos.has(p.chave) && antigos.get(p.chave)?.ordem !== p.ordem);
    for (const p of ordens) {
      await admin.from("comercial_produtos").update({ ordem: p.ordem }).eq("chave", p.chave);
    }

    for (let i = 0; i < gravar.length; i += 50) {
      const { error } = await admin.from("comercial_produtos").upsert(gravar.slice(i, i + 50));
      if (error) throw new Error(error.message);
    }

    // Produtos que saíram da planilha.
    const atuais = new Set(produtos.map((p) => p.chave));
    const removidos = existentes.filter((e) => !atuais.has(e.chave));
    for (const r of removidos) {
      const [secaoNorm] = r.chave.split("|");
      eventos.push({ chave: r.chave, secao: secaoNorm.toUpperCase(), nome: r.nome, tipo: "removido", mudancas: [] });
    }
    if (removidos.length > 0) {
      await admin.from("comercial_produtos").delete().in("chave", removidos.map((r) => r.chave));
    }

    if (eventos.length > 0) {
      const { error } = await admin.from("comercial_alteracoes").insert(eventos);
      if (error) throw new Error(error.message);
      await avisarEquipe(admin, eventos);
    }

    let lpsAtualizadas = 0;
    let avisoLps: string | undefined;
    try {
      lpsAtualizadas = await sincronizarStatusLps(origem);
    } catch (e) {
      avisoLps = "LPs: " + (e instanceof Error ? e.message : "Falha ao sincronizar os status.");
    }
    await admin.from("comercial_sync").upsert({
      id: 1,
      sincronizado_em: new Date().toISOString(),
      origem,
      abas: produtos.length,
      alteradas: eventos.length,
      erro: avisoLps ?? null,
    });
    // Períodos sazonais (ex.: Black November) vão junto; se falharem, não derrubam a sincronização principal.
    await sincronizarSazonais(origem).catch(() => undefined);
    return { produtos: produtos.length, alteradas: eventos.length, lpsAtualizadas, avisoLps };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Falha na sincronização.";
    // Mantém o horário da última sincronização bem-sucedida.
    await admin.from("comercial_sync").upsert({ id: 1, origem, erro });
    throw e;
  }
}

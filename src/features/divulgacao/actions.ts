"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { sincronizarDivulgacao } from "./sincronizar";
import type { DadosOferta } from "./tipos";

type Resultado = { ok?: boolean; erro?: string };
const MIGRACAO = "A divulgação diária ainda não foi ativada no banco (migration 0064).";
const semTabela = (c?: string) => c === "42P01" || c === "PGRST205";
const nulo = (v: string, max = 8000) => v.trim().slice(0, max) || null;

/** Valor em reais digitado no formato brasileiro ("1.234,56") ou simples ("1234.56"). */
function valor(v: string): number | null | "erro" {
  const t = v.trim().replace(/[R$\s]/g, "");
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : "erro";
}

export async function salvarOferta(id: string | null, d: DadosOferta): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data)) return { erro: "Informe a data da divulgação." };
  if (d.tipo !== "nacional" && d.tipo !== "internacional") return { erro: "Escolha nacional ou internacional." };
  if (!d.produto.trim() && !d.canal.trim() && !d.vantagem.trim()) return { erro: "Informe ao menos o produto/destino, o tipo de divulgação ou a descrição." };
  const lv = valor(d.conc_lv);
  const conc = valor(d.conc_concorrente);
  let dif = valor(d.conc_diferenca);
  if (lv === "erro" || conc === "erro" || dif === "erro") return { erro: "Valor de concorrência inválido (use, por exemplo, 2.478,83)." };
  if (dif === null && lv !== null && conc !== null) dif = Math.round((conc - lv) * 100) / 100;

  const dados = {
    data: d.data,
    tipo: d.tipo,
    canal: nulo(d.canal, 200),
    produto: nulo(d.produto),
    temporada: nulo(d.temporada),
    vantagem: nulo(d.vantagem),
    aereo: nulo(d.aereo, 500),
    periodo_viagem: nulo(d.periodo_viagem, 500),
    oferta_dia: nulo(d.oferta_dia, 1000),
    conc_lv: lv,
    conc_concorrente: conc,
    conc_diferenca: dif,
    observacao: nulo(d.observacao, 2000),
    updated_at: new Date().toISOString(),
  };
  const q = id
    ? supabase.from("divulgacao_ofertas").update(dados).eq("id", id).select("id")
    : supabase.from("divulgacao_ofertas").insert({ ...dados, criado_por: user.id }).select("id");
  const { data, error } = await q;
  if (error || !data || data.length === 0) return { erro: semTabela(error?.code) ? MIGRACAO : "Não foi possível salvar a oferta." };
  revalidatePath("/operacional/divulgacao");
  return { ok: true };
}

export async function excluirOferta(id: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("divulgacao_ofertas").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) return { erro: "Não foi possível excluir (apenas liderança pode)." };
  revalidatePath("/operacional/divulgacao");
  return { ok: true };
}

/** Lê a planilha agora (liderança). Limita a uma atualização a cada 5 minutos para poupar CPU. */
export async function atualizarDaPlanilha(): Promise<{ erro?: string; inseridas?: number; atualizadas?: number; removidas?: number }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const papel = (eu as { role: string } | null)?.role;
  if (papel !== "gerente" && papel !== "lider") return { erro: "Só a liderança atualiza a partir da planilha." };

  const { data: ult } = await supabase.from("divulgacao_sync").select("sincronizado_em").eq("id", 1).maybeSingle();
  const ultimo = (ult as { sincronizado_em: string | null } | null)?.sincronizado_em;
  if (ultimo && Date.now() - new Date(ultimo).getTime() < 5 * 60_000) {
    return { erro: "A planilha foi lida há menos de 5 minutos. Aguarde um pouco." };
  }
  try {
    const r = await sincronizarDivulgacao("manual");
    revalidatePath("/operacional/divulgacao");
    revalidatePath("/dashboard");
    return r;
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha ao ler a planilha." };
  }
}

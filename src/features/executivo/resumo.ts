import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";
import { enviarEmail, emailConfigurado } from "@/lib/email";
import { obterResumoExecutivo, type ResumoExecutivo } from "./data";
import { usuariosDaDiretoria } from "./avisos";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Texto curto do resumo semanal (usado no aviso do celular e no e-mail). */
export function textoDoResumo(r: ResumoExecutivo): string[] {
  const n = r.numeros;
  const linhas = [
    `${r.paraAprovar.length} para aprovar · ${n.atrasadas} atrasadas · ${n.tarefasAtivas} tarefas em aberto`,
    `${n.projetosAndamento} projetos em andamento · ${n.chamadosAbertos} chamados abertos`,
  ];
  if (r.semana.length > 0) linhas.push(`Próximos 7 dias: ${r.semana.slice(0, 5).map((s) => s.nome).join("; ")}${r.semana.length > 5 ? "…" : ""}`);
  if (r.alteracoesComercial.length > 0) linhas.push(`Comercial: ${r.alteracoesComercial.length} produto(s) com condição alterada`);
  if (r.estoqueZerado.length > 0) linhas.push(`Estoque zerado: ${r.estoqueZerado.join(", ")}`);
  return linhas;
}

function htmlDoResumo(r: ResumoExecutivo, nome: string, url: string): string {
  const lista = (itens: string[]) => `<ul style="padding-left:18px;margin:6px 0">${itens.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
  <h2 style="margin:0 0 4px">Resumo semanal do marketing</h2>
  <p style="margin:0 0 12px;color:#555">Olá, ${esc(nome.split(" ")[0])}. Segue o essencial da semana.</p>
  ${lista(textoDoResumo(r))}
  ${r.paraAprovar.length > 0 ? `<h3 style="margin:14px 0 4px">Aguardando sua aprovação</h3>${lista(r.paraAprovar.map((p) => p.titulo))}` : ""}
  ${r.atrasadas.length > 0 ? `<h3 style="margin:14px 0 4px">Atrasadas</h3>${lista(r.atrasadas.slice(0, 5).map((a) => `${a.titulo}${a.responsavel ? ` (${a.responsavel})` : ""}`))}` : ""}
  <p style="margin-top:16px"><a href="${url}" style="background:#16a34a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Abrir o painel</a></p>
</div>`;
}

/**
 * Resumo semanal da diretoria: notificação no sino e no celular (push) e, se o e-mail estiver configurado,
 * um e-mail. Roda toda segunda de manhã pelo agendador da Vercel.
 */
export async function executarResumoSemanal(base: string): Promise<{ destinatarios: number; emails: number }> {
  const alvo = await usuariosDaDiretoria();
  if (alvo.length === 0) return { destinatarios: 0, emails: 0 };

  const r = await obterResumoExecutivo();
  const linhas = textoDoResumo(r);
  const url = `${base}/executivo`;
  const admin = criarClienteAdmin();

  await admin
    .from("notificacoes")
    .insert(alvo.map((u) => ({ destinatario_id: u.id, tipo: "resumo", titulo: "Resumo semanal do marketing", link: "/executivo" })));
  await enviarPush(
    alvo.map((u) => u.id),
    { titulo: "Resumo semanal do marketing", corpo: linhas[0], url: "/executivo", tag: "resumo-semanal" }
  );

  let emails = 0;
  if (emailConfigurado()) {
    for (const u of alvo) {
      if (u.email && (await enviarEmail(u.email, "Resumo semanal do marketing", htmlDoResumo(r, u.nome, url), linhas.join("\n")))) emails++;
    }
  }
  return { destinatarios: alvo.length, emails };
}

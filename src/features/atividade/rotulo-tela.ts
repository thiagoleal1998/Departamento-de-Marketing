import { NAVEGACAO } from "@/lib/navigation";

/** Nome da tela a partir do caminho (usa os nomes do menu; o que não estiver no menu aparece como o caminho). */
const MAPA = (() => {
  const m = new Map<string, string>();
  for (const i of NAVEGACAO) {
    m.set(i.href, i.label);
    for (const f of i.filhos ?? []) m.set(f.href, f.label);
  }
  m.set("/dashboard", "Painel");
  m.set("/perfil", "Meu perfil");
  m.set("/chat", "Chat");
  m.set("/gestao", "Gestão · Indicadores");
  m.set("/gestao/perfis", "Gestão · Perfis comportamentais");
  m.set("/gestao/ferias", "Gestão · Férias");
  m.set("/gestao/feriados", "Gestão · Escala de feriados");
  return m;
})();

export function rotuloTela(caminho: string | null | undefined): string {
  if (!caminho) return "—";
  if (MAPA.has(caminho)) return MAPA.get(caminho)!;
  // O prefixo mais longo que bate (ex.: /chamados/123 → Chamados).
  let melhor = "";
  for (const k of MAPA.keys()) if (k !== "/" && caminho.startsWith(k + "/") && k.length > melhor.length) melhor = k;
  return melhor ? `${MAPA.get(melhor)} › ${caminho.slice(melhor.length + 1).split("/")[0].slice(0, 24)}` : caminho;
}

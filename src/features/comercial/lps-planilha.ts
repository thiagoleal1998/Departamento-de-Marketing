import * as XLSX from "xlsx";

const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const urlNormal = (s: string | null) => (s ?? "").trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
const GRUPOS: Record<string, string> = { "novas lp s": "novas", b2c: "b2c", "lps v4": "v4", "controle feriados": "feriados" };
const STATUS = new Set(["ativo", "inativo", "cancelado", "desativado"]);

export interface StatusLpPlanilha {
  nome: string;
  grupo: string;
  url: string | null;
  status: string;
}

export interface LpParaSync {
  id: string;
  nome: string;
  grupo: string | null;
  url: string | null;
  status_patrocinio: string | null;
}

/** Lê só o status das abas atuais. Não importa páginas antigas nem projetos descontinuados. */
export function lerStatusLps(buffer: Buffer): StatusLpPlanilha[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const saida: StatusLpPlanilha[] = [];
  for (const aba of wb.SheetNames) {
    const grupo = GRUPOS[norm(aba)];
    if (!grupo) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[aba], { header: 1, defval: "" });
    const h = rows.findIndex((r, i) => i < 10 && r.some((x) => norm(x) === "status de patrocinio"));
    if (h < 0) continue;
    const cab = rows[h].map(norm);
    const nomeCol = cab.findIndex((c) => c === "produto" || c === "produtos");
    const statusCol = cab.indexOf("status de patrocinio");
    const urlCol = cab.indexOf("url");
    if (nomeCol < 0) continue;
    for (const r of rows.slice(h + 1)) {
      const nome = String(r[nomeCol] ?? "").trim();
      const status = norm(r[statusCol]);
      if (nome && STATUS.has(status)) saida.push({ nome, grupo, status, url: urlCol >= 0 ? String(r[urlCol] ?? "").trim() || null : null });
    }
  }
  return saida;
}

/** Nunca aproxima nomes de hotéis: evita misturar unidades da mesma rede e grupos diferentes. */
export function mudancasStatusLps(lps: LpParaSync[], linhas: StatusLpPlanilha[]) {
  return lps.flatMap((lp) => {
    const grupo = linhas.filter((l) => l.grupo === lp.grupo);
    const porUrl = lp.url ? grupo.filter((l) => l.url && urlNormal(l.url) === urlNormal(lp.url)) : [];
    const candidatas = porUrl.length ? porUrl : grupo.filter((l) => norm(l.nome) === norm(lp.nome));
    const estados = new Set(candidatas.map((l) => l.status));
    if (estados.size !== 1) return []; // Ausência ou conflito na fonte não altera o cadastro.
    const status = candidatas[0].status;
    return status === lp.status_patrocinio ? [] : [{ lp, status }];
  });
}

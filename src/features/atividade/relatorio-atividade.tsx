import { Select } from "@/components/ui/select";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { dataBr, hojeSP, somarDias } from "@/features/divulgacao/tipos";
import { rotuloTela } from "./rotulo-tela";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FUSO = "America/Sao_Paulo";
const ehData = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

/** 3 h 25 min · 12 min · 0 min */
function duracao(segundos: number): string {
  const min = Math.round(segundos / 60);
  if (min < 1) return "0 min";
  const h = Math.floor(min / 60);
  return h > 0 ? `${h} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`;
}

interface Sessao {
  usuario_id: string;
  inicio: string;
  ultimo_sinal: string;
  segundos_ativo: number;
  segundos_inativo: number;
}
interface Login {
  usuario_id: string;
  em: string;
  evento: "login" | "logout";
  ip: string | null;
}
interface Registro {
  usuario_id: string | null;
  em: string;
  tipo: "pagina" | "acao";
  acao: string;
  detalhe: string | null;
  caminho: string | null;
}

/** Relatório de acessos: logins, tempo logado/ativo/inativo por pessoa e registro das atividades. */
export async function RelatorioAtividade({ sp }: { sp: { de?: string; ate?: string; usuario?: string; tipo?: string } }) {
  if (!servicoDisponivel()) {
    return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Registro de atividade indisponível no momento.</p>;
  }
  const hoje = hojeSP();
  const de = ehData(sp.de) || somarDias(hoje, -6);
  const ate = ehData(sp.ate) || hoje;
  const usuarioSel = sp.usuario ?? "";
  const tipoSel = sp.tipo === "acao" || sp.tipo === "pagina" ? sp.tipo : "";
  const ini = `${de}T00:00:00-03:00`;
  const fim = `${ate}T23:59:59-03:00`;

  const admin = criarClienteAdmin();
  const comUsuario = <T extends { eq: (c: string, v: string) => T }>(q: T) => (usuarioSel ? q.eq("usuario_id", usuarioSel) : q);

  const [perfisR, sessoesR, loginsR, registrosR] = await Promise.all([
    admin.from("profiles").select("id, nome, role, ativo").order("nome", { ascending: true }),
    comUsuario(admin.from("atividade_sessoes").select("usuario_id, inicio, ultimo_sinal, segundos_ativo, segundos_inativo").gte("inicio", ini).lte("inicio", fim).limit(10000)),
    comUsuario(admin.from("atividade_logins").select("usuario_id, em, evento, ip").gte("em", ini).lte("em", fim).order("em", { ascending: false }).limit(5000)),
    (() => {
      let q = comUsuario(admin.from("atividade_log").select("usuario_id, em, tipo, acao, detalhe, caminho").gte("em", ini).lte("em", fim).order("em", { ascending: false }).limit(300));
      if (tipoSel) q = q.eq("tipo", tipoSel);
      return q;
    })(),
  ]);

  if (sessoesR.error || loginsR.error || registrosR.error) {
    return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">O registro de atividade ainda não foi ativado no banco. Rode a migration 0077 no Supabase.</p>;
  }

  const perfis = (perfisR.data as { id: string; nome: string; role: string; ativo: boolean }[] | null) ?? [];
  const nome = new Map(perfis.map((p) => [p.id, p.nome]));
  const sessoes = (sessoesR.data as Sessao[] | null) ?? [];
  const logins = (loginsR.data as Login[] | null) ?? [];
  const registros = (registrosR.data as Registro[] | null) ?? [];

  // Resumo por pessoa.
  const resumo = perfis
    .filter((p) => (usuarioSel ? p.id === usuarioSel : p.ativo))
    .map((p) => {
      const s = sessoes.filter((x) => x.usuario_id === p.id);
      const l = logins.filter((x) => x.usuario_id === p.id && x.evento === "login");
      const ativo = s.reduce((t, x) => t + x.segundos_ativo, 0);
      const inativo = s.reduce((t, x) => t + x.segundos_inativo, 0);
      const ultimoSinal = s.reduce<string | null>((m, x) => (!m || x.ultimo_sinal > m ? x.ultimo_sinal : m), null);
      return { id: p.id, nome: p.nome, logins: l.length, ultimoLogin: l[0]?.em ?? null, sessoes: s.length, ativo, inativo, logado: ativo + inativo, ultimoSinal };
    })
    .sort((a, b) => b.logado - a.logado || a.nome.localeCompare(b.nome, "pt-BR"));

  const totalAtivo = resumo.reduce((t, r) => t + r.ativo, 0);
  const totalInativo = resumo.reduce((t, r) => t + r.inativo, 0);
  const totalLogins = resumo.reduce((t, r) => t + r.logins, 0);

  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="aba" value="atividade" />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          De <Input type="date" name="de" defaultValue={de} className="h-9 w-36" />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Até <Input type="date" name="ate" defaultValue={ate} className="h-9 w-36" />
        </label>
        <Select name="usuario" defaultValue={usuarioSel} aria-label="Pessoa" className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">Todas as pessoas</option>
          {perfis.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
        <Select name="tipo" defaultValue={tipoSel} aria-label="Tipo de registro" className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">Telas e ações</option>
          <option value="acao">Só ações</option>
          <option value="pagina">Só telas abertas</option>
        </Select>
        <Button type="submit" size="sm" className="h-9">
          Aplicar
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {dataBr(de)} a {dataBr(ate)}
        </span>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { rotulo: "Logins no período", valor: totalLogins.toLocaleString("pt-BR") },
          { rotulo: "Tempo logado", valor: duracao(totalAtivo + totalInativo) },
          { rotulo: "Tempo ativo", valor: duracao(totalAtivo) },
          { rotulo: "Tempo inativo", valor: duracao(totalInativo) },
        ].map((k) => (
          <Card key={k.rotulo}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.rotulo}</p>
              <p className="text-2xl font-bold tabular-nums">{k.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        O navegador avisa o sistema a cada minuto enquanto o painel está aberto. <strong>Ativo</strong> é quando a pessoa mexeu em algo (mouse, teclado, rolagem ou toque) nos últimos 5 minutos;{" "}
        <strong>inativo</strong> é o painel aberto sem uso (ou em segundo plano). O registro começa na data em que este recurso foi ativado.
      </p>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <h2 className="px-4 pt-4 text-sm font-semibold">Resumo por pessoa</h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Pessoa</th>
                <th className="px-4 py-2 text-right font-medium">Logins</th>
                <th className="px-4 py-2 font-medium">Último login</th>
                <th className="px-4 py-2 text-right font-medium">Sessões</th>
                <th className="px-4 py-2 text-right font-medium">Tempo logado</th>
                <th className="px-4 py-2 text-right font-medium">Ativo</th>
                <th className="px-4 py-2 text-right font-medium">Inativo</th>
                <th className="px-4 py-2 text-right font-medium">% ativo</th>
                <th className="px-4 py-2 font-medium">Última atividade</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {resumo.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-medium">{r.nome}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.logins}</td>
                  <td className="px-4 py-2 tabular-nums">{r.ultimoLogin ? dataHora(r.ultimoLogin) : "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.sessoes}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{duracao(r.logado)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{duracao(r.ativo)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{duracao(r.inativo)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.logado > 0 ? `${Math.round((r.ativo / r.logado) * 100)}%` : "—"}</td>
                  <td className="px-4 py-2 tabular-nums">{r.ultimoSinal ? dataHora(r.ultimoSinal) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="text-sm font-semibold">Registro de logins</h2>
              <span className="text-xs text-muted-foreground">{Math.min(logins.length, 100)} de {logins.length}</span>
            </div>
            {logins.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum login neste período.</p>
            ) : (
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Data e hora</th>
                    <th className="px-4 py-2 font-medium">Pessoa</th>
                    <th className="px-4 py-2 font-medium">Evento</th>
                    <th className="px-4 py-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logins.slice(0, 100).map((l, i) => (
                    <tr key={l.em + l.usuario_id + i}>
                      <td className="px-4 py-1.5 tabular-nums">{dataHora(l.em)}</td>
                      <td className="px-4 py-1.5">{nome.get(l.usuario_id) ?? "—"}</td>
                      <td className="px-4 py-1.5">{l.evento === "login" ? "Entrou" : "Saiu"}</td>
                      <td className="px-4 py-1.5 text-xs text-muted-foreground">{l.ip ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="overflow-x-auto p-0">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="text-sm font-semibold">Registro de atividades</h2>
              <span className="text-xs text-muted-foreground">últimas {registros.length}</span>
            </div>
            {registros.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhuma atividade neste período.</p>
            ) : (
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Data e hora</th>
                    <th className="px-4 py-2 font-medium">Pessoa</th>
                    <th className="px-4 py-2 font-medium">Atividade</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {registros.map((r, i) => (
                    <tr key={r.em + (r.usuario_id ?? "") + i}>
                      <td className="whitespace-nowrap px-4 py-1.5 tabular-nums">{dataHora(r.em)}</td>
                      <td className="px-4 py-1.5">{r.usuario_id ? nome.get(r.usuario_id) ?? "—" : "—"}</td>
                      <td className="px-4 py-1.5">
                        {r.tipo === "pagina" ? (
                          <span className="text-muted-foreground">
                            Abriu <strong className="font-medium text-foreground">{rotuloTela(r.caminho)}</strong>
                          </span>
                        ) : (
                          <>
                            {r.acao}
                            {r.detalhe ? <span className="text-muted-foreground"> · {r.detalhe}</span> : null}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

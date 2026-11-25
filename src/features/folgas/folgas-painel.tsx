"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, BellRing, CalendarOff, Check, Loader2, Lock, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { avisarEquipeFolga, excluirFolga, salvarFolga } from "./actions";
import {
  CHAVES_TIPO,
  FUNCOES_AUTORIZACAO,
  PESSOAS_RH,
  TIPOS_FOLGA,
  diasDeFolga,
  nomeAutorizador,
  proximoDiaUtil,
  rotuloTipo,
  textoPeriodo,
  textoRetorno,
  valorAutorizacao,
  type AusenciaTime,
  type Folga,
} from "./tipos";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputData } from "@/components/ui/input-data";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatarData } from "@/lib/utils";

interface Pessoa {
  id: string;
  nome: string;
}

const sobrepoe = (a: { inicio: string; fim: string }, b: { inicio: string; fim: string }) => a.inicio <= b.fim && b.inicio <= a.fim;

export function FolgasPainel({
  folgas,
  pessoas,
  ausencias,
  hoje,
  indisponivel,
  podeEditar,
}: {
  folgas: Folga[];
  pessoas: Pessoa[];
  /** Ausências já avisadas ao time (sem justificativa), para quem não é da liderança. */
  ausencias: AusenciaTime[];
  hoje: string;
  indisponivel?: boolean;
  podeEditar: boolean;
}) {
  const { confirmar, avisar } = useDialogo();
  const [editando, setEditando] = useState<string | "novo" | null>(null);
  const [pessoa, setPessoa] = useState("");
  const [tipo, setTipo] = useState<string>("tre");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [retorno, setRetorno] = useState("");
  const [retornoManual, setRetornoManual] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [autoriza, setAutoriza] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  const [verAnteriores, setVerAnteriores] = useState(false);

  const nome = new Map(pessoas.map((p) => [p.id, p.nome]));
  const ordenar = (l: Folga[]) => [...l].sort((a, b) => a.inicio.localeCompare(b.inicio) || (nome.get(a.profile_id) ?? "").localeCompare(nome.get(b.profile_id) ?? "", "pt-BR"));
  const proximas = ordenar(folgas.filter((f) => f.fim >= hoje));
  const anteriores = ordenar(folgas.filter((f) => f.fim < hoje)).reverse();

  function abrirNovo() {
    setPessoa("");
    setTipo("tre");
    setInicio("");
    setFim("");
    setRetorno("");
    setRetornoManual(false);
    setJustificativa("");
    setAutoriza({});
    setErro(null);
    setEditando("novo");
  }
  function abrirEdicao(f: Folga) {
    setPessoa(f.profile_id);
    setTipo(f.tipo);
    setInicio(f.inicio);
    setFim(f.fim);
    setRetorno(f.retorno ?? "");
    setRetornoManual(Boolean(f.retorno));
    setJustificativa(f.justificativa ?? "");
    setAutoriza(Object.fromEntries(f.autorizacoes.map((a) => [a.funcao, valorAutorizacao(a)])));
    setErro(null);
    setEditando(f.id);
  }
  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    start(async () => {
      const r = await salvarFolga(editando === "novo" ? null : editando, {
        profile_id: pessoa,
        tipo,
        inicio,
        fim,
        retorno,
        justificativa,
        autorizacoes: FUNCOES_AUTORIZACAO.filter((fn) => autoriza[fn]).map((fn) => (fn === "RH" ? { funcao: fn, nome: autoriza[fn] } : { funcao: fn, profile_id: autoriza[fn] })),
      });
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setEditando(null);
      if (r.aviso) void avisar(r.aviso, "Folga salva");
    });
  }
  async function excluir(f: Folga) {
    const ok = await confirmar({
      titulo: "Excluir esta folga?",
      descricao: `${nome.get(f.profile_id) ?? "Colaborador"}: ${rotuloTipo(f.tipo)}, ${textoPeriodo(f)}.`,
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    start(async () => {
      const r = await excluirFolga(f.id);
      if (r.erro) void avisar(r.erro, "Não foi possível excluir");
    });
  }
  async function avisarEquipe(f: Folga) {
    const quem = nome.get(f.profile_id) ?? "O colaborador";
    const ok = await confirmar({
      titulo: "Avisar a equipe?",
      descricao: `O time receberá: “${quem} estará ausente em ${textoPeriodo(f)} (${rotuloTipo(f.tipo)}).” A justificativa e quem autorizou não vão para o time.`,
      confirmar: "Avisar equipe",
    });
    if (!ok) return;
    start(async () => {
      const r = await avisarEquipeFolga(f.id);
      if (r.erro) void avisar(r.erro, "Não foi possível avisar");
      else void avisar(`${r.avisados ?? 0} pessoa(s) receberam o aviso de ausência.`, "Equipe avisada");
    });
  }

  const situacao = (f: { inicio: string; fim: string }) =>
    f.fim < hoje
      ? { rotulo: "Concluída", cor: "bg-muted text-muted-foreground" }
      : f.inicio <= hoje
        ? { rotulo: "Em andamento", cor: "bg-emerald-100 text-emerald-900" }
        : { rotulo: "Programada", cor: "bg-sky-100 text-sky-900" };

  /** Quem mais está de folga nos mesmos dias (a liderança vê, para planejar a cobertura). */
  const coincidem = (f: Folga) =>
    folgas.filter((o) => o.id !== f.id && o.profile_id !== f.profile_id && sobrepoe(f, o)).map((o) => nome.get(o.profile_id) ?? "—");

  function Cartao({ f }: { f: Folga }) {
    const s = situacao(f);
    const coinc = podeEditar ? coincidem(f) : [];
    const autoriz = f.autorizacoes;
    return (
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold">{podeEditar ? nome.get(f.profile_id) ?? "—" : rotuloTipo(f.tipo)}</span>
                {podeEditar ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{rotuloTipo(f.tipo)}</span> : null}
                <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", s.cor)}>{s.rotulo}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {textoPeriodo(f)} · {diasDeFolga(f)} {diasDeFolga(f) === 1 ? "dia" : "dias"}
                {f.retorno ? <span> · retorna em <strong className="text-foreground">{textoRetorno(f)}</strong></span> : null}
              </p>
            </div>
            {podeEditar ? (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => abrirEdicao(f)} disabled={pendente}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir(f)} disabled={pendente}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>

          {podeEditar ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {f.equipe_avisada_em ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">
                  <Check className="size-3.5" /> Equipe avisada em {formatarData(f.equipe_avisada_em)}
                </span>
              ) : f.fim >= hoje ? (
                <>
                  <span className="text-xs text-muted-foreground">O time ainda não foi avisado.</span>
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 rounded-full text-xs" onClick={() => avisarEquipe(f)} disabled={pendente}>
                    <BellRing className="size-3.5" /> Avisar equipe
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}

          {coinc.length > 0 ? (
            <p className="flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Coincide com a folga de <strong>{coinc.join(", ")}</strong>.
              </span>
            </p>
          ) : null}

          {f.justificativa || autoriz.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Lock className="size-3" /> {podeEditar ? "Só a liderança e o colaborador veem" : "Só você e a liderança veem"}
              </p>
              {f.justificativa ? (
                <p>
                  <span className="font-medium">Justificativa:</span> {f.justificativa}
                </p>
              ) : null}
              {autoriz.length > 0 ? (
                <div>
                  <span className="font-medium">Autorizada por:</span>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {autoriz.map((a) => (
                      <li key={a.funcao} className="rounded-full border bg-background px-2.5 py-0.5 text-xs">
                        <strong>{nomeAutorizador(a, nome)}</strong> · {a.funcao}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          {podeEditar
            ? "Registre folgas (TRE, compensação, abono…) com a justificativa e quem autorizou. A pessoa é avisada ao registrar; o time só recebe o aviso de ausência quando você mandar, sem a justificativa."
            : "Suas folgas, registradas pela liderança, e as ausências que o time já foi avisado."}
        </p>
        {editando === null && podeEditar ? (
          <Button onClick={abrirNovo} disabled={indisponivel}>
            <Plus className="size-4" /> Registrar folga
          </Button>
        ) : null}
      </div>

      {indisponivel ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          As folgas ainda não foram ativadas no banco. Rode a migration 0090 no Supabase para começar a registrar.
        </p>
      ) : null}

      {editando !== null && podeEditar ? (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={salvar} className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{editando === "novo" ? "Registrar folga" : "Editar folga"}</h2>
                <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={() => setEditando(null)}>
                  <X className="size-4" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fo-pessoa">Colaborador *</Label>
                  <Select id="fo-pessoa" value={pessoa} onChange={(e) => setPessoa(e.target.value)} required>
                    <option value="">Selecione…</option>
                    {pessoas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fo-tipo">Tipo da folga *</Label>
                  <Select id="fo-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                    {CHAVES_TIPO.map((k) => (
                      <option key={k} value={k}>
                        {TIPOS_FOLGA[k]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fo-inicio">Primeiro dia *</Label>
                  <InputData id="fo-inicio" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fo-fim">Último dia *</Label>
                  <InputData
                    id="fo-fim"
                    value={fim}
                    min={inicio || undefined}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFim(v);
                      // Sugere o retorno (próximo dia útil) enquanto você não tiver escolhido um.
                      if (!retornoManual && /^\d{4}-\d{2}-\d{2}$/.test(v)) setRetorno(proximoDiaUtil(v));
                    }}
                    required
                  />
                  {inicio && fim && fim >= inicio ? (
                    <p className="text-xs text-muted-foreground">
                      {diasDeFolga({ inicio, fim })} {diasDeFolga({ inicio, fim }) === 1 ? "dia" : "dias"} corridos: {textoPeriodo({ inicio, fim })}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fo-retorno">Data de retorno</Label>
                  <InputData
                    id="fo-retorno"
                    value={retorno}
                    min={fim || undefined}
                    onChange={(e) => {
                      setRetorno(e.target.value);
                      setRetornoManual(Boolean(e.target.value));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Sugerida: o próximo dia útil depois do último dia. Mude se houver feriado ou outra combinação. Vai no aviso do time.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fo-just" className="flex items-center gap-1.5">
                  Justificativa <Lock className="size-3 text-muted-foreground" />
                </Label>
                <Textarea
                  id="fo-just"
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  maxLength={1000}
                  rows={2}
                  autoAjustar
                  placeholder="Ex.: convocação do TRE para mesário, conforme solicitação do colaborador…"
                />
                <p className="text-xs text-muted-foreground">Aparece só para o colaborador e para a liderança. Não vai no aviso do time.</p>
              </div>

              <div className="space-y-2">
                <Label>Quem autorizou</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FUNCOES_AUTORIZACAO.map((fn) => (
                    <div key={fn} className="flex items-center gap-2 rounded-lg border p-2">
                      <span className="w-36 shrink-0 text-xs font-medium text-muted-foreground">{fn}</span>
                      <div className="min-w-0 flex-1">
                        <Select
                          value={autoriza[fn] ?? ""}
                          onChange={(e) => setAutoriza((a) => ({ ...a, [fn]: e.target.value }))}
                          aria-label={`Quem autorizou como ${fn}`}
                          className="h-9"
                        >
                          <option value="">—</option>
                          {fn === "RH"
                            ? PESSOAS_RH.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))
                            : pessoas.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nome}
                                </option>
                              ))}
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {erro ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pendente}>
                  {pendente ? <Loader2 className="size-4 animate-spin" /> : null} Salvar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarOff className="size-5 text-muted-foreground" /> {podeEditar ? "Próximas e em andamento" : "Minhas folgas"}
        </h2>
        {proximas.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {podeEditar ? "Nenhuma folga programada." : "Você não tem folgas registradas."}
          </p>
        ) : (
          <div className="space-y-3">
            {proximas.map((f) => (
              <Cartao key={f.id} f={f} />
            ))}
          </div>
        )}
      </section>

      {!podeEditar ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="size-5 text-muted-foreground" /> Ausências do time
          </h2>
          {ausencias.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma ausência avisada para os próximos dias.</p>
          ) : (
            <Card>
              <CardContent className="divide-y p-0">
                {ausencias.map((a) => {
                  const s = situacao(a);
                  return (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <div>
                        <span className="font-medium">{nome.get(a.profile_id) ?? "—"}</span>
                        <span className="text-muted-foreground"> · {textoPeriodo(a)} · {rotuloTipo(a.tipo)}{a.retorno ? ` · retorna em ${textoRetorno(a)}` : ""}</span>
                      </div>
                      <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", s.cor)}>{s.rotulo}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </section>
      ) : null}

      {anteriores.length > 0 ? (
        <section className="space-y-3">
          <Button variant="ghost" size="sm" onClick={() => setVerAnteriores((v) => !v)}>
            {verAnteriores ? "Ocultar" : "Ver"} folgas anteriores ({anteriores.length})
          </Button>
          {verAnteriores ? (
            <div className="space-y-3">
              {anteriores.map((f) => (
                <Cartao key={f.id} f={f} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  History,
  KanbanSquare,
  UserCog,
  Send,
  Paperclip,
  CheckCheck,
  Users,
  X,
} from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import {
  obterChamado,
  listarComentarios,
  listarHistorico,
  listarMembros,
  mapaDePerfis,
} from "@/features/chamados/data";
import {
  comentarChamado,
  triarChamado,
  converterEmTarefa,
  aceitarChamado,
  aprovarChamado,
  reprovarChamado,
  adicionarMembro,
  removerMembro,
  definirResponsavel,
} from "@/features/chamados/actions";
import { PainelStatus } from "@/features/chamados/painel-status";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChamadoStatusBadge,
  ChamadoPrioridadeBadge,
  AprovacaoBadge,
} from "@/components/shared/status-badge";
import { formatarDataHora, formatarData } from "@/lib/utils";
import { CHAMADO_TIPO_LABEL } from "@/types";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ChamadoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await exigirUsuario();
  const chamado = await obterChamado(id);
  if (!chamado) notFound();

  const [comentarios, historico, membrosIds, perfis] = await Promise.all([
    listarComentarios(id),
    listarHistorico(id),
    listarMembros(id),
    mapaDePerfis(),
  ]);

  const lideranca = ehLideranca(usuario.role);
  const ehResponsavel = chamado.responsavel_id === usuario.id;
  const podeEditarStatus = lideranca || ehResponsavel;
  const ehGerente = usuario.role === "gerente";
  // Somente o líder aceita para iniciar; o gerente só aprova/reprova.
  const podeAceitar = usuario.role === "lider" && !chamado.aceito_por;
  const aprovacao = chamado.aprovacao ?? "pendente";
  const aceitoNome = chamado.aceito_por
    ? perfis.get(chamado.aceito_por)?.nome
    : null;
  const aprovadoNome = chamado.aprovado_por
    ? perfis.get(chamado.aprovado_por)?.nome
    : null;

  const solicitanteNome =
    (chamado.solicitante_id ? perfis.get(chamado.solicitante_id)?.nome : null) ??
    chamado.solicitante_nome ??
    "—";
  const responsavel = chamado.responsavel_id
    ? perfis.get(chamado.responsavel_id)
    : null;
  const colaboradores = Array.from(perfis.values());
  const membros = membrosIds
    .map((mid) => perfis.get(mid))
    .filter((p): p is Profile => Boolean(p));
  const disponiveis = colaboradores.filter(
    (p) => !membrosIds.includes(p.id) && p.id !== chamado.responsavel_id
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={`#${chamado.numero} · ${chamado.titulo}`}
        descricao={CHAMADO_TIPO_LABEL[chamado.tipo]}
        acoes={
          <Button asChild variant="outline">
            <Link href="/chamados">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row flex-wrap items-center gap-2 space-y-0">
              <ChamadoStatusBadge status={chamado.status} />
              <ChamadoPrioridadeBadge prioridade={chamado.prioridade} />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm text-foreground/90">
                {chamado.descricao || "Sem descrição."}
              </p>
              {chamado.referencia_url ? (
                <a
                  href={chamado.referencia_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-accent/40"
                >
                  <Paperclip className="size-4" />
                  {chamado.referencia_nome ?? "Arquivo de referência"}
                </a>
              ) : null}
              <div className="grid grid-cols-2 gap-4 border-t pt-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Solicitante</p>
                  <p className="font-medium">{solicitanteNome}</p>
                  {chamado.origem === "portal" ? (
                    <p className="text-xs text-muted-foreground">
                      {chamado.solicitante_email} · via portal
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Departamento</p>
                  <p className="font-medium">{chamado.departamento ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Segmento / Público-alvo
                  </p>
                  <p className="font-medium">{chamado.segmento ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Canal</p>
                  <p className="font-medium">{chamado.categoria ?? "—"}</p>
                </div>
                {chamado.formato ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Formato</p>
                    <p className="font-medium">{chamado.formato}</p>
                  </div>
                ) : null}
                {chamado.subtipo ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de peça</p>
                    <p className="font-medium">{chamado.subtipo}</p>
                  </div>
                ) : null}
                {chamado.material_grafico ? (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Material gráfico
                    </p>
                    <p className="font-medium">{chamado.material_grafico}</p>
                  </div>
                ) : null}
                {chamado.prazo_entrega ? (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Entrega do marketing
                    </p>
                    <p className="font-medium">
                      {formatarData(chamado.prazo_entrega)}
                    </p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <p className="font-medium">
                    {responsavel?.nome ?? "Não atribuído"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prazo (SLA)</p>
                  <p className="font-medium">{formatarData(chamado.prazo_sla)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aberto em</p>
                  <p className="font-medium">
                    {formatarData(chamado.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comentários */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4" /> Comentários
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comentarios.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum comentário ainda.
                </p>
              ) : (
                <ul className="space-y-4">
                  {comentarios.map((c) => {
                    const autor: Profile | undefined = perfis.get(c.autor_id);
                    return (
                      <li key={c.id} className="flex gap-3">
                        <Avatar nome={autor?.nome} className="size-8" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {autor?.nome ?? "—"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatarDataHora(c.created_at)}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-foreground/90">
                            {c.texto}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <form
                action={comentarChamado.bind(null, id)}
                className="flex flex-col gap-2 border-t pt-4"
              >
                <Textarea
                  name="texto"
                  placeholder="Escreva um comentário..."
                  rows={3}
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm">
                    <Send className="size-4" /> Comentar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Aprovação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCheck className="size-4" /> Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AprovacaoBadge status={aprovacao} />

              {aceitoNome ? (
                <div className="rounded-md border bg-muted/40 p-2 text-xs">
                  <p className="font-medium">
                    Aceito por {aceitoNome}
                    {chamado.aceito_em
                      ? ` · ${formatarData(chamado.aceito_em)}`
                      : ""}
                  </p>
                  {chamado.aceite_justificativa ? (
                    <p className="mt-0.5 text-muted-foreground">
                      “{chamado.aceite_justificativa}”
                    </p>
                  ) : null}
                </div>
              ) : null}

              {aprovadoNome ? (
                <div className="rounded-md border bg-muted/40 p-2 text-xs">
                  <p className="font-medium">
                    {aprovacao === "reprovado" ? "Reprovado" : "Aprovado"} por{" "}
                    {aprovadoNome}
                    {chamado.aprovado_em
                      ? ` · ${formatarData(chamado.aprovado_em)}`
                      : ""}
                  </p>
                  {chamado.aprovacao_justificativa ? (
                    <p className="mt-0.5 text-muted-foreground">
                      “{chamado.aprovacao_justificativa}”
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Líder aceita (justificativa obrigatória) */}
              {podeAceitar ? (
                <form
                  action={aceitarChamado.bind(null, id)}
                  className="space-y-2 border-t pt-3"
                >
                  <Label htmlFor="just_aceite" className="text-xs">
                    Aceitar a demanda — justifique (obrigatório)
                  </Label>
                  <Textarea
                    id="just_aceite"
                    name="justificativa"
                    rows={2}
                    required
                    placeholder="Por que está aceitando iniciar agora?"
                  />
                  <Button type="submit" size="sm" className="w-full">
                    Aceitar e iniciar
                  </Button>
                </form>
              ) : null}

              {/* Gerente aprova/reprova (justificativa opcional) */}
              {ehGerente && aprovacao === "pendente" ? (
                <form
                  action={aprovarChamado.bind(null, id)}
                  className="space-y-2 border-t pt-3"
                >
                  <Label htmlFor="just_aprov" className="text-xs">
                    Justificativa (opcional)
                  </Label>
                  <Textarea
                    id="just_aprov"
                    name="justificativa"
                    rows={2}
                    placeholder="Observação da decisão (opcional)"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="flex-1">
                      Aprovar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      formAction={reprovarChamado.bind(null, id)}
                    >
                      Reprovar
                    </Button>
                  </div>
                </form>
              ) : null}

              {!lideranca ? (
                <p className="text-xs text-muted-foreground">
                  A liderança avalia a aprovação deste chamado.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <PainelStatus
                chamadoId={id}
                statusAtual={chamado.status}
                podeEditar={podeEditarStatus}
              />
            </CardContent>
          </Card>

          {/* Membros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" /> Membros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Responsável (editável pela liderança) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Responsável
                </Label>
                {lideranca ? (
                  <form
                    action={definirResponsavel.bind(null, id)}
                    className="flex gap-2"
                  >
                    <Select
                      name="responsavel_id"
                      defaultValue={chamado.responsavel_id ?? ""}
                      className="h-9"
                    >
                      <option value="">Sem responsável</option>
                      {colaboradores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit" size="sm" variant="outline">
                      Salvar
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <Avatar
                      nome={responsavel?.nome}
                      src={responsavel?.avatar_url}
                      className="size-7"
                    />
                    <span className="text-sm">
                      {responsavel?.nome ?? "Não atribuído"}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  Membros adicionais
                </p>
                <ul className="space-y-2">
                  {membros.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar
                          nome={m.nome}
                          src={m.avatar_url}
                          className="size-7"
                        />
                        <span className="truncate text-sm">{m.nome}</span>
                      </div>
                      {lideranca ? (
                        <form action={removerMembro.bind(null, id)}>
                          <input
                            type="hidden"
                            name="profile_id"
                            value={m.id}
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title="Remover membro"
                          >
                            <X className="size-4" />
                          </Button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                  {membros.length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      Nenhum membro adicional.
                    </li>
                  ) : null}
                </ul>

                {lideranca && disponiveis.length > 0 ? (
                  <form
                    action={adicionarMembro.bind(null, id)}
                    className="flex gap-2"
                  >
                    <Select name="profile_id" defaultValue="" className="h-9">
                      <option value="" disabled>
                        Adicionar membro...
                      </option>
                      {disponiveis.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit" size="sm">
                      Adicionar
                    </Button>
                  </form>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {lideranca ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCog className="size-4" /> Triagem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  action={triarChamado.bind(null, id)}
                  className="space-y-3"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select
                      id="prioridade"
                      name="prioridade"
                      defaultValue={chamado.prioridade}
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prazo_sla">Prazo (SLA)</Label>
                    <Input
                      id="prazo_sla"
                      name="prazo_sla"
                      type="date"
                      defaultValue={
                        chamado.prazo_sla
                          ? chamado.prazo_sla.slice(0, 10)
                          : ""
                      }
                    />
                  </div>
                  <Button type="submit" size="sm" className="w-full">
                    Salvar triagem
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {lideranca ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <KanbanSquare className="size-4" /> Operacional
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {chamado.tarefa_id ? (
                  <p className="text-sm text-muted-foreground">
                    Já convertido em tarefa no kanban.
                  </p>
                ) : (
                  <form action={converterEmTarefa.bind(null, id)}>
                    <Button
                      type="submit"
                      variant="warm"
                      size="sm"
                      className="w-full"
                    >
                      Converter em tarefa
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Histórico / timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" /> Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem registros ainda.
                </p>
              ) : (
                <ul className="space-y-3">
                  {historico.map((h) => {
                    const autor = h.autor_id ? perfis.get(h.autor_id) : null;
                    return (
                      <li key={h.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-primary" />
                          <span className="font-medium capitalize">
                            {h.campo}
                          </span>
                          {h.para ? (
                            <span className="text-muted-foreground">
                              → {h.para}
                            </span>
                          ) : null}
                        </div>
                        <p className="pl-4 text-xs text-muted-foreground">
                          {autor?.nome ?? "Sistema"} ·{" "}
                          {formatarDataHora(h.created_at)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

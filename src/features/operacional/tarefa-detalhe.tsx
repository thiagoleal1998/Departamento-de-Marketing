"use client";

import { useDialogo } from "@/components/shared/dialogo-provider";

import { useEffect, useState, useTransition } from "react";
import Link from "@/components/shared/link";
import { X, Loader2, Save, ExternalLink, Check, Trash2 } from "lucide-react";
import { excluirTarefa, salvarTarefa } from "./actions";
import { ConteudoCard } from "./conteudo-card";
import { CampoPasta } from "./campo-pasta";
import { criadaEm } from "@/lib/codigo-tarefa";
import { ehRaiz, type RaizPasta, type Unidades } from "@/lib/pastas";
import { AnexosTarefa } from "./anexos-tarefa";
import { ItensEstoqueTarefa } from "./itens-estoque-tarefa";
import { ConversaDoCard } from "./conversa-card";
import type { TarefaView, PessoaOpcao } from "./kanban-tarefas";
import { TAREFA_STATUS_META, type TarefaStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const ORDEM_STATUS: TarefaStatus[] = [
  "a_fazer",
  "em_andamento",
  "alteracoes",
  "aprovacao_gustavo",
  "aprovacao_thiago",
  "aprovacao_marco",
  "revisao",
  "concluida",
];

/** Painel do card: propriedades no topo e conteúdo abaixo (estilo Notion). */
export function TarefaDetalhe({
  tarefa,
  pessoas,
  onFechar,
  onSalvo,
  onExcluida,
  podeExcluir = false,
  usuarioId,
  unidades,
}: {
  unidades: Unidades;
  usuarioId: string;
  tarefa: TarefaView;
  pessoas: PessoaOpcao[];
  onFechar: () => void;
  onSalvo: (t: TarefaView) => void;
  /** Chamado depois que a tarefa é excluída (o quadro a retira da tela). */
  onExcluida?: (id: string) => void;
  /** Liderança ou responsável pela tarefa. */
  podeExcluir?: boolean;
}) {
  const [titulo, setTitulo] = useState(tarefa.titulo);
  const [descricao, setDescricao] = useState(tarefa.descricao ?? "");
  const [status, setStatus] = useState<TarefaStatus>(tarefa.status);
  const [responsavelId, setResponsavelId] = useState(
    tarefa.responsavel_id ?? ""
  );
  const [colaboradorId, setColaboradorId] = useState(tarefa.colaborador_id ?? "");
  const [prazo, setPrazo] = useState((tarefa.prazo ?? "").slice(0, 10));
  const [prioridade, setPrioridade] = useState(
    tarefa.prioridade ? String(tarefa.prioridade) : ""
  );
  const [tag, setTag] = useState(tarefa.tag ?? "");
  const [link, setLink] = useState(tarefa.link ?? "");
  const [linkSite, setLinkSite] = useState(tarefa.link_site ?? "");
  const [conteudo, setConteudo] = useState(tarefa.conteudo ?? "");
  const [pasta, setPasta] = useState<{ raiz: RaizPasta; caminho: string }>({
    raiz: ehRaiz(tarefa.pasta_raiz) ? tarefa.pasta_raiz : "corporativo",
    caminho: tarefa.pasta_caminho ?? "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pendente, startTransition] = useTransition();
  const { confirmar } = useDialogo();

  useEffect(() => {
    function aoTecla(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTecla);
    return () => document.removeEventListener("keydown", aoTecla);
  }, [onFechar]);

  async function excluir() {
    const ok = await confirmar({
      titulo: "Excluir esta tarefa?",
      descricao:
        tarefa.titulo + "\n\nUse para tarefas que não são mais necessárias. A exclusão é definitiva e não pode ser desfeita.",
      confirmar: "Excluir tarefa",
      perigo: true,
    });
    if (!ok) return;
    setErro(null);
    startTransition(async () => {
      const res = await excluirTarefa(tarefa.id);
      if (res.erro) setErro(res.erro);
      else {
        onExcluida?.(tarefa.id);
        onFechar();
      }
    });
  }

  function salvar() {
    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      const res = await salvarTarefa(tarefa.id, {
        titulo,
        descricao,
        status,
        responsavel_id: responsavelId || null,
        prazo: prazo || null,
        prioridade: prioridade ? parseInt(prioridade, 10) : null,
        tag,
        link,
        conteudo,
        pasta_raiz: pasta.raiz,
        pasta_caminho: pasta.caminho,
        colaborador_id: colaboradorId || null,
        link_site: linkSite,
      });
      if (res.erro) {
        setErro(res.erro);
        return;
      }
      setSalvo(true);
      const nomePessoa =
        pessoas.find((p) => p.id === responsavelId)?.nome ?? null;
      onSalvo({
        ...tarefa,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        status,
        responsavel_id: responsavelId || null,
        responsavel_nome: nomePessoa ?? tarefa.responsaveis_notion ?? null,
        prazo: prazo || null,
        prioridade: prioridade ? parseInt(prioridade, 10) : null,
        tag: tag.trim() || null,
        link: link.trim() || null,
        link_site: linkSite.trim() || null,
        conteudo: conteudo || null,
        colaborador_id: colaboradorId || null,
        colaborador_nome: pessoas.find((p) => p.id === colaboradorId)?.nome ?? null,
        pasta_raiz: pasta.caminho.trim() ? pasta.raiz : null,
        pasta_caminho: pasta.caminho.trim().replace(/^\\+/, "") || null,
      });
    });
  }

  const linkExterno = link.trim().toLowerCase().startsWith("http")
    ? link.trim()
    : null;
  const linkSiteExterno = linkSite.trim().toLowerCase().startsWith("http") ? linkSite.trim() : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes do card"
        className="w-full max-w-3xl rounded-xl border bg-card shadow-xl"
      >
        {/* Cabeçalho */}
        <div className="flex items-start gap-3 border-b p-5">
          <div className="min-w-0 flex-1">
            {tarefa.codigo || tarefa.criada_em ? (
              <p className="mb-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                {tarefa.codigo ? <span className="font-semibold tracking-wide text-foreground/80">{tarefa.codigo}</span> : null}
                {criadaEm(tarefa.criada_em) ? <span>Criado em {criadaEm(tarefa.criada_em)}</span> : null}
              </p>
            ) : null}
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              aria-label="Título"
              className="h-auto border-0 px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onFechar}
            aria-label="Fechar"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="space-y-6 p-5">
          <ItensEstoqueTarefa tarefaId={tarefa.id} />

          {/* Propriedades */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="td-status">Status</Label>
              <Select
                id="td-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TarefaStatus)}
              >
                {ORDEM_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {TAREFA_STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-resp">Responsável</Label>
              <Select
                id="td-resp"
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
              >
                <option value="">
                  {tarefa.responsaveis_notion
                    ? `Sem vínculo (${tarefa.responsaveis_notion})`
                    : "Sem responsável"}
                </option>
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-colab">Colaborador</Label>
              <Select id="td-colab" value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)}>
                <option value="">Sem colaborador</option>
                {pessoas
                  .filter((p) => p.id !== responsavelId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-prazo">Prazo</Label>
              <Input
                id="td-prazo"
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-prio">Prioridade</Label>
              <Select
                id="td-prio"
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value)}
              >
                <option value="">—</option>
                <option value="1">1 (mais alta)</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5 (mais baixa)</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-tag">Tags</Label>
              <Input
                id="td-tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Ex.: RH"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-url">URL de referência</Label>
              <div className="flex gap-2">
                <Input
                  id="td-url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://"
                />
                {linkExterno ? (
                  <Button asChild variant="outline" size="icon">
                    <a
                      href={linkExterno}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Abrir URL"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-url-site">URL do nosso site</Label>
              <div className="flex gap-2">
                <Input id="td-url-site" value={linkSite} onChange={(e) => setLinkSite(e.target.value)} placeholder="https://" />
                {linkSiteExterno ? (
                  <Button asChild variant="outline" size="icon">
                    <a href={linkSiteExterno} target="_blank" rel="noopener noreferrer" aria-label="Abrir URL do nosso site">
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
            <CampoPasta id="td-pasta" raiz={pasta.raiz} caminho={pasta.caminho} unidades={unidades} onChange={setPasta} />
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="td-desc">Descrição</Label>
              <Textarea
                id="td-desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="min-h-[70px]"
              />
            </div>
          </div>

          {/* Corpo do card */}
          <ConteudoCard valor={conteudo} onChange={setConteudo} />

          <AnexosTarefa tarefaId={tarefa.id} />

          <ConversaDoCard tarefaId={tarefa.id} pessoas={pessoas} usuarioId={usuarioId} responsavelId={tarefa.responsavel_id} />

          {tarefa.origemHref ? (
            <Link
              href={tarefa.origemHref}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-4" /> {tarefa.origemLabel}
            </Link>
          ) : null}
        </div>

        {/* Rodapé */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t p-4">
          {podeExcluir ? (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={excluir}
              disabled={pendente}
            >
              <Trash2 className="size-4" /> Excluir tarefa
            </Button>
          ) : null}
          {erro ? <span className="text-sm text-destructive">{erro}</span> : null}
          {salvo ? (
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <Check className="size-4" /> Salvo
            </span>
          ) : null}
          <Button type="button" variant="outline" onClick={onFechar}>
            Fechar
          </Button>
          <Button type="button" onClick={salvar} disabled={pendente}>
            {pendente ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

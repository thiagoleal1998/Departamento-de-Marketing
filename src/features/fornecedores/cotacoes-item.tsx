"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { BadgeCheck, ExternalLink, FileText, Loader2, Paperclip, Pencil, Plus, Trash2, X } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { useDialogo } from "@/components/shared/dialogo-provider";
import {
  excluirCotacao,
  listarCotacoesItem,
  listarFornecedores,
  prepararEnvioNota,
  salvarCotacao,
} from "./actions";
import { FornecedorForm } from "./fornecedor-form";
import { GraficoPrecos } from "./grafico-precos";
import {
  ACCEPT_NOTA,
  BUCKET_NOTAS,
  MAX_BYTES_NOTA,
  TIPOS_NOTA,
  dataBr,
  lerValor,
  moeda,
  type Cotacao,
  type Fornecedor,
} from "./tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InputData } from "@/components/ui/input-data";

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const tipoDe = (f: File) => f.type || (f.name.toLowerCase().endsWith(".xml") ? "text/xml" : f.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");

interface Form {
  fornecedor_id: string;
  data_cotacao: string;
  valor_unitario: string;
  quantidade: string;
  prazo_entrega_dias: string;
  condicoes: string;
  observacao: string;
  contratado: boolean;
  data_compra: string;
  valor_total_pago: string;
  nota_fiscal_numero: string;
  nota_fiscal_caminho: string | null;
  nota_fiscal_nome: string | null;
}

const vazio = (): Form => ({
  fornecedor_id: "",
  data_cotacao: hoje(),
  valor_unitario: "",
  quantidade: "",
  prazo_entrega_dias: "",
  condicoes: "",
  observacao: "",
  contratado: false,
  data_compra: "",
  valor_total_pago: "",
  nota_fiscal_numero: "",
  nota_fiscal_caminho: null,
  nota_fiscal_nome: null,
});

/** Aba Fornecedor do produto: preços cotados, quem foi contratado, contato, nota fiscal e gráfico. */
export function CotacoesItem({ itemId }: { itemId: string }) {
  const { confirmar, avisar } = useDialogo();
  const [cotacoes, setCotacoes] = useState<{ itens: Cotacao[]; indisponivel?: boolean; erro?: string } | null>(null);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [editando, setEditando] = useState<string | "nova" | null>(null);
  const [f, setF] = useState<Form>(vazio());
  const [novoForn, setNovoForn] = useState(false);
  const [enviandoNota, setEnviandoNota] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  const arq = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    const [c, fs] = await Promise.all([listarCotacoesItem(itemId), listarFornecedores()]);
    setCotacoes(c);
    setFornecedores(fs.itens);
  }, [itemId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const forn = new Map(fornecedores.map((x) => [x.id, x]));

  function abrirNova() {
    setF(vazio());
    setErro(null);
    setEditando("nova");
  }
  function abrirEdicao(c: Cotacao) {
    setF({
      fornecedor_id: c.fornecedor_id,
      data_cotacao: c.data_cotacao,
      valor_unitario: String(c.valor_unitario).replace(".", ","),
      quantidade: c.quantidade?.toString() ?? "",
      prazo_entrega_dias: c.prazo_entrega_dias?.toString() ?? "",
      condicoes: c.condicoes ?? "",
      observacao: c.observacao ?? "",
      contratado: c.contratado,
      data_compra: c.data_compra ?? "",
      valor_total_pago: c.valor_total_pago === null ? "" : String(c.valor_total_pago).replace(".", ","),
      nota_fiscal_numero: c.nota_fiscal_numero ?? "",
      nota_fiscal_caminho: null, // só troca se enviar outro; ver "manterNota"
      nota_fiscal_nome: c.nota_fiscal_nome,
    });
    setManterNota(c.nota_fiscal_nome ? { nome: c.nota_fiscal_nome, url: c.nota_fiscal_url } : null);
    setErro(null);
    setEditando(c.id);
  }

  // Nota já gravada na cotação (mantida enquanto não enviar outra).
  const [manterNota, setManterNota] = useState<{ nome: string; url: string | null } | null>(null);

  async function escolherNota(arquivos: FileList | null) {
    const arquivo = arquivos?.[0];
    if (!arquivo) return;
    setErro(null);
    const tipo = tipoDe(arquivo);
    if (!TIPOS_NOTA.includes(tipo)) return setErro("Use PDF, imagem (PNG, JPG, WebP) ou XML.");
    if (arquivo.size > MAX_BYTES_NOTA) return setErro("O arquivo pode ter no máximo 15 MB.");
    setEnviandoNota(true);
    try {
      const prep = await prepararEnvioNota(itemId, arquivo.name, tipo, arquivo.size);
      if (prep.erro || !prep.caminho || !prep.token) return setErro(prep.erro ?? "Falha ao preparar o envio.");
      const { error } = await criarClienteBrowser().storage.from(BUCKET_NOTAS).uploadToSignedUrl(prep.caminho, prep.token, arquivo, { contentType: tipo });
      if (error) return setErro("Não foi possível enviar o arquivo. Tente novamente.");
      setF((p) => ({ ...p, nota_fiscal_caminho: prep.caminho!, nota_fiscal_nome: arquivo.name }));
      setManterNota(null);
    } catch {
      setErro("Não foi possível enviar o arquivo. Tente novamente.");
    } finally {
      setEnviandoNota(false);
      if (arq.current) arq.current.value = "";
    }
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    start(async () => {
      // Sem arquivo novo, mantém a nota que já estava gravada.
      const atual = editando && editando !== "nova" ? cotacoes?.itens.find((c) => c.id === editando) : undefined;
      let caminho = f.nota_fiscal_caminho;
      let nomeNota = f.nota_fiscal_nome;
      if (!caminho && manterNota && atual) {
        // O servidor preserva o caminho antigo quando recebe o mesmo (buscado lá); aqui sinalizamos mantendo o nome.
        nomeNota = manterNota.nome;
      }
      const r = await salvarCotacao(itemId, editando === "nova" ? null : editando, { ...f, nota_fiscal_caminho: caminho, nota_fiscal_nome: nomeNota });
      if (r.erro) return setErro(r.erro);
      setEditando(null);
      await carregar();
    });
  }

  async function excluir(c: Cotacao) {
    const ok = await confirmar({
      titulo: "Excluir esta cotação?",
      descricao: `${c.fornecedor_nome} — ${moeda(c.valor_unitario)} em ${dataBr(c.data_cotacao)}${c.contratado ? "\n\nEla está marcada como compra feita." : ""}`,
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    const r = await excluirCotacao(c.id);
    if (r.erro) void avisar(r.erro, "Não foi possível excluir");
    else await carregar();
  }

  if (cotacoes === null) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </p>
    );
  }
  if (cotacoes.erro) return <p className="py-6 text-sm text-muted-foreground">{cotacoes.erro}</p>;
  if (cotacoes.indisponivel) {
    return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Fornecedores e cotações ainda não foram ativados no banco (migration 0063).</p>;
  }

  const itens = cotacoes.itens;
  const contratadas = itens.filter((c) => c.contratado);
  const totalGasto = contratadas.reduce((s, c) => s + (c.valor_total_pago ?? (c.quantidade ? c.quantidade * c.valor_unitario : 0)), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {itens.length} cotação(ões) · {contratadas.length} compra(s)
          {contratadas.length > 0 && totalGasto > 0 ? ` · ${moeda(totalGasto)} gastos` : ""}
        </p>
        {editando === null ? (
          <Button size="sm" onClick={abrirNova}>
            <Plus className="size-4" /> Registrar cotação
          </Button>
        ) : null}
      </div>

      {editando !== null ? (
        <form onSubmit={salvar} className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{editando === "nova" ? "Nova cotação" : "Editar cotação"}</h3>
            <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={() => setEditando(null)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="co-forn">Fornecedor *</Label>
              <div className="flex gap-2">
                <Select id="co-forn" value={f.fornecedor_id} onChange={(e) => set("fornecedor_id", e.target.value)} required>
                  <option value="">Selecione…</option>
                  {fornecedores.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nome}
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="outline" onClick={() => setNovoForn(true)}>
                  <Plus className="size-4" /> Novo
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-valor">Valor unitário (R$) *</Label>
              <Input id="co-valor" inputMode="decimal" value={f.valor_unitario} onChange={(e) => set("valor_unitario", e.target.value)} placeholder="12,50" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-data">Data da cotação *</Label>
              <InputData id="co-data"  value={f.data_cotacao} onChange={(e) => set("data_cotacao", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-qtd">Quantidade cotada</Label>
              <Input id="co-qtd" type="number" min={1} value={f.quantidade} onChange={(e) => set("quantidade", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-prazo">Prazo de entrega (dias)</Label>
              <Input id="co-prazo" type="number" min={0} value={f.prazo_entrega_dias} onChange={(e) => set("prazo_entrega_dias", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="co-cond">Condições (pagamento, frete, validade da proposta)</Label>
              <Input id="co-cond" value={f.condicoes} onChange={(e) => set("condicoes", e.target.value)} maxLength={500} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="co-obs">Observação</Label>
              <Textarea id="co-obs" value={f.observacao} onChange={(e) => set("observacao", e.target.value)} rows={2} maxLength={1000} />
            </div>

            <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
              <input type="checkbox" checked={f.contratado} onChange={(e) => set("contratado", e.target.checked)} className="size-4 accent-primary" />
              Este fornecedor foi contratado (compra feita)
            </label>

            {f.contratado ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="co-dc">Data da compra</Label>
                  <InputData id="co-dc"  value={f.data_compra} onChange={(e) => set("data_compra", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="co-total">Valor total pago (R$)</Label>
                  <Input id="co-total" inputMode="decimal" value={f.valor_total_pago} onChange={(e) => set("valor_total_pago", e.target.value)} placeholder="1.250,00" />
                  {f.valor_total_pago && lerValor(f.valor_total_pago) === null ? <p className="text-xs text-destructive">Valor inválido.</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="co-nf">Número da nota fiscal</Label>
                  <Input id="co-nf" value={f.nota_fiscal_numero} onChange={(e) => set("nota_fiscal_numero", e.target.value)} maxLength={60} />
                </div>
                <div className="space-y-1.5">
                  <Label>Arquivo da nota fiscal</Label>
                  <input ref={arq} type="file" accept={ACCEPT_NOTA} className="hidden" onChange={(e) => void escolherNota(e.target.files)} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => arq.current?.click()} disabled={enviandoNota}>
                      {enviandoNota ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                      {f.nota_fiscal_nome || manterNota ? "Trocar arquivo" : "Anexar nota"}
                    </Button>
                    {f.nota_fiscal_caminho && f.nota_fiscal_nome ? (
                      <span className="truncate text-xs text-muted-foreground">{f.nota_fiscal_nome}</span>
                    ) : manterNota ? (
                      <span className="truncate text-xs text-muted-foreground">{manterNota.nome} (atual)</span>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>
          {erro ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendente || enviandoNota}>
              {pendente ? <Loader2 className="size-4 animate-spin" /> : null} Salvar
            </Button>
          </div>
        </form>
      ) : null}

      {itens.length > 0 ? (
        <div className="rounded-lg border p-3">
          <h3 className="mb-2 text-sm font-semibold">Evolução dos preços</h3>
          <GraficoPrecos cotacoes={itens} />
        </div>
      ) : (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma cotação registrada para este produto. Clique em &ldquo;Registrar cotação&rdquo; para guardar o preço de um fornecedor.
        </p>
      )}

      {itens.length > 0 ? (
        <ul className="space-y-2">
          {itens.map((c) => {
            const fo = forn.get(c.fornecedor_id);
            return (
              <li key={c.id} className="space-y-2 rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {c.fornecedor_nome}
                      {c.contratado ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-900">
                          <BadgeCheck className="size-3.5" /> Contratado
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">Cotado em {dataBr(c.data_cotacao)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">{moeda(c.valor_unitario)}</p>
                    <p className="text-xs text-muted-foreground">por unidade</p>
                  </div>
                </div>

                <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                  {c.quantidade ? (
                    <div>
                      <dt className="inline text-muted-foreground">Quantidade: </dt>
                      <dd className="inline">{c.quantidade} un. ({moeda(c.quantidade * c.valor_unitario)})</dd>
                    </div>
                  ) : null}
                  {c.prazo_entrega_dias !== null ? (
                    <div>
                      <dt className="inline text-muted-foreground">Prazo de entrega: </dt>
                      <dd className="inline">{c.prazo_entrega_dias} dia(s)</dd>
                    </div>
                  ) : null}
                  {c.condicoes ? (
                    <div className="sm:col-span-2">
                      <dt className="inline text-muted-foreground">Condições: </dt>
                      <dd className="inline">{c.condicoes}</dd>
                    </div>
                  ) : null}
                  {c.observacao ? (
                    <div className="sm:col-span-2">
                      <dt className="inline text-muted-foreground">Obs.: </dt>
                      <dd className="inline whitespace-pre-line">{c.observacao}</dd>
                    </div>
                  ) : null}
                  {fo && (fo.contato_nome || fo.telefone || fo.email) ? (
                    <div className="sm:col-span-2">
                      <dt className="inline text-muted-foreground">Contato: </dt>
                      <dd className="inline">
                        {[fo.contato_nome, fo.telefone, fo.email].filter(Boolean).join(" · ")}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {c.contratado ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
                    <span>Compra em {dataBr(c.data_compra)}</span>
                    {c.valor_total_pago !== null ? <span>Total pago: <strong>{moeda(c.valor_total_pago)}</strong></span> : null}
                    {c.nota_fiscal_numero ? <span>NF nº {c.nota_fiscal_numero}</span> : null}
                    {c.nota_fiscal_url ? (
                      <a href={c.nota_fiscal_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline">
                        <FileText className="size-3.5" /> {c.nota_fiscal_nome ?? "Nota fiscal"} <ExternalLink className="size-3" />
                      </a>
                    ) : c.nota_fiscal_nome ? (
                      <span>{c.nota_fiscal_nome}</span>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => abrirEdicao(c)}>
                    <Pencil className="size-3.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void excluir(c)} className="text-destructive hover:text-destructive">
                    <Trash2 className="size-3.5" /> Excluir
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {novoForn ? (
        <FornecedorForm
          aoFechar={() => setNovoForn(false)}
          aoSalvar={async (id) => {
            setNovoForn(false);
            await carregar();
            set("fornecedor_id", id);
          }}
        />
      ) : null}
    </div>
  );
}

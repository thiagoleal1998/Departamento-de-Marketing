"use client";

import { useEffect, useState, useTransition } from "react";
import { BadgeCheck, ChevronDown, ChevronUp, ExternalLink, FileText, Globe, Loader2, Mail, Pencil, Phone, Plus, Search, Store, Trash2, UserRound } from "lucide-react";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { excluirFornecedor, listarCotacoesFornecedor } from "./actions";
import { FornecedorForm } from "./fornecedor-form";
import { dataBr, moeda, type Cotacao, type Fornecedor } from "./tipos";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface FornecedorResumo extends Fornecedor {
  cotacoes: number;
  compras: number;
  totalGasto: number;
}

/** Aba Fornecedores do Estoque: cadastro, contato e histórico de cotações/compras de cada um. */
export function FornecedoresPainel({ fornecedores, indisponivel }: { fornecedores: FornecedorResumo[]; indisponivel?: boolean }) {
  const { confirmar, avisar } = useDialogo();
  const [busca, setBusca] = useState("");
  const [formulario, setFormulario] = useState<Fornecedor | "novo" | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  const termo = busca.trim().toLowerCase();
  const visiveis = fornecedores.filter(
    (f) =>
      !termo ||
      [f.nome, f.contato_nome, f.email, f.telefone, f.cnpj].some((v) => (v ?? "").toLowerCase().includes(termo))
  );

  async function excluir(f: FornecedorResumo) {
    const ok = await confirmar({
      titulo: "Remover este fornecedor?",
      descricao: f.cotacoes > 0 ? `${f.nome}\n\nEle tem ${f.cotacoes} cotação(ões) registrada(s): o histórico é mantido e ele só deixa de aparecer na lista.` : f.nome,
      confirmar: "Remover",
      perigo: true,
    });
    if (!ok) return;
    start(async () => {
      const r = await excluirFornecedor(f.id);
      if (r.erro) void avisar(r.erro, "Não foi possível remover");
    });
  }

  if (indisponivel) {
    return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Fornecedores ainda não foram ativados no banco (migration 0063).</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar fornecedor…" aria-label="Buscar fornecedor" className="h-9 w-64 pl-8" />
        </div>
        <Button onClick={() => setFormulario("novo")}>
          <Plus className="size-4" /> Novo fornecedor
        </Button>
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {fornecedores.length === 0 ? "Nenhum fornecedor cadastrado ainda. Cadastre aqui ou direto na aba Fornecedor de um produto." : "Nenhum fornecedor encontrado."}
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visiveis.map((f) => (
            <li key={f.id} className="lg:[&:has([data-aberto=true])]:col-span-2">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Store className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{f.nome}</h3>
                        {f.cnpj ? <p className="text-xs text-muted-foreground">CNPJ {f.cnpj}</p> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" aria-label={`Editar ${f.nome}`} onClick={() => setFormulario(f)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Remover ${f.nome}`} onClick={() => void excluir(f)} disabled={pendente}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <ul className="space-y-1 text-sm">
                    {f.contato_nome ? (
                      <li className="flex items-center gap-2">
                        <UserRound className="size-3.5 text-muted-foreground" /> {f.contato_nome}
                      </li>
                    ) : null}
                    {f.telefone ? (
                      <li className="flex items-center gap-2">
                        <Phone className="size-3.5 text-muted-foreground" /> {f.telefone}
                      </li>
                    ) : null}
                    {f.email ? (
                      <li className="flex items-center gap-2">
                        <Mail className="size-3.5 text-muted-foreground" />
                        <a href={`mailto:${f.email}`} className="break-all hover:underline">
                          {f.email}
                        </a>
                      </li>
                    ) : null}
                    {f.site ? (
                      <li className="flex items-center gap-2">
                        <Globe className="size-3.5 text-muted-foreground" />
                        <a href={f.site} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">
                          {f.site.replace(/^https?:\/\//, "")}
                        </a>
                      </li>
                    ) : null}
                  </ul>
                  {f.observacoes ? <p className="whitespace-pre-line text-xs italic text-muted-foreground">{f.observacoes}</p> : null}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                    <span>
                      {f.cotacoes} cotação(ões) · {f.compras} compra(s)
                      {f.totalGasto > 0 ? ` · ${moeda(f.totalGasto)}` : ""}
                    </span>
                    {f.cotacoes > 0 ? (
                      <Button variant="ghost" size="sm" onClick={() => setAberto(aberto === f.id ? null : f.id)}>
                        {aberto === f.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />} Histórico
                      </Button>
                    ) : null}
                  </div>

                  {aberto === f.id ? <HistoricoFornecedor fornecedorId={f.id} /> : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {formulario !== null ? (
        <FornecedorForm
          fornecedor={formulario === "novo" ? undefined : formulario}
          aoFechar={() => setFormulario(null)}
          aoSalvar={() => setFormulario(null)}
        />
      ) : null}
    </div>
  );
}

function HistoricoFornecedor({ fornecedorId }: { fornecedorId: string }) {
  const [itens, setItens] = useState<(Cotacao & { produto: string })[] | null>(null);
  useEffect(() => {
    let vivo = true;
    void listarCotacoesFornecedor(fornecedorId).then((r) => vivo && setItens(r.itens));
    return () => {
      vivo = false;
    };
  }, [fornecedorId]);

  if (itens === null) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Carregando histórico…
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-3 py-1.5 font-medium">Produto</th>
            <th className="px-3 py-1.5 font-medium">Data</th>
            <th className="px-3 py-1.5 text-right font-medium">Valor unit.</th>
            <th className="px-3 py-1.5 font-medium">Situação</th>
            <th className="px-3 py-1.5 font-medium">Nota fiscal</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {itens.map((c) => (
            <tr key={c.id}>
              <td className="px-3 py-1.5 font-medium">{c.produto}</td>
              <td className="px-3 py-1.5">{dataBr(c.data_cotacao)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{moeda(c.valor_unitario)}</td>
              <td className="px-3 py-1.5">
                {c.contratado ? (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-800">
                    <BadgeCheck className="size-3.5" /> Contratado{c.valor_total_pago !== null ? ` (${moeda(c.valor_total_pago)})` : ""}
                  </span>
                ) : (
                  "Só cotação"
                )}
              </td>
              <td className="px-3 py-1.5">
                {c.nota_fiscal_url ? (
                  <a href={c.nota_fiscal_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <FileText className="size-3.5" /> {c.nota_fiscal_numero ? `NF ${c.nota_fiscal_numero}` : "Abrir"} <ExternalLink className="size-3" />
                  </a>
                ) : (
                  c.nota_fiscal_numero ?? "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

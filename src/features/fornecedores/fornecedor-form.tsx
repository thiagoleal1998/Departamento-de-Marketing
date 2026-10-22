"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { salvarFornecedor } from "./actions";
import type { Fornecedor } from "./tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Janela para cadastrar ou editar um fornecedor. */
export function FornecedorForm({
  fornecedor,
  aoFechar,
  aoSalvar,
}: {
  fornecedor?: Fornecedor;
  aoFechar: () => void;
  /** Recebe o id do fornecedor salvo. */
  aoSalvar: (id: string) => void;
}) {
  const [nome, setNome] = useState(fornecedor?.nome ?? "");
  const [contato, setContato] = useState(fornecedor?.contato_nome ?? "");
  const [telefone, setTelefone] = useState(fornecedor?.telefone ?? "");
  const [email, setEmail] = useState(fornecedor?.email ?? "");
  const [site, setSite] = useState(fornecedor?.site ?? "");
  const [cnpj, setCnpj] = useState(fornecedor?.cnpj ?? "");
  const [obs, setObs] = useState(fornecedor?.observacoes ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTecla);
    return () => document.removeEventListener("keydown", aoTecla);
  }, [aoFechar]);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setErro(null);
    start(async () => {
      const r = await salvarFornecedor(fornecedor?.id ?? null, {
        nome,
        contato_nome: contato,
        telefone,
        email,
        site,
        cnpj,
        observacoes: obs,
      });
      if (r.erro || !r.id) return setErro(r.erro ?? "Não foi possível salvar.");
      aoSalvar(r.id);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <form onSubmit={salvar} role="dialog" aria-modal="true" aria-label="Fornecedor" className="w-full max-w-lg space-y-4 rounded-xl border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{fornecedor ? "Editar fornecedor" : "Novo fornecedor"}</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={aoFechar}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fo-nome">Nome / razão social *</Label>
            <Input id="fo-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={160} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fo-contato">Contato (pessoa)</Label>
            <Input id="fo-contato" value={contato} onChange={(e) => setContato(e.target.value)} maxLength={160} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fo-tel">Telefone / WhatsApp</Label>
            <Input id="fo-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} maxLength={40} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fo-email">E-mail</Label>
            <Input id="fo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fo-cnpj">CNPJ</Label>
            <Input id="fo-cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} maxLength={24} placeholder="00.000.000/0000-00" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fo-site">Site</Label>
            <Input id="fo-site" type="url" inputMode="url" value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fo-obs">Observações</Label>
            <Textarea id="fo-obs" value={obs} onChange={(e) => setObs(e.target.value)} rows={3} maxLength={1000} />
          </div>
        </div>

        {erro ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2 className="size-4 animate-spin" /> : null} Salvar
          </Button>
        </div>
      </form>
    </div>
  );
}

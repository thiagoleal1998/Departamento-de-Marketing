"use client";

import { useState } from "react";
import { Check, Copy, FolderOpen } from "lucide-react";
import { RAIZES, atalhoWindows, caminhoCompleto, ehRaiz, separarCaminho, type RaizPasta, type Unidades } from "@/lib/pastas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

/** Caminho da pasta da tarefa: raiz (Corporativo, Público ou HD) + caminho, mostrado com a letra de cada pessoa. */
export function CampoPasta({
  id,
  raiz,
  caminho,
  unidades,
  onChange,
}: {
  id: string;
  raiz: RaizPasta;
  caminho: string;
  unidades: Unidades;
  onChange: (v: { raiz: RaizPasta; caminho: string }) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const completo = caminho.trim() ? caminhoCompleto(raiz, caminho.trim(), unidades) : "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(completo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copie o caminho:", completo);
    }
  }

  function abrir() {
    const blob = new Blob([atalhoWindows(raiz, caminho.trim(), unidades)], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "abrir-pasta.url";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label htmlFor={id}>Caminho da pasta</Label>
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        <Select
          aria-label="Local da pasta"
          value={raiz}
          onChange={(e) => ehRaiz(e.target.value) && onChange({ raiz: e.target.value, caminho })}
          className="w-full sm:w-44"
        >
          {RAIZES.map((r) => (
            <option key={r.chave} value={r.chave}>
              {r.label} ({unidades[r.chave]}:)
            </option>
          ))}
        </Select>
        <Input
          id={id}
          value={caminho}
          onChange={(e) => onChange(separarCaminho(e.target.value, raiz, unidades))}
          placeholder="00 mkt - corporativo\Marketing\… (pode colar o caminho completo)"
          className="min-w-0 flex-1"
        />
        {completo ? (
          <>
            <Button type="button" variant="outline" size="icon" onClick={() => void copiar()} aria-label="Copiar caminho" title="Copiar caminho">
              {copiado ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={abrir} aria-label="Abrir pasta" title="Baixa um atalho que abre a pasta no Explorer">
              <FolderOpen className="size-4" />
            </Button>
          </>
        ) : null}
      </div>
      {completo ? <p className="break-all text-xs text-muted-foreground">{completo}</p> : null}
    </div>
  );
}

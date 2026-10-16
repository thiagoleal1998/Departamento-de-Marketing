"use client";

import { useTransition } from "react";
import { atualizarCategoriaProjeto } from "./actions";
import { CATEGORIAS, type CategoriaProjeto } from "./categorias";
import { Select } from "@/components/ui/select";

/** Troca a categoria do projeto (Evento, Feira, Famtour, VT...). */
export function CategoriaControl({
  projetoId,
  categoria,
}: {
  projetoId: string;
  categoria: CategoriaProjeto;
}) {
  const [pendente, startTransition] = useTransition();
  return (
    <Select
      aria-label="Categoria do projeto"
      value={categoria}
      disabled={pendente}
      onChange={(e) =>
        startTransition(async () => {
          await atualizarCategoriaProjeto(projetoId, e.target.value);
        })
      }
      className="h-9 w-44"
    >
      {CATEGORIAS.map((c) => (
        <option key={c.valor} value={c.valor}>
          {c.label}
        </option>
      ))}
    </Select>
  );
}

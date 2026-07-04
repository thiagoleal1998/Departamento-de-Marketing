"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Seletor de arquivo com rótulo em português (substitui o "Choose file"). */
export function FileInputBR({
  name,
  accept,
}: {
  name: string;
  accept?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState("");
  return (
    <div className="flex items-center gap-3">
      <input
        ref={ref}
        type="file"
        name={name}
        accept={accept}
        className="hidden"
        onChange={(e) => setNome(e.target.files?.[0]?.name ?? "")}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => ref.current?.click()}
      >
        <Upload className="size-4" /> Escolher arquivo
      </Button>
      <span className="truncate text-sm text-muted-foreground">
        {nome || "Nenhum arquivo selecionado"}
      </span>
    </div>
  );
}

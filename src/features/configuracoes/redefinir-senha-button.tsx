"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Check } from "lucide-react";
import { redefinirSenhaUsuario } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RedefinirSenhaButton({
  id,
  nome,
}: {
  id: string;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pendente, startTransition] = useTransition();

  function salvar() {
    setErro(null);
    setOk(false);
    startTransition(async () => {
      const res = await redefinirSenhaUsuario(id, senha);
      if (res.erro) {
        setErro(res.erro);
      } else {
        setOk(true);
        setSenha("");
        setAberto(false);
        setTimeout(() => setOk(false), 4000);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {ok ? (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <Check className="size-4" /> Senha de {nome} alterada
          </span>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setAberto((v) => !v);
            setErro(null);
          }}
        >
          <KeyRound className="size-4" /> Trocar senha
        </Button>
      </div>
      {aberto ? (
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Input
            type="text"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Nova senha (mín. 6 caracteres)"
            autoComplete="off"
            className="h-9 w-64"
          />
          <Button
            type="button"
            size="sm"
            onClick={salvar}
            disabled={pendente || senha.length < 6}
          >
            {pendente ? <Loader2 className="size-4 animate-spin" /> : null}
            Salvar senha
          </Button>
        </div>
      ) : null}
      {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bloco que passou do tempo limite: continua tentando sozinho algumas vezes (o que a IA e as buscas já resolveram
 * fica guardado, então cada tentativa avança de onde parou) e, se ainda não deu, oferece o botão.
 */
export function AvisoDemora({ titulo, maxTentativas = 3, intervaloMs = 8000 }: { titulo: string; maxTentativas?: number; intervaloMs?: number }) {
  const router = useRouter();
  const [tentativa, setTentativa] = useState(1);
  const [parou, setParou] = useState(false);

  useEffect(() => {
    if (parou) return;
    const id = setInterval(() => {
      setTentativa((t) => {
        if (t >= maxTentativas) {
          setParou(true);
          return t;
        }
        router.refresh();
        return t + 1;
      });
    }, intervaloMs);
    return () => clearInterval(id);
  }, [parou, maxTentativas, intervaloMs, router]);

  return (
    <div className="flex h-full min-h-24 flex-wrap items-center gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
      {parou ? (
        <>
          <span>
            <strong className="text-foreground">{titulo}</strong> ainda não ficou pronto. O que já foi lido fica guardado, então mais uma tentativa costuma terminar.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setTentativa(1);
              setParou(false);
              router.refresh();
            }}
          >
            <RotateCcw className="size-3.5" /> Tentar de novo
          </Button>
        </>
      ) : (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span>
            <strong className="text-foreground">{titulo}</strong> está demorando; continuo buscando… (tentativa {tentativa} de {maxTentativas})
          </span>
        </>
      )}
    </div>
  );
}

import { Fragment } from "react";
import { cn } from "@/lib/utils";

/** Endereços http(s):// ou começando com www. (até o próximo espaço). */
const LINK = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
/** Pontuação que costuma vir colada ao fim do endereço numa frase ("veja https://x.com/a.") e não faz parte dele. */
const SOBRA = /[.,;:!?)\]}]+$/;

/**
 * Texto da mensagem com os endereços clicáveis (abrem em nova aba). O restante continua texto puro:
 * nada de HTML da mensagem é interpretado.
 */
export function TextoComLinks({ texto, minha, className }: { texto: string; minha?: boolean; className?: string }) {
  const partes = texto.split(LINK);
  return (
    <p className={cn("whitespace-pre-wrap break-words", className)}>
      {partes.map((parte, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{parte}</Fragment>;
        const sobra = SOBRA.exec(parte)?.[0] ?? "";
        const endereco = sobra ? parte.slice(0, -sobra.length) : parte;
        const href = /^https?:\/\//i.test(endereco) ? endereco : "https://" + endereco;
        return (
          <Fragment key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("break-all font-medium underline underline-offset-2 hover:opacity-80", minha ? "text-inherit" : "text-primary")}
            >
              {endereco}
            </a>
            {sobra}
          </Fragment>
        );
      })}
    </p>
  );
}

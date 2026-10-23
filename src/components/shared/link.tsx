import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * Link do Next sem pré-carregamento automático. O painel é todo dinâmico: pré-carregar cada link do
 * menu a cada tela aberta gerava dezenas de chamadas ao servidor (e consumo de CPU) sem necessidade.
 */
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}

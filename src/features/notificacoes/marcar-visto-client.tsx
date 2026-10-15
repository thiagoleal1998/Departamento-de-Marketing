"use client";

import { useEffect } from "react";
import { marcarLidasPorLink } from "./actions";

export function MarcarVistoClient({
  prefixo,
  exato,
}: {
  prefixo: string;
  exato: boolean;
}) {
  useEffect(() => {
    void marcarLidasPorLink(prefixo, exato);
  }, [prefixo, exato]);
  return null;
}

/* eslint-disable @next/next/no-img-element */
import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Marca do sistema: exibe a logo enviada (config) ou, na ausência dela,
 * o ícone padrão dentro de um quadrado com a cor primária.
 */
export function Marca({
  logoUrl,
  boxClassName,
  iconClassName,
  imgClassName,
}: {
  logoUrl?: string | null;
  boxClassName?: string;
  iconClassName?: string;
  imgClassName?: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Logo"
        className={cn("w-auto object-contain", imgClassName)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-primary text-primary-foreground",
        boxClassName
      )}
    >
      <Megaphone className={cn("size-5", iconClassName)} />
    </div>
  );
}

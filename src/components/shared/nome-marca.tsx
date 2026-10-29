import { cn } from "@/lib/utils";

/**
 * Nome ao lado do logo: o departamento em destaque (maiúsculas) e a empresa logo abaixo.
 * Sem corte com reticências: onde o espaço é curto, "Departamento de Marketing" quebra em duas linhas.
 */
export function NomeMarca({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 flex-col leading-tight", className)}>
      <span className="text-[10.5px] font-bold uppercase leading-[1.15]">Departamento de Marketing</span>
      <span className="mt-0.5 text-xs text-muted-foreground">Litoral Verde Operadora</span>
    </span>
  );
}

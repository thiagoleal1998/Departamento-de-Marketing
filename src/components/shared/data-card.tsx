import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function DataCard({
  titulo,
  valor,
  icone: Icone,
  descricao,
  href,
  className,
}: {
  titulo: string;
  valor: string | number;
  icone?: LucideIcon;
  descricao?: string;
  href?: string;
  className?: string;
}) {
  const conteudo = (
    <Card
      className={cn(
        href &&
          "h-full transition-colors hover:border-primary/40 hover:bg-accent/30",
        className
      )}
    >
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{titulo}</p>
          <p className="text-2xl font-semibold tracking-tight">{valor}</p>
          {descricao ? (
            <p className="text-xs text-muted-foreground">{descricao}</p>
          ) : null}
        </div>
        {Icone ? (
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Icone className="size-5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {conteudo}
      </Link>
    );
  }
  return conteudo;
}

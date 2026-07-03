/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import { cn } from "@/lib/utils";
import { iniciais } from "@/lib/utils";

function Avatar({
  nome,
  src,
  className,
}: {
  nome?: string | null;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={nome ?? "Avatar"}
        className={cn(
          "size-9 shrink-0 rounded-full object-cover",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        className
      )}
      aria-hidden
    >
      {iniciais(nome)}
    </div>
  );
}

export { Avatar };

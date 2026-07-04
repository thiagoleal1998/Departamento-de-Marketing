"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dropdown customizado (não-nativo) com abertura animada e opções
 * destacadas na cor primária (mesma dos CTAs). Submete em formulários
 * via um input que também valida `required`.
 */
export function SelectMenu({
  name,
  options,
  placeholder = "Selecione",
  defaultValue = "",
  required = false,
  id,
  className,
}: {
  name: string;
  options: string[];
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  id?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Carrega o valor no formulário e valida required (invisível). */}
      <input
        type="text"
        name={name}
        value={value}
        required={required}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />

      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full origin-top overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
        >
          {options.map((opt) => {
            const selecionado = opt === value;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={selecionado}
                onClick={() => {
                  setValue(opt);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  selecionado
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-primary/10 hover:text-primary"
                )}
              >
                <span className="truncate">{opt}</span>
                {selecionado ? <Check className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/** Botão para alternar entre tema claro e escuro (persistido em localStorage). */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMontado(true);
  }, []);

  function alternar() {
    const novo = !dark;
    setDark(novo);
    document.documentElement.classList.toggle("dark", novo);
    try {
      localStorage.setItem("tema", novo ? "dark" : "light");
    } catch {
      // ignora indisponibilidade do localStorage
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
      className={
        className ??
        "flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      }
    >
      {/* Evita mismatch de hidratação mostrando o ícone só após montar */}
      {montado && dark ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </button>
  );
}

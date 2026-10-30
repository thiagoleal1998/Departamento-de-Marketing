"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { rolarOpcaoNaLista } from "./select-rolagem";

type Opcao = { tipo: "opcao"; valor: string; rotulo: React.ReactNode; texto: string; desabilitada: boolean } | { tipo: "grupo"; rotulo: string };

function textoDe(no: React.ReactNode): string {
  if (no === null || no === undefined || typeof no === "boolean") return "";
  if (typeof no === "string" || typeof no === "number") return String(no);
  if (Array.isArray(no)) return no.map(textoDe).join("");
  if (React.isValidElement(no)) return textoDe((no.props as { children?: React.ReactNode }).children);
  return "";
}

/** Lê os <option>/<optgroup> recebidos como filhos (a mesma API do select nativo). */
function coletar(filhos: React.ReactNode, saida: Opcao[] = []): Opcao[] {
  React.Children.forEach(filhos, (f) => {
    if (!React.isValidElement(f)) return;
    const p = f.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean; label?: string };
    if (f.type === "option") {
      const texto = textoDe(p.children);
      saida.push({ tipo: "opcao", valor: p.value === undefined ? texto : String(p.value), rotulo: p.children, texto, desabilitada: !!p.disabled });
    } else if (f.type === "optgroup") {
      if (p.label) saida.push({ tipo: "grupo", rotulo: p.label });
      coletar(p.children, saida);
    } else if (f.type === React.Fragment) {
      coletar(p.children, saida);
    }
  });
  return saida;
}

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Seleção moderna: o botão e a lista são desenhados aqui (nada de lista nativa do navegador),
 * mas continua com a mesma API do <select> — filhos <option>, value/defaultValue, onChange, name, required,
 * disabled e ref —, então funciona em formulários comuns, estados controlados e react-hook-form.
 * Um <select> nativo invisível guarda o valor; a lista abre num portal para não ser cortada por cartões ou janelas.
 */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, id, value, defaultValue, disabled, onChange, "aria-label": ariaLabel, ...props },
  refExterno
) {
  const nativo = React.useRef<HTMLSelectElement | null>(null);
  const botao = React.useRef<HTMLButtonElement>(null);
  const lista = React.useRef<HTMLDivElement>(null);
  const buscaInput = React.useRef<HTMLInputElement>(null);
  const opcoes = coletar(children);
  const reais = opcoes.filter((o): o is Extract<Opcao, { tipo: "opcao" }> => o.tipo === "opcao");

  const [atual, setAtual] = React.useState<string>(() => String(value ?? defaultValue ?? reais[0]?.valor ?? ""));
  const [aberto, setAberto] = React.useState(false);
  const [busca, setBusca] = React.useState("");
  const [ativo, setAtivo] = React.useState(0);
  const [pos, setPos] = React.useState<{ left: number; width: number; top?: number; bottom?: number; max: number } | null>(null);

  // Mantém o rótulo em dia com o valor real (estado controlado, reset de formulário, react-hook-form).
  React.useEffect(() => {
    const v = nativo.current?.value;
    if (v !== undefined && v !== atual) setAtual(v);
  }, [atual, value, children]);

  const juntarRef = (el: HTMLSelectElement | null) => {
    nativo.current = el;
    if (typeof refExterno === "function") refExterno(el);
    else if (refExterno) (refExterno as React.MutableRefObject<HTMLSelectElement | null>).current = el;
  };

  const comBusca = reais.length > 10;
  const visiveis = opcoes.filter((o) => o.tipo === "grupo" || !busca || sem(o.texto).includes(sem(busca)));
  const selecionaveis = visiveis.filter((o): o is Extract<Opcao, { tipo: "opcao" }> => o.tipo === "opcao" && !o.desabilitada);

  function abrir() {
    const r = botao.current?.getBoundingClientRect();
    if (!r) return;
    const abaixo = window.innerHeight - r.bottom - 12;
    const acima = r.top - 12;
    const embaixo = abaixo >= 200 || abaixo >= acima;
    const largura = Math.max(r.width, 200);
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - largura - 8)),
      width: largura,
      ...(embaixo ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 }),
      max: Math.max(160, Math.min(320, embaixo ? abaixo : acima)),
    });
    setBusca("");
    setAtivo(Math.max(0, reais.filter((o) => !o.desabilitada).findIndex((o) => o.valor === atual)));
    setAberto(true);
  }

  function escolher(v: string) {
    setAberto(false);
    botao.current?.focus({ preventScroll: true });
    const el = nativo.current;
    if (!el || el.value === v) return;
    // Mesmo caminho de uma escolha nativa: dispara "change" para onChange / react-hook-form.
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(el, v);
    el.dispatchEvent(new Event("change", { bubbles: true }));
    setAtual(v);
  }

  React.useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (!botao.current?.contains(alvo) && !lista.current?.contains(alvo)) setAberto(false);
    };
    const rolar = (e: Event) => {
      if (!lista.current?.contains(e.target as Node)) setAberto(false);
    };
    const fechar = () => setAberto(false);
    document.addEventListener("mousedown", fora);
    window.addEventListener("scroll", rolar, true);
    window.addEventListener("resize", fechar);
    return () => {
      document.removeEventListener("mousedown", fora);
      window.removeEventListener("scroll", rolar, true);
      window.removeEventListener("resize", fechar);
    };
  }, [aberto]);

  React.useEffect(() => {
    if (!aberto) return;
    const area = lista.current?.querySelector<HTMLElement>('[role="listbox"]');
    const opcao = area?.querySelector<HTMLElement>("[data-ativo=true]");
    if (area && opcao) rolarOpcaoNaLista(area, opcao);
  }, [aberto, ativo]);

  React.useEffect(() => {
    if (aberto) buscaInput.current?.focus({ preventScroll: true });
  }, [aberto]);

  function teclas(e: React.KeyboardEvent) {
    if (!aberto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setAberto(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((i) => Math.min(selecionaveis.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = selecionaveis[ativo];
      if (o) escolher(o.valor);
    }
  }

  const escolhida = reais.find((o) => o.valor === atual);
  const ativoValor = selecionaveis[ativo]?.valor;

  return (
    <div className="relative">
      {/* Guarda o valor do formulário (e valida "required"); a escolha é feita pelo botão. */}
      <select
        ref={juntarRef}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={onChange}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        {...props}
      >
        {children}
      </select>

      <button
        ref={botao}
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        onKeyDown={teclas}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-sm shadow-sm outline-none transition-colors hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50",
          aberto && "border-primary ring-2 ring-primary/25",
          className
        )}
      >
        {/* Todas as opções empilhadas (invisíveis) fixam a largura no texto mais comprido: o botão não "pula" ao trocar. */}
        <span className="grid min-w-0 max-w-[18rem] flex-1">
          <span className={cn("col-start-1 row-start-1 truncate", !atual && "text-muted-foreground")}>{escolhida?.rotulo ?? ""}</span>
          {reais.map((o, i) => (
            <span key={i} aria-hidden className="invisible col-start-1 row-start-1 h-0 overflow-hidden whitespace-nowrap">
              {o.rotulo}
            </span>
          ))}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", aberto && "rotate-180 text-primary")} />
      </button>

      {aberto && pos
        ? createPortal(
            <div
              ref={lista}
              style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.max }}
              className="z-[200] flex flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 duration-150"
            >
              {comBusca ? (
                <div className="relative border-b p-2">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={buscaInput}
                    value={busca}
                    onChange={(e) => {
                      setBusca(e.target.value);
                      setAtivo(0);
                    }}
                    onKeyDown={teclas}
                    placeholder="Buscar…"
                    className="h-8 w-full rounded-md bg-muted/60 pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground focus:bg-muted"
                  />
                </div>
              ) : null}
              <div role="listbox" className="min-h-0 flex-1 overflow-y-auto p-1">
                {visiveis.filter((o) => o.tipo === "opcao").length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">Nada encontrado</p>
                ) : null}
                {visiveis.map((o, i) =>
                  o.tipo === "grupo" ? (
                    <p key={`g${i}`} className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {o.rotulo}
                    </p>
                  ) : (
                    <button
                      key={i}
                      type="button"
                      role="option"
                      aria-selected={o.valor === atual}
                      disabled={o.desabilitada}
                      data-ativo={o.valor === ativoValor}
                      onClick={() => escolher(o.valor)}
                      onMouseEnter={() => {
                        const k = selecionaveis.findIndex((s) => s.valor === o.valor);
                        if (k >= 0) setAtivo(k);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                        o.valor === atual ? "bg-primary text-primary-foreground" : o.valor === ativoValor ? "bg-primary/10 text-primary" : "hover:bg-muted",
                        o.valor === "" && o.valor !== atual && "text-muted-foreground"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{o.rotulo}</span>
                      {o.valor === atual ? <Check className="size-4 shrink-0" /> : null}
                    </button>
                  )
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
});
Select.displayName = "Select";

export { Select };

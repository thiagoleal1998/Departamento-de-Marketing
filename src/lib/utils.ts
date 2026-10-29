import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Fuso de todo o painel: datas e horas sempre no horário de Brasília (servidor e navegador mostram o mesmo dia). */
export const FUSO_BR = "America/Sao_Paulo";

const SO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Dia (aaaa-mm-dd) de um prazo/data no horário de Brasília. Serve para preencher campo de data e comparar dias.
 * Uma data pura (aaaa-mm-dd) volta como está.
 */
export function diaBrasilia(data: string | Date | null | undefined): string {
  if (!data) return "";
  if (typeof data === "string" && SO_DATA.test(data)) return data;
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: FUSO_BR });
}

/**
 * Prazo escolhido num campo de data (aaaa-mm-dd) → valor a gravar em coluna de data e hora: meio-dia em Brasília.
 * Gravar só a data faria o banco usar meia-noite UTC (21h do dia anterior em Brasília) e o prazo "voltaria" um dia.
 */
export function prazoParaGravar(dia: string | null | undefined): string | null {
  const v = (dia ?? "").trim();
  if (!v) return null;
  return SO_DATA.test(v) ? `${v}T12:00:00-03:00` : v;
}

/** Formata uma data ISO para o padrão brasileiro (dd/mm/aaaa), no horário de Brasília. */
export function formatarData(data: string | Date | null | undefined): string {
  if (!data) return "—";
  if (typeof data === "string") {
    const m = data.match(SO_DATA);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    timeZone: FUSO_BR,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Formata data e hora no padrão brasileiro. */
export function formatarDataHora(data: string | Date | null | undefined): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    timeZone: FUSO_BR,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Formata um valor numérico como moeda brasileira (R$). */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Retorna as iniciais de um nome para avatares. */
export function iniciais(nome: string | null | undefined): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

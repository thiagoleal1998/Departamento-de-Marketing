export type TipoSolicitacao =
  | "folga"
  | "ferias"
  | "saida_cedo"
  | "entrada_tarde"
  | "home_office"
  | "consulta"
  | "banco_horas"
  | "atestado"
  | "outro";

export type StatusSolicitacao =
  | "pendente"
  | "aprovada"
  | "recusada"
  | "cancelada";

export interface Solicitacao {
  id: string;
  solicitante_id: string;
  tipo: TipoSolicitacao;
  data_inicio: string;
  data_fim: string | null;
  hora: string | null;
  motivo: string | null;
  status: StatusSolicitacao;
  resposta: string | null;
  decidido_por: string | null;
  decidido_em: string | null;
  created_at: string;
}

export const TIPO_LABEL: Record<TipoSolicitacao, string> = {
  folga: "Folga / day off",
  ferias: "Férias",
  saida_cedo: "Saída mais cedo",
  entrada_tarde: "Entrada mais tarde",
  home_office: "Home office",
  consulta: "Consulta / compromisso",
  banco_horas: "Banco de horas",
  atestado: "Atestado",
  outro: "Outro",
};

/** Tipos que pedem um horário (ex.: "saio às 16h"). */
export const TIPOS_COM_HORA: TipoSolicitacao[] = [
  "saida_cedo",
  "entrada_tarde",
  "consulta",
];

/** Tipos que normalmente cobrem um período (data de início e fim). */
export const TIPOS_COM_PERIODO: TipoSolicitacao[] = [
  "folga",
  "ferias",
  "home_office",
  "atestado",
  "banco_horas",
];

export const STATUS_META: Record<
  StatusSolicitacao,
  { label: string; variant: "warning" | "success" | "danger" | "muted" }
> = {
  pendente: { label: "Pendente", variant: "warning" },
  aprovada: { label: "Aprovada", variant: "success" },
  recusada: { label: "Recusada", variant: "danger" },
  cancelada: { label: "Cancelada", variant: "muted" },
};

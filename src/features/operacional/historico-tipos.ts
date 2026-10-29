import { MOTIVO_LABEL, type MotivoAlteracao } from "@/features/atas/tipos";

/** Motivos para mudar o prazo de uma tarefa: os mesmos das atas, para os relatórios falarem a mesma língua. */
export const MOTIVOS_PRAZO = Object.entries(MOTIVO_LABEL) as [MotivoAlteracao, string][];
export const rotuloMotivo = (chave: string | null | undefined) => (chave && chave in MOTIVO_LABEL ? MOTIVO_LABEL[chave as MotivoAlteracao] : null);

export type CampoHistorico = "criada" | "status" | "prazo" | "responsavel" | "colaborador" | "solicitante" | "prioridade" | "titulo";

export interface EventoTarefa {
  id: string;
  campo: CampoHistorico | string;
  de: string | null;
  para: string | null;
  motivo: string | null;
  detalhe: string | null;
  autor: string | null;
  quando: string;
}

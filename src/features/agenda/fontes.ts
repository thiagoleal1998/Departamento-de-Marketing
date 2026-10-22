/**
 * Agendas do Google Calendar exibidas no dashboard. O painel lê o endereço iCal da agenda
 * (a agenda precisa estar pública ou ter o "endereço secreto em formato iCal" configurado).
 * Para agendas privadas, defina a variável de ambiente indicada com o endereço secreto completo.
 */
export interface FonteAgenda {
  id: string;
  rotulo: string;
  /** Classe de cor do ponto/etiqueta. */
  cor: string;
  email: string;
  /** Variável de ambiente com o endereço secreto (.ics) — tem prioridade sobre o endereço público. */
  envSecreto: string;
}

export const FONTES_AGENDA: FonteAgenda[] = [
  { id: "reunioes", rotulo: "Reuniões LV", cor: "bg-emerald-500", email: "reunioeslitoralverdeviagens@gmail.com", envSecreto: "AGENDA_ICS_REUNIOES" },
  { id: "thiago", rotulo: "Thiago", cor: "bg-sky-500", email: "thiago.leallv@gmail.com", envSecreto: "AGENDA_ICS_THIAGO" },
  { id: "jonas", rotulo: "Jonas", cor: "bg-violet-500", email: "jonas.almeida@litoralverde.com.br", envSecreto: "AGENDA_ICS_JONAS" },
];

export function urlIcs(f: FonteAgenda): string {
  const secreto = process.env[f.envSecreto];
  if (secreto && /^https:\/\/calendar\.google\.com\//.test(secreto)) return secreto;
  return `https://calendar.google.com/calendar/ical/${encodeURIComponent(f.email)}/public/basic.ics`;
}

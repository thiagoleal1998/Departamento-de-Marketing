"use client";

import { useId, useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Aba = "divulgacao" | "rd" | "operacional" | "atividade";

interface Texto {
  titulo: string;
  fontes: string[];
  calculos: string[];
  limites: string[];
}

const TEXTOS: Record<Aba, Texto> = {
  divulgacao: {
    titulo: "Divulgação",
    fontes: [
      "Planilha de Divulgação diária (Google Sheets), lida pelo painel uma vez por dia, às 10h30, e também ao abrir a tela se estiver desatualizada. Cada linha da planilha vira um registro na tabela de divulgações: data, tipo (nacional ou internacional), canal, produto, temporada e vantagem.",
    ],
    calculos: [
      "Divulgações: número de linhas da planilha no período escolhido. Cada linha é uma divulgação em um dia.",
      "Produtos / destinos distintos: nomes únicos, sem diferenciar acento nem maiúscula. Uma oferta nacional pode citar vários produtos separados por “---”, e cada um conta.",
      "Nacional · Internacional: quantas linhas são de cada tipo. Dias com divulgação: datas diferentes com pelo menos uma linha.",
      "Por período: o painel lê o campo “temporada” e procura palavras-chave. “Baixa” é Baixa temporada; “last minute” é Last minute; Dia das Mães, Black Friday e afins são Data comemorativa; “férias” é Férias; Natal, Réveillon, Carnaval, Semana Santa, Páscoa, Corpus Christi e feriados nacionais são Feriado. O que não bater com nenhuma palavra vai para “Sem período informado”.",
      "Por regime: o painel procura no texto da vantagem (primeiros 600 caracteres): all inclusive, pensão completa, meia pensão, café da manhã ou sem alimentação. Se não achar, fica “Não informado”.",
    ],
    limites: [
      "Período e regime são deduzidos por palavras, não por uma classificação manual: “Sem período informado” alto quer dizer que a planilha não traz a temporada ou o texto não bate com as palavras acima.",
    ],
  },
  rd: {
    titulo: "E-mails (RD Station)",
    fontes: [
      "API do RD Station Marketing (relatório de e-mails). Os números são buscados pelo botão de atualizar desta aba e guardados no painel, um registro por e-mail enviado. O RD informa dados até ontem e limita cerca de 60 consultas por hora.",
    ],
    calculos: [
      "Enviados, entregues, aberturas únicas, cliques únicos e descadastros: valores como o RD informa, somados sobre os e-mails do período.",
      "Taxa de abertura = aberturas únicas ÷ entregues. Taxa de clique = cliques únicos ÷ entregues (somando todos os e-mails do grupo, e não a média das taxas de cada e-mail).",
      "Cruzamento com a divulgação: o e-mail é ligado ao produto, ao período e ao regime divulgados no mesmo dia (usando a tabela de Divulgação).",
    ],
    limites: ["Se a conta do RD Station não estiver conectada, esta aba fica vazia."],
  },
  operacional: {
    titulo: "Evolução do operacional",
    fontes: [
      "Tarefas: quadro de Tarefas (data de criação, prazo, status e responsável de cada uma, lidas na hora em que a página abre).",
      "Atas: reuniões e itens da ata (status, prazo, responsável, tipo de demanda e motivo de adiamento), lidos na hora.",
    ],
    calculos: [
      "Tarefas abertas = todas que não estão em “Concluída”. Atrasadas = abertas com o prazo anterior a hoje (dias de atraso contados em horário de Brasília). Esperando aprovação = as que estão nas colunas Aprovação (Marco, Gustavo ou Thiago) ou Alterações.",
      "Tarefas criadas por mês = por data de criação. “Já concluídas” = quantas das criadas naquele mês estão concluídas hoje.",
      "Prazo médio combinado = média de (prazo − data de criação), em dias, das tarefas criadas em cada mês; entram só prazos de 0 a 180 dias e meses com 3 ou mais tarefas.",
      "Atas, por reunião realizada: itens = linhas da ata; em aberto = não concluídos nem cancelados; novos = assunto que aparece pela primeira vez; % concluído = concluídos ÷ itens; adiado = item aberto cujo prazo ficou mais tarde que na reunião anterior do mesmo assunto.",
      "Reuniões até concluir = média de reuniões em que um assunto aparece até ser concluído. Motivos, tipos de demanda e adiamentos por pessoa vêm do que está registrado nas atas.",
      "Leitura rápida: compara a média das últimas 4 reuniões com a das 4 anteriores.",
    ],
    limites: [
      "As tarefas guardam a data de criação, mas não a de conclusão. Por isso o painel não mede quantos dias cada tarefa levou para ser feita; esse tempo só existe, em reuniões, para os itens das atas.",
      "Os números das atas dependem de a ata ser preenchida (status, prazo, motivo).",
    ],
  },
  atividade: {
    titulo: "Acessos e atividade",
    fontes: [
      "O próprio painel, com um sinal do navegador a cada minuto e a cada troca de tela. Cada sinal grava na tabela de sessões; entradas e saídas, com IP e navegador, ficam na tabela de acessos; as telas abertas e as ações (criar, editar, excluir) ficam no registro de atividades.",
    ],
    calculos: [
      "Tempo ativo = tempo com a aba visível e alguma interação (mouse ou teclado) nos últimos 5 minutos. Tempo inativo = aba aberta, mas sem uso por mais de 5 minutos ou escondida.",
      "Cada sinal credita no máximo 2 minutos. Se passam 5 minutos sem sinal, a sessão termina e a seguinte começa outra.",
      "Telas mais usadas e ações = contagem do registro de atividades no período.",
    ],
    limites: ["Só mede quem está com o painel aberto em um navegador; o tempo fora do painel (outros sistemas) não aparece."],
  },
};

/** “Como apuramos estes dados”: de onde vêm as informações e como cada número é calculado, na aba aberta. Abre e fecha com animação suave. */
export function ComoApuramos({ aba }: { aba: Aba }) {
  const t = TEXTOS[aba];
  const [aberto, setAberto] = useState(false);
  const id = useId();
  return (
    <section className="rounded-xl border bg-card text-sm">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={id}
        className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left font-medium transition-colors hover:bg-accent/40"
      >
        <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>Como apuramos estes dados · {t.titulo}</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
          {aberto ? "Fechar" : "Ver fontes e fórmulas"}
          <ChevronDown className={cn("size-4 transition-transform duration-300 ease-out", aberto && "rotate-180")} aria-hidden />
        </span>
      </button>
      {/* A altura anima de 0 ao tamanho do conteúdo (grid 0fr → 1fr), sem precisar medir nada. */}
      <div id={id} className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none", aberto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden" aria-hidden={!aberto}>
          <div className="space-y-3 border-t px-4 py-3">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">De onde vêm as informações</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {t.fontes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Como cada número é calculado</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {t.calculos.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">O que observar</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {t.limites.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </section>
            <div className="flex justify-end">
              <button type="button" onClick={() => setAberto(false)} tabIndex={aberto ? 0 : -1} className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

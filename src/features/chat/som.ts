"use client";

const ARQUIVO = "/sons/notificacao.mp3";
/** Intervalo entre um som e o próximo quando chegam várias mensagens de uma vez (cada uma toca o seu). */
const ESPACO_MS = 350;
/** Se a fila já passou disso, o som novo é descartado (evita tocar por minutos depois de uma rajada enorme). */
const FILA_MAX_MS = 6000;

const jaTocadas = new Set<string>();
let proximo = 0;
let ultimoComId = 0;

/** Navegadores só liberam o som depois de um clique/tecla na página: faz isso uma vez, em silêncio. */
function liberarSom() {
  if (typeof window === "undefined") return;
  const eventos = ["pointerdown", "keydown", "touchstart"];
  const liberar = () => {
    for (const ev of eventos) window.removeEventListener(ev, liberar);
    try {
      const a = new Audio(ARQUIVO);
      a.muted = true;
      void a.play().then(() => a.pause()).catch(() => {});
    } catch {
      /* sem som */
    }
  };
  for (const ev of eventos) window.addEventListener(ev, liberar, { passive: true });
}
liberarSom();

function tocar() {
  try {
    const a = new Audio(ARQUIVO);
    a.volume = 0.7;
    void a.play().catch(() => {});
  } catch {
    /* sem som */
  }
}

/**
 * Toca o som de notificação do chat: UM por mensagem recebida (`id` = id da mensagem). Vários trechos da tela
 * escutam a mesma mensagem; o id evita tocar duas vezes pela mesma, e mensagens diferentes nunca se cancelam:
 * numa rajada, os sons saem em sequência, um para cada.
 */
export function tocarSomChat(id: string) {
  if (typeof window === "undefined") return;
  if (jaTocadas.has(id)) return;
  jaTocadas.add(id);
  if (jaTocadas.size > 500) jaTocadas.delete(jaTocadas.values().next().value as string);
  ultimoComId = Date.now();

  const agora = Date.now();
  const quando = Math.max(agora, proximo);
  if (quando - agora > FILA_MAX_MS) return;
  proximo = quando + ESPACO_MS;
  if (quando === agora) tocar();
  else setTimeout(tocar, quando - agora);
}

/**
 * Som pedido pelo aviso do navegador (service worker), que não traz o id da mensagem. Só toca se a própria tela
 * não tocou nesse meio-tempo (a tela recebe a mensagem em tempo real e toca com o id certo; isto cobre o caso
 * em que ela não recebeu).
 */
export function tocarSomChatPorAviso() {
  if (typeof window === "undefined") return;
  const pedido = Date.now();
  setTimeout(() => {
    if (ultimoComId < pedido - 3000) tocarSomChat("aviso-" + pedido + "-" + Math.random().toString(36).slice(2, 8));
  }, 2000);
}

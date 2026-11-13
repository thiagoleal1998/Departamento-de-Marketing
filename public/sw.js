/* Service worker: notificações push do Painel de Marketing. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { titulo: "Nova notificação", corpo: event.data ? event.data.text() : "" };
  }

  const titulo = dados.titulo || "Painel de Marketing";
  const opcoes = {
    body: dados.corpo || "",
    icon: "/marca-icone.png",
    badge: "/marca-icone.png",
    tag: dados.tag || undefined,
    renotify: Boolean(dados.tag),
    data: { url: dados.url || "/" },
  };

  event.waitUntil(
    (async () => {
      // Se o painel já está aberto e em foco, o aviso aparece dentro dele.
      const janelas = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const emFoco = janelas.some((c) => c.focused);
      if (emFoco) return;
      // Mensagem do chat com o painel aberto em outra aba/janela: quem toca é o próprio painel, com o som do painel
      // (o aviso do navegador vai em silêncio para não tocar o som padrão do computador por cima).
      const ehChat = typeof dados.tag === "string" && dados.tag.startsWith("chat-");
      if (ehChat && janelas.length > 0) {
        for (const c of janelas) c.postMessage({ tipo: "som-chat" });
        await self.registration.showNotification(titulo, { ...opcoes, silent: true });
        return;
      }
      await self.registration.showNotification(titulo, opcoes);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      let origemDestino = self.location.origin;
      try {
        origemDestino = new URL(destino, self.location.origin).origin;
      } catch {
        // mantém a origem do próprio service worker
      }
      for (const c of janelas) {
        // Só reaproveita abas do mesmo endereço do destino (avisos antigos podem apontar para outro domínio).
        if (!c.url.startsWith(origemDestino)) continue;
        if ("focus" in c) {
          await c.focus();
          if ("navigate" in c) {
            try {
              await c.navigate(destino);
            } catch {
              // ignora
            }
          }
          return;
        }
      }
      await self.clients.openWindow(destino);
    })()
  );
});

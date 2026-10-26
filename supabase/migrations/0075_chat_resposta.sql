-- =====================================================================
-- 0075 — Chat: responder a uma mensagem específica (resposta com citação).
-- A mensagem guarda qual mensagem está respondendo; o chat mostra a citação
-- acima da resposta. Se a original for apagada, a resposta continua. Pode rodar
-- mais de uma vez.
-- =====================================================================

alter table chat_mensagens add column if not exists resposta_a uuid references chat_mensagens(id) on delete set null;
create index if not exists chat_msg_resposta_idx on chat_mensagens (resposta_a) where resposta_a is not null;

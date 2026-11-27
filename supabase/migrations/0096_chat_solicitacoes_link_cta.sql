-- Solicitações pelo chat: link de destino do botão (CTA), ou seja, a página para onde a peça deve levar a pessoa.
alter table chat_solicitacoes
  add column if not exists link_cta text;

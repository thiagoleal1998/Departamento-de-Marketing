-- =====================================================================
-- 0042 — Presença do Jonas Almeida: as 4 ausências (férias) passam a
-- "Dispensado" (ele não teve ausência). Mantém a observação.
-- Rode DEPOIS da 0038. Pode rodar mais de uma vez.
-- =====================================================================

update reunioes r
set presencas = (
  select jsonb_agg(
    case
      when e->>'nome' = 'Jonas Almeida' and e->>'presenca' = 'Ausente'
        then jsonb_set(e, '{presenca}', '"Dispensado"')
      else e
    end
    order by ord
  )
  from jsonb_array_elements(r.presencas) with ordinality as t(e, ord)
)
where r.presencas @> '[{"nome": "Jonas Almeida", "presenca": "Ausente"}]'::jsonb;

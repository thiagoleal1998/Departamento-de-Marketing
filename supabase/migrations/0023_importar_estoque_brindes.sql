-- =====================================================================
-- 0023 — Importa o inventário de brindes da planilha "Inventário BRINDE"
-- Rode DEPOIS da 0012 (Estoque) e da 0022. Pode rodar mais de uma vez
-- (itens já existentes são ignorados).
-- Total: 25 itens, com o histórico de contagens (14/07 a 22/09/2026).
-- =====================================================================

do $import$
declare
  r jsonb;
  c jsonb;
  v_id uuid;
  v_ultimo int;
  v_saldo int;
  v_delta int;
  v_primeiro boolean;
  v_data date;
begin
  for r in select * from jsonb_array_elements($json$[{"nome":"Malas","descricao":"MV650-AZ","cor":"Azul","danificados":0,"observacoes":null,"categoria":"brinde","contagens":[{"data":"2026-07-14","total":13},{"data":"2026-09-22","total":7}]},{"nome":"Garrafa","descricao":"Logo, tampa e danos em geral conferidos","cor":"Verde","danificados":3,"observacoes":"2 amassadas e 1 sem pressão","categoria":"brinde","contagens":[{"data":"2026-07-14","total":50},{"data":"2026-07-21","total":49},{"data":"2026-07-22","total":50},{"data":"2026-07-24","total":49},{"data":"2026-09-22","total":41}]},{"nome":"Garrafa","descricao":"Logo, tampa e danos em geral conferidos","cor":"Preta","danificados":58,"observacoes":"sem pressão","categoria":"brinde","contagens":[{"data":"2026-07-14","total":58},{"data":"2026-07-21","total":57},{"data":"2026-07-22","total":58},{"data":"2026-07-24","total":57},{"data":"2026-08-07","total":42},{"data":"2026-09-22","total":19}]},{"nome":"Canetas 08000212022","descricao":"Logo, telefone e embalagens conferidos","cor":"Parda","danificados":0,"observacoes":null,"categoria":"brinde","contagens":[{"data":"2026-07-14","total":51},{"data":"2026-09-22","total":50}]},{"nome":"Copos com tampa","descricao":"Logo, tampa e danos em geral conferidos","cor":"Bege","danificados":0,"observacoes":null,"categoria":"brinde","contagens":[{"data":"2026-07-14","total":106},{"data":"2026-09-22","total":106}]},{"nome":"Garrafa fina","descricao":"Logo, tampa e danos em geral conferidos","cor":"Verde","danificados":0,"observacoes":null,"categoria":"brinde","contagens":[{"data":"2026-07-14","total":1},{"data":"2026-09-22","total":0}]},{"nome":"Papel Seda","descricao":null,"cor":"Verde","danificados":0,"observacoes":null,"categoria":"outro","contagens":[{"data":"2026-07-14","total":100},{"data":"2026-09-22","total":100}]},{"nome":"Caixa presente","descricao":"Logo e danos em geral conferidos","cor":"Branca","danificados":2,"observacoes":"2 amassadas","categoria":"outro","contagens":[{"data":"2026-07-14","total":13},{"data":"2026-07-22","total":14},{"data":"2026-07-24","total":13},{"data":"2026-09-22","total":13}]},{"nome":"Saco presente","descricao":"Pequeno","cor":"Verde","danificados":0,"observacoes":null,"categoria":"outro","contagens":[{"data":"2026-07-14","total":2},{"data":"2026-09-22","total":2}]},{"nome":"Saco presente","descricao":"Pequeno","cor":"Prata","danificados":0,"observacoes":null,"categoria":"outro","contagens":[{"data":"2026-07-14","total":10},{"data":"2026-09-22","total":8}]},{"nome":"Saco presente","descricao":"Tamanho XGG","cor":"Prata","danificados":0,"observacoes":null,"categoria":"outro","contagens":[{"data":"2026-07-14","total":1},{"data":"2026-09-22","total":0}]},{"nome":"Fita presente padrão","descricao":null,"cor":"Branca e dourada","danificados":0,"observacoes":"80 fechadas em pacotes e 3 soltas","categoria":"outro","contagens":[{"data":"2026-07-14","total":83},{"data":"2026-09-22","total":40}]},{"nome":"Fita presente","descricao":null,"cor":"Prata","danificados":0,"observacoes":null,"categoria":"outro","contagens":[{"data":"2026-07-14","total":1},{"data":"2026-09-22","total":0}]},{"nome":"Rolo papel pardo","descricao":null,"cor":"Pardo","danificados":0,"observacoes":"parece estar na metade","categoria":"outro","contagens":[{"data":"2026-07-14","total":1},{"data":"2026-09-22","total":1}]},{"nome":"Calculadora","descricao":null,"cor":null,"danificados":0,"observacoes":"não testada","categoria":"brinde","contagens":[{"data":"2026-07-14","total":2},{"data":"2026-09-22","total":2}]},{"nome":"Camisa TMJ UV-50","descricao":"Masculina, Manga longa","cor":"Branca","danificados":0,"observacoes":"G","categoria":"brinde","contagens":[{"data":"2026-07-14","total":4},{"data":"2026-09-22","total":4}]},{"nome":"Camisa TMJ UV-50","descricao":"Feminina, Manga longa","cor":"Branca","danificados":0,"observacoes":"G","categoria":"brinde","contagens":[{"data":"2026-07-14","total":1},{"data":"2026-09-22","total":1}]},{"nome":"Necessaire","descricao":"Iberostar & Litoral Verde","cor":"Preta","danificados":0,"observacoes":null,"categoria":"brinde","contagens":[{"data":"2026-07-14","total":2},{"data":"2026-09-22","total":2}]},{"nome":"Porta retrato","descricao":"Madeira e vidro","cor":"Azul","danificados":0,"observacoes":null,"categoria":"brinde","contagens":[{"data":"2026-07-14","total":1},{"data":"2026-09-22","total":1}]},{"nome":"Placa Grande","descricao":"Acrílico","cor":"Verde","danificados":0,"observacoes":null,"categoria":"outro","contagens":[{"data":"2026-07-14","total":12},{"data":"2026-09-22","total":12}]},{"nome":"Placa Pequena","descricao":"Acrílico","cor":null,"danificados":0,"observacoes":null,"categoria":"outro","contagens":[{"data":"2026-07-14","total":2},{"data":"2026-09-22","total":2}]},{"nome":"Urna","descricao":"Acrílico","cor":null,"danificados":0,"observacoes":null,"categoria":"outro","contagens":[{"data":"2026-07-14","total":1},{"data":"2026-09-22","total":1}]},{"nome":"Adesivo para malas","descricao":"Adesivo LV para malas","cor":"Verde","danificados":0,"observacoes":null,"categoria":"brinde","contagens":[{"data":"2026-07-14","total":8},{"data":"2026-09-22","total":8}]},{"nome":"Placa Transfer","descricao":"Placa para se usada em transfer","cor":"Verde","danificados":0,"observacoes":null,"categoria":"outro","contagens":[{"data":"2026-07-14","total":14},{"data":"2026-09-22","total":14}]},{"nome":"Bola Trionda","descricao":"Bola Adidas Trionda","cor":null,"danificados":0,"observacoes":null,"categoria":"brinde","contagens":[{"data":"2026-07-14","total":0},{"data":"2026-09-22","total":3}]}]$json$::jsonb) loop

    -- Já importado? (mesmo nome + cor + descrição)
    if exists (
      select 1 from estoque_itens e
      where e.nome = r->>'nome'
        and coalesce(e.cor, '') = coalesce(r->>'cor', '')
        and coalesce(e.descricao, '') = coalesce(r->>'descricao', '')
    ) then
      continue;
    end if;

    -- Quantidade atual = última contagem registrada.
    v_ultimo := (r->'contagens'->-1->>'total')::int;

    insert into estoque_itens
      (nome, categoria, quantidade, estoque_minimo, descricao, cor, danificados, observacoes)
    values
      (r->>'nome', r->>'categoria', greatest(v_ultimo, 0), 0,
       r->>'descricao', r->>'cor', coalesce((r->>'danificados')::int, 0), r->>'observacoes')
    returning id into v_id;

    -- Histórico: inventário inicial + diferenças de cada recontagem.
    v_primeiro := true;
    v_saldo := 0;
    for c in select * from jsonb_array_elements(r->'contagens') loop
      v_data := (c->>'data')::date;
      v_delta := (c->>'total')::int - v_saldo;

      if v_delta <> 0 then
        insert into estoque_movimentos
          (item_id, tipo, quantidade, saldo_apos, motivo, created_at)
        values
          (v_id,
           case when v_delta > 0 then 'entrada' else 'saida' end,
           abs(v_delta),
           (c->>'total')::int,
           case when v_primeiro
                then 'Inventário inicial ' || to_char(v_data, 'DD/MM/YYYY')
                else 'Recontagem ' || to_char(v_data, 'DD/MM/YYYY') end,
           v_data::timestamptz + interval '12 hours');
      end if;

      v_saldo := (c->>'total')::int;
      v_primeiro := false;
    end loop;
  end loop;
end
$import$;

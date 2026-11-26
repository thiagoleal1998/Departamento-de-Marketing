import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { Avatar } from "@/components/ui/avatar";
import { lerMembros, type Setor } from "./tipos";

const CORES = ["from-emerald-300 to-teal-300", "from-fuchsia-300 to-violet-300", "from-amber-300 to-orange-300"];

/** Organograma da página: linha de cima, depois a liderança operacional (no centro) e, embaixo, os setores. */
const TOPO = ["diretoria", "gerencia", "supervisao"];
const MEIO = ["lideranca-operacional"];

/**
 * Seção da página inicial: os setores do departamento, o que cada um faz e quem está neles.
 * Só aparece quando há algum texto ou pessoa cadastrados (Gestão > Setores). Antes da migration 0093 não aparece.
 */
export async function SetoresPublicos() {
  if (!servicoDisponivel()) return null;
  const sb = criarClienteAdmin();
  const [setoresR, pessoasR] = await Promise.all([
    sb.from("setores").select("id, nome, descricao, membros, ordem").order("ordem"),
    sb.from("profiles").select("id, nome, avatar_url").eq("ativo", true),
  ]);
  const pessoas = new Map(((pessoasR.data as { id: string; nome: string; avatar_url: string | null }[] | null) ?? []).map((p) => [p.id, p]));
  const setores = ((setoresR.data as Setor[] | null) ?? []).map((s) => ({
    ...s,
    membros: lerMembros(s.membros).filter((m) => pessoas.has(m.profile_id)),
  }));
  if (!setores.some((s) => s.descricao.trim() || s.membros.length > 0)) return null;

  return (
    <section aria-labelledby="setores-titulo" className="mb-14 space-y-5">
      <h2 id="setores-titulo" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Liderança e setores
      </h2>
      {[
        { chave: "topo", itens: setores.filter((s) => TOPO.includes(s.id)), grade: "lg:grid-cols-3" },
        // Um cartão só, na coluna do meio.
        { chave: "meio", itens: setores.filter((s) => MEIO.includes(s.id)), grade: "lg:grid-cols-3 lg:[&>*]:col-start-2" },
        { chave: "setores", itens: setores.filter((s) => !TOPO.includes(s.id) && !MEIO.includes(s.id)), grade: "lg:grid-cols-3" },
      ].map((linha) => (
        <div key={linha.chave} className={`grid gap-4 ${linha.grade}`}>
          {linha.itens.map((s) => (
            <article key={s.id} className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div className="space-y-2">
                <h3 className={`bg-gradient-to-r ${CORES[setores.indexOf(s) % CORES.length]} bg-clip-text pb-0.5 text-2xl font-bold text-transparent`}>{s.nome}</h3>
                {s.descricao.trim() ? <p className="whitespace-pre-line text-sm text-slate-300">{s.descricao}</p> : null}
              </div>
              {s.membros.length > 0 ? (
                <ul className="space-y-3 border-t border-white/10 pt-4">
                  {s.membros.map((m) => {
                    const p = pessoas.get(m.profile_id)!;
                    return (
                      <li key={m.profile_id} className="flex items-start gap-3">
                        <Avatar nome={p.nome} src={p.avatar_url} className="size-10" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{p.nome}</p>
                          {m.funcao ? <p className="whitespace-pre-line text-xs leading-relaxed text-slate-400">{m.funcao}</p> : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}

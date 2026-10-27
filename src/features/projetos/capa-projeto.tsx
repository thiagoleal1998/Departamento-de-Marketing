/* eslint-disable @next/next/no-img-element */

/** Faixa de capa do projeto, com a logo do parceiro sobre a foto (ou sozinha, se não houver foto). */
export function CapaProjeto({ capa, logo, nome }: { capa?: string | null; logo?: string | null; nome: string }) {
  if (!capa && !logo) return null;
  if (!capa) {
    return (
      <div className="inline-flex items-center gap-3 rounded-xl border bg-white p-2.5 shadow-sm">
        <img src={logo!} alt={`Logo do parceiro de ${nome}`} className="h-14 max-w-48 object-contain" />
      </div>
    );
  }
  return (
    <div className="relative h-44 overflow-hidden rounded-2xl border bg-muted sm:h-60">
      <img src={capa} alt={`Capa de ${nome}`} className="size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      {logo ? (
        <div className="absolute bottom-3 left-3 rounded-xl bg-white p-2 shadow-lg">
          <img src={logo} alt={`Logo do parceiro de ${nome}`} className="h-12 max-w-44 object-contain sm:h-14" />
        </div>
      ) : null}
    </div>
  );
}

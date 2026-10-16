import type { AnexoVisivel } from "./anexos";

/** Exibe imagens e vídeos anexados a um envio de Feedback. */
export function AnexosLista({ anexos }: { anexos: AnexoVisivel[] }) {
  if (anexos.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Anexos ({anexos.length})
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {anexos.map((a) =>
          a.tipo.startsWith("video/") ? (
            <video
              key={a.url}
              src={a.url}
              controls
              preload="metadata"
              className="max-h-64 w-full rounded-md border bg-black"
            />
          ) : (
            <a
              key={a.url}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              title={a.nome}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={a.nome}
                className="max-h-64 w-full rounded-md border object-contain"
              />
            </a>
          )
        )}
      </div>
    </div>
  );
}

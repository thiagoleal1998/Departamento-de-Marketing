import type { MetadataRoute } from "next";

/** Permite instalar o painel como app na tela inicial do celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Painel de Marketing",
    short_name: "Marketing",
    description: "Gestão, criação, operação e desenvolvimento do time de marketing.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    // Livre: o tablet precisa girar para o modo horizontal (travar em retrato deixava o app espremido no meio).
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    lang: "pt-BR",
    icons: [
      { src: "/marca-icone.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/marca-icone.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}

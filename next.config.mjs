import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(raiz, "package.json"), "utf-8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Versão do sistema (fonte única: package.json), visível na interface.
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;

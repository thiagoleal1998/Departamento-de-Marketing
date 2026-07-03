import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { obterConfig, estiloDeCor } from "@/lib/config";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Painel do Departamento de Marketing",
  description:
    "Sistema centralizado de gestão, criação, operação e desenvolvimento do time de marketing.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { cor } = await obterConfig();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Cor da marca aplicada às CSS variables do tema */}
        <style dangerouslySetInnerHTML={{ __html: estiloDeCor(cor) }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}

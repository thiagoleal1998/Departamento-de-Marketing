import { notFound } from "next/navigation";
import { ListaProjetos } from "@/features/projetos/lista-projetos";
import { categoriaPorSlug } from "@/features/projetos/categorias";

export const dynamic = "force-dynamic";

export default async function ProjetosCategoriaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const categoria = categoriaPorSlug(slug);
  if (!categoria) notFound();
  return <ListaProjetos categoria={categoria} />;
}

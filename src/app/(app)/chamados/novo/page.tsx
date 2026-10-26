import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Internamente a solicitação vai pelo Feedback; chamados só chegam pelo portal externo. */
export default function NovoChamadoPage() {
  redirect("/chamados");
}

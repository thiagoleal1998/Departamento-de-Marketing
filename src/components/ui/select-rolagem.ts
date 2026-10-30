/** Mantém a opção visível movendo só a lista, sem rolar o formulário ou a página ao redor. */
export function rolarOpcaoNaLista(lista: HTMLElement, opcao: HTMLElement): void {
  const area = lista.getBoundingClientRect();
  const item = opcao.getBoundingClientRect();
  if (item.top < area.top) lista.scrollTop -= area.top - item.top;
  else if (item.bottom > area.bottom) lista.scrollTop += item.bottom - area.bottom;
}

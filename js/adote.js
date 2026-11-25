/* Página "Adote Um Amigo.": todos os animais disponíveis, com Adotar e Salvar */
window.NIPA_DADOS.then((animais) => {
  "use strict";

  const { Store, abrir, moldura, mini, juntar } = window.NIPAFolha;
  const lista = document.querySelector("[data-adote]");

  function cartao(a) {
    const salvo = Store.estaSalvo(a.id);
    return `
      <article class="salvo salvo--ativo salvo--adote">
        <button class="salvo__foto" type="button" data-ficha="${a.id}" aria-label="Ver ficha de ${a.nome}">${moldura(a, "moldura--creme")}</button>
        <h2 class="salvo__nome">${a.nome}</h2>
        <div class="salvo__info"><div>${juntar(a)}</div></div>
        <div class="salvo__acoes">
          <button class="btn" type="button" data-adotar="${a.id}">Adotar</button>
          <button class="btn-ico" type="button" data-salvar-card="${a.id}" aria-pressed="${salvo}" aria-label="${salvo ? `Remover ${a.nome} dos salvos` : `Salvar ${a.nome}`}"><span class="ico ico--salvar"></span></button>
        </div>
        ${mini(a)}
      </article>`;
  }

  function render() {
    const disponiveis = animais.filter((a) => !a.adotado);
    lista.innerHTML = disponiveis.length
      ? disponiveis.map(cartao).join("")
      : '<p style="padding-right:2.65rem">No momento todos os nossos amigos encontraram um lar! Volte em breve.</p>';
  }

  lista.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.ficha) abrir("ficha", b.dataset.ficha, render, b.querySelector(".moldura"));
    else if (b.dataset.adotar) abrir("questionario", b.dataset.adotar, render, b);
    else if (b.dataset.salvarCard) {
      const agora = Store.alternarSalvo(b.dataset.salvarCard);
      b.setAttribute("aria-pressed", String(agora));
    }
  });

  render();
});

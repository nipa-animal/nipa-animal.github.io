/* Página "Adote Um Amigo.": todos os animais disponíveis, com Sobre, Adotar e Salvar */
window.NIPA_DADOS.then((animais) => {
  "use strict";

  const { Store, abrir, moldura, juntar, ICONES } = window.NIPAFolha;
  const lista = document.querySelector("[data-adote]");
  const ROTULOS = { energia: "Energia", carencia: "Carência", brincalhao: "Brincalhão", rebeldia: "Rebeldia" };

  const barras = (a) => `
    <div class="barras">
      ${Object.keys(ROTULOS).map((k) => `
        <div class="barras__linha">
          <span class="barras__ico" aria-hidden="true">${ICONES[k]}</span>
          <span class="barras__trilho" role="meter" aria-label="${ROTULOS[k]}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${a.atributos[k]}"><i style="width:${a.atributos[k]}%"></i></span>
        </div>`).join("")}
    </div>`;

  function cartao(a) {
    const salvo = Store.estaSalvo(a.id);
    return `
      <article class="salvo salvo--ativo salvo--adote">
        <button class="salvo__foto" type="button" data-ficha="${a.id}" aria-label="Ver ficha de ${a.nome}">${moldura(a, "moldura--creme")}</button>
        <h2 class="salvo__nome">${a.nome}</h2>
        <div class="salvo__info"><div>${juntar(a)}</div></div>
        ${barras(a)}
        <div class="salvo__acoes">
          <button class="btn btn--sobre" type="button" data-ficha="${a.id}">Sobre</button>
          <button class="btn btn--adotar" type="button" data-adotar="${a.id}">Adotar</button>
          <button class="btn-ico" type="button" data-salvar-card="${a.id}" aria-pressed="${salvo}" aria-label="${salvo ? `Remover ${a.nome} dos salvos` : `Salvar ${a.nome}`}"><span class="ico ico--salvar"></span></button>
        </div>
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
    if (b.dataset.ficha) {
      const card = b.closest(".salvo");
      abrir("ficha", b.dataset.ficha, render, card.querySelector(".moldura"));
    } else if (b.dataset.adotar) abrir("questionario", b.dataset.adotar, render, b);
    else if (b.dataset.salvarCard) {
      const agora = Store.alternarSalvo(b.dataset.salvarCard);
      b.setAttribute("aria-pressed", String(agora));
      b.setAttribute("aria-label", (agora ? "Remover dos salvos" : "Salvar"));
    }
  });

  render();
});

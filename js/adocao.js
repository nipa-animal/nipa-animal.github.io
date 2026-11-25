/* Página de Adoção: "Adote um amigo." (4 primeiros) e "Amigos salvos." (2 primeiros) */
window.NIPA_DADOS.then((animais) => {
  "use strict";

  const { Store, abrir, moldura } = window.NIPAFolha;
  const gradeAdote = document.querySelector("[data-grade-adote]");
  const gradeSalvos = document.querySelector("[data-grade-salvos]");

  const card = (a) => `
    <button class="animal" type="button" data-id="${a.id}" aria-label="Ver ficha de ${a.nome}">
      ${moldura(a)}
      <h3>${a.nome}</h3>
    </button>`;

  function render() {
    const disponiveis = animais.filter((a) => !a.adotado);
    gradeAdote.innerHTML = disponiveis.length
      ? disponiveis.slice(0, 4).map(card).join("")
      : '<p class="grade__vazio">No momento todos os nossos amigos encontraram um lar!</p>';

    const salvos = Store.salvosOrdenados().slice(0, 2);
    gradeSalvos.innerHTML = salvos.length
      ? salvos.map(card).join("")
      : '<p class="grade__vazio">Toque no marcador da ficha de um amigo para salvá-lo aqui.</p>';
  }

  document.querySelector("main").addEventListener("click", (e) => {
    const c = e.target.closest("[data-id]");
    if (c) abrir("ficha", c.dataset.id, render, c.querySelector(".moldura") || c);
  });

  render();
});

/* Página de Adoção: "Adote um amigo." (4 primeiros) e "Amigos salvos." (4 primeiros) */
window.NIPA_DADOS.then((animais) => {
  "use strict";

  const { Store, abrir, moldura } = window.NIPAFolha;
  const gradeAdote = document.querySelector("[data-grade-adote]");
  const gradeSalvos = document.querySelector("[data-grade-salvos]");

  const card = (a, extra = "") => `
    <button class="animal" type="button" data-id="${a.id}" aria-label="Ver ficha de ${a.nome}">
      ${moldura(a, extra)}
      <h3>${a.nome}</h3>
    </button>`;

  // Preenche a grade; com mais de uma linha, a última ganha o efeito de fade
  function preencher(grade, itens, vazio, extra) {
    grade.innerHTML = itens.length ? itens.map((a) => card(a, extra)).join("") : `<p class="grade__vazio">${vazio}</p>`;
    grade.classList.toggle("grade--fade", itens.length > 2);
  }

  function render() {
    preencher(gradeAdote, animais.filter((a) => !a.adotado).slice(0, 4),
      "No momento todos os nossos amigos encontraram um lar!");
    preencher(gradeSalvos, Store.salvosOrdenados().slice(0, 4),
      "Toque no marcador da ficha de um amigo para salvá-lo aqui.", "moldura--creme");
  }

  document.querySelector("main").addEventListener("click", (e) => {
    const c = e.target.closest("[data-id]");
    if (c) abrir("ficha", c.dataset.id, render, c.querySelector(".moldura") || c);
  });

  render();
});

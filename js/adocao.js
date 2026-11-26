/* Página de Adoção: "Adote um amigo." e "Amigos salvos." em linha única deslizante */
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

  // Fade na última coluna enquanto houver mais amigos para o lado;
  // some quando a pessoa desliza até o fim, para o último ficar visível.
  function atualizarFade(grade) {
    const resta = grade.scrollWidth - grade.clientWidth - grade.scrollLeft;
    grade.classList.toggle("grade--fade", resta > 8);
  }

  function preencher(grade, itens, vazio, extra) {
    const x = grade.scrollLeft; // mantém a posição ao voltar da ficha
    grade.innerHTML = itens.length ? itens.map((a) => card(a, extra)).join("") : `<p class="grade__vazio">${vazio}</p>`;
    grade.style.scrollBehavior = "auto";
    grade.scrollLeft = x;
    grade.style.scrollBehavior = "";
    atualizarFade(grade);
  }

  [gradeAdote, gradeSalvos].forEach((g) => g.addEventListener("scroll", () => atualizarFade(g), { passive: true }));
  window.addEventListener("resize", () => [gradeAdote, gradeSalvos].forEach(atualizarFade));

  function render() {
    preencher(gradeAdote, animais.filter((a) => !a.adotado).slice(0, 8),
      "No momento todos os nossos amigos encontraram um lar!");
    preencher(gradeSalvos, Store.salvosOrdenados().slice(0, 8),
      "Toque no marcador da ficha de um amigo para salvá-lo aqui.", "moldura--creme");
  }

  document.querySelector("main").addEventListener("click", (e) => {
    const c = e.target.closest("[data-id]");
    if (c) abrir("ficha", c.dataset.id, render, c.querySelector(".moldura") || c);
  });

  render();
});

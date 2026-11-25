/* Página de Adoção: "Adote um amigo." e "Amigos salvos." */
(function () {
  "use strict";

  const { Store, abrir, moldura } = window.NIPAFolha;
  const animais = window.ANIMAIS || [];
  const gradeAdote = document.querySelector("[data-grade-adote]");
  const gradeSalvos = document.querySelector("[data-grade-salvos]");
  const verMais = document.querySelector("[data-ver-mais]");
  let mostrarTodos = false;

  const card = (a) => `
    <button class="animal" type="button" data-id="${a.id}" aria-label="Ver ficha de ${a.nome}">
      ${moldura(a)}
      <h3>${a.nome}</h3>
    </button>`;

  function render() {
    const disponiveis = animais.filter((a) => !a.adotado);
    gradeAdote.innerHTML = (mostrarTodos ? disponiveis : disponiveis.slice(0, 4)).map(card).join("");
    if (animarNovos) {
      [...gradeAdote.children].slice(4).forEach((el, i) => {
        el.classList.add("surgir");
        el.style.animationDelay = `${i * 90}ms`;
      });
      animarNovos = false;
    }
    verMais.hidden = disponiveis.length <= 4;
    verMais.textContent = mostrarTodos ? "Ver Menos" : "Ver Mais";

    const salvos = Store.salvosOrdenados().slice(0, 2);
    gradeSalvos.innerHTML = salvos.length
      ? salvos.map(card).join("")
      : '<p class="grade__vazio">Toque no marcador da ficha de um amigo para salvá-lo aqui.</p>';
  }

  let animarNovos = false;
  verMais.addEventListener("click", () => { mostrarTodos = !mostrarTodos; animarNovos = mostrarTodos; render(); });

  document.querySelector("main").addEventListener("click", (e) => {
    const c = e.target.closest("[data-id]");
    if (c) abrir("ficha", c.dataset.id, render, c.querySelector(".moldura") || c);
  });

  render();
})();

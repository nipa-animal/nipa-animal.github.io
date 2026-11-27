/*
 * Página de Adoção: "Adote um amigo." e "Amigos Salvos" em linhas que deslizam
 * para o lado. O animal na ponta esquerda fica maior; o da direita some em fade.
 * Na primeira visita da sessão, a ficha do primeiro animal abre sozinha, para
 * mostrar que dá para tocar nos animais e ler mais sobre eles.
 */
window.NIPA_DADOS.then((animais) => {
  "use strict";

  const { Store, abrir, moldura, PATA } = window.NIPAFolha;
  const gradeAdote = document.querySelector("[data-grade-adote]");
  const gradeSalvos = document.querySelector("[data-grade-salvos]");
  const grades = [gradeAdote, gradeSalvos];
  const AUMENTO = 0.21; // o da ponta fica 21% maior (como no layout)

  const card = (a) => `
    <button class="animal" type="button" data-id="${a.id}" aria-label="Ver ficha de ${a.nome}">
      ${moldura(a)}
      <span class="animal__nome">${PATA}<span>${a.nome}</span></span>
    </button>`;

  // Escala de cada animal conforme a distância até a ponta esquerda da linha
  function atualizarEscala(grade) {
    const itens = grade.querySelectorAll(".animal");
    if (!itens.length) return;
    const estilo = getComputedStyle(grade);
    const inicio = parseFloat(estilo.paddingLeft);
    const passo = itens[0].offsetWidth + parseFloat(estilo.columnGap || estilo.gap || 0);
    itens.forEach((el) => {
      const pos = el.offsetLeft - grade.scrollLeft - inicio;
      const t = Math.max(0, 1 - Math.abs(pos) / passo);
      el.style.transform = `scale(${(1 + AUMENTO * t).toFixed(4)})`;
      el.style.zIndex = t > 0.5 ? 1 : "";
    });
  }

  // Fade na direita enquanto houver mais animais; some ao chegar no fim
  function atualizarFade(grade) {
    const resta = grade.scrollWidth - grade.clientWidth - grade.scrollLeft;
    grade.classList.toggle("grade--fade", resta > 8);
  }

  const atualizar = (grade) => { atualizarFade(grade); atualizarEscala(grade); };

  function preencher(grade, itens, vazio) {
    const x = grade.scrollLeft; // mantém a posição ao voltar da ficha
    grade.innerHTML = itens.length ? itens.map(card).join("") : `<p class="grade__vazio">${vazio}</p>`;
    grade.scrollLeft = x;
    atualizar(grade);
  }

  grades.forEach((g) => {
    let pedido = 0;
    g.addEventListener("scroll", () => {
      if (pedido) return;
      pedido = requestAnimationFrame(() => { pedido = 0; atualizar(g); });
    }, { passive: true });
  });
  window.addEventListener("resize", () => grades.forEach(atualizar));

  const disponiveis = () => Store.ordenar(animais.filter((a) => !a.adotado)).slice(0, 8);
  const salvos = () => Store.salvosOrdenados().slice(0, 8);

  function render() {
    preencher(gradeAdote, disponiveis(), "No momento todos os nossos amigos encontraram um lar!");
    preencher(gradeSalvos, salvos(), "Toque no marcador da ficha de um amigo para salvá-lo aqui.");
  }

  // Abre a ficha; as setas/deslize percorrem os animais da mesma linha
  function abrirFicha(cardEl) {
    const grade = cardEl.closest(".grade");
    const ids = [...grade.querySelectorAll("[data-id]")].map((el) => el.dataset.id);
    abrir("ficha", cardEl.dataset.id, render, cardEl.querySelector(".moldura"), ids);
  }

  // Clique: a foto encolhe e volta (com latido/miado) e logo depois a ficha abre
  document.querySelector("main").addEventListener("click", (e) => {
    const c = e.target.closest(".grade [data-id]");
    if (!c) return;
    const a = animais.find((x) => x.id === c.dataset.id);
    window.NIPAFolha.apertar(c.querySelector(".moldura"), a ? a.especie : "cachorro");
    setTimeout(() => abrirFicha(c), 260);
  });

  render();

  // Primeira visita da sessão: mostra a ficha do primeiro animal
  try {
    if (!sessionStorage.getItem("nipa:dica-ficha")) {
      sessionStorage.setItem("nipa:dica-ficha", "1");
      const primeiro = gradeAdote.querySelector("[data-id]");
      if (primeiro) setTimeout(() => { if (!document.body.classList.contains("travado")) abrirFicha(primeiro); }, 900);
    }
  } catch { /* modo privado */ }
});

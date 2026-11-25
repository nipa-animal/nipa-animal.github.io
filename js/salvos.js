/* Página "Amigos salvos.": status, Remover, Adotar, Notificar e Fixar */
window.NIPA_DADOS.then(() => {
  "use strict";

  const { Store, abrir, moldura, mini, juntar } = window.NIPAFolha;
  const lista = document.querySelector("[data-salvos]");

  function cartao(a) {
    if (a.adotado) {
      return `
        <article class="salvo">
          ${moldura(a)}
          <h2 class="salvo__nome">${a.nome}</h2>
          <div class="salvo__info"><div>${juntar(a)}</div><div class="linha2">Status:<strong>Adotado.</strong></div></div>
          <div class="salvo__acoes"><button class="btn btn--verde" type="button" data-remover="${a.id}">Remover</button></div>
          ${mini(a)}
        </article>`;
    }
    const fixado = Store.estaFixado(a.id);
    return `
      <article class="salvo salvo--ativo">
        ${moldura(a, "moldura--creme")}
        <h2 class="salvo__nome">${a.nome}</h2>
        <div class="salvo__info"><div>${juntar(a)}</div><div class="linha2">Status:<strong>Em busca de um lar.</strong></div></div>
        <div class="salvo__acoes">
          <button class="btn" type="button" data-adotar="${a.id}">Adotar</button>
          <button class="btn-ico" type="button" data-notificar="${a.id}" aria-label="Notificar quando ${a.nome} for adotado"><span class="ico ico--sino"></span></button>
          <button class="btn-ico" type="button" data-fixar="${a.id}" aria-pressed="${fixado}" aria-label="${fixado ? "Desafixar" : "Fixar como primeiro"}"><span class="ico ico--fixar"></span></button>
        </div>
        ${mini(a)}
      </article>`;
  }

  function render() {
    const salvos = Store.salvosOrdenados();
    lista.innerHTML = salvos.length
      ? salvos.map(cartao).join("")
      : '<p style="padding-right:2.65rem">Você ainda não salvou nenhum amigo. Abra a ficha de um animal na página de <a href="adocao.html" style="text-decoration:underline">Adoção</a> e toque no marcador.</p>';
  }

  lista.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.remover) { Store.alternarSalvo(b.dataset.remover); render(); }
    else if (b.dataset.fixar) { Store.alternarFixado(b.dataset.fixar); render(); }
    else if (b.dataset.adotar) abrir("questionario", b.dataset.adotar, render, b);
    else if (b.dataset.notificar) abrir("notificar", b.dataset.notificar, render, b);
  });

  render();
});

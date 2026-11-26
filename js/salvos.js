/* Página "Amigos salvos.": status, Remover, Adotar, Notificar e Fixar */
window.NIPA_DADOS.then(() => {
  "use strict";

  const { Store, abrir, moldura, mini, juntar } = window.NIPAFolha;
  const lista = document.querySelector("[data-salvos]");

  function cartao(a) {
    if (a.adotado) {
      return `
        <article class="salvo" data-card="${a.id}">
          ${moldura(a)}
          <h2 class="salvo__nome">${a.nome}</h2>
          <div class="salvo__info"><div>${juntar(a)}</div><div class="linha2">Status:<strong>Adotado.</strong></div></div>
          <div class="salvo__acoes"><button class="btn btn--verde" type="button" data-remover="${a.id}">Remover</button></div>
          ${mini(a)}
        </article>`;
    }
    const fixado = Store.estaFixado(a.id);
    return `
      <article class="salvo salvo--ativo" data-card="${a.id}">
        ${moldura(a, "moldura--creme")}
        <h2 class="salvo__nome">${a.nome}</h2>
        <div class="salvo__info"><div>${juntar(a)}</div><div class="linha2">Status:<strong>Em busca de um lar.</strong></div></div>
        <div class="salvo__acoes">
          <button class="btn" type="button" data-adotar="${a.id}">Adotar</button>
          <button class="btn-ico" type="button" data-notificar="${a.id}" aria-pressed="${Store.estaNotificado(a.id)}" aria-label="Notificar quando ${a.nome} for adotado"><span class="ico ico--sino"></span></button>
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

  // Fixar com animação: técnica FLIP (mede antes, reordena, anima a diferença)
  function fixarAnimado(id) {
    const antes = new Map([...lista.querySelectorAll("[data-card]")].map((el) => [el.dataset.card, el.getBoundingClientRect().top]));
    const fixou = Store.alternarFixado(id);
    render();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dur = 620, ease = "cubic-bezier(.22,.9,.24,1)";
    lista.querySelectorAll("[data-card]").forEach((el) => {
      const y0 = antes.get(el.dataset.card);
      if (y0 == null) return;
      const dy = y0 - el.getBoundingClientRect().top;
      if (el.dataset.card === id) {
        // O card fixado "levanta", desliza e assenta no novo lugar
        el.style.zIndex = 2;
        el.animate([
          { transform: `translateY(${dy}px) scale(1)`, boxShadow: "0 0 0 rgba(30,36,14,0)" },
          { transform: `translateY(${dy * 0.5}px) scale(1.035)`, boxShadow: "0 1.6rem 3.2rem rgba(30,36,14,.28)", offset: 0.45 },
          { transform: "translateY(0) scale(1)", boxShadow: "0 0 0 rgba(30,36,14,0)" },
        ], { duration: dur + 80, easing: ease }).onfinish = () => { el.style.zIndex = ""; };
        const pino = el.querySelector("[data-fixar] .ico");
        if (pino) pino.animate([
          { transform: "scale(1) rotate(0)" },
          { transform: `scale(1.5) rotate(${fixou ? -25 : 25}deg)`, offset: 0.4 },
          { transform: "scale(1) rotate(0)" },
        ], { duration: 520, delay: 120, easing: "cubic-bezier(.3,1.5,.5,1)" });
      } else if (dy) {
        el.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], { duration: dur, easing: ease });
      }
    });
    // Acompanha o card até a nova posição se ela estiver fora da tela
    const alvo = lista.querySelector(`[data-card="${id}"]`);
    const r = alvo && alvo.getBoundingClientRect();
    if (r && (r.top < 80 || r.bottom > window.innerHeight)) alvo.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  lista.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.remover) { Store.alternarSalvo(b.dataset.remover); render(); }
    else if (b.dataset.fixar) fixarAnimado(b.dataset.fixar);
    else if (b.dataset.adotar) abrir("questionario", b.dataset.adotar, render, b);
    else if (b.dataset.notificar) abrir("notificar", b.dataset.notificar, render, b);
  });

  render();
});

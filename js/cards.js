/*
 * Cards verticais de "Amigos salvos." e "Adote Um Amigo."
 * Cachorro = fundo verde + círculo laranja; gato = fundo laranja + círculo verde.
 * Adotado = fundo claro com contorno.
 * Botões: Adotar, Notificar (sino), Fixar (alfinete) e Salvar (marcador).
 */
window.NIPA_DADOS.then((animais) => {
  "use strict";

  const { Store, abrir, moldura, juntar } = window.NIPAFolha;
  const lista = document.querySelector("[data-cards]");
  const pagina = lista.dataset.cards; // "salvos" ou "adote"

  function itens() {
    if (pagina === "adote") return Store.ordenar(animais.filter((a) => !a.adotado));
    // Amigos salvos: fixados primeiro, depois os adotados, depois os demais
    const fix = Store.fixados();
    const s = Store.salvosOrdenados();
    return [...s.filter((a) => fix.includes(a.id)), ...s.filter((a) => !fix.includes(a.id) && a.adotado), ...s.filter((a) => !fix.includes(a.id) && !a.adotado)];
  }

  function cartao(a) {
    const salvo = Store.estaSalvo(a.id), fixado = Store.estaFixado(a.id), avisar = Store.estaNotificado(a.id);
    const classe = a.adotado ? "ca--adotado" : "";
    return `
      <article class="ca ca--${a.especie} ${classe}" data-card="${a.id}">
        <button class="ca__foto" type="button" data-ficha="${a.id}" aria-label="Ver ficha de ${a.nome}">${moldura(a)}</button>
        <h2 class="ca__nome">${a.nome}</h2>
        <p class="ca__info">${juntar(a)}</p>
        <p class="ca__status">Status: <strong>${a.adotado ? "Adotado." : "Buscando por um lar."}</strong></p>
        <div class="ca__acoes">
          ${a.adotado
            ? '<span class="btn" aria-disabled="true">Adotar</span>'
            : `<button class="btn" type="button" data-adotar="${a.id}">Adotar</button>`}
          <button class="btn-ico" type="button" data-notificar="${a.id}" aria-pressed="${avisar}" aria-label="Notificar quando ${a.nome} for adotado"${a.adotado ? " disabled" : ""}><span class="ico ico--sino"></span></button>
          <button class="btn-ico" type="button" data-fixar="${a.id}" aria-pressed="${fixado}" aria-label="${fixado ? "Desafixar" : "Fixar como primeiro"}"><span class="ico ico--fixar"></span></button>
          <button class="btn-ico" type="button" data-salvar-card="${a.id}" aria-pressed="${salvo}" aria-label="${salvo ? `Remover ${a.nome} dos salvos` : `Salvar ${a.nome}`}"><span class="ico ico--salvar"></span></button>
        </div>
      </article>`;
  }

  function render() {
    const l = itens();
    lista.innerHTML = l.length ? l.map(cartao).join("")
      : `<p class="cards-animais__vazio">${pagina === "salvos"
        ? 'Você ainda não salvou nenhum amigo. Toque no marcador de um animal em <a href="adote.html" style="text-decoration:underline">Adote Um Amigo</a>.'
        : "No momento todos os nossos amigos encontraram um lar! Volte em breve."}</p>`;
  }

  const semMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Reordena com animação (técnica FLIP: mede antes, reordena, anima a diferença)
  function reordenarAnimado(destaque, mudar) {
    const antes = new Map([...lista.querySelectorAll("[data-card]")].map((el) => {
      const r = el.getBoundingClientRect();
      return [el.dataset.card, { x: r.left, y: r.top }];
    }));
    mudar();
    render();
    if (semMovimento()) return;
    const ease = "cubic-bezier(.22,.9,.24,1)";
    lista.querySelectorAll("[data-card]").forEach((el) => {
      const p = antes.get(el.dataset.card);
      if (!p) return;
      const r = el.getBoundingClientRect();
      const dx = p.x - r.left, dy = p.y - r.top;
      if (el.dataset.card === destaque) {
        el.style.zIndex = 2;
        el.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(1)`, boxShadow: "0 0 0 rgba(30,36,14,0)" },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5}px) scale(1.05)`, boxShadow: "0 1.6rem 3.2rem rgba(30,36,14,.3)", offset: 0.45 },
          { transform: "none", boxShadow: "0 0 0 rgba(30,36,14,0)" },
        ], { duration: 700, easing: ease }).onfinish = () => { el.style.zIndex = ""; };
      } else if (dx || dy) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 620, easing: ease });
      }
    });
    const alvo = lista.querySelector(`[data-card="${destaque}"]`);
    const r = alvo && alvo.getBoundingClientRect();
    if (r && (r.top < 80 || r.bottom > window.innerHeight)) alvo.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Remove um card (deixou de ser salvo) com uma saída suave
  function removerAnimado(id) {
    const el = lista.querySelector(`[data-card="${id}"]`);
    if (!el || semMovimento()) { Store.alternarSalvo(id); render(); return; }
    el.animate([{ transform: "none", opacity: 1 }, { transform: "scale(.85)", opacity: 0 }], { duration: 240, easing: "ease-in", fill: "forwards" })
      .onfinish = () => reordenarAnimado(null, () => Store.alternarSalvo(id));
  }

  const ids = () => [...lista.querySelectorAll("[data-card]")].map((el) => el.dataset.card);

  lista.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    const card = b.closest("[data-card]");
    if (b.dataset.ficha) abrir("ficha", b.dataset.ficha, render, card.querySelector(".moldura"), ids());
    else if (b.dataset.adotar) abrir("questionario", b.dataset.adotar, render, b);
    else if (b.dataset.notificar) abrir("notificar", b.dataset.notificar, render, b);
    else if (b.dataset.fixar) {
      const id = b.dataset.fixar;
      reordenarAnimado(id, () => Store.alternarFixado(id));
      const pino = lista.querySelector(`[data-fixar="${id}"] .ico`);
      if (pino && !semMovimento()) pino.animate([
        { transform: "scale(1) rotate(0)" }, { transform: "scale(1.5) rotate(-25deg)", offset: 0.4 }, { transform: "scale(1) rotate(0)" },
      ], { duration: 520, delay: 120, easing: "cubic-bezier(.3,1.5,.5,1)" });
    } else if (b.dataset.salvarCard) {
      const id = b.dataset.salvarCard;
      if (pagina === "salvos" && Store.estaSalvo(id)) return removerAnimado(id);
      const agora = Store.alternarSalvo(id);
      b.setAttribute("aria-pressed", String(agora));
      b.setAttribute("aria-label", agora ? "Remover dos salvos" : "Salvar");
    }
  });

  render();
});

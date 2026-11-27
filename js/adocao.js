/*
 * Página de Adoção: "Adote um amigo." e "Amigos Salvos" em linhas que giram
 * sozinhas, devagar e em loop, para mostrar todos os animais.
 * - O animal na ponta esquerda fica maior; o da direita some em fade.
 * - O giro pausa quando a pessoa toca/arrasta/rola a linha, quando a ficha
 *   está aberta ou quando a linha não está na tela, e volta sozinho depois.
 * - Ao lado do nome há o botão de salvar.
 * - Na primeira visita da sessão, a ficha do primeiro animal abre sozinha.
 */
window.NIPA_DADOS.then((animais) => {
  "use strict";

  const { Store, abrir, apertar, moldura, PATA } = window.NIPAFolha;
  const gradeAdote = document.querySelector("[data-grade-adote]");
  const gradeSalvos = document.querySelector("[data-grade-salvos]");
  const AUMENTO = 0.21;       // o da ponta fica 21% maior
  const VELOCIDADE = 16;      // px por segundo (bem devagar)
  const ESPERA = 2600;        // ms parado depois que a pessoa mexe na linha
  const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const porId = (id) => animais.find((a) => a.id === id);

  function card(a, clone) {
    const salvo = Store.estaSalvo(a.id);
    const t = clone ? ' tabindex="-1"' : "";
    return `
      <div class="animal" data-id="${a.id}"${clone ? ' data-clone aria-hidden="true"' : ""}>
        <button class="animal__foto" type="button" data-ficha aria-label="Ver ficha de ${a.nome}"${t}>${moldura(a)}</button>
        <div class="animal__rodape">
          <button class="animal__nome" type="button" data-ficha${t}>${PATA}<span>${a.nome}</span></button>
          <button class="btn-ico animal__salvar" type="button" data-salvar aria-pressed="${salvo}" aria-label="${salvo ? `Remover ${a.nome} dos salvos` : `Salvar ${a.nome}`}"${t}><span class="ico ico--salvar"></span></button>
        </div>
      </div>`;
  }

  // ---------- Uma linha que gira em loop ----------
  function criarLinha(grade, obterItens, vazio) {
    const estado = { pos: 0, volta: 0, pausadoAte: 0, sobre: false, visivel: true, loop: false };

    function medirVolta() {
      const primeiro = grade.querySelector(".animal:not([data-clone])");
      const clone = grade.querySelector(".animal[data-clone]");
      estado.volta = primeiro && clone ? clone.offsetLeft - primeiro.offsetLeft : 0;
    }

    function escala() {
      const itens = grade.querySelectorAll(".animal");
      if (!itens.length) return;
      const estilo = getComputedStyle(grade);
      const inicio = parseFloat(estilo.paddingLeft);
      const passo = itens[0].offsetWidth + parseFloat(estilo.columnGap || estilo.gap || 0);
      itens.forEach((el) => {
        const p = el.offsetLeft - grade.scrollLeft - inicio;
        const t = Math.max(0, 1 - Math.abs(p) / passo);
        el.style.transform = `scale(${(1 + AUMENTO * t).toFixed(4)})`;
        el.style.zIndex = t > 0.5 ? 1 : "";
      });
    }

    function fade() {
      const resta = grade.scrollWidth - grade.clientWidth - grade.scrollLeft;
      grade.classList.toggle("grade--fade", estado.loop || resta > 8);
    }

    function preencher() {
      const itens = obterItens();
      const x = grade.scrollLeft;
      // Loop só quando há animais suficientes para passar da largura da tela
      estado.loop = itens.length >= 3 && !semMovimento;
      grade.innerHTML = itens.length
        ? itens.map((a) => card(a, false)).join("") + (estado.loop ? itens.map((a) => card(a, true)).join("") : "")
        : `<p class="grade__vazio">${vazio}</p>`;
      medirVolta();
      grade.scrollLeft = estado.volta ? x % estado.volta : x;
      estado.pos = grade.scrollLeft;
      fade(); escala();
    }

    // Manter dentro da "volta": ao passar do fim da primeira cópia, volta ao começo sem salto visível
    function normalizar() {
      if (!estado.loop || !estado.volta) return;
      if (grade.scrollLeft >= estado.volta) { grade.scrollLeft -= estado.volta; estado.pos = grade.scrollLeft; }
    }

    const pausar = () => { estado.pausadoAte = performance.now() + ESPERA; };
    grade.addEventListener("pointerdown", pausar, { passive: true });
    grade.addEventListener("wheel", pausar, { passive: true });
    grade.addEventListener("touchstart", pausar, { passive: true });
    grade.addEventListener("focusin", pausar);
    grade.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") estado.sobre = true; });
    grade.addEventListener("pointerleave", () => { estado.sobre = false; pausar(); });

    let pedido = 0;
    grade.addEventListener("scroll", () => {
      if (pedido) return;
      pedido = requestAnimationFrame(() => { pedido = 0; normalizar(); fade(); escala(); });
    }, { passive: true });

    new IntersectionObserver((e) => { estado.visivel = e[0].isIntersecting; }).observe(grade);

    let ultimo = 0;
    function girar(t) {
      const dt = Math.min(0.25, (t - (ultimo || t)) / 1000);
      ultimo = t;
      const parado = !estado.loop || !estado.visivel || estado.sobre || document.hidden
        || document.body.classList.contains("travado") || t < estado.pausadoAte;
      if (parado) estado.pos = grade.scrollLeft; // retoma de onde a pessoa deixou
      else {
        estado.pos += VELOCIDADE * dt;
        if (estado.volta && estado.pos >= estado.volta) estado.pos -= estado.volta;
        grade.scrollLeft = estado.pos;
      }
      requestAnimationFrame(girar);
    }
    if (!semMovimento) requestAnimationFrame(girar);
    window.addEventListener("resize", () => { medirVolta(); fade(); escala(); });

    return { preencher, grade };
  }

  const disponiveis = () => Store.ordenar(animais.filter((a) => !a.adotado)).slice(0, 8);
  const salvos = () => Store.salvosOrdenados().slice(0, 8);
  const linhaAdote = criarLinha(gradeAdote, disponiveis, "No momento todos os nossos amigos encontraram um lar!");
  const linhaSalvos = criarLinha(gradeSalvos, salvos, "Toque no marcador de um amigo para salvá-lo aqui.");

  function render() { linhaAdote.preencher(); linhaSalvos.preencher(); }

  // Abre a ficha; as setas/deslize percorrem os animais da mesma linha (sem as cópias do loop)
  function abrirFicha(item) {
    const grade = item.closest(".grade");
    const ids = [...new Set([...grade.querySelectorAll(".animal:not([data-clone])")].map((el) => el.dataset.id))];
    abrir("ficha", item.dataset.id, render, item.querySelector(".moldura"), ids);
  }

  document.querySelector("main").addEventListener("click", (e) => {
    const item = e.target.closest(".grade .animal");
    if (!item) return;
    const a = porId(item.dataset.id);
    const salvar = e.target.closest("[data-salvar]");
    if (salvar) {
      const agora = Store.alternarSalvo(item.dataset.id);
      // Atualiza o marcador em todas as cópias deste animal e a linha de salvos
      document.querySelectorAll(`.grade .animal[data-id="${item.dataset.id}"] [data-salvar]`).forEach((b) => {
        b.setAttribute("aria-pressed", String(agora));
        b.setAttribute("aria-label", agora ? `Remover ${a.nome} dos salvos` : `Salvar ${a.nome}`);
      });
      linhaSalvos.preencher();
      if (!semMovimento) salvar.animate([{ scale: 1 }, { scale: 1.3 }, { scale: 1 }], { duration: 320, easing: "ease-out" });
      return;
    }
    if (!e.target.closest("[data-ficha]")) return;
    // A foto encolhe e volta (com latido/miado) e logo depois a ficha abre
    apertar(item.querySelector(".moldura"), a ? a.especie : "cachorro");
    setTimeout(() => abrirFicha(item), 260);
  });

  render();

  // Primeira visita da sessão: mostra a ficha do primeiro animal
  try {
    if (!sessionStorage.getItem("nipa:dica-ficha")) {
      sessionStorage.setItem("nipa:dica-ficha", "1");
      const primeiro = gradeAdote.querySelector(".animal:not([data-clone])");
      if (primeiro) setTimeout(() => { if (!document.body.classList.contains("travado")) abrirFicha(primeiro); }, 900);
    }
  } catch { /* modo privado */ }
});

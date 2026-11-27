/*
 * Página de Adoção: "Adote um amigo." e "Amigos Salvos" em linhas que giram
 * sozinhas, devagar e em loop, para mostrar todos os animais.
 * - O animal na ponta esquerda fica maior; o da direita some em fade.
 * - O giro só para enquanto a ficha está aberta (ou quando a pessoa arrasta a linha,
 *   ou ela não está na tela) e volta sozinho depois.
 * - Ao lado do nome há o botão de salvar.
 * - Na primeira visita da sessão, a ficha do primeiro animal abre sozinha.
 */
window.NIPA_DADOS.then((animais) => {
  "use strict";

  const { Store, abrir, apertar, moldura, PATA, HORIZONTE } = window.NIPAFolha;
  const gradeAdote = document.querySelector("[data-grade-adote]");
  const gradeSalvos = document.querySelector("[data-grade-salvos]");
  const AUMENTO = 0.21;       // o da ponta fica 21% maior
  const VELOCIDADE = 16;      // px por segundo (bem devagar)
  const ESPERA = 900;         // ms parado depois que a pessoa arrasta/rola a linha
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
  // direcao: 1 = os animais andam para a esquerda; -1 = andam para a direita
  function criarLinha(grade, obterItens, vazio, direcao) {
    const estado = { pos: 0, volta: 0, pausadoAte: 0, visivel: true, loop: false, apareceu: false };

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

    // Os animais surgem do "horizonte" um de cada vez, com um quique bem suave
    function quicarEntrada() {
      if (semMovimento) return;
      [...grade.querySelectorAll(".animal")].slice(0, 8).forEach((el, i) => el.animate(HORIZONTE, { duration: 1100, delay: 120 + i * 170, easing: "cubic-bezier(.33,.7,.4,1)", fill: "backwards" }));
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
      let novo = estado.volta ? x % estado.volta : x;
      // A linha que anda para a direita começa no meio (para ter para onde ir)
      if (estado.loop && direcao < 0 && novo < 2) novo = estado.volta;
      grade.scrollLeft = novo;
      estado.pos = grade.scrollLeft;
      fade(); escala();
    }

    // Mantém dentro da "volta": ao passar do fim (ou do começo) da primeira cópia,
    // pula para o ponto equivalente da outra cópia, sem salto visível
    function normalizar() {
      if (!estado.loop || !estado.volta) return;
      if (grade.scrollLeft >= estado.volta * (direcao < 0 ? 1.5 : 1)) { grade.scrollLeft -= estado.volta; estado.pos = grade.scrollLeft; }
      else if (direcao < 0 && grade.scrollLeft <= 1) { grade.scrollLeft += estado.volta; estado.pos = grade.scrollLeft; }
    }

    // Tocar num animal NÃO para a linha: ela só para enquanto a ficha está aberta.
    // Só quando a pessoa realmente arrasta/rola a linha é que ela espera um instante,
    // para não brigar com o dedo.
    const pausar = () => { estado.pausadoAte = performance.now() + ESPERA; };
    grade.addEventListener("wheel", (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) pausar(); }, { passive: true });
    grade.addEventListener("touchmove", pausar, { passive: true });

    let pedido = 0;
    grade.addEventListener("scroll", () => {
      if (pedido) return;
      pedido = requestAnimationFrame(() => { pedido = 0; normalizar(); fade(); escala(); });
    }, { passive: true });

    new IntersectionObserver((e) => {
      estado.visivel = e[0].isIntersecting;
      if (estado.visivel && !estado.apareceu && e[0].intersectionRatio > 0.25) { estado.apareceu = true; quicarEntrada(); estado.pausadoAte = performance.now() + 1200; }
    }, { threshold: [0, 0.3] }).observe(grade);

    let ultimo = 0;
    function girar(t) {
      const dt = Math.min(0.25, (t - (ultimo || t)) / 1000);
      ultimo = t;
      // Parada só enquanto a ficha está aberta: ao fechar, volta a andar na hora
      if (document.body.classList.contains("travado")) estado.pausadoAte = t;
      const parado = !estado.loop || !estado.visivel || document.hidden || t <= estado.pausadoAte;
      if (parado) estado.pos = grade.scrollLeft; // retoma de onde a pessoa deixou
      else {
        estado.pos += direcao * VELOCIDADE * dt;
        if (estado.volta && estado.pos >= estado.volta * (direcao < 0 ? 1.5 : 1)) estado.pos -= estado.volta;
        if (estado.volta && direcao < 0 && estado.pos <= 1) estado.pos += estado.volta;
        grade.scrollLeft = estado.pos;
      }
      requestAnimationFrame(girar);
    }
    if (!semMovimento) requestAnimationFrame(girar);
    window.addEventListener("resize", () => { medirVolta(); fade(); escala(); });


    // Um animal recém-salvo: leva a linha até ele e ele entra com o quique suave
    function destacar(id) {
      const copias = [...grade.querySelectorAll(`.animal[data-id="${id}"]`)];
      if (!copias.length || semMovimento) return;
      const inicio = parseFloat(getComputedStyle(grade).paddingLeft) || 0;
      let alvo = copias[0].offsetLeft - inicio;
      if (estado.loop && direcao < 0 && alvo <= 1 && copias[1]) alvo = copias[1].offsetLeft - inicio;
      grade.scrollLeft = alvo;
      estado.pos = grade.scrollLeft;
      estado.pausadoAte = performance.now() + 1600;
      copias.forEach((el) => el.animate(HORIZONTE, { duration: 1100, easing: "cubic-bezier(.33,.7,.4,1)" }));
    }
    return { preencher, grade, destacar };
  }

  const disponiveis = () => Store.ordenar(animais.filter((a) => !a.adotado)).slice(0, 8);
  const salvos = () => Store.salvosOrdenados().slice(0, 8);
  const linhaAdote = criarLinha(gradeAdote, disponiveis, "No momento todos os nossos amigos encontraram um lar!", 1);
  const linhaSalvos = criarLinha(gradeSalvos, salvos, "Toque no marcador de um amigo para salvá-lo aqui.", -1);

  // Atualiza a linha de salvos; quem acabou de ser salvo entra quicando
  let conhecidos = new Set(Store.salvos());
  function atualizarSalvos() {
    linhaSalvos.preencher();
    const novos = Store.salvos().filter((id) => !conhecidos.has(id));
    conhecidos = new Set(Store.salvos());
    if (novos.length) linhaSalvos.destacar(novos[novos.length - 1]);
  }
  function render() { linhaAdote.preencher(); atualizarSalvos(); }

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
      atualizarSalvos();
      if (!semMovimento) salvar.animate([{ scale: 1 }, { scale: 1.3 }, { scale: 1 }], { duration: 320, easing: "ease-out" });
      return;
    }
    if (!e.target.closest("[data-ficha]")) return;
    // A foto encolhe e volta (com latido/miado) e logo depois a ficha abre
    apertar(item.querySelector(".moldura"), a ? a.especie : "cachorro", true); // sem som ao abrir a ficha
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

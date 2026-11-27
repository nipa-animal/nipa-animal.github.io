/* NIPA — scripts compartilhados */
(function () {
  "use strict";

  const WHATSAPP = "5511968337340";
  const linkWhats = (msg) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  const abrirWhats = (msg) => window.open(linkWhats(msg), "_blank", "noopener");

  // Copia o texto e mostra "Copiado!" no próprio botão
  async function copiar(texto, botao) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    if (botao) {
      const original = botao.dataset.rotulo || botao.textContent;
      botao.dataset.rotulo = original;
      botao.textContent = "Copiado!";
      clearTimeout(botao._t);
      botao._t = setTimeout(() => { botao.textContent = original; }, 1800);
    }
  }

  window.NIPA = { linkWhats, abrirWhats, copiar };

  // Menu do hambúrguer
  function montarMenu() {
    const botao = document.querySelector("[data-menu-abrir]");
    if (!botao) return;
    const bg = document.createElement("div");
    bg.className = "menu-bg";
    const nav = document.createElement("nav");
    nav.className = "menu";
    nav.setAttribute("aria-label", "Menu");
    nav.inert = true;
    nav.innerHTML = `
      <div class="menu__topo">
        <a class="menu__logo" href="index.html" aria-label="Logo — página inicial">Logo</a>
        <button class="menu__fechar" type="button" aria-label="Fechar menu">&times;</button>
      </div>
      <a href="sobre.html">Sobre</a>
      <a href="adocao.html">Adoção</a>
      <a class="menu__sub" href="adote.html">Adote um amigo</a>
      <a class="menu__sub" href="salvos.html">Amigos salvos</a>
      <a href="ajudar.html">Ajudar</a>
      <button class="menu__som" type="button" aria-pressed="true" data-som>Sons dos animais: <strong>ligados</strong></button>`;
    // Liga/desliga os latidos e miados
    const som = nav.querySelector("[data-som]");
    const mostrarSom = () => {
      const on = !window.NIPASom || window.NIPASom.ligado();
      som.setAttribute("aria-pressed", String(on));
      som.querySelector("strong").textContent = on ? "ligados" : "desligados";
    };
    som.addEventListener("click", () => {
      if (!window.NIPASom) return;
      const on = !window.NIPASom.ligado();
      window.NIPASom.definir(on);
      mostrarSom();
      if (on) window.NIPASom.tocar(Math.random() < 0.5 ? "gato" : "cachorro");
    });
    mostrarSom();
    // Destaca a página atual também no menu
    const nome = location.pathname.split("/").pop() || "index.html";
    nav.querySelectorAll("a[href]:not(.menu__logo)").forEach((a) => {
      if (a.getAttribute("href") === nome) a.setAttribute("aria-current", "page");
    });
    document.body.append(bg, nav);
    const fechar = nav.querySelector(".menu__fechar");
    const set = (aberto) => {
      document.body.classList.toggle("menu-aberto", aberto);
      document.body.classList.toggle("travado", aberto);
      botao.setAttribute("aria-expanded", String(aberto));
      nav.inert = !aberto;
      (aberto ? fechar : botao).focus({ preventScroll: true });
    };
    botao.addEventListener("click", () => set(true));
    fechar.addEventListener("click", () => set(false));
    bg.addEventListener("click", () => set(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.classList.contains("menu-aberto")) set(false);
    });
  }

  // Links de WhatsApp com mensagem pronta
  function ligarWhats() {
    document.querySelectorAll("[data-whats]").forEach((el) => {
      el.href = linkWhats(el.dataset.whats);
      el.target = "_blank";
      el.rel = "noopener";
    });
  }

  // Painel Pix na página Ajudar
  function ligarPainelPix() {
    const painel = document.querySelector("[data-pix]");
    const botao = document.querySelector("[data-pix-abrir]");
    if (!painel || !botao) return;
    const wrap = painel.querySelector(".pix__wrap");
    const set = (aberto) => {
      painel.classList.toggle("aberto", aberto);
      botao.setAttribute("aria-expanded", String(aberto));
      wrap.inert = !aberto;
      if (aberto) setTimeout(() => painel.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    };
    set(false);
    botao.addEventListener("click", () => set(!painel.classList.contains("aberto")));
    if (location.hash === "#pix") set(true);
  }

  // Newsletter da Home (sem servidor: envia pelo WhatsApp)
  function ligarNewsletter() {
    const form = document.querySelector("[data-newsletter]");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      abrirWhats(`Olá, NIPA! Quero receber avisos quando vocês precisarem de auxílio financeiro.\nE-mail: ${form.email.value.trim()}`);
      form.reset();
    });
  }

  // ---------- Transições entre páginas ----------
  const ORDEM = ["index", "sobre", "adocao", "salvos", "ajudar"];
  const pagina = (url) => {
    const nome = new URL(url, location.href).pathname.split("/").pop().replace(".html", "") || "index";
    return ORDEM.indexOf(nome);
  };
  const temVT = "onpagereveal" in window && CSS.supports && CSS.supports("view-transition-name: a");

  if (temVT) {
    // Define a direção (avançar/voltar) conforme a ordem das páginas no menu
    window.addEventListener("pagereveal", (e) => {
      if (!e.viewTransition) return;
      const de = window.navigation && navigation.activation && navigation.activation.from;
      if (!de) return;
      const a = pagina(de.url), b = pagina(location.href);
      if (a < 0 || b < 0 || a === b) return;
      e.viewTransition.types.add(b > a ? "avancar" : "voltar");
    });
  } else {
    // Alternativa: o conteúdo some suavemente antes de trocar de página
    document.documentElement.classList.add("sem-vt");
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !url.pathname.endsWith(".html") && !url.pathname.endsWith("/")) return;
      if (url.pathname === location.pathname) return;
      e.preventDefault();
      document.documentElement.classList.add("saindo");
      setTimeout(() => { location.href = url.href; }, 260);
    });
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) document.documentElement.classList.remove("saindo");
    });
  }

  // ---------- Rolagem mais fluida, com "boing" ao chegar no começo/fim ----------
  // Com mouse/trackpad: a rolagem desliza suavemente até o destino e, se a
  // pessoa continuar rolando no fim (ou no começo) da página, o conteúdo
  // estica um pouco e volta quicando como uma mola. No celular, o próprio
  // sistema já faz esse efeito (iPhone e Android).
  function ligarRolagem() {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const elasticos = () => [document.querySelector("body > main"), document.querySelector("body > .footer")].filter(Boolean);
    const maximo = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    let alvo = window.scrollY, atual = window.scrollY, rodando = false;
    let estica = 0, vel = 0; // deslocamento da "mola" (px) e sua velocidade

    // Algum elemento rolável por dentro (formulário, ficha) deve rolar sozinho
    function rolavelInterno(el, dy) {
      for (; el && el !== document.body; el = el.parentElement) {
        const s = getComputedStyle(el).overflowY;
        if ((s === "auto" || s === "scroll") && el.scrollHeight > el.clientHeight + 1) {
          if ((dy < 0 && el.scrollTop > 0) || (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
        }
      }
      return false;
    }

    window.addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.defaultPrevented) return;
      if (document.body.classList.contains("travado")) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // rolagem lateral (linhas de animais)
      const dy = e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (rolavelInterno(e.target instanceof Element ? e.target : null, dy)) return;
      e.preventDefault();
      if (!rodando) { alvo = atual = window.scrollY; }
      alvo += dy;
      const max = maximo();
      if (alvo < 0) { estica += alvo * 0.3; alvo = 0; }
      else if (alvo > max) { estica += (alvo - max) * 0.3; alvo = max; }
      estica = Math.max(-140, Math.min(140, estica));
      if (!rodando) { rodando = true; requestAnimationFrame(passo); }
    }, { passive: false });

    // Rolagem feita por teclado, barra de rolagem ou links: acompanha
    window.addEventListener("scroll", () => { if (!rodando) alvo = atual = window.scrollY; }, { passive: true });

    function passo() {
      const max = maximo();
      alvo = Math.min(Math.max(alvo, 0), max);
      atual += (alvo - atual) * 0.14;
      if (Math.abs(alvo - atual) < 0.5) atual = alvo;
      window.scrollTo(0, atual);
      // Mola subamortecida: volta ao lugar quicando ("boing boing")
      vel += -estica * 0.11;
      vel *= 0.78;
      estica += vel;
      const t = Math.abs(estica) < 0.3 && Math.abs(vel) < 0.3 ? "" : `translate3d(0, ${(-estica).toFixed(2)}px, 0)`;
      elasticos().forEach((el) => { el.style.transform = t; });
      if (atual !== alvo || t) requestAnimationFrame(passo);
      else { estica = 0; vel = 0; rodando = false; }
    }
  }

  // Header fixo: ganha uma sombra suave quando a página rola
  function ligarHeader() {
    const h = document.querySelector(".header");
    if (!h) return;
    const atualizar = () => h.classList.toggle("rolou", window.scrollY > 4);
    window.addEventListener("scroll", atualizar, { passive: true });
    atualizar();
  }

  document.addEventListener("DOMContentLoaded", () => {
    ligarHeader();
    ligarRolagem();
    montarMenu();
    ligarNewsletter();
    ligarWhats();
    ligarPainelPix();
  });
})();

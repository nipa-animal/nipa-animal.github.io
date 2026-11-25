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
      <button class="menu__fechar" type="button" aria-label="Fechar menu">&times;</button>
      <a href="sobre.html">Sobre</a>
      <a href="adocao.html">Adoção</a>
      <a href="ajudar.html">Ajudar</a>`;
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
    montarMenu();
    ligarNewsletter();
    ligarWhats();
    ligarPainelPix();
  });
})();

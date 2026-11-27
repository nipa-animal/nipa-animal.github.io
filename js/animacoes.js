/*
 * Animações de entrada dos textos e elementos (disparam quando aparecem na tela).
 * Marque o elemento com data-anim:
 *   "titulo"     – cada linha sobe de dentro de uma máscara (como no site de referência:
 *                  máscara 100%→0 em 2s, texto 110%→0 em 1,5s, curva expo.out, 0,1s entre linhas)
 *   "texto"      – o mesmo efeito, começando um pouco depois do título
 *   "correnteza" – as linhas entram deslizando para a direita, bem rápido
 *   "bloco"      – botões, círculos e fotos sobem de dentro de uma máscara
 *   "letras"     – cada letra pula para o lugar, uma de cada vez (o "LOGO" do Sobre)
 * data-anim-atraso="0.3" acrescenta um atraso (segundos).
 */
(function () {
  "use strict";
  if (!document.documentElement.classList.contains("js-anim")) return; // movimento reduzido

  const BASE = { titulo: 0.15, texto: 0.4, correnteza: 0.15, bloco: 0.45, letras: 0.1 };

  // Envolve cada palavra (inclusive dentro de <strong>, <a>…) em .am > .at
  function envolverPalavras(el) {
    const andar = (no) => {
      [...no.childNodes].forEach((filho) => {
        if (filho.nodeType === 3) {
          const partes = filho.textContent.split(/(\s+)/);
          if (partes.every((p) => !p.trim())) return;
          const frag = document.createDocumentFragment();
          partes.forEach((p) => {
            if (!p) return;
            if (!p.trim()) { frag.appendChild(document.createTextNode(p)); return; }
            const m = document.createElement("span"); m.className = "am";
            const t = document.createElement("span"); t.className = "at"; t.textContent = p;
            m.appendChild(t); frag.appendChild(m);
          });
          filho.replaceWith(frag);
        } else if (filho.nodeType === 1 && !/^(BR|IMG|SVG|BUTTON|INPUT)$/.test(filho.tagName)) {
          if (filho.classList.contains("pata")) {
            const m = document.createElement("span"); m.className = "am";
            const t = document.createElement("span"); t.className = "at";
            filho.replaceWith(m); t.appendChild(filho); m.appendChild(t);
          } else andar(filho);
        }
      });
    };
    andar(el);
  }

  // Descobre em que linha está cada palavra (para o atraso de 0,1s entre linhas)
  function numerarLinhas(el) {
    let topo = null, linha = -1, palavra = 0;
    el.querySelectorAll(".am").forEach((m) => {
      const y = m.offsetTop;
      if (topo === null || Math.abs(y - topo) > 4) { linha++; topo = y; }
      m.style.setProperty("--i", linha);
      m.querySelector(".at").style.setProperty("--i", linha);
      m.querySelector(".at").style.setProperty("--w", palavra++);
    });
  }

  function preparar(el) {
    const tipo = el.dataset.anim;
    const atraso = (BASE[tipo] ?? 0) + parseFloat(el.dataset.animAtraso || 0);
    el.style.setProperty("--b", atraso + "s");
    // Primeiro coloca o elemento no estado "escondido" SEM transição (senão ele
    // anima até a posição escondida e a entrada de quem já está na tela quase não aparece)
    el.style.transition = "none";
    el.classList.add("anim-pronto");
    if (tipo === "titulo" || tipo === "texto" || tipo === "correnteza") {
      envolverPalavras(el);
      numerarLinhas(el);
    } else if (tipo === "letras") {
      const txt = el.textContent;
      el.setAttribute("aria-label", txt.trim());
      el.innerHTML = [...txt].map((c) => (c.trim() ? `<span class="letra" aria-hidden="true">${c}</span>` : c)).join("");
    }
    void el.offsetHeight; // aplica o estado inicial
    el.style.transition = "";
  }

  function entrar(el) {
    if (el.dataset.anim === "letras") {
      el.querySelectorAll(".letra").forEach((l, i) => l.animate([
        { transform: "translateY(120%) rotate(-25deg) scale(.3)", opacity: 0 },
        { transform: "translateY(-18%) rotate(8deg) scale(1.12)", opacity: 1, offset: 0.55 },
        { transform: "translateY(6%) rotate(-3deg) scale(.97)", offset: 0.78 },
        { transform: "none", opacity: 1 },
      ], { duration: 900, delay: 150 + i * 130, easing: "cubic-bezier(.3,.7,.4,1)", fill: "backwards" }));
    }
    el.classList.add("anim-entrou");
    // Blocos: depois de entrar, devolve o comportamento normal (hover, toque)
    if (el.dataset.anim === "bloco") {
      const dur = (parseFloat(getComputedStyle(el).getPropertyValue("--b")) || 0) * 1000 + 1600;
      setTimeout(() => { el.classList.remove("anim-pronto", "anim-entrou"); el.removeAttribute("data-anim"); el.style.removeProperty("--b"); }, dur);
    }
  }

  function iniciar() {
    const alvos = [...document.querySelectorAll("[data-anim]")];
    alvos.forEach(preparar);
    // Blocos começam totalmente recortados (área zero), então o navegador nunca os
    // "veria" entrando na tela: para eles, observamos o elemento pai.
    const vigiado = new Map();
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        (vigiado.get(e.target) || []).forEach(entrar);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    alvos.forEach((el) => {
      const alvo = el.dataset.anim === "bloco" ? el.parentElement : el;
      if (!vigiado.has(alvo)) { vigiado.set(alvo, []); obs.observe(alvo); }
      vigiado.get(alvo).push(el);
    });
  }

  // Espera as fontes (para medir as linhas) e a troca de página terminar, para que as
  // animações de quem abre a página aconteçam à vista e não escondidas pela transição.
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const pronto = () => Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), espera(1200)])
    .then(() => new Promise((r) => requestAnimationFrame(() => r())))
    .then(() => window.NIPA_VT ? Promise.race([window.NIPA_VT.catch(() => {}), espera(800)]) : null)
    .then(iniciar);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pronto); else pronto();
})();

/*
 * Home — "Missão e valores": bolhas com os títulos flutuam devagar pela seção.
 * - Quando a seção aparece, as bolhas surgem do próprio centro, de forma suave.
 * - Ao tocar numa bolha, ela vira um painel que ocupa UM TERÇO do quadro (no topo);
 *   as outras continuam flutuando no espaço que sobrou. A segunda ocupa mais um
 *   terço, e com a terceira o quadro fica todo preenchido com a missão e os valores.
 * - Cada painel tem um X para fechar (a bolha volta a flutuar).
 */
(function () {
  "use strict";

  const area = document.querySelector("[data-bolhas]");
  if (!area) return;
  const bolhas = [...area.querySelectorAll(".bolha")];
  const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const antigo = area.querySelector(".bolha-aberta");
  if (antigo) antigo.remove(); // painel único da versão anterior

  let corpos = [];
  let largura = 0, altura = 0;
  let rodando = false, visivel = false, ultimo = 0;
  let topoAtual = 0, topoAlvo = 0;   // limite de cima do espaço livre (cresce quando um painel abre)
  const abertos = [];                // bolhas abertas, na ordem em que foram abertas (cada uma = 1 terço)

  const INICIO = [[0.27, 0.28], [0.72, 0.42], [0.42, 0.76]];
  const terco = () => altura / 3;

  function medir() {
    const r = area.getBoundingClientRect();
    largura = r.width; altura = r.height;
  }

  function iniciar() {
    medir();
    corpos = bolhas.map((el, i) => {
      const raio = el.offsetWidth / 2;
      const ang = Math.random() * Math.PI * 2;
      const vel = 10 + Math.random() * 6; // px por segundo
      const [fx, fy] = INICIO[i % INICIO.length];
      return { el, raio, aberta: false, x: Math.min(Math.max(fx * largura, raio), largura - raio), y: Math.min(Math.max(fy * altura, raio), altura - raio), vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel };
    });
    desenhar();
  }

  function desenhar() {
    corpos.forEach((c) => { c.el.style.transform = `translate(${(c.x - c.raio).toFixed(1)}px, ${(c.y - c.raio).toFixed(1)}px)`; });
  }

  function limitar(c) {
    const cima = topoAtual + c.raio + 4;
    if (c.x < c.raio) { c.x = c.raio; c.vx = Math.abs(c.vx); }
    if (c.x > largura - c.raio) { c.x = largura - c.raio; c.vx = -Math.abs(c.vx); }
    if (c.y < cima) { c.y = cima; c.vy = Math.abs(c.vy); }
    if (c.y > altura - c.raio) { c.y = altura - c.raio; c.vy = -Math.abs(c.vy); }
  }

  function passo(t) {
    if (!rodando) return;
    const dt = Math.min(0.25, (t - (ultimo || t)) / 1000);
    ultimo = t;
    // O espaço livre encolhe/cresce de forma suave quando um painel abre/fecha
    topoAtual += (topoAlvo - topoAtual) * Math.min(1, dt * 6);
    const livres = corpos.filter((c) => !c.aberta);
    livres.forEach((c) => { c.x += c.vx * dt; c.y += c.vy * dt; limitar(c); });
    for (let i = 0; i < livres.length; i++) {
      for (let j = i + 1; j < livres.length; j++) {
        const a = livres[i], b = livres[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy), min = a.raio + b.raio + 6;
        if (dist > 0 && dist < min) {
          const nx = dx / dist, ny = dy / dist, sobra = (min - dist) / 2;
          a.x -= nx * sobra; a.y -= ny * sobra; b.x += nx * sobra; b.y += ny * sobra;
          const va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny;
          if (va - vb > 0) { a.vx += (vb - va) * nx; a.vy += (vb - va) * ny; b.vx += (va - vb) * nx; b.vy += (va - vb) * ny; }
          limitar(a); limitar(b);
        }
      }
    }
    desenhar();
    requestAnimationFrame(passo);
  }

  function atualizarMovimento() {
    const deve = visivel && !semMovimento && corpos.some((c) => !c.aberta);
    if (deve && !rodando) { rodando = true; ultimo = 0; requestAnimationFrame(passo); }
    else if (!deve) rodando = false;
  }

  // Entrada: as bolhas crescem a partir do próprio centro, uma depois da outra, sem pressa
  let apareceu = false;
  function surgir() {
    apareceu = true;
    area.classList.remove("bolhas--espera");
    if (semMovimento) return;
    bolhas.forEach((b, i) => b.animate([
      { scale: 0, opacity: 0 },
      { scale: 1.04, opacity: 1, offset: 0.7 },
      { scale: 1 },
    ], { duration: 1300, delay: 200 + i * 320, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" }));
  }

  new IntersectionObserver((e) => {
    visivel = e[0].isIntersecting;
    if (visivel && !apareceu && e[0].intersectionRatio >= 0.35) surgir();
    atualizarMovimento();
  }, { threshold: [0, 0.35] }).observe(area);

  window.addEventListener("resize", () => {
    medir();
    corpos.forEach((c) => { c.raio = c.el.offsetWidth / 2; });
    reposicionarPaineis(false);
  });

  // ---------- Painéis (cada um ocupa um terço do quadro) ----------
  function reposicionarPaineis(animar) {
    abertos.forEach((c, i) => {
      if (!animar) c.painel.style.transition = "none";
      c.painel.style.top = `${i * terco()}px`;
      if (!animar) { void c.painel.offsetHeight; c.painel.style.transition = ""; }
    });
    topoAlvo = abertos.length * terco();
    if (!animar) topoAtual = topoAlvo;
  }

  function abrir(c) {
    if (c.aberta) return;
    const r = c.el.getBoundingClientRect(), a = area.getBoundingClientRect();
    c.aberta = true;
    c.el.classList.add("bolha--aberta");
    c.el.setAttribute("aria-expanded", "true");
    const p = document.createElement("div");
    p.className = "missao-painel";
    p.setAttribute("role", "region");
    p.innerHTML = `<button class="missao-painel__fechar" type="button" aria-label="Fechar"></button>
      <h3>${c.el.querySelector(".bolha__titulo").textContent}</h3>
      <p>${c.el.querySelector(".bolha__texto").textContent}</p>`;
    c.painel = p;
    abertos.push(c);
    p.style.top = `${(abertos.length - 1) * terco()}px`;
    area.appendChild(p);
    topoAlvo = abertos.length * terco();
    p.querySelector(".missao-painel__fechar").addEventListener("click", (e) => { e.stopPropagation(); fechar(c); });
    // O painel "cresce" a partir da bolha (círculo que se abre no lugar onde ela estava)
    if (!semMovimento) {
      const pr = p.getBoundingClientRect();
      const cx = r.left + r.width / 2 - pr.left, cy = r.top + r.height / 2 - pr.top;
      p.animate([
        { clipPath: `circle(${r.width / 2}px at ${cx}px ${cy}px)` },
        { clipPath: `circle(${Math.hypot(pr.width, pr.height) * 1.1}px at ${cx}px ${cy}px)` },
      ], { duration: 650, easing: "cubic-bezier(.3,.8,.25,1)" });
      p.querySelectorAll("h3, p").forEach((el, i) => el.animate([{ opacity: 0, translate: "0 0.8rem" }, { opacity: 1, translate: "0 0" }], { duration: 500, delay: 250 + i * 90, easing: "ease-out", fill: "backwards" }));
    }
    atualizarMovimento();
  }

  function fechar(c) {
    if (!c.aberta) return;
    const p = c.painel;
    const fim = () => {
      p.remove();
      abertos.splice(abertos.indexOf(c), 1);
      reposicionarPaineis(true);
      // A bolha volta a flutuar, saindo do espaço livre
      c.aberta = false;
      c.el.classList.remove("bolha--aberta");
      c.el.setAttribute("aria-expanded", "false");
      c.x = Math.min(Math.max(largura / 2, c.raio), largura - c.raio);
      c.y = altura - c.raio - 6;
      desenhar();
      if (!semMovimento) c.el.animate([{ scale: 0, opacity: 0 }, { scale: 1, opacity: 1 }], { duration: 700, easing: "cubic-bezier(.22,1,.36,1)" });
      atualizarMovimento();
      c.el.focus({ preventScroll: true });
    };
    if (semMovimento) return fim();
    const pr = p.getBoundingClientRect();
    p.animate([
      { clipPath: `circle(${Math.hypot(pr.width, pr.height)}px at 50% 50%)` },
      { clipPath: "circle(0px at 50% 50%)" },
    ], { duration: 420, easing: "cubic-bezier(.5,0,.75,.4)" }).onfinish = fim;
  }

  bolhas.forEach((b, i) => b.addEventListener("click", () => abrir(corpos[i])));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && abertos.length) fechar(abertos[abertos.length - 1]);
  });

  (document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve()).then(iniciar);
})();

/*
 * Home — "Missão e valores": bolhas com os títulos flutuam devagar pela seção,
 * quicando nas bordas e umas nas outras. Ao tocar numa bolha, ela se abre
 * (círculo que cresce) mostrando o texto completo.
 */
(function () {
  "use strict";

  const area = document.querySelector("[data-bolhas]");
  if (!area) return;
  const bolhas = [...area.querySelectorAll(".bolha")];
  const painel = area.querySelector(".bolha-aberta");
  const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Estado de cada bolha: posição (x, y do centro), velocidade e raio, em px
  let corpos = [];
  let largura = 0, altura = 0;
  let rodando = false, visivel = false, aberta = null, ultimo = 0;

  // Posições iniciais espalhadas (frações da área), sem sobrepor
  const INICIO = [[0.27, 0.3], [0.72, 0.36], [0.45, 0.74]];

  function medir() {
    const r = area.getBoundingClientRect();
    largura = r.width; altura = r.height;
  }

  function iniciar() {
    medir();
    corpos = bolhas.map((el, i) => {
      const raio = el.offsetWidth / 2;
      const ang = Math.random() * Math.PI * 2;
      const vel = 11 + Math.random() * 7; // px por segundo: bem devagar
      const [fx, fy] = INICIO[i % INICIO.length];
      return {
        el, raio,
        x: Math.min(Math.max(fx * largura, raio), largura - raio),
        y: Math.min(Math.max(fy * altura, raio), altura - raio),
        vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel,
      };
    });
    desenhar();
  }

  function desenhar() {
    corpos.forEach((c) => { c.el.style.transform = `translate(${(c.x - c.raio).toFixed(1)}px, ${(c.y - c.raio).toFixed(1)}px)`; });
  }

  function passo(t) {
    if (!rodando) return;
    const dt = Math.min(0.05, (t - (ultimo || t)) / 1000);
    ultimo = t;
    corpos.forEach((c) => {
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.x < c.raio) { c.x = c.raio; c.vx = Math.abs(c.vx); }
      if (c.x > largura - c.raio) { c.x = largura - c.raio; c.vx = -Math.abs(c.vx); }
      if (c.y < c.raio) { c.y = c.raio; c.vy = Math.abs(c.vy); }
      if (c.y > altura - c.raio) { c.y = altura - c.raio; c.vy = -Math.abs(c.vy); }
    });
    // Colisão entre bolhas: troca as velocidades na direção do choque
    for (let i = 0; i < corpos.length; i++) {
      for (let j = i + 1; j < corpos.length; j++) {
        const a = corpos[i], b = corpos[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy), min = a.raio + b.raio + 6;
        if (dist > 0 && dist < min) {
          const nx = dx / dist, ny = dy / dist;
          const sobra = (min - dist) / 2;
          a.x -= nx * sobra; a.y -= ny * sobra; b.x += nx * sobra; b.y += ny * sobra;
          const va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny;
          if (va - vb > 0) {
            a.vx += (vb - va) * nx; a.vy += (vb - va) * ny;
            b.vx += (va - vb) * nx; b.vy += (va - vb) * ny;
          }
        }
      }
    }
    desenhar();
    requestAnimationFrame(passo);
  }

  function atualizarMovimento() {
    const deve = visivel && !aberta && !semMovimento;
    if (deve && !rodando) { rodando = true; ultimo = 0; requestAnimationFrame(passo); }
    else if (!deve) rodando = false;
  }

  // "Pop" de entrada: na primeira vez que a seção aparece, as bolhas
  // surgem uma a uma, crescendo e quicando
  let apareceu = false;
  function pop() {
    apareceu = true;
    area.classList.remove("bolhas--espera");
    if (semMovimento) return;
    bolhas.forEach((b, i) => {
      b.animate([
        { scale: 0, opacity: 0 },
        { scale: 1.18, opacity: 1, offset: 0.55 },
        { scale: 0.94, offset: 0.8 },
        { scale: 1 },
      ], { duration: 650, delay: 140 + i * 170, easing: "cubic-bezier(.3,.7,.4,1)", fill: "backwards" });
    });
  }

  // Só anima quando a seção está na tela (economiza bateria)
  new IntersectionObserver((entradas) => {
    visivel = entradas[0].isIntersecting;
    if (visivel && !apareceu && entradas[0].intersectionRatio >= 0.35) pop();
    atualizarMovimento();
  }, { threshold: [0, 0.35] }).observe(area);

  window.addEventListener("resize", () => { medir(); corpos.forEach((c) => { c.raio = c.el.offsetWidth / 2; }); });

  // ---------- Abrir / fechar uma bolha ----------
  function abrir(bolha) {
    aberta = bolha;
    atualizarMovimento();
    painel.querySelector("h3").textContent = bolha.querySelector(".bolha__titulo").textContent;
    painel.querySelector("p").textContent = bolha.querySelector(".bolha__texto").textContent;
    painel.hidden = false;
    bolha.setAttribute("aria-expanded", "true");
    bolhas.forEach((b) => { if (b !== bolha) b.classList.add("bolha--apagada"); });
    if (!semMovimento) {
      const a = area.getBoundingClientRect(), r = bolha.getBoundingClientRect();
      const cx = r.left + r.width / 2 - a.left, cy = r.top + r.height / 2 - a.top;
      painel.animate([
        { clipPath: `circle(${r.width / 2}px at ${cx}px ${cy}px)` },
        { clipPath: `circle(${Math.hypot(a.width, a.height)}px at ${cx}px ${cy}px)` },
      ], { duration: 520, easing: "cubic-bezier(.3,.8,.25,1)" });
    }
    painel.querySelector(".bolha-aberta__fechar").focus({ preventScroll: true });
  }

  function fechar() {
    if (!aberta) return;
    const bolha = aberta;
    const terminar = () => {
      painel.hidden = true;
      bolha.setAttribute("aria-expanded", "false");
      bolhas.forEach((b) => b.classList.remove("bolha--apagada"));
      aberta = null;
      atualizarMovimento();
      bolha.focus({ preventScroll: true });
    };
    if (semMovimento) return terminar();
    const a = area.getBoundingClientRect(), r = bolha.getBoundingClientRect();
    const cx = r.left + r.width / 2 - a.left, cy = r.top + r.height / 2 - a.top;
    painel.animate([
      { clipPath: `circle(${Math.hypot(a.width, a.height)}px at ${cx}px ${cy}px)` },
      { clipPath: `circle(${r.width / 2}px at ${cx}px ${cy}px)` },
    ], { duration: 380, easing: "cubic-bezier(.5,0,.75,.4)" }).onfinish = terminar;
  }

  bolhas.forEach((b) => b.addEventListener("click", () => abrir(b)));
  painel.querySelector(".bolha-aberta__fechar").addEventListener("click", fechar);
  painel.addEventListener("click", (e) => { if (e.target === painel) fechar(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });

  // Espera as fontes para medir o tamanho real das bolhas
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(iniciar);
})();

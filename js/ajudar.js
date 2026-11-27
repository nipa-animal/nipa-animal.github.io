/*
 * Página Ajudar: a opção que está no centro da tela "cresce" um pouco,
 * como se estivesse em destaque, conforme a pessoa rola a página.
 */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Em seções de largura total, cresce só o conteúdo (para não vazar da tela)
  const alvos = [...document.querySelectorAll(".ajuda--dinheiro, .voluntariado__texto, .ajuda--itens, .parcerias__conteudo, .loja .grupo-texto, .ajuda--rifas")];
  const AUMENTO = 0.06; // a do centro fica 6% maior
  let pedido = 0;

  function atualizar() {
    pedido = 0;
    const meio = window.innerHeight / 2;
    const alcance = window.innerHeight * 0.55;
    alvos.forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - meio) / alcance;
      let t = Math.max(0, 1 - d);
      t = t * t * (3 - 2 * t); // suaviza a entrada e a saída
      el.style.scale = (1 + AUMENTO * t).toFixed(4);
      el.classList.toggle("em-destaque", t > 0.6);
    });
  }
  const agendar = () => { if (!pedido) pedido = requestAnimationFrame(atualizar); };
  window.addEventListener("scroll", agendar, { passive: true });
  window.addEventListener("resize", agendar);
  atualizar();
})();

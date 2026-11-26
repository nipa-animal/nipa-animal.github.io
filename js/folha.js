/*
 * Dados salvos no navegador (salvos, fixados, notificações) e as folhas
 * sobrepostas: ficha do animal, questionário de adoção e notificação.
 * Na ficha dá para passar de um animal para outro: setas, deslizar o dedo
 * para os lados ou as setas do teclado.
 */
(function () {
  "use strict";

  // Lista de animais (carregada de data/animais.json por js/dados.js)
  const lista = () => window.ANIMAIS || [];
  const porId = (id) => lista().find((a) => a.id === id);

  // ---------- Armazenamento local ----------
  const ler = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* modo privado */ } };
  const alternar = (k, id) => {
    const l = ler(k);
    const i = l.indexOf(id);
    if (i >= 0) l.splice(i, 1); else l.unshift(id);
    gravar(k, l);
    return i < 0;
  };

  const Store = {
    salvos: () => ler("nipa:salvos").filter(porId),
    estaSalvo: (id) => ler("nipa:salvos").includes(id),
    alternarSalvo: (id) => {
      const agora = alternar("nipa:salvos", id);
      if (!agora) gravar("nipa:fixados", ler("nipa:fixados").filter((x) => x !== id));
      return agora;
    },
    estaFixado: (id) => ler("nipa:fixados").includes(id),
    alternarFixado: (id) => alternar("nipa:fixados", id),
    fixados: () => ler("nipa:fixados"),
    estaNotificado: (id) => ler("nipa:notificar").includes(id),
    marcarNotificado: (id) => { const l = ler("nipa:notificar"); if (!l.includes(id)) { l.push(id); gravar("nipa:notificar", l); } },
    // Coloca os fixados primeiro (o último fixado fica no topo)
    ordenar: (animais) => {
      const fix = ler("nipa:fixados");
      return [...fix.map((id) => animais.find((a) => a.id === id)).filter(Boolean), ...animais.filter((a) => !fix.includes(a.id))];
    },
    salvosOrdenados: () => Store.ordenar(Store.salvos().map(porId)),
  };

  // ---------- Ícones ----------
  const ICONES = {
    energia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',
    carencia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-9-9.3C2 7.4 4.2 4.5 7.4 4.5c2 0 3.4 1.1 4.6 2.7 1.2-1.6 2.6-2.7 4.6-2.7 3.2 0 5.4 2.9 4.4 6.2-1.5 4.7-9 9.3-9 9.3Z"/></svg>',
    brincalhao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8L12 3Z"/></svg>',
    rebeldia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5c.3 2 1 3.3 2 4.1A8 8 0 1 0 18 8.6c1-.8 1.7-2.1 2-4.1-1.9.4-3.4 1-4.4 2A8 8 0 0 0 8.4 6.5c-1-1-2.5-1.6-4.4-2Z"/><path d="m8 11.5 2.5 1.2M16 11.5l-2.5 1.2M9.5 16.5c1.6 1 3.4 1 5 0"/></svg>',
  };
  const ROTULOS = { energia: "Energia", carencia: "Carência", brincalhao: "Brincalhão", rebeldia: "Rebeldia" };
  const MARCADOR = `<svg viewBox="0 0 10.41 13.9" aria-hidden="true">
      <path class="cheio" fill="currentColor" d="M.4 1.2C.4.7.8.4 1.3.4h7.9c.5 0 .8.4.8.9v11.7c0 .3-.3.5-.6.3L5.2 9.9 1 13.3c-.3.2-.6 0-.6-.3V1.2Z"/>
      <path fill="currentColor" d="M5.64,10.57c-.23-.23-.64-.23-.86-.01l-3.06,3.06c-.29.29-.71.35-1.09.19C.33,13.69,0,13.38,0,12.97V1.25C0,.59.54,0,1.21,0h7.99c.71,0,1.21.62,1.21,1.3v11.67c0,.41-.33.72-.63.84-.38.16-.8.09-1.09-.19l-3.05-3.04ZM6.19,9.97l3.07,3.07c.07.02.19.03.24.01s.1-.13.1-.21V1.3c0-.29-.2-.5-.49-.5H1.3c-.29,0-.49.2-.49.5v11.58c0,.07.07.19.13.19l.2-.03,3.13-3.12c.57-.45,1.36-.45,1.92.05Z"/>
    </svg>`;
  const VOLTAR = '<img src="assets/Asset%2015Icones.svg" alt="">';
  const SETA = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d === "ant" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}"/></svg>`;
  const PATA = '<span class="pata" aria-hidden="true"></span>';

  // Moldura circular: a mesma foto duas vezes (recortada no círculo + livre acima dele)
  const moldura = (a, extra = "") => `
    <div class="moldura ${extra}">
      <div class="moldura__circ"><img src="${a.foto}" alt="Foto de ${a.nome}" loading="lazy" decoding="async"></div>
      <div class="moldura__topo" aria-hidden="true"><img src="${a.foto}" alt="" loading="lazy" decoding="async"></div>
    </div>`;
  const juntar = (a) => `${a.idade}, ${String(a.sexo).toLowerCase()}, ${a.raca}`;

  // ---------- Folha sobreposta ----------
  const fundo = document.querySelector("[data-folha-bg]");
  const folha = document.querySelector("[data-folha]");
  let atual = null;      // animal aberto
  let tipoAtual = null;  // "ficha", "questionario" ou "notificar"
  let aoFechar = null;   // callback para atualizar a página
  let focoAnterior = null;
  let navLista = [];     // ids que a ficha pode percorrer (setas / deslizar)

  // Estrutura da carta: frente (conteúdo), verso e brilho
  let frente = null, brilho = null, navAnt = null, navProx = null;
  if (folha) {
    folha.innerHTML = `
      <div class="folha__frente" data-frente></div>
      <div class="folha__verso" aria-hidden="true"><span>Logo</span></div>`;
    frente = folha.querySelector("[data-frente]");
    brilho = document.createElement("div");
    brilho.className = "folha__brilho";
    brilho.setAttribute("aria-hidden", "true");
    folha.appendChild(brilho);
    // Setas laterais (ficam nas margens, fora da carta)
    navAnt = document.createElement("button");
    navProx = document.createElement("button");
    navAnt.className = "folha-nav folha-nav--ant";
    navProx.className = "folha-nav folha-nav--prox";
    navAnt.type = navProx.type = "button";
    navAnt.setAttribute("aria-label", "Animal anterior");
    navProx.setAttribute("aria-label", "Próximo animal");
    navAnt.innerHTML = SETA("ant");
    navProx.innerHTML = SETA("prox");
    fundo.after(navAnt, navProx);
  }

  function htmlFicha(a) {
    const salvo = Store.estaSalvo(a.id);
    return `
      <button class="folha__fechar" type="button" data-fechar aria-label="Fechar"></button>
      <h2 class="folha__titulo" id="folha-titulo">Sobre</h2>
      <div class="ficha__topo">
        ${moldura(a)}
        <h3 class="ficha__nome">${PATA}<span>${a.nome}</span></h3>
        <ul class="ficha__dados">
          <li><strong>idade:</strong> ${a.idade}</li>
          <li><strong>sexo:</strong> ${String(a.sexo).toLowerCase()}</li>
          <li><strong>raça:</strong> ${a.raca}</li>
        </ul>
      </div>
      <div class="ficha__historia">${a.historia.map((p) => `<p>${p}</p>`).join("")}</div>
      <div class="atributos">
        ${Object.keys(ROTULOS).map((k) => `
          <div class="atributo">
            <div class="atributo__label">${ICONES[k]}<span>${ROTULOS[k]}</span></div>
            <div class="barra" role="meter" aria-label="${ROTULOS[k]}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${a.atributos[k]}"><i data-largura="${a.atributos[k]}"></i></div>
          </div>`).join("")}
      </div>
      <div class="ficha__acoes">
        <button class="btn-salvar" type="button" data-salvar aria-pressed="${salvo}" aria-label="${salvo ? "Remover dos salvos" : "Salvar"}">${MARCADOR}</button>
        ${a.adotado
          ? '<span class="btn btn--verde" aria-disabled="true">Adotado</span>'
          : '<button class="btn btn--verde" type="button" data-adotar>Adotar</button>'}
      </div>
      <p class="ficha__nota">*Todos os animais para a adoção já estão castrados, vermifugados e vacinados</p>
      ${navLista.length > 1 ? '<p class="ficha__dica">Deslize para os lados para ver outros amigos</p>' : ""}`;
  }

  function htmlQuestionario(a, voltarParaFicha) {
    return `
      ${voltarParaFicha ? `<button class="folha__voltar" type="button" data-ver-ficha aria-label="Voltar para a ficha">${VOLTAR}</button>` : ""}
      <button class="folha__fechar" type="button" data-fechar aria-label="Fechar"></button>
      <h2 class="folha__titulo" id="folha-titulo">Adotar ${a.nome}</h2>
      <form class="form" data-questionario>
        <h3>Informações gerais</h3>
        <label>Nome completo<input name="Nome" required autocomplete="name"></label>
        <label>Idade<input name="Idade" type="number" min="18" max="120" required></label>
        <label>Cidade / bairro<input name="Cidade/bairro" required autocomplete="address-level2"></label>
        <label>Mora em casa ou apartamento?<input name="Moradia" required></label>
        <label>Tem outros animais? Quais?<input name="Outros animais"></label>
        <label>Por que deseja adotar?<textarea name="Motivo" required></textarea></label>
        <h3>Informações de contato</h3>
        <label>Telefone / WhatsApp<input name="Telefone" type="tel" required autocomplete="tel"></label>
        <label>E-mail<input name="E-mail" type="email" autocomplete="email"></label>
        <div class="form__acoes"><button class="btn btn--verde" type="submit">Enviar</button></div>
      </form>`;
  }

  function htmlNotificar(a) {
    return `
      <button class="folha__fechar" type="button" data-fechar aria-label="Fechar"></button>
      <h2 class="folha__titulo" id="folha-titulo">Notificar</h2>
      <p class="form__intro">Inscreva seu e-mail para saber quando ${a.nome} for adotado.</p>
      <form class="form" data-notificar>
        <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
        <div class="form__acoes"><button class="btn btn--verde" type="submit">Inscrever</button></div>
      </form>`;
  }

  function mostrar(html, tipo) {
    tipoAtual = tipo;
    frente.innerHTML = html;
    fundo.scrollTop = 0;
    // Setas só na ficha e quando há mais de um animal na lista
    fundo.classList.toggle("com-nav", tipo === "ficha" && navLista.length > 1);
    frente.querySelectorAll("img").forEach((i) => { i.loading = "eager"; });
    requestAnimationFrame(() => requestAnimationFrame(() =>
      frente.querySelectorAll("[data-largura]").forEach((i) => { i.style.width = i.dataset.largura + "%"; })
    ));
  }

  // ---------- Animação de "carta revelada" ----------
  const semMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let origem = null;     // elemento de onde a carta "sai"
  let animacao = null;
  let simples = false;   // true = abre sem o giro de carta (ex.: Notificar)

  function vetorOrigem() {
    const f = folha.getBoundingClientRect();
    if (!origem || !origem.isConnected) return { x: 0, y: window.innerHeight * 0.6, s: 0.3 };
    const o = origem.getBoundingClientRect();
    return {
      x: o.left + o.width / 2 - (f.left + f.width / 2),
      y: o.top + o.height / 2 - (f.top + f.height / 2),
      s: Math.max(0.12, Math.min(0.5, o.width / f.width)),
    };
  }

  function animarEntrada() {
    folha.getAnimations().forEach((an) => an.cancel());
    animacao = null;
    if (semMovimento()) return;
    if (simples) {
      animacao = folha.animate([
        { transform: "translateY(2.4rem) scale(.97)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ], { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" });
      animacao.onfinish = () => { animacao = null; };
      return;
    }
    const { x, y, s } = vetorOrigem();
    // Mola amortecida: o giro desacelera de forma contínua e "assenta" no fim
    const N = 36;
    const quadros = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = 1 - Math.pow(1 - t, 3);
      const mola = Math.exp(-4 * t) * Math.cos(4.2 * t) * (1 - Math.pow(t, 6));
      const tx = x * (1 - p);
      const ty = y * (1 - p) - 44 * Math.sin(Math.PI * p) * (1 - t);
      const sc = s + (1 - s) * p + 0.035 * Math.sin(Math.PI * p);
      quadros.push({
        transform: i === N ? "none"
          : `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${sc.toFixed(4)}) rotateY(${(180 * mola).toFixed(2)}deg) rotateZ(${(-10 * mola).toFixed(2)}deg)`,
      });
    }
    animacao = folha.animate(quadros, { duration: 950, easing: "linear" });
    brilho.animate([
      { backgroundPosition: "150% 0", opacity: 0 },
      { opacity: 1, offset: 0.3 },
      { backgroundPosition: "-50% 0", opacity: 0 },
    ], { duration: 850, delay: 380, easing: "ease-out" });
    animacao.onfinish = () => { animacao = null; };
  }

  function animarSaida(depois) {
    if (animacao) animacao.cancel();
    if (semMovimento()) return depois();
    if (simples) {
      animacao = folha.animate([
        { transform: "none", opacity: 1 },
        { transform: "translateY(1.6rem) scale(.98)", opacity: 0 },
      ], { duration: 220, easing: "ease-in", fill: "forwards" });
      animacao.onfinish = () => { animacao = null; depois(); };
      return;
    }
    const { x, y, s } = vetorOrigem();
    animacao = folha.animate([
      { transform: "none" },
      { transform: "translate(0, -10px) scale(1.03) rotateY(-8deg)", offset: 0.25 },
      { transform: `translate(${x}px, ${y}px) scale(${s}) rotateY(180deg) rotateZ(-8deg)` },
    ], { duration: 520, easing: "cubic-bezier(.5,0,.75,.4)", fill: "forwards" });
    animacao.onfinish = () => { animacao = null; depois(); };
  }

  // ---------- Passar para o animal anterior / seguinte ----------
  let trocando = false;
  function irPara(passo, arrasteX = 0) {
    if (tipoAtual !== "ficha" || navLista.length < 2 || trocando || !atual) return;
    const i = navLista.indexOf(atual.id);
    const novo = porId(navLista[(i + passo + navLista.length) % navLista.length]);
    if (!novo) return;
    trocando = true;
    folha.getAnimations().forEach((an) => an.cancel());
    const largura = folha.offsetWidth;
    const fim = () => { trocando = false; };
    if (semMovimento()) { atual = novo; mostrar(htmlFicha(novo), "ficha"); fim(); return; }
    // Sai para um lado girando levemente e o novo entra pelo outro
    const sai = folha.animate([
      { transform: `translateX(${arrasteX}px) rotateY(${-arrasteX / 40}deg)`, opacity: 1 },
      { transform: `translateX(${-passo * largura * 0.9}px) rotateY(${passo * 18}deg) scale(.92)`, opacity: 0 },
    ], { duration: 230, easing: "cubic-bezier(.5,0,.8,.4)", fill: "forwards" });
    sai.onfinish = () => {
      atual = novo;
      mostrar(htmlFicha(novo), "ficha");
      const entra = folha.animate([
        { transform: `translateX(${passo * largura * 0.9}px) rotateY(${-passo * 18}deg) scale(.92)`, opacity: 0 },
        { transform: "none", opacity: 1 },
      ], { duration: 420, easing: "cubic-bezier(.2,.9,.25,1.05)" });
      sai.cancel();
      entra.onfinish = fim;
      entra.oncancel = fim;
    };
  }

  // Deslizar o dedo (ou arrastar com o mouse) para os lados
  function ligarDeslize() {
    let x0 = 0, y0 = 0, dx = 0, ativo = false, horizontal = null, idPtr = null;
    folha.addEventListener("pointerdown", (e) => {
      if (tipoAtual !== "ficha" || navLista.length < 2 || animacao || trocando) return;
      if (e.target.closest("button, a, input, textarea")) return;
      ativo = true; horizontal = null; dx = 0; x0 = e.clientX; y0 = e.clientY; idPtr = e.pointerId;
    });
    folha.addEventListener("pointermove", (e) => {
      if (!ativo || e.pointerId !== idPtr) return;
      const mx = e.clientX - x0, my = e.clientY - y0;
      if (horizontal === null && Math.hypot(mx, my) > 8) {
        horizontal = Math.abs(mx) > Math.abs(my);
        if (horizontal) { try { folha.setPointerCapture(idPtr); } catch { /* ok */ } }
        else ativo = false;
      }
      if (horizontal) {
        dx = mx;
        folha.style.transform = `translateX(${dx}px) rotateY(${-dx / 40}deg)`;
      }
    });
    const soltar = () => {
      if (!ativo) return;
      ativo = false;
      const arraste = dx;
      folha.style.transform = "";
      if (horizontal && Math.abs(arraste) > 70) irPara(arraste < 0 ? 1 : -1, arraste);
      else if (horizontal && arraste) folha.animate([{ transform: `translateX(${arraste}px)` }, { transform: "none" }], { duration: 300, easing: "cubic-bezier(.2,.9,.3,1.3)" });
    };
    folha.addEventListener("pointerup", soltar);
    folha.addEventListener("pointercancel", soltar);
  }

  // Leve inclinação 3D acompanhando o mouse (como segurar uma carta)
  function ligarInclinacao() {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    folha.addEventListener("pointermove", (e) => {
      if (animacao || trocando || semMovimento() || e.buttons) return;
      const r = folha.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / Math.min(r.height, window.innerHeight) - 0.5;
      frente.style.transform = `rotateY(${px * 6}deg) rotateX(${-py * 4}deg)`;
      brilho.style.setProperty("--brilho-x", `${(px + 0.5) * 100}%`);
      brilho.style.setProperty("--brilho-y", `${(e.clientY - r.top) / r.height * 100}%`);
      brilho.classList.add("ativo");
    });
    folha.addEventListener("pointerleave", () => {
      frente.style.transform = "";
      brilho.classList.remove("ativo");
    });
  }

  /**
   * Abre uma folha.
   * @param tipo     "ficha" | "questionario" | "notificar"
   * @param id       id do animal
   * @param callback chamado ao fechar (para a página se atualizar)
   * @param elOrigem elemento de onde a carta "sai" na animação
   * @param ids      lista de ids que a ficha pode percorrer com as setas/deslize
   */
  function abrir(tipo, id, callback, elOrigem, ids) {
    const a = porId(id);
    if (!a) return;
    atual = a;
    aoFechar = callback || null;
    focoAnterior = document.activeElement;
    origem = elOrigem || null;
    simples = tipo === "notificar";
    navLista = tipo === "ficha" && Array.isArray(ids) ? ids.filter(porId) : [];
    folha.getAnimations().forEach((an) => an.cancel());
    animacao = null;
    if (tipo === "ficha") mostrar(htmlFicha(a), "ficha");
    else if (tipo === "questionario") mostrar(htmlQuestionario(a, false), "questionario");
    else if (tipo === "notificar") mostrar(htmlNotificar(a), "notificar");
    fundo.hidden = false;
    document.body.classList.add("travado");
    fundo.classList.add("aberta");
    // Espera a foto estar decodificada (até 200 ms) para o giro não engasgar
    folha.style.visibility = "hidden";
    const foto = frente.querySelector(".moldura img");
    const pronta = foto && foto.decode ? foto.decode().catch(() => {}) : Promise.resolve();
    Promise.race([pronta, new Promise((r) => setTimeout(r, 200))]).then(() => {
      if (atual !== a) return;
      folha.style.visibility = "";
      animarEntrada();
      const alvo = frente.querySelector("[data-fechar]");
      if (alvo) alvo.focus({ preventScroll: true });
    });
  }

  function fechar() {
    if (!atual) return;
    atual = null;
    frente.style.transform = "";
    fundo.classList.remove("aberta", "com-nav");
    animarSaida(() => {
      if (atual) return;
      fundo.hidden = true;
      document.body.classList.remove("travado");
      if (animacao) animacao.cancel();
      folha.getAnimations().forEach((an) => an.cancel());
    });
    if (focoAnterior && focoAnterior.isConnected) focoAnterior.focus({ preventScroll: true });
    if (aoFechar) aoFechar();
  }

  if (fundo) {
    ligarInclinacao();
    ligarDeslize();
    navAnt.addEventListener("click", () => irPara(-1));
    navProx.addEventListener("click", () => irPara(1));
    fundo.addEventListener("click", (e) => {
      if (e.target === fundo || e.target.closest("[data-fechar]")) return fechar();
      if (e.target.closest("[data-ver-ficha]")) return mostrar(htmlFicha(atual), "ficha");
      const salvar = e.target.closest("[data-salvar]");
      if (salvar) {
        const agora = Store.alternarSalvo(atual.id);
        salvar.setAttribute("aria-pressed", String(agora));
        salvar.setAttribute("aria-label", agora ? "Remover dos salvos" : "Salvar");
        return;
      }
      if (e.target.closest("[data-adotar]")) mostrar(htmlQuestionario(atual, true), "questionario");
    });

    fundo.addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target;
      if (form.matches("[data-questionario]")) {
        const linhas = [`Olá, NIPA! Tenho interesse em adotar ${atual.nome}.`, ""];
        new FormData(form).forEach((v, k) => { if (String(v).trim()) linhas.push(`${k}: ${String(v).trim()}`); });
        window.NIPA.abrirWhats(linhas.join("\n"));
        fechar();
      } else if (form.matches("[data-notificar]")) {
        Store.marcarNotificado(atual.id);
        window.NIPA.abrirWhats(`Olá, NIPA! Quero ser avisado(a) por e-mail quando ${atual.nome} for adotado.\nE-mail: ${form.email.value.trim()}`);
        fechar();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (!atual) return;
      if (e.key === "Escape") fechar();
      const digitando = e.target instanceof Element && e.target.closest("input, textarea");
      if (e.key === "ArrowRight" && !digitando) irPara(1);
      else if (e.key === "ArrowLeft" && !digitando) irPara(-1);
    });
  }

  window.NIPAFolha = { Store, abrir, fechar, ICONES, MARCADOR, PATA, moldura, juntar, porId };
})();

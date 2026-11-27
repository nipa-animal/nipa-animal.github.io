/*
 * Cards verticais de "Amigos salvos." e "Adote Um Amigo."
 * Cachorro = fundo verde + orelhas caídas; gato = fundo laranja + orelhas em
 * triângulo. Círculo atrás do animal sempre bege. Adotado = fundo claro.
 * Tocar no card faz o animal latir/miar; tocar na foto também a "aperta".
 * Em "Adote Um Amigo" há filtros e ordenação.
 */
window.NIPA_DADOS.then((animais) => {
  "use strict";

  const { Store, abrir, apertar, moldura, juntar } = window.NIPAFolha;
  const lista = document.querySelector("[data-cards]");
  const pagina = lista.dataset.cards; // "salvos" ou "adote"
  const semMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Filtros e ordenação (só em "Adote Um Amigo") ----------
  const NIVEIS = [["baixo", "Baixo"], ["medio", "Médio"], ["alto", "Alto"]];
  const GRUPOS = [
    { chave: "especie", titulo: "Cachorro ou gato", opcoes: [["cachorro", "Cachorro"], ["gato", "Gato"]] },
    { chave: "faixa", titulo: "Idade", opcoes: [["filhote", "Filhote"], ["adulto", "Adulto"], ["senior", "Sênior"]] },
    { chave: "sexoChave", titulo: "Sexo", opcoes: [["macho", "Macho"], ["femea", "Fêmea"]] },
    { chave: "porte", titulo: "Porte", opcoes: [["pequeno", "Pequeno"], ["medio", "Médio"], ["grande", "Grande"]] },
    { chave: "energia", titulo: "Energia", opcoes: NIVEIS, nivel: true },
    { chave: "carencia", titulo: "Carência", opcoes: NIVEIS, nivel: true },
    { chave: "brincalhao", titulo: "Brincalhão", opcoes: NIVEIS, nivel: true },
    { chave: "rebeldia", titulo: "Rebeldia", opcoes: NIVEIS, nivel: true },
  ];
  const nivel = (v) => (v <= 33 ? "baixo" : v <= 66 ? "medio" : "alto");
  const filtros = {};          // { chave: Set de valores marcados }
  let ordem = "recentes";

  function passaNosFiltros(a) {
    return GRUPOS.every((g) => {
      const marcados = filtros[g.chave];
      if (!marcados || !marcados.size) return true;
      const valor = g.nivel ? nivel(a.atributos[g.chave]) : a[g.chave];
      return marcados.has(valor);
    });
  }

  function ordenar(l) {
    const c = [...l];
    if (ordem === "alfabetica") c.sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
    else if (ordem === "idade") c.sort((x, y) => (x.idadeMeses ?? 1e9) - (y.idadeMeses ?? 1e9));
    else c.sort((x, y) => (y.adicionado - x.adicionado) || (y.ordem - x.ordem));
    return c;
  }

  function montarFiltros() {
    const barra = document.createElement("div");
    barra.className = "filtros-area";
    barra.innerHTML = `
      <div class="filtros-barra">
        <button class="btn btn--verde filtros-botao" type="button" aria-expanded="false" aria-controls="filtros" data-abrir-filtros>
          Filtrar<span class="filtros-contagem" data-contagem></span>
        </button>
        <label class="ordenar">Ordenar por
          <select data-ordem>
            <option value="recentes">Recentemente adicionados</option>
            <option value="idade">Idade (mais novos primeiro)</option>
            <option value="alfabetica">Ordem alfabética</option>
          </select>
        </label>
      </div>
      <div class="filtros" id="filtros" data-painel>
        <div class="filtros__wrap">
          <div class="filtros__painel">
            ${GRUPOS.map((g) => `
              <fieldset class="filtro-grupo">
                <legend>${g.titulo}</legend>
                <div class="filtro-opcoes">
                  ${g.opcoes.map(([v, r]) => `<button class="chip" type="button" aria-pressed="false" data-grupo="${g.chave}" data-valor="${v}">${r}</button>`).join("")}
                </div>
              </fieldset>`).join("")}
          </div>
        </div>
      </div>
      <p class="filtros-resultado" aria-live="polite"><span data-resultado></span> <button class="filtros-limpar" type="button" data-limpar hidden>Limpar filtros</button></p>`;
    lista.before(barra);

    const painel = barra.querySelector("[data-painel]");
    const botao = barra.querySelector("[data-abrir-filtros]");
    painel.querySelector(".filtros__wrap").inert = true;
    botao.addEventListener("click", () => {
      const aberto = !painel.classList.contains("aberto");
      painel.classList.toggle("aberto", aberto);
      botao.setAttribute("aria-expanded", String(aberto));
      painel.querySelector(".filtros__wrap").inert = !aberto;
    });
    barra.querySelector("[data-ordem]").addEventListener("change", (e) => {
      ordem = e.target.value;
      reordenarAnimado(null, () => {});
    });
    barra.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (chip) {
        const g = chip.dataset.grupo, v = chip.dataset.valor;
        filtros[g] = filtros[g] || new Set();
        if (filtros[g].has(v)) filtros[g].delete(v); else filtros[g].add(v);
        chip.setAttribute("aria-pressed", String(filtros[g].has(v)));
        reordenarAnimado(null, () => {});
      } else if (e.target.closest("[data-limpar]")) {
        Object.keys(filtros).forEach((k) => filtros[k].clear());
        barra.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
        reordenarAnimado(null, () => {});
      }
    });
  }

  function atualizarResumo(qtd) {
    const area = document.querySelector(".filtros-area");
    if (!area) return;
    const ativos = Object.values(filtros).reduce((s, set) => s + set.size, 0);
    area.querySelector("[data-contagem]").textContent = ativos ? ` (${ativos})` : "";
    area.querySelector("[data-resultado]").textContent = `${qtd} ${qtd === 1 ? "amigo encontrado" : "amigos encontrados"}`;
    area.querySelector("[data-limpar]").hidden = !ativos;
  }

  // ---------- Lista ----------
  function itens() {
    if (pagina === "adote") {
      const disponiveis = ordenar(animais.filter((a) => !a.adotado && passaNosFiltros(a)));
      return Store.ordenar(disponiveis); // fixados continuam no topo
    }
    // Amigos salvos: fixados primeiro, depois os adotados, depois os demais
    const fix = Store.fixados();
    const s = Store.salvosOrdenados();
    return [...s.filter((a) => fix.includes(a.id)), ...s.filter((a) => !fix.includes(a.id) && a.adotado), ...s.filter((a) => !fix.includes(a.id) && !a.adotado)];
  }

  function cartao(a) {
    const salvo = Store.estaSalvo(a.id), fixado = Store.estaFixado(a.id), avisar = Store.estaNotificado(a.id);
    return `
      <article class="ca ca--${a.especie}${a.adotado ? " ca--adotado" : ""}" data-card="${a.id}" data-especie="${a.especie}">
        <span class="orelha orelha--e" aria-hidden="true"></span><span class="orelha orelha--d" aria-hidden="true"></span>
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
        : Object.values(filtros).some((s) => s.size)
          ? "Nenhum amigo com essas características no momento. Tente tirar algum filtro."
          : "No momento todos os nossos amigos encontraram um lar! Volte em breve."}</p>`;
    atualizarResumo(l.length);
  }

  // Reordena com animação (FLIP: mede antes, reordena, anima a diferença).
  // Cards que entram (ex.: filtro removido) aparecem com um leve "pulo".
  function reordenarAnimado(destaque, mudar) {
    const antes = new Map([...lista.querySelectorAll("[data-card]")].map((el) => {
      const r = el.getBoundingClientRect();
      return [el.dataset.card, { x: r.left, y: r.top }];
    }));
    mudar();
    render();
    if (semMovimento()) return;
    const ease = "cubic-bezier(.22,.9,.24,1)";
    let novos = 0;
    lista.querySelectorAll("[data-card]").forEach((el) => {
      const p = antes.get(el.dataset.card);
      if (!p) {
        el.animate([{ transform: "translateY(2rem) scale(.9)", opacity: 0 }, { transform: "none", opacity: 1 }],
          { duration: 480, delay: 60 * novos++, easing: ease, fill: "backwards" });
        return;
      }
      const r = el.getBoundingClientRect();
      const dx = p.x - r.left, dy = p.y - r.top;
      if (el.dataset.card === destaque) {
        el.style.zIndex = 2;
        el.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(1)` },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5}px) scale(1.06)`, offset: 0.45 },
          { transform: "none" },
        ], { duration: 700, easing: ease }).onfinish = () => { el.style.zIndex = ""; };
      } else if (dx || dy) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 620, easing: ease });
      }
    });
    if (destaque) {
      const alvo = lista.querySelector(`[data-card="${destaque}"]`);
      const r = alvo && alvo.getBoundingClientRect();
      if (r && (r.top < 80 || r.bottom > window.innerHeight)) alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function removerAnimado(id) {
    const el = lista.querySelector(`[data-card="${id}"]`);
    if (!el || semMovimento()) { Store.alternarSalvo(id); render(); return; }
    el.animate([{ transform: "none", opacity: 1 }, { transform: "scale(.85)", opacity: 0 }], { duration: 240, easing: "ease-in", fill: "forwards" })
      .onfinish = () => reordenarAnimado(null, () => Store.alternarSalvo(id));
  }

  const ids = () => [...lista.querySelectorAll("[data-card]")].map((el) => el.dataset.card);

  lista.addEventListener("click", (e) => {
    const card = e.target.closest("[data-card]");
    if (!card) return;
    const b = e.target.closest("button");
    // Tocar no card (fora dos botões de ação) faz o animal latir/miar
    if (!b) { window.NIPASom && window.NIPASom.tocar(card.dataset.especie); return; }
    if (b.disabled) return;
    if (b.dataset.ficha) {
      const m = card.querySelector(".moldura");
      apertar(m, card.dataset.especie);
      setTimeout(() => abrir("ficha", b.dataset.ficha, render, m, ids()), 260);
    }
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

  if (pagina === "adote") montarFiltros();
  render();
});

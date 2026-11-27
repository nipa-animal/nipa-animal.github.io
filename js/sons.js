/*
 * Latidos e miados: usa os arquivos da pasta sons/ (e, se não carregarem,
 * um som sintetizado no próprio navegador). Uso: NIPASom.tocar("gato" | "cachorro").
 * Dá para desligar pelo menu (fica salvo no navegador).
 */
(function () {
  "use strict";

  let ctx = null;
  const ligado = () => { try { return localStorage.getItem("nipa:sons") !== "off"; } catch { return true; } };
  const definir = (sim) => { try { localStorage.setItem("nipa:sons", sim ? "on" : "off"); } catch { /* ok */ } };

  function contexto() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Ruído branco curto (para o "sopro" do latido)
  function ruido(c, dur) {
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    return src;
  }

  // "Au!": tom grave que cai rápido + sopro filtrado
  function latido(c, t, tom) {
    const saida = c.createGain();
    saida.gain.value = 0.55;
    saida.connect(c.destination);

    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(380 * tom, t);
    osc.frequency.exponentialRampToValueAtTime(520 * tom, t + 0.03);
    osc.frequency.exponentialRampToValueAtTime(170 * tom, t + 0.17);
    const formante = c.createBiquadFilter();
    formante.type = "bandpass"; formante.frequency.value = 900 * tom; formante.Q.value = 1.2;
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(formante).connect(env).connect(saida);
    osc.start(t); osc.stop(t + 0.22);

    const sopro = ruido(c, 0.12);
    const filtro = c.createBiquadFilter();
    filtro.type = "bandpass"; filtro.frequency.value = 1600 * tom; filtro.Q.value = 0.8;
    const envR = c.createGain();
    envR.gain.setValueAtTime(0.0001, t);
    envR.gain.exponentialRampToValueAtTime(0.35, t + 0.008);
    envR.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    sopro.connect(filtro).connect(envR).connect(saida);
    sopro.start(t); sopro.stop(t + 0.12);
  }

  // "Miau": tom que sobe e desce, com formantes que abrem ("i" → "au") e leve vibrato
  function miado(c, t, tom) {
    const dur = 0.62;
    const saida = c.createGain();
    saida.gain.value = 0.32;
    saida.connect(c.destination);

    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(560 * tom, t);
    osc.frequency.linearRampToValueAtTime(880 * tom, t + 0.16);
    osc.frequency.linearRampToValueAtTime(760 * tom, t + 0.34);
    osc.frequency.exponentialRampToValueAtTime(480 * tom, t + dur);
    const lfo = c.createOscillator();
    const lfoG = c.createGain();
    lfo.frequency.value = 7; lfoG.gain.value = 14 * tom;
    lfo.connect(lfoG).connect(osc.frequency);

    const f1 = c.createBiquadFilter();
    f1.type = "bandpass"; f1.Q.value = 5;
    f1.frequency.setValueAtTime(700, t);
    f1.frequency.linearRampToValueAtTime(1300, t + 0.22);
    f1.frequency.linearRampToValueAtTime(800, t + dur);
    const f2 = c.createBiquadFilter();
    f2.type = "bandpass"; f2.Q.value = 6; f2.frequency.value = 2600;
    const g2 = c.createGain(); g2.gain.value = 0.45;

    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1, t + 0.06);
    env.gain.setValueAtTime(1, t + 0.36);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(f1).connect(env);
    osc.connect(f2).connect(g2).connect(env);
    env.connect(saida);
    osc.start(t); lfo.start(t);
    osc.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
  }

  // ---------- Sons gravados (pasta sons/) ----------
  const ARQUIVOS = { cachorro: "sons/latido-unico.mp3", gato: "sons/meow-1.mp3" };
  const buffers = {};   // áudio já decodificado (Web Audio)
  const carregando = {};

  function carregar(especie) {
    const c = contexto();
    if (!c || buffers[especie] || carregando[especie]) return carregando[especie];
    carregando[especie] = fetch(ARQUIVOS[especie])
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((dados) => new Promise((ok, erro) => c.decodeAudioData(dados, ok, erro)))
      .then((buf) => { buffers[especie] = buf; return buf; })
      .catch(() => { buffers[especie] = null; return null; });
    return carregando[especie];
  }

  function tocarArquivo(c, buf, tom) {
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = tom; // cada clique soa um pouquinho diferente
    const g = c.createGain();
    g.gain.value = 0.9;
    src.connect(g).connect(c.destination);
    src.start();
  }

  function tocarSintetizado(c, especie, tom) {
    const t = c.currentTime + 0.01;
    if (especie === "gato") miado(c, t, tom);
    else latido(c, t, tom);
  }

  function tocar(especie) {
    if (!ligado()) return;
    const c = contexto();
    if (!c) return;
    especie = especie === "gato" ? "gato" : "cachorro";
    const tom = 0.94 + Math.random() * 0.12;
    if (buffers[especie]) return tocarArquivo(c, buffers[especie], tom);
    // Primeira vez: carrega o arquivo; se não der, usa o som sintetizado
    Promise.resolve(carregar(especie)).then((buf) => {
      if (buf) tocarArquivo(c, buf, tom); else tocarSintetizado(c, especie, tom);
    });
  }

  // Pré-carrega os dois sons no primeiro toque/clique na página (sem atraso depois)
  const preCarregar = () => { if (ligado()) { carregar("cachorro"); carregar("gato"); } };
  window.addEventListener("pointerdown", preCarregar, { once: true, passive: true });
  window.addEventListener("keydown", preCarregar, { once: true });

  window.NIPASom = { tocar, ligado, definir };
})();

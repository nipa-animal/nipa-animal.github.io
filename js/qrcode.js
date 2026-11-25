/*
 * Gerador de QR Code (modo byte, correção de erro nível M, versões 1–15).
 * Implementação própria, sem dependências. Uso:
 *   const svg = QRCode.toSVG("texto", { dark: "#000", light: "#fff", margin: 4 });
 */
(function (global) {
  "use strict";

  // ---------- Aritmética em GF(256) ----------
  const EXP = new Array(512);
  const LOG = new Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

  function rsGenerator(degree) {
    let g = [1];
    for (let i = 0; i < degree; i++) {
      const next = new Array(g.length + 1).fill(0);
      for (let j = 0; j < g.length; j++) {
        next[j] ^= g[j];
        next[j + 1] ^= mul(g[j], EXP[i]);
      }
      g = next;
    }
    return g;
  }

  function rsRemainder(data, degree) {
    const gen = rsGenerator(degree);
    const res = new Array(degree).fill(0);
    for (const byte of data) {
      const factor = byte ^ res.shift();
      res.push(0);
      for (let i = 0; i < degree; i++) res[i] ^= mul(gen[i + 1], factor);
    }
    return res;
  }

  // ---------- Tabelas (nível M) ----------
  // [EC por bloco, blocos grupo 1, dados por bloco g1, blocos grupo 2, dados por bloco g2]
  const EC_M = [
    null,
    [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0],
    [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39],
    [22, 3, 36, 2, 37], [26, 4, 43, 1, 44], [30, 1, 50, 4, 51], [22, 6, 36, 2, 37],
    [22, 8, 37, 1, 38], [24, 4, 40, 5, 41], [24, 5, 41, 5, 42],
  ];
  const ALIGN = [
    null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42],
    [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
    [6, 26, 48, 70],
  ];
  const ECL_FORMAT_BITS_M = 0;

  function dataCapacity(v) {
    const t = EC_M[v];
    return t[1] * t[2] + t[3] * t[4];
  }

  function utf8Bytes(str) {
    return Array.from(new TextEncoder().encode(str));
  }

  // ---------- Codificação dos dados ----------
  function encodeData(bytes) {
    let version = 0;
    for (let v = 1; v <= 15; v++) {
      const countBits = v < 10 ? 8 : 16;
      const needed = 4 + countBits + bytes.length * 8;
      if (needed <= dataCapacity(v) * 8) { version = v; break; }
    }
    if (!version) throw new Error("Texto longo demais para o QR Code.");

    const bits = [];
    const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(0b0100, 4);
    push(bytes.length, version < 10 ? 8 : 16);
    bytes.forEach((b) => push(b, 8));

    const capBits = dataCapacity(version) * 8;
    push(0, Math.min(4, capBits - bits.length));
    while (bits.length % 8) bits.push(0);
    const codewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      codewords.push(b);
    }
    for (let pad = 0xec; codewords.length < dataCapacity(version); pad ^= 0xec ^ 0x11) codewords.push(pad);
    return { version, codewords };
  }

  function addEcAndInterleave(version, data) {
    const [ecLen, g1, g1len, g2, g2len] = EC_M[version];
    const blocks = [];
    let k = 0;
    for (let i = 0; i < g1 + g2; i++) {
      const len = i < g1 ? g1len : g2len;
      const d = data.slice(k, k + len);
      k += len;
      blocks.push({ d, ec: rsRemainder(d, ecLen) });
    }
    const out = [];
    const maxLen = Math.max(g1len, g2len);
    for (let i = 0; i < maxLen; i++) blocks.forEach((b) => { if (i < b.d.length) out.push(b.d[i]); });
    for (let i = 0; i < ecLen; i++) blocks.forEach((b) => out.push(b.ec[i]));
    return out;
  }

  // ---------- Matriz ----------
  function buildMatrix(version, codewords, mask) {
    const size = version * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const setF = (x, y, dark) => { m[y][x] = dark; fn[y][x] = true; };

    for (let i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }

    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          setF(x, y, dist !== 2 && dist !== 4);
        }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    const al = ALIGN[version];
    const n = al.length;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++)
            setF(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }

    const drawFormat = (msk) => {
      const data = (ECL_FORMAT_BITS_M << 3) | msk;
      let rem = data;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const bits = ((data << 10) | rem) ^ 0x5412;
      const bit = (i) => ((bits >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) setF(8, i, bit(i));
      setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8));
      for (let i = 9; i < 15; i++) setF(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) setF(8, size - 15 + i, bit(i));
      setF(8, size - 8, true);
    };
    drawFormat(mask);

    if (version >= 7) {
      let rem = version;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = (version << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const b = ((bits >>> i) & 1) === 1;
        const a = size - 11 + (i % 3), c = Math.floor(i / 3);
        setF(a, c, b); setF(c, a, b);
      }
    }

    // Posicionamento em zigue-zague
    let i = 0;
    const total = codewords.length * 8;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++)
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (fn[y][x]) continue;
          let dark = false;
          if (i < total) { dark = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
          m[y][x] = dark;
        }
    }

    // Máscara
    const maskFn = [
      (x, y) => (x + y) % 2 === 0,
      (x, y) => y % 2 === 0,
      (x) => x % 3 === 0,
      (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
      (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
      (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
      (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
    ][mask];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (!fn[y][x] && maskFn(x, y)) m[y][x] = !m[y][x];
    return m;
  }

  function penalty(m) {
    const size = m.length;
    let score = 0;
    // Regra 1: sequências de 5+ módulos iguais
    for (let y = 0; y < size; y++) {
      for (const horiz of [true, false]) {
        let run = 1;
        for (let x = 1; x < size; x++) {
          const a = horiz ? m[y][x] : m[x][y];
          const b = horiz ? m[y][x - 1] : m[x - 1][y];
          if (a === b) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
          else run = 1;
        }
      }
    }
    // Regra 2: blocos 2x2
    for (let y = 0; y < size - 1; y++)
      for (let x = 0; x < size - 1; x++) {
        const c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
      }
    // Regra 3: padrões parecidos com o localizador
    const pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    for (let y = 0; y < size; y++)
      for (let x = 0; x <= size - 11; x++)
        for (const horiz of [true, false]) {
          let ok1 = true, ok2 = true;
          for (let k = 0; k < 11; k++) {
            const v = (horiz ? m[y][x + k] : m[x + k][y]) ? 1 : 0;
            if (v !== pat1[k]) ok1 = false;
            if (v !== pat2[k]) ok2 = false;
          }
          if (ok1) score += 40;
          if (ok2) score += 40;
        }
    // Regra 4: equilíbrio claro/escuro
    let dark = 0;
    m.forEach((row) => row.forEach((c) => { if (c) dark++; }));
    const k = Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1;
    score += Math.max(0, k) * 10;
    return score;
  }

  function generate(text) {
    const { version, codewords } = encodeData(utf8Bytes(text));
    const all = addEcAndInterleave(version, codewords);
    let best = null, bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const mtx = buildMatrix(version, all, mask);
      const s = penalty(mtx);
      if (s < bestScore) { bestScore = s; best = mtx; }
    }
    return best;
  }

  function toSVG(text, opts = {}) {
    const dark = opts.dark || "#000";
    const light = opts.light || "#fff";
    const margin = opts.margin == null ? 4 : opts.margin;
    const m = generate(text);
    const size = m.length + margin * 2;
    let path = "";
    for (let y = 0; y < m.length; y++)
      for (let x = 0; x < m.length; x++)
        if (m[y][x]) path += `M${x + margin} ${y + margin}h1v1h-1z`;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR Code">` +
      `<rect width="100%" height="100%" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`
    );
  }

  global.QRCode = { generate, toSVG };
})(window);

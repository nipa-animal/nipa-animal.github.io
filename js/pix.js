/*
 * Doação via Pix: gera o "Pix copia e cola" (BR Code, padrão EMV do Banco Central)
 * e o QR Code correspondente.
 *
 * >>> TROQUE OS DADOS ABAIXO PELOS DADOS REAIS DO NIPA <<<
 */
const PIX_CONFIG = {
  chave: "chave-pix@exemplo.com", // e-mail, CPF/CNPJ, telefone (+55...) ou chave aleatória
  nome: "NIPA",                   // nome do recebedor (até 25 caracteres)
  cidade: "SAO PAULO",            // cidade do recebedor (até 15 caracteres)
  descricao: "Doacao NIPA",       // opcional (aparece no app do banco)
};

const Pix = (function () {
  "use strict";

  const semAcento = (s) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E]/g, "");

  const tlv = (id, valor) => id + String(valor.length).padStart(2, "0") + valor;

  function crc16(str) {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function payload({ chave, nome, cidade, descricao, valor, txid }) {
    const conta =
      tlv("00", "br.gov.bcb.pix") +
      tlv("01", chave.trim()) +
      (descricao ? tlv("02", semAcento(descricao).slice(0, 40)) : "");
    let p =
      tlv("00", "01") +
      tlv("26", conta) +
      tlv("52", "0000") +
      tlv("53", "986") +
      (valor > 0 ? tlv("54", valor.toFixed(2)) : "") +
      tlv("58", "BR") +
      tlv("59", semAcento(nome).toUpperCase().slice(0, 25)) +
      tlv("60", semAcento(cidade).toUpperCase().slice(0, 15)) +
      tlv("62", tlv("05", (txid || "***").replace(/[^A-Za-z0-9*]/g, "").slice(0, 25))) +
      "6304";
    return p + crc16(p);
  }

  return { payload, crc16 };
})();

// ---------- Interface da seção de doação ----------
document.addEventListener("DOMContentLoaded", () => {
  const box = document.querySelector("[data-pix]");
  if (!box) return;

  const qr = box.querySelector("[data-pix-qr]");
  const codigo = box.querySelector("[data-pix-codigo]");
  const valorLabel = box.querySelector("[data-pix-valor]");
  const chaveEl = box.querySelector("[data-pix-chave]");
  const outroWrap = box.querySelector("[data-pix-outro]");
  const outroInput = outroWrap.querySelector("input");
  const botoes = box.querySelectorAll("[data-valor]");
  const erro = box.querySelector("[data-pix-erro]");

  chaveEl.textContent = PIX_CONFIG.chave;
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function render(valor) {
    const code = Pix.payload({ ...PIX_CONFIG, valor });
    codigo.value = code;
    qr.innerHTML = QRCode.toSVG(code, { dark: "#2f3818", light: "#ffffff", margin: 3 });
    valorLabel.textContent = valor > 0 ? brl(valor) : "valor livre";
  }

  function selecionar(btn) {
    botoes.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    const outro = btn.dataset.valor === "outro";
    outroWrap.hidden = !outro;
    erro.hidden = true;
    if (outro) {
      outroInput.focus();
      lerOutro();
    } else {
      render(Number(btn.dataset.valor));
    }
  }

  function lerOutro() {
    const raw = outroInput.value.replace(/\./g, "").replace(",", ".");
    const v = Math.round(parseFloat(raw) * 100) / 100;
    if (!raw) { erro.hidden = true; render(0); return; }
    if (!(v >= 1) || v > 100000) { erro.hidden = false; return; }
    erro.hidden = true;
    render(v);
  }

  botoes.forEach((b) => b.addEventListener("click", () => selecionar(b)));
  outroInput.addEventListener("input", lerOutro);

  box.querySelector("[data-copiar-chave]").addEventListener("click", (e) =>
    window.NIPA.copiar(PIX_CONFIG.chave, e.currentTarget)
  );
  box.querySelector("[data-copiar-codigo]").addEventListener("click", (e) =>
    window.NIPA.copiar(codigo.value, e.currentTarget)
  );

  selecionar(botoes[0]);
});

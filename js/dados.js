/*
 * Carrega os animais de data/animais.json (o arquivo que a NIPA edita
 * pelo painel em app.pagescms.org) e entrega a lista já normalizada.
 * Todas as páginas (Adoção, Adote um amigo, Amigos salvos e a ficha)
 * leem daqui, então uma edição aparece em todas ao mesmo tempo.
 */
(function () {
  "use strict";

  const slug = (s) => String(s || "animal").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "animal";
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 50; };
  const texto = (v, padrao) => (v == null || String(v).trim() === "" ? padrao : String(v).trim());
  // Caminho da foto pronto para usar no HTML (espaços viram %20)
  const caminho = (f) => encodeURI(String(f || "").replace(/^\/+/, "").replace(/^nipa\//, ""));

  function normalizar(bruto) {
    const usados = {};
    return (Array.isArray(bruto) ? bruto : []).filter((a) => a && a.nome).map((a) => {
      let id = slug(a.nome);
      usados[id] = (usados[id] || 0) + 1;
      if (usados[id] > 1) id += "-" + usados[id];
      const historia = texto(a.historia, "História do animal.")
        .split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      return {
        id,
        nome: texto(a.nome, "Sem nome"),
        foto: caminho(a.foto),
        idade: texto(a.idade, "Idade"),
        sexo: texto(a.sexo, "sexo"),
        raca: texto(a.raca, "raça"),
        historia,
        atributos: { energia: num(a.energia), carencia: num(a.carencia), brincalhao: num(a.brincalhao), rebeldia: num(a.rebeldia) },
        adotado: a.adotado === true || a.adotado === "true",
      };
    });
  }

  window.NIPA_DADOS = fetch("data/animais.json", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(normalizar)
    .catch(() => [])
    .then((lista) => { window.ANIMAIS = lista; return lista; });
})();

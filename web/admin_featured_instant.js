/* Miguel Lanches — correção do botão Destaque
   Usa a ÚNICA opção [data-feature] já existente no admin.js.
   Não cria coluna, não chama load() e não altera a ordem.
*/
(() => {
  "use strict";

  function getProduct(id) {
    const list = Array.isArray(window.products) ? window.products : [];
    return list.find(p => String(p.id) === String(id));
  }

  function paint(button, active) {
    button.textContent = active ? "★ Destaque" : "☆ Destacar";
    button.classList.toggle("featured-yellow", active);
    button.classList.remove("featured-saving");
  }

  function bind() {
    document.querySelectorAll("#products [data-feature]").forEach(button => {
      if (button.dataset.mlFeaturedFix === "1") return;
      button.dataset.mlFeaturedFix = "1";

      button.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const product = getProduct(button.dataset.feature);
        if (!product || !window.db) return;

        const oldValue = product.destaque === true;
        const newValue = !oldValue;

        // Resposta visual INSTANTÂNEA.
        product.destaque = newValue;
        paint(button, newValue);
        button.disabled = true;
        button.classList.add("featured-saving");

        // Salva sem reconstruir a tabela.
        const result = await window.db
          .from("produtos")
          .update({ destaque: newValue })
          .eq("id", product.id);

        button.disabled = false;

        if (result.error) {
          product.destaque = oldValue;
          paint(button, oldValue);
          if (typeof window.toast === "function") {
            window.toast("Não foi possível salvar o destaque.");
          }
          return;
        }

        if (typeof window.toast === "function") {
          window.toast(newValue
            ? "Produto colocado em Destaques."
            : "Produto retirado dos Destaques.");
        }
      }, true);
    });
  }

  // O admin.js recria as linhas quando renderiza o cardápio.
  // Reaplicamos somente o comportamento do botão, sem alterar a ordem.
  const observer = new MutationObserver(bind);

  function start() {
    bind();
    const tbody = document.getElementById("products");
    if (tbody) observer.observe(tbody, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

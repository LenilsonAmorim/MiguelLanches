/* MIGUEL LANCHES — destaque sem recarregar o cardápio
   O botão "Destacar" altera somente o campo destaque.
   Não chama load(), não recria a tabela e não altera a posição dos produtos/pedidos.
*/
(() => {
  "use strict";

  const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

  const money = v => Number(v || 0).toLocaleString("pt-BR", {
    style:"currency", currency:"BRL"
  });

  function updateFeaturedLists() {
    const products = Array.isArray(window.products) ? window.products : [];
    const featured = products.filter(p => p && p.destaque === true);

    ["featuredProducts", "featuredProductsPromo"].forEach(id => {
      const host = document.getElementById(id);
      if (!host) return;
      host.innerHTML = featured.length
        ? featured.map(p =>
            `<div class="mini-product"><span>${esc(p.nome)}</span><b>${money(p.preco)}</b></div>`
          ).join("")
        : "<p class='muted'>Nenhum produto em destaque.</p>";
    });
  }

  document.addEventListener("click", async event => {
    const button = event.target.closest?.("[data-feature]");
    if (!button) return;

    // Executa antes do onclick do admin.js e impede o load()/re-render.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const products = Array.isArray(window.products) ? window.products : [];
    const product = products.find(p => String(p.id) === String(button.dataset.feature));
    const db = window.db;

    if (!product || !db) return;

    const oldValue = product.destaque === true;
    const newValue = !oldValue;

    button.disabled = true;
    button.textContent = newValue ? "★ Destaque" : "☆ Destacar";

    const result = await db.from("produtos")
      .update({ destaque: newValue })
      .eq("id", product.id);

    button.disabled = false;

    if (result.error) {
      button.textContent = oldValue ? "★ Destaque" : "☆ Destacar";
      if (typeof window.toast === "function") {
        window.toast("Erro ao alterar destaque: " + result.error.message);
      }
      return;
    }

    product.destaque = newValue;
    window.products = products;
    updateFeaturedLists();

    if (typeof window.toast === "function") {
      window.toast(
        newValue
          ? "Produto colocado em Destaques."
          : "Produto retirado dos Destaques."
      );
    }
  }, true);
})();

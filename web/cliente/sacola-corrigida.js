/* Miguel Lanches — correção direta da sacola
   Compatível com o app.js atual, que usa a variável cart no escopo do script.
*/
(() => {
  const clearBtn = document.getElementById("clearCart");
  const addMoreBtn = document.getElementById("addMore");

  if (clearBtn) {
    clearBtn.onclick = () => {
      if (!cart.length) return;
      if (!confirm("Tem certeza que deseja limpar a sacola?")) return;
      cart = [];
      renderCart();
      closeCart();
    };
  }

  if (addMoreBtn) {
    addMoreBtn.onclick = () => {
      closeCart();
      window.scrollTo({top: 0, behavior: "smooth"});
    };
  }

  // Salva os dados SOMENTE quando o pedido foi realmente inserido no Supabase.
  const originalSendOrder = window.sendOrder;
  if (typeof originalSendOrder === "function") {
    window.sendOrder = async function () {
      const result = await originalSendOrder();
      return result;
    };
  }
})();

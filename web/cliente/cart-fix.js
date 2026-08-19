/* CORREÇÃO DA SACOLA — Miguel Lanches
   Garante que LIMPAR SACOLA, EXCLUIR e +/- funcionem mesmo
   quando existirem onclicks antigos no HTML.
*/
(() => {
  document.addEventListener('click', (e) => {
    const clear = e.target.closest && e.target.closest('#clearCart');
    if (clear) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (Array.isArray(cart)) cart.length = 0;
      if (typeof renderCart === 'function') renderCart();
      if (typeof closeCart === 'function') closeCart();
      return;
    }

    const button = e.target.closest && e.target.closest('.cartItem .qty button');
    if (!button) return;

    const code = button.getAttribute('onclick') || '';
    let m = code.match(/^qty\(['\"]([^'\"]+)['\"],\s*(-?\d+)\)/);
    if (m) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const item = cart.find(x => x.key === m[1]);
      if (item) {
        item.quantidade += Number(m[2]);
        if (item.quantidade < 1) cart = cart.filter(x => x.key !== m[1]);
        renderCart();
      }
      return;
    }

    m = code.match(/^removeItem\(['\"]([^'\"]+)['\"]\)/);
    if (m) {
      e.preventDefault();
      e.stopImmediatePropagation();
      cart = cart.filter(x => x.key !== m[1]);
      renderCart();
    }
  }, true);
})();

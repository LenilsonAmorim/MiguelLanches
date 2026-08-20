/* Miguel Lanches — salva automaticamente o último pedido para acompanhamento. */
(() => {
  'use strict';
  const KEY = 'ml_last_order_id';
  function saveFromScreen() {
    const el = document.getElementById('orderNumber');
    if (!el) return;
    const text = String(el.textContent || '');
    const m = text.match(/Pedido\s*#\s*([A-Za-z0-9-]+)/i);
    if (m && m[1]) localStorage.setItem(KEY, m[1]);
  }
  const success = document.getElementById('successModal');
  if (success) {
    new MutationObserver(saveFromScreen).observe(success, {subtree:true, childList:true, characterData:true, attributes:true});
  }
  window.addEventListener('load', () => setTimeout(saveFromScreen, 50));
  window.mlSaveLastOrderId = id => {
    if (id !== undefined && id !== null && String(id)) localStorage.setItem(KEY, String(id));
  };
})();

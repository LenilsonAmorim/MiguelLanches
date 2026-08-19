/* MIGUEL LANCHES — INTERAÇÕES DEFINITIVAS
   Este arquivo deve ser carregado DEPOIS do app.js.
*/
(() => {
  const $ = id => document.getElementById(id);
  const KEY = "miguel_lanches_cliente_v1";
  const getCart = () => (typeof cart !== "undefined" ? cart : null);
  const render = () => { if (typeof renderCart === "function") renderCart(); };

  function closeBag() {
    $("cart")?.classList.remove("open");
    $("overlay")?.classList.remove("open");
    document.body.style.overflow = "";
  }

  function saved() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch { return null; }
  }

  function hasAddress(d) {
    return !!(d && (String(d.endereco || "").trim() || String(d.bairro || "").trim()));
  }

  function restore() {
    const d = saved();
    if (!d) return;
    ["nome","telefone","bairro","endereco","referencia","pagamento"].forEach(id => {
      const el = $(id);
      if (el && d[id] != null) el.value = d[id];
    });
  }

  function renderSavedAddress() {
    const box = $("savedAddress");
    const text = $("savedAddressText");
    const d = saved();
    if (!box || !text) return;

    if (!hasAddress(d)) {
      box.classList.add("hidden");
      text.textContent = "";
      return;
    }

    text.textContent = [d.bairro, d.endereco, d.referencia]
      .map(x => String(x || "").trim())
      .filter(Boolean)
      .join(" • ");
    box.classList.remove("hidden");
  }

  function clearBag() {
    const c = getCart();
    if (!c) return;
    c.length = 0;
    render();
    closeBag();
  }

  function removeItem(key) {
    const c = getCart();
    if (!c) return;
    const i = c.findIndex(x => String(x.key) === String(key));
    if (i >= 0) c.splice(i, 1);
    render();
  }

  function changeQty(key, delta) {
    const c = getCart();
    if (!c) return;
    const item = c.find(x => String(x.key) === String(key));
    if (!item) return;
    item.quantidade = Number(item.quantidade || 1) + Number(delta);
    if (item.quantidade <= 0) removeItem(key);
    else render();
  }

  function chooseReceive(method) {
    const checkout = $("checkout");
    const section = $("customerSection");
    const delivery = $("deliveryFields");
    if (!checkout || !section) return;

    checkout.classList.remove("hidden");
    restore();
    section.classList.remove("hidden");
    if (delivery) delivery.classList.toggle("hidden", method === "retirada");
    renderSavedAddress();

    setTimeout(() => {
      const el = method === "retirada" ? $("nome") : $("endereco");
      if (el) el.focus({preventScroll:true});
      section.scrollIntoView({behavior:"smooth", block:"start"});
    }, 50);
  }

  function changeAddress() {
    const section = $("customerSection");
    const delivery = $("deliveryFields");
    restore();
    section?.classList.remove("hidden");
    delivery?.classList.remove("hidden");
    renderSavedAddress();

    setTimeout(() => {
      $("endereco")?.focus({preventScroll:true});
      section?.scrollIntoView({behavior:"smooth", block:"start"});
    }, 50);
  }

  function continueOrder() {
    const c = getCart();
    if (!c || !c.length) return;
    closeBag();
    $("checkout")?.classList.remove("hidden");
    restore();
    renderSavedAddress();

    if (!hasAddress(saved()))
      $("customerSection")?.classList.add("hidden");
  }

  // IMPORTANTE: listener normal, sem stopImmediatePropagation.
  document.addEventListener("click", e => {
    const target = e.target?.closest?.("#clearCart");
    if (target) {
      e.preventDefault();
      clearBag();
      return;
    }

    if (e.target?.closest?.("#closeCart, #overlay")) {
      e.preventDefault();
      closeBag();
      return;
    }

    if (e.target?.closest?.("#addMore")) {
      e.preventDefault();
      closeBag();
      window.scrollTo({top:0, behavior:"smooth"});
      return;
    }

    if (e.target?.closest?.("#continueOrder")) {
      e.preventDefault();
      continueOrder();
      return;
    }

    const qtyButton = e.target?.closest?.(".cartItem .qty button:not(.remove)");
    if (qtyButton) {
      const code = qtyButton.getAttribute("onclick") || "";
      const m = code.match(/qty\(['"]([^'"]+)['"],\s*(-?\d+)\)/);
      if (m) {
        e.preventDefault();
        changeQty(m[1], Number(m[2]));
        return;
      }
    }

    const removeButton = e.target?.closest?.(".cartItem .qty .remove");
    if (removeButton) {
      const code = removeButton.getAttribute("onclick") || "";
      const m = code.match(/removeItem\(['"]([^'"]+)['"]\)/);
      if (m) {
        e.preventDefault();
        removeItem(m[1]);
        return;
      }
    }

    const receive = e.target?.closest?.(".receive-option");
    if (receive) {
      e.preventDefault();
      chooseReceive(receive.dataset.method || "entrega");
      return;
    }

    if (e.target?.closest?.("#changeAddress")) {
      e.preventDefault();
      changeAddress();
      return;
    }

    if (e.target?.closest?.("#closeCheckout")) {
      e.preventDefault();
      $("checkout")?.classList.add("hidden");
      return;
    }
  }, false);

  const observer = new MutationObserver(() => {
    const checkout = $("checkout");
    if (checkout && !checkout.classList.contains("hidden")) {
      restore();
      renderSavedAddress();
    }
  });

  observer.observe(document.body, {
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:["class"]
  });

  window.mlInteractionsFix = {
    clearBag, removeItem, changeQty, chooseReceive, changeAddress, continueOrder
  };
})();

/* Checkout final — Entrega, Retirada e Endereço Salvo */
(() => {
  const $ = id => document.getElementById(id);
  const KEY = "miguel_lanches_cliente_v1"; // mesma chave usada pelo dados-cliente-salvos.js

  const getSaved = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch { return null; }
  };

  const hasRealAddress = d =>
    !!(d && String(d.endereco || "").trim());

  const setVisible = (el, visible) => {
    if (!el) return;
    el.classList.toggle("hidden", !visible);
    el.style.display = visible ? "" : "none";
  };

  function showSavedAddress(method) {
    const box = $("savedAddress");
    const text = $("savedAddressText");
    const d = getSaved();

    // Endereço salvo só existe se houver um endereço REAL salvo.
    // E nunca aparece durante Retirada.
    const show = method === "entrega" && hasRealAddress(d);

    setVisible(box, show);

    if (show && text) {
      text.textContent = [d.bairro, d.endereco, d.referencia]
        .filter(v => String(v || "").trim())
        .join(" • ");
    } else if (text) {
      text.textContent = "";
    }
  }

  function fillSavedData() {
    const d = getSaved();
    if (!d) return;

    ["nome","telefone","bairro","endereco","referencia","pagamento"].forEach(id => {
      const el = $(id);
      if (el && d[id] !== undefined && d[id] !== null && !el.value) {
        el.value = d[id];
      }
    });
  }

  function setMethod(method) {
    const isDelivery = method === "entrega";
    const fields = $("deliveryFields");
    const customer = $("customerSection");

    // Os dados sempre aparecem depois de escolher Entrega/Retirada.
    setVisible(customer, true);

    // Endereço SOMENTE para Entrega.
    setVisible(fields, isDelivery);

    document.querySelectorAll(".receive-option").forEach(btn => {
      btn.classList.toggle("selected", btn.dataset.method === method);
      btn.setAttribute("aria-pressed", btn.dataset.method === method ? "true" : "false");
    });

    fillSavedData();
    showSavedAddress(method);

    // Retirada: não deixar nenhum campo de endereço obrigatório.
    ["bairro","endereco","referencia"].forEach(id => {
      const el = $(id);
      if (el) {
        el.required = isDelivery;
        if (!isDelivery) el.setCustomValidity("");
      }
    });

    // Entrega exige endereço; Retirada não.
    if (isDelivery) {
      setTimeout(() => $("endereco")?.focus({preventScroll:true}), 80);
    } else {
      setTimeout(() => $("nome")?.focus({preventScroll:true}), 80);
    }

    window.__mlReceiveMethod = method;
  }

  function updatePayment() {
    const payment = $("pagamento");
    const money = $("paymentMoney");
    const show = payment?.value === "Dinheiro";
    setVisible(money, show);
  }

  function hideSavedIfInvalid() {
    const d = getSaved();
    if (!hasRealAddress(d)) {
      const box = $("savedAddress");
      const text = $("savedAddressText");
      setVisible(box, false);
      if (text) text.textContent = "";
    }
  }

  document.addEventListener("click", e => {
    const option = e.target.closest?.(".receive-option");
    if (option) {
      e.preventDefault();
      e.stopImmediatePropagation();
      setMethod(option.dataset.method === "retirada" ? "retirada" : "entrega");
      return;
    }

    const change = e.target.closest?.("#changeAddress");
    if (change) {
      e.preventDefault();
      e.stopImmediatePropagation();
      setMethod("entrega");
      return;
    }

    const close = e.target.closest?.("#closeCheckout");
    if (close) {
      e.preventDefault();
      // deixa o app principal fechar o checkout quando ele tiver o handler;
      // aqui só não cria um segundo fluxo.
    }
  }, true);

  document.addEventListener("change", e => {
    if (e.target?.id === "pagamento") updatePayment();
  }, true);

  document.addEventListener("input", e => {
    // Se não existe endereço real, nunca mostre o banner.
    if (["bairro","endereco","referencia"].includes(e.target?.id)) {
      hideSavedIfInvalid();
    }
  }, true);

  // dados-cliente-salvos.js pode tentar restaurar o banner depois.
  // Reaplica a regra sempre que o DOM mudar.
  const observer = new MutationObserver(() => {
    const method = window.__mlReceiveMethod;
    if (method) showSavedAddress(method);
    else hideSavedIfInvalid();
    updatePayment();
  });
  observer.observe(document.body, {childList:true, subtree:true});

  window.mlCheckoutAddress = {
    setMethod,
    showSavedAddress,
    refresh: () => {
      hideSavedIfInvalid();
      updatePayment();
    }
  };

  setTimeout(() => {
    hideSavedIfInvalid();
    updatePayment();
  }, 100);
  setTimeout(() => {
    hideSavedIfInvalid();
    updatePayment();
  }, 1000);
})();
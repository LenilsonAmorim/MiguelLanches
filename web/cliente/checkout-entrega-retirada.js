/* Checkout final v2 — pagamento e entrega/retirada */
(() => {
  const $ = id => document.getElementById(id);
  const KEY = "miguel_lanches_cliente_v1";

  const getSaved = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch { return null; }
  };

  function forceVisible(el, yes) {
    if (!el) return;
    if (yes) {
      el.classList.remove("hidden");
      el.style.removeProperty("display");
    } else {
      el.classList.add("hidden");
      // O !important impede app.js/CSS antigo de reexibir o campo.
      el.style.setProperty("display", "none", "important");
    }
  }

  function hasAddress(d) {
    return !!(d && String(d.endereco || "").trim());
  }

  function refreshSaved(method) {
    const box=$("savedAddress"), text=$("savedAddressText"), d=getSaved();
    const show = method === "entrega" && hasAddress(d);
    forceVisible(box, show);
    if (text) text.textContent = show
      ? [d.bairro,d.endereco,d.referencia].filter(Boolean).join(" • ")
      : "";
  }

  function setMethod(method) {
    const delivery = method === "entrega";
    window.__mlReceiveMethod = method;

    forceVisible($("customerSection"), true);
    forceVisible($("deliveryFields"), delivery);
    refreshSaved(method);

    ["bairro","endereco","referencia"].forEach(id=>{
      const el=$(id);
      if(el) el.required=delivery;
    });

    document.querySelectorAll(".receive-option").forEach(btn=>{
      const selected=btn.dataset.method===method;
      btn.classList.toggle("selected",selected);
      btn.setAttribute("aria-pressed",selected?"true":"false");
    });
  }

  function refreshPayment() {
    const payment=$("pagamento");
    const money=$("paymentMoney");
    const isMoney=payment && payment.value === "Dinheiro";

    // Só Dinheiro pode exibir valor pago/troco.
    forceVisible(money, !!isMoney);

    if (!isMoney) {
      const paid=$("valorPago");
      const preview=$("trocoPreview");
      if(paid) paid.value="";
      if(preview) preview.textContent="";
    }
  }

  document.addEventListener("click", e=>{
    const option=e.target.closest?.(".receive-option");
    if(option){
      e.preventDefault();
      e.stopImmediatePropagation();
      setMethod(option.dataset.method==="retirada" ? "retirada" : "entrega");
      refreshPayment();
      return;
    }

    const change=e.target.closest?.("#changeAddress");
    if(change){
      e.preventDefault();
      e.stopImmediatePropagation();
      setMethod("entrega");
      return;
    }
  }, true);

  document.addEventListener("change", e=>{
    if(e.target?.id==="pagamento") refreshPayment();
  }, true);

  // Também corrige imediatamente se outro script tentar mostrar paymentMoney.
  const observer=new MutationObserver(()=>{
    refreshPayment();
    if(window.__mlReceiveMethod) refreshSaved(window.__mlReceiveMethod);
    else {
      const d=getSaved();
      if(!hasAddress(d)) forceVisible($("savedAddress"),false);
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","style"]});

  window.mlCheckoutAddress={setMethod,refreshPayment};

  setTimeout(refreshPayment,50);
  setTimeout(refreshPayment,300);
  setTimeout(refreshPayment,1000);
})();
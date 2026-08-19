/* CHECKOUT FIX — Miguel Lanches
   Corrige:
   - Entrega
   - Retirada
   - Trocar endereço
   - Endereço salvo somente quando realmente existe
   - Primeiro pedido: abre o preenchimento normalmente, sem "Endereço salvo"/"Trocar"
   - Dados salvos no celular são restaurados no próximo checkout
*/
(() => {
  const $ = id => document.getElementById(id);
  const KEY = "miguel_lanches_cliente_v1";

  function getSaved() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch { return null; }
  }

  function hasAddress(d) {
    return !!(d && (String(d.endereco||"").trim() || String(d.bairro||"").trim()));
  }

  function restoreFields() {
    const d = getSaved();
    if (!d) return;
    const set = (id, value) => {
      const el = $(id);
      if (el && value !== undefined && value !== null) el.value = value;
    };
    set("nome", d.nome);
    set("telefone", d.telefone);
    set("bairro", d.bairro);
    set("endereco", d.endereco);
    set("referencia", d.referencia);
    set("pagamento", d.pagamento);
  }

  function renderSavedAddress() {
    const box = $("savedAddress");
    const text = $("savedAddressText");
    const d = getSaved();

    if (!box || !text) return;

    if (!hasAddress(d)) {
      box.classList.add("hidden");
      text.textContent = "";
      return;
    }

    const address = [d.bairro, d.endereco, d.referencia]
      .map(x => String(x || "").trim())
      .filter(Boolean)
      .join(" • ");

    text.textContent = address;
    box.classList.remove("hidden");
  }

  function showCustomer(method) {
    const section = $("customerSection");
    const delivery = $("deliveryFields");
    if (!section) return;

    restoreFields();

    section.classList.remove("hidden");

    if (delivery) {
      delivery.classList.toggle("hidden", method === "retirada");
    }

    renderSavedAddress();

    setTimeout(() => {
      const first = method === "retirada" ? $("nome") : $("endereco");
      if (first) first.focus({preventScroll:true});
      section.scrollIntoView({behavior:"smooth",block:"start"});
    }, 50);
  }

  function openCheckout() {
    const checkout = $("checkout");
    if (!checkout) return;

    checkout.classList.remove("hidden");
    renderSavedAddress();
    restoreFields();

    /* Na primeira vez não existe caixa de endereço salvo.
       O cliente escolhe Entrega ou Retirada e só então preenche. */
    const saved = getSaved();
    if (!hasAddress(saved)) {
      const section = $("customerSection");
      if (section) section.classList.add("hidden");
    }
  }

  function changeAddress() {
    restoreFields();
    const section = $("customerSection");
    const delivery = $("deliveryFields");

    if (section) section.classList.remove("hidden");
    if (delivery) delivery.classList.remove("hidden");

    setTimeout(() => {
      const el = $("endereco");
      if (el) el.focus({preventScroll:true});
      section?.scrollIntoView({behavior:"smooth",block:"start"});
    }, 50);
  }

  /* Os botões Entrega/Retirada não tinham ação no app atual. */
  document.addEventListener("click", e => {
    const option = e.target.closest?.(".receive-option");
    if (option) {
      e.preventDefault();
      e.stopPropagation();
      showCustomer(option.dataset.method || "entrega");
      return;
    }

    if (e.target.closest?.("#changeAddress")) {
      e.preventDefault();
      e.stopPropagation();
      changeAddress();
      return;
    }

    if (e.target.closest?.("#continueOrder")) {
      /* O app original abre o checkout. Reforça restauração e estado correto. */
      setTimeout(openCheckout, 0);
    }
  }, true);

  /* Quando a tela de checkout aparece por qualquer código, normaliza o estado. */
  const observer = new MutationObserver(() => {
    const checkout = $("checkout");
    if (checkout && !checkout.classList.contains("hidden")) {
      renderSavedAddress();
      restoreFields();
    }
  });
  observer.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:["class"]});

  window.mlCheckoutFix = {renderSavedAddress, restoreFields, showCustomer, changeAddress};
  setTimeout(() => { renderSavedAddress(); restoreFields(); }, 300);
  setTimeout(() => { renderSavedAddress(); restoreFields(); }, 1200);
})();

/* Miguel Lanches — botões +/- de quantidade nos configuradores */
(() => {
  const STYLE_ID = "ml-qty-buttons-style";

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      .ml-qty-control{
        display:flex;
        align-items:center;
        justify-content:center;
        gap:14px;
        margin:8px 0 16px;
      }
      .ml-qty-control button{
        width:48px;
        height:48px;
        border:0;
        border-radius:12px;
        background:#b71924;
        color:#fff;
        font-size:28px;
        line-height:1;
        font-weight:800;
        cursor:pointer;
      }
      .ml-qty-control button:active{transform:scale(.95)}
      .ml-qty-control .ml-qty-number{
        min-width:52px;
        text-align:center;
        font-size:22px;
        font-weight:800;
      }
      .ml-qty-control input{
        position:absolute!important;
        width:1px!important;
        height:1px!important;
        opacity:0!important;
        pointer-events:none!important;
      }
    `;
    document.head.appendChild(s);
  }

  function installFor(input) {
    if (!input || input.dataset.mlQtyReady === "1") return;
    input.dataset.mlQtyReady = "1";

    const wrap = document.createElement("div");
    wrap.className = "ml-qty-control";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", "Diminuir quantidade");

    const number = document.createElement("span");
    number.className = "ml-qty-number";

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", "Aumentar quantidade");

    function value() {
      let n = Math.max(1, parseInt(input.value || "1", 10) || 1);
      input.value = n;
      number.textContent = n;
      return n;
    }

    minus.onclick = () => {
      value();
      input.value = Math.max(1, Number(input.value) - 1);
      number.textContent = input.value;
      input.dispatchEvent(new Event("input", {bubbles:true}));
      input.dispatchEvent(new Event("change", {bubbles:true}));
    };

    plus.onclick = () => {
      value();
      input.value = Number(input.value) + 1;
      number.textContent = input.value;
      input.dispatchEvent(new Event("input", {bubbles:true}));
      input.dispatchEvent(new Event("change", {bubbles:true}));
    };

    wrap.append(minus, number, plus);
    input.parentNode.insertBefore(wrap, input);
    value();

    // Mantém o número sincronizado caso outro código altere o campo.
    input.addEventListener("input", () => {
      const n = Math.max(1, parseInt(input.value || "1", 10) || 1);
      number.textContent = n;
    });
  }

  function scan() {
    addStyle();
    // Produtos normais configuráveis
    installFor(document.getElementById("mQty"));
    // Açaí
    installFor(document.getElementById("acaiQty"));
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.body, {childList:true, subtree:true});
  setTimeout(scan, 300);
  setTimeout(scan, 1000);
})();

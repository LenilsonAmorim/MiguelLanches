/* PATCH: botões de quantidade no modal do cliente */
(() => {
  function installQtyButtons() {
    const input = document.getElementById("qty");
    if (!input || input.dataset.mlPatched === "1") return;
    input.dataset.mlPatched = "1";
    input.type = "hidden";
    input.value = Math.max(1, Number(input.value || 1));

    const old = document.getElementById("mlQtyButtons");
    if (old) old.remove();

    const wrap = document.createElement("div");
    wrap.id = "mlQtyButtons";
    wrap.innerHTML = `
      <div style="font-weight:700;text-align:center;margin:6px 0 4px">Quantidade</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:0 0 14px">
        <button type="button" id="mlQtyMinus" style="width:42px;height:42px;border:1px solid #d0d5dd;border-radius:9px;background:#fff;font-size:24px;font-weight:800">−</button>
        <b id="mlQtyValue" style="min-width:32px;text-align:center;font-size:19px">1</b>
        <button type="button" id="mlQtyPlus" style="width:42px;height:42px;border:1px solid #d0d5dd;border-radius:9px;background:#fff;font-size:24px;font-weight:800">+</button>
      </div>`;
    input.parentNode.insertBefore(wrap, input);

    const sync=()=>{input.value=Math.max(1,Number(input.value||1));document.getElementById("mlQtyValue").textContent=input.value};
    document.getElementById("mlQtyMinus").onclick=()=>{input.value=Math.max(1,Number(input.value||1)-1);sync()};
    document.getElementById("mlQtyPlus").onclick=()=>{input.value=Number(input.value||1)+1;sync()};
    sync();
  }
  new MutationObserver(installQtyButtons).observe(document.body,{childList:true,subtree:true});
  setTimeout(installQtyButtons,50);
})();

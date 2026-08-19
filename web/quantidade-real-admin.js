/* PATCH: botões de quantidade no modal do Admin */
(() => {
  function installQtyButtons() {
    const input = document.getElementById("mQty");
    if (!input || input.dataset.mlPatched === "1") return;
    input.dataset.mlPatched = "1";
    input.type = "hidden";
    input.value = Math.max(1, Number(input.value || 1));

    const old = document.getElementById("mlAdminQtyButtons");
    if (old) old.remove();

    const wrap = document.createElement("div");
    wrap.id = "mlAdminQtyButtons";
    wrap.innerHTML = `
      <div style="font-weight:700;text-align:center;margin:6px 0 4px">Quantidade</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:0 0 14px">
        <button type="button" id="mlAdminQtyMinus" style="width:42px;height:42px;border:1px solid #d0d5dd;border-radius:9px;background:#fff;font-size:24px;font-weight:800">−</button>
        <b id="mlAdminQtyValue" style="min-width:32px;text-align:center;font-size:19px">1</b>
        <button type="button" id="mlAdminQtyPlus" style="width:42px;height:42px;border:1px solid #d0d5dd;border-radius:9px;background:#fff;font-size:24px;font-weight:800">+</button>
      </div>`;
    input.parentNode.insertBefore(wrap,input);

    const sync=()=>{input.value=Math.max(1,Number(input.value||1));document.getElementById("mlAdminQtyValue").textContent=input.value};
    document.getElementById("mlAdminQtyMinus").onclick=()=>{input.value=Math.max(1,Number(input.value||1)-1);sync()};
    document.getElementById("mlAdminQtyPlus").onclick=()=>{input.value=Number(input.value||1)+1;sync()};
    sync();
  }
  new MutationObserver(installQtyButtons).observe(document.body,{childList:true,subtree:true});
  setTimeout(installQtyButtons,50);
})();

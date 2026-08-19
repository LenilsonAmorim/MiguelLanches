/* Miguel Lanches — quantidade por botões
   Troca os campos numéricos de quantidade dos modais por:
   [ − ] [ quantidade ] [ + ]
*/
(() => {
  const css=document.createElement("style");
  css.textContent=`
    .ml-qty-control{display:flex;align-items:center;justify-content:center;gap:12px;margin:8px 0 14px}
    .ml-qty-control button{width:42px;height:42px;border:1px solid #d0d5dd;border-radius:9px;background:#fff;color:#222;font-size:24px;font-weight:800;line-height:1;cursor:pointer}
    .ml-qty-control button:active{transform:scale(.96)}
    .ml-qty-control .ml-qty-value{min-width:42px;text-align:center;font-size:19px;font-weight:800}
    .ml-qty-label{text-align:center;font-weight:700;margin-bottom:4px}
    .qty{display:flex!important;align-items:center!important;gap:8px!important;margin-top:10px!important}
    .qty button{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:34px!important;height:34px!important;min-width:34px!important;border:1px solid #d0d5dd!important;border-radius:8px!important;background:#fff!important;color:#222!important;font-size:20px!important;font-weight:800!important;cursor:pointer!important}
    .qty b{min-width:28px!important;text-align:center!important;font-size:16px!important}
  `;
  document.head.appendChild(css);

  function makeControl(input){
    if(!input || input.dataset.mlQtyReady==="1") return;
    input.dataset.mlQtyReady="1";
    const wrap=document.createElement("div");
    wrap.className="ml-qty-control";
    const minus=document.createElement("button");
    minus.type="button"; minus.textContent="−"; minus.setAttribute("aria-label","Diminuir quantidade");
    const value=document.createElement("span");
    value.className="ml-qty-value";
    const plus=document.createElement("button");
    plus.type="button"; plus.textContent="+"; plus.setAttribute("aria-label","Aumentar quantidade");

    const sync=()=>{let n=Math.max(1,parseInt(input.value||"1",10)||1);input.value=n;value.textContent=n};
    minus.onclick=()=>{sync();input.value=Math.max(1,(parseInt(input.value,10)||1)-1);sync()};
    plus.onclick=()=>{sync();input.value=(parseInt(input.value,10)||1)+1;sync()};
    input.addEventListener("input",sync);
    input.style.display="none";
    wrap.append(minus,value,plus);
    input.parentNode.insertBefore(wrap,input);
    sync();
  }

  function scan(){
    // Client modal uses #qty; Admin product modal uses #mQty.
    makeControl(document.getElementById("qty"));
    makeControl(document.getElementById("mQty"));
  }

  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
  setTimeout(scan,100);
  setTimeout(scan,500);
  setTimeout(scan,1200);
})();

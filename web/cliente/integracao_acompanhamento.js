/* Miguel Lanches — integração final
   Este arquivo:
   1) garante que o pedido salvo pelo checkout seja guardado como último pedido;
   2) adiciona a tela de acompanhamento;
   3) adiciona os botões pós-pedido.
*/
(() => {
"use strict";
const originalSuccess = window.closeSuccess;
window.closeSuccess = function(){
  if(typeof originalSuccess==="function") originalSuccess();
  document.getElementById("successModal")?.classList.add("hidden");
  document.getElementById("mlHome")?.click();
};

function installTrackingModal(){
 if(document.getElementById("trackingModal"))return;
 const m=document.createElement("div");m.id="trackingModal";m.className="hidden";
 m.innerHTML=`<div id="trackingCard"><div id="trackingBody"></div></div>`;
 document.body.appendChild(m);
}
installTrackingModal();

// Intercept a successful checkout by watching the success number text.
// app.js normally sets #orderNumber after insertion.
const observer=new MutationObserver(()=>{
 const n=document.getElementById("orderNumber");
 if(!n)return;
 const text=n.textContent||"";
 const match=text.match(/([0-9a-f]{8}-[0-9a-f-]{27,}|#?\d+)/i);
 if(match && window.currentLastOrderId){
   localStorage.setItem("ml_last_order_id",window.currentLastOrderId);
 }
});
observer.observe(document.body,{subtree:true,childList:true,characterData:true});

// Add the desired buttons to the success modal.
function successButtons(){
 const card=document.querySelector("#successModal .success-card");
 if(!card || card.querySelector("#mlSuccessTrack"))return;
 const old=card.querySelector(".main-btn");
 if(old) old.style.display="none";
 const box=document.createElement("div");box.style.display="grid";box.style.gap="9px";
 box.innerHTML=`<button id="mlSuccessTrack" class="main-btn" type="button">Acompanhar pedido</button>
 <button id="mlSuccessNew" class="secondary-btn" type="button">Novo pedido</button>`;
 card.appendChild(box);
 document.getElementById("mlSuccessTrack").onclick=()=>{
   document.getElementById("successModal")?.classList.add("hidden");
   window.openTracking?.(localStorage.getItem("ml_last_order_id"));
   document.getElementById("mlOrders")?.click();
 };
 document.getElementById("mlSuccessNew").onclick=()=>{
   document.getElementById("successModal")?.classList.add("hidden");
   document.getElementById("mlHome")?.click();
   window.scrollTo({top:0,behavior:"smooth"});
 };
}
setInterval(successButtons,500);
})();
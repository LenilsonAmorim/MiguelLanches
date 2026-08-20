/* Miguel Lanches — acompanhamento do pedido em tempo real + som */
(() => {
"use strict";
const C=window.ML_CONFIG||{};
if(!window.supabase || !C.SUPABASE_URL || !C.SUPABASE_KEY) return;
const R=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_KEY);
let audioCtx=null, currentId=null, currentStatus=null, channel=null;

const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

function arm(){
 if(audioCtx)return;
 try{
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==="suspended")audioCtx.resume();
 }catch(e){}
}
["click","touchstart","keydown"].forEach(e=>window.addEventListener(e,arm,{once:true,passive:true}));

function beep(){
 if(!audioCtx)return;
 try{
  if(audioCtx.state==="suspended")audioCtx.resume();
  const n=audioCtx.currentTime;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type="sine";o.frequency.value=740;
  g.gain.setValueAtTime(.001,n);
  g.gain.linearRampToValueAtTime(.14,n+.02);
  g.gain.exponentialRampToValueAtTime(.001,n+.22);
  o.connect(g);g.connect(audioCtx.destination);o.start(n);o.stop(n+.24);
 }catch(e){}
}

const labels={
 novo:"Pedido recebido",
 preparo:"Preparando",
 entrega:"Saiu para entrega",
 entregue:"Pedido entregue",
 cancelado:"Pedido cancelado"
};

function statusOf(o){
 const m=String(o?.observacoes||"").match(/\[ML_STATUS\](novo|preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/);
 return m?m[1]:"novo";
}

function setView(o){
 const s=statusOf(o);
 const steps=["novo","preparo","entrega","entregue"];
 const idx=steps.indexOf(s);
 const cancelled=s==="cancelado";
 const title=cancelled?"Pedido cancelado":labels[s];

 const el=document.getElementById("trackingBody");
 if(!el)return;
 el.innerHTML=`
  <div class="track-head">
   <small>ACOMPANHAR PEDIDO</small>
   <h2>Pedido #${esc(String(o.id).slice(-5))}</h2>
   <strong class="${cancelled?"danger":""}">${title}</strong>
  </div>
  ${cancelled?`<div class="track-cancel">Seu pedido foi cancelado.</div>`:`
  <div class="track-line">
   ${steps.map((x,i)=>`
    <div class="track-step ${i<=idx?"done":""} ${x===s?"current":""}">
     <span>${i<=idx?"✓":i+1}</span><b>${labels[x]}</b>
    </div>`).join("")}
  </div>`}
  <div class="track-info">
   <div><span>Total</span><b>${money(o.total)}</b></div>
   <div><span>Recebimento</span><b>${esc(o.tipo_entrega||o.forma_entrega||"Pedido")}</b></div>
  </div>
  <button class="main-btn" type="button" onclick="window.closeTracking()">Voltar</button>`;
}

async function loadOrder(id){
 const q=await R.from("pedidos").select("*").eq("id",id).maybeSingle();
 if(q.data){
  if(currentStatus && currentStatus!==statusOf(q.data)) beep();
  currentStatus=statusOf(q.data);
  setView(q.data);
 }else{
  showEmptyTracking();
 }
}

function listen(id){
 if(channel)R.removeChannel(channel);
 channel=R.channel("ml-client-order-"+id)
  .on("postgres_changes",{event:"UPDATE",schema:"public",table:"pedidos",filter:"id=eq."+id},p=>{
    const s=statusOf(p.new);
    if(currentStatus!==null && s!==currentStatus) beep();
    currentStatus=s;setView(p.new);
  }).subscribe();
}

function showEmptyTracking(){
 const modal=document.getElementById("trackingModal");
 const body=document.getElementById("trackingBody");
 if(!modal||!body)return;
 body.innerHTML=`
  <div class="track-empty">
    <div class="track-empty-icon">🛍️</div>
    <h2>Você ainda não tem pedidos</h2>
    <p>Quando você fizer um pedido, ele aparecerá aqui para você acompanhar o status em tempo real.</p>
    <button class="main-btn" type="button" onclick="window.closeTracking();document.getElementById('mlHome')?.click();">Adicionar produtos</button>
  </div>`;
 modal.classList.remove("hidden");
}

window.openTracking=async function(id){
 currentId=id||localStorage.getItem("ml_last_order_id");
 if(!currentId){
   currentStatus=null;
   if(channel){R.removeChannel(channel);channel=null;}
   showEmptyTracking();
   return;
 }
 document.getElementById("trackingModal")?.classList.remove("hidden");
 currentStatus=null;
 await loadOrder(currentId);
 listen(currentId);
};

window.closeTracking=function(){
 document.getElementById("trackingModal")?.classList.add("hidden");
};

function footer(){
 if(document.getElementById("ml-footer"))return;
 const f=document.createElement("nav");f.id="ml-footer";f.innerHTML=`
  <button type="button" class="active" id="mlHome">⌂<span>Início</span></button>
  <button type="button" id="mlOrders">▣<span>Pedidos</span></button>`;
 document.body.appendChild(f);
 document.getElementById("mlHome").onclick=()=>{
   document.getElementById("mlOrders")?.classList.remove("active");
   document.getElementById("mlHome")?.classList.add("active");
   document.getElementById("trackingModal")?.classList.add("hidden");
   window.scrollTo({top:0,behavior:"smooth"});
 };
 document.getElementById("mlOrders").onclick=()=>{
   document.getElementById("mlHome")?.classList.remove("active");
   document.getElementById("mlOrders")?.classList.add("active");
   window.openTracking();
 };
}
footer();
})();

const st=document.createElement("style");st.textContent=`
#ml-footer{position:fixed;bottom:0;left:0;right:0;height:66px;background:#080808;display:flex;z-index:600;box-shadow:0 -5px 20px #0003}
#ml-footer button{flex:1;border:0;background:none;color:#aaa;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:21px}
#ml-footer button span{font-size:11px}.ml-footer button.active,#ml-footer button.active{color:#f4bd17}
body{padding-bottom:88px}
#bagBar{bottom:80px!important;z-index:550!important}
#trackingModal{position:fixed;inset:0;background:#000a;z-index:700;display:flex;align-items:flex-end}
#trackingModal.hidden{display:none}
#trackingCard{background:#fff;width:100%;max-height:90vh;overflow:auto;border-radius:26px 26px 0 0;padding:22px}
.track-head small{font-weight:900;color:#777}.track-head h2{margin:5px 0}.track-head strong{color:#16803a}.track-head strong.danger{color:#c62828}
.track-line{display:grid;gap:12px;margin:24px 0}.track-step{display:grid;grid-template-columns:38px 1fr;align-items:center;gap:10px;color:#aaa}.track-step span{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#eee;font-weight:900}.track-step.done{color:#222}.track-step.done span{background:#f4bd17;color:#111}.track-step.current b{color:#bd1f2b}
.track-info{border-top:1px solid #eee;border-bottom:1px solid #eee;padding:12px 0;margin-bottom:16px}.track-info div{display:flex;justify-content:space-between;padding:6px 0}.track-cancel{background:#fff0f0;color:#c62828;padding:14px;border-radius:12px;margin:20px 0}
.track-empty{text-align:center;padding:30px 8px 18px}.track-empty-icon{width:76px;height:76px;border-radius:50%;background:#fff7d6;display:grid;place-items:center;font-size:38px;margin:0 auto 18px}.track-empty h2{margin:0 0 10px;font-size:25px}.track-empty p{color:#777;line-height:1.5;margin:0 auto 22px;max-width:430px}
`;document.head.appendChild(st);

/* Miguel Lanches — pedidos + menu mobile */
(()=> {
const css=`.mobile-menu-btn{display:none;position:fixed;top:14px;left:14px;width:44px;height:44px;border:0;border-radius:10px;background:#1d1d1d;z-index:1002;align-items:center;justify-content:center;flex-direction:column;gap:5px}.mobile-menu-btn span{width:21px;height:2px;background:#fff;border-radius:2px}.mobile-menu-backdrop{display:none;position:fixed;inset:0;background:#0008;z-index:1000}.mobile-menu-backdrop.open{display:block}@media(max-width:700px){.mobile-menu-btn{display:flex}.sidebar{position:fixed!important;left:0!important;top:0!important;bottom:0!important;width:min(290px,84vw)!important;height:100vh!important;transform:translateX(-105%);transition:transform .22s ease;z-index:1001!important;padding:14px!important;overflow:auto;box-shadow:8px 0 30px #0005}.sidebar.mobile-open{transform:translateX(0)}.sidebar .brand{height:auto!important;padding:8px 4px 18px!important;justify-content:flex-start!important}.sidebar .brand div{display:block!important}.sidebar nav{display:grid!important;gap:6px!important;padding-top:16px!important;overflow:visible!important}.sidebar .nav{width:100%!important;justify-content:flex-start!important;font-size:14px!important;padding:13px!important;min-height:46px}.sidebar .nav i{display:block!important}.sidebar-foot{display:grid!important;margin-top:18px!important}.main{margin-left:0!important;width:100%!important}.topbar{padding-left:70px!important}.orders-board{grid-template-columns:1fr!important}}`;
document.head.appendChild(Object.assign(document.createElement("style"),{textContent:css}));

function setupMenu(){
 if(document.getElementById("mobileMenuBtn"))return;
 const b=document.createElement("button");b.id="mobileMenuBtn";b.className="mobile-menu-btn";b.innerHTML="<span></span><span></span><span></span>";
 const back=document.createElement("div");back.id="mobileMenuBackdrop";back.className="mobile-menu-backdrop";
 document.body.append(b,back);
 const side=document.querySelector(".sidebar");
 const close=()=>{side?.classList.remove("mobile-open");back.classList.remove("open")};
 const open=()=>{side?.classList.add("mobile-open");back.classList.add("open")};
 b.onclick=()=>side?.classList.contains("mobile-open")?close():open();back.onclick=close;
 document.querySelectorAll(".sidebar .nav").forEach(n=>n.addEventListener("click",close));
}

const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const statusOf=o=>{const m=[...String(o||"").matchAll(/\[ML_STATUS\](novo|preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/g)];return m.length?m.at(-1)[1]:"novo"};
const itemsOf=o=>{const m=String(o||"").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/);if(!m)return[];try{return JSON.parse(decodeURIComponent(m[1]))}catch{return[]}};
const clean=o=>String(o||"").replace(/\n?\[ML_[A-Z_]+\][\s\S]*?\[\/ML_[A-Z_]+\]/g,"").trim();
const setStatus=(o,s)=>String(o||"").replace(/\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"").trim()+`\n[ML_STATUS]${s}[/ML_STATUS]`;
const cfg=()=>window.ML_CONFIG||{};
let db=null,orders=[];

function getDB(){if(db)return db;if(!window.supabase||!cfg().SUPABASE_URL||!cfg().SUPABASE_KEY)return null;return db=window.supabase.createClient(cfg().SUPABASE_URL,cfg().SUPABASE_KEY)}

async function load(){
 const d=getDB();if(!d)return;
 const r=await d.from("pedidos").select("*").order("created_at",{ascending:false}).limit(500);
 if(r.error){const h=document.getElementById("orders");if(h)h.innerHTML=`<div class="panel">Erro ao carregar pedidos: ${esc(r.error.message)}</div>`;return}
 orders=r.data||[];render();
}

async function change(id,next){
 const d=getDB(),o=orders.find(x=>String(x.id)===String(id));if(!d||!o)return;
 const novo=setStatus(o.observacoes,next),r=await d.from("pedidos").update({observacoes:novo}).eq("id",o.id);
 if(r.error)return alert("Erro: "+r.error.message);o.observacoes=novo;render();
}

function print(o){
 if(!o)return;
 const w=open("","_blank","width=420,height=700");if(!w)return alert("Permita pop-ups para imprimir.");
 const its=itemsOf(o.observacoes);
 w.document.write(`<html><head><meta charset=utf-8><style>@page{size:58mm auto;margin:0}body{width:58mm;margin:0;padding:3mm;font:12px Arial}.line{border-top:1px dashed #000;margin:7px 0}.tot{display:flex;justify-content:space-between;font-weight:bold;font-size:15px}</style></head><body><center><b>MIGUEL LANCHES</b><br>PEDIDO #${String(o.id).slice(-5)}<br>${new Date(o.created_at).toLocaleString("pt-BR")}</center><div class=line></div><b>CLIENTE:</b> ${esc(o.Cliente||"Cliente")}<br><b>END:</b> ${esc(o.endereco||"Retirada")}<br><b>REF:</b> ${esc(o.referencia||"—")}<div class=line></div>${its.map(i=>`<div><b>${i.quantidade||1}x</b> ${esc(i.nome)} — ${money(Number(i.preco||0)*Number(i.quantidade||1))}</div>`).join("")}<div class=line></div><b>OBS:</b> ${esc(clean(o.observacoes)||"—")}<div class=line></div><div class=tot><span>TOTAL</span><span>${money(o.total)}</span></div><script>window.print()<\/script></body></html>`);w.document.close();
}

function render(){
 const h=document.getElementById("orders");if(!h)return;
 h.className="orders-board";
 const gs=[["novo","Pedido novo","new-col"],["preparo","Preparando","prep-col"],["entrega","Saiu para entrega","delivery-col"],["entregue","Entregue","done-col"]];
 h.innerHTML=gs.map(([st,title,cl])=>{const a=orders.filter(o=>statusOf(o.observacoes)===st);return `<section class="orders-column ${cl}"><div class="orders-column-head"><h2>${title}</h2><b>${a.length}</b></div>${a.map(o=>{const s=statusOf(o.observacoes),its=itemsOf(o.observacoes);return `<article class="board-card ${s==="novo"?"new-card":""}"><div class="board-top"><h3>Pedido #${String(o.id).slice(-5)}</h3><span class=board-time>${new Date(o.created_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span></div><div class=board-client>${esc(o.Cliente||"Cliente")}</div><div class=board-items>${its.map(i=>`<div><b>${i.quantidade||1}x</b> ${esc(i.nome)} <span class=muted>${money(Number(i.preco||0)*Number(i.quantidade||1))}</span></div>`).join("")||"<div>Itens não detalhados</div>"}</div><div class=board-address>${esc(o.endereco||"Retirada")}${o.referencia?" · "+esc(o.referencia):""}</div><div class=board-total><span>Total</span><b>${money(o.total)}</b></div><div class=board-actions><button class=btn-print data-print="${o.id}">Imprimir</button>${s==="novo"?`<button class=btn-primary data-status="${o.id}" data-next=preparo>Preparar</button><button class=btn-danger data-status="${o.id}" data-next=cancelado>Cancelar</button>`:""}${s==="preparo"?`<button class=btn-blue data-status="${o.id}" data-next=entrega>Sair para entrega</button>`:""}${s==="entrega"?`<button class=btn-green data-status="${o.id}" data-next=entregue>Entregue</button>`:""}</div></article>`}).join("")||"<div class=board-empty>Nenhum pedido</div>"}</section>`}).join("");
 const b=document.getElementById("newBadge");if(b)b.textContent=orders.filter(o=>statusOf(o.observacoes)==="novo").length;
 h.querySelectorAll("[data-print]").forEach(x=>x.onclick=()=>print(orders.find(o=>String(o.id)===String(x.dataset.print))));
 h.querySelectorAll("[data-status]").forEach(x=>x.onclick=()=>{if(x.dataset.next==="cancelado"&&!confirm("Cancelar este pedido?"))return;change(x.dataset.status,x.dataset.next)});
}

window.addEventListener("load",()=>{setupMenu();setTimeout(()=>{load();const d=getDB();if(d)d.channel("pedidos-admin-live").on("postgres_changes",{event:"*",schema:"public",table:"pedidos"},load).subscribe()},150)});
})();
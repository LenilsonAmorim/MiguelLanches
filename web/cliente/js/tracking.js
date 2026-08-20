const db=window.db;
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const app=document.getElementById('app');
const KEY='miguel_lanches_ultimo_pedido';

function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;")}

function getSaved(){
 try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}
}

function statusFromOrder(order){
 const direct=String(order.status||'').toLowerCase().trim();
 if(direct)return direct;
 const m=String(order.observacoes||'').match(/\[ML_STATUS\](.*?)\[\/ML_STATUS\]/i);
 return (m?.[1]||'novo').toLowerCase().trim();
}

function itemsFromOrder(order){
 const m=String(order.observacoes||'').match(/\[ML_ITENS\](.*?)\[\/ML_ITENS\]/i);
 if(!m)return [];
 try{return JSON.parse(decodeURIComponent(m[1]))||[]}catch{return []}
}

function labelStatus(s){
 return ({novo:'Pedido recebido',recebido:'Pedido recebido',preparo:'Em preparo',em_preparo:'Em preparo',preparando:'Em preparo',pronto:'Pronto',entregue:'Entregue',cancelado:'Cancelado'}[s]||'Pedido recebido');
}

function renderEmpty(){
 app.innerHTML=`<section class="card empty"><h2>Você não tem nenhum pedido</h2><p>Quando fizer um pedido, ele aparecerá aqui para você acompanhar.</p><button class="primary" onclick="location.href='index.html'">Fazer um pedido</button></section>`;
}

function renderOrder(order){
 const status=statusFromOrder(order);
 const steps=[['novo','Pedido recebido','Seu pedido foi recebido pela lanchonete.'],['preparo','Em preparo','Seu pedido está sendo preparado.'],['pronto','Pronto','Seu pedido está pronto.'],['entregue','Entregue','Pedido finalizado.']];
 const orderItems=itemsFromOrder(order);
 const current=status==='em_preparo'||status==='preparando'?'preparo':status;
 const idx=steps.findIndex(x=>x[0]===current);
 const canceled=status==='cancelado';

 const timeline=canceled?`<div class="card" style="margin-top:15px"><b>Pedido cancelado</b><p class="muted">Este pedido foi cancelado.</p></div>`:`
 <div class="timeline">${steps.map((s,i)=>{
   const active=i===idx,done=idx>=0&&i<idx;
   return `<div class="step ${active?'active':''} ${done?'done':''}"><div><div class="dot">${done?'✓':i+1}</div>${i<steps.length-1?'<div class="line"></div>':''}</div><div><h3>${s[1]}</h3><p>${s[2]}</p></div></div>`;
 }).join('')}</div>`;

 app.innerHTML=`<section class="card">
   <div class="order-head"><div><h2>Pedido #${esc(String(order.id).slice(-5))}</h2><div class="order-date">${order.created_at?new Date(order.created_at).toLocaleString('pt-BR'):''}</div></div><span class="badge">${esc(labelStatus(status))}</span></div>
   ${timeline}
   <div class="items"><b>Itens do pedido</b>${orderItems.length?orderItems.map(x=>`<div class="item"><div><strong>${Number(x.quantidade)||1}x ${esc(x.nome)}</strong>${x.obs?`<small>${esc(x.obs)}</small>`:''}</div><strong>${money((Number(x.preco)||0)*(Number(x.quantidade)||1))}</strong></div>`).join(''):'<p class="muted">Os itens deste pedido não puderam ser exibidos.</p>'}
   <div class="total"><span>Total</span><span>${money(order.total)}</span></div></div>
   <button class="primary" onclick="location.href='index.html'">Voltar ao cardápio</button>
   <div class="refresh">Atualizando automaticamente a cada 8 segundos</div>
 </section>`;
}

async function loadOrder(){
 const saved=getSaved();
 if(!saved?.id){renderEmpty();return;}
 const {data,error}=await db.from('pedidos').select('*').eq('id',saved.id).maybeSingle();
 if(error||!data){renderEmpty();return;}
 renderOrder(data);
}

loadOrder();
setInterval(loadOrder,8000);

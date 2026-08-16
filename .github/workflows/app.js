const $=id=>document.getElementById(id);
let items=[]; let sent=[];

function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function renderItems(){
  $('items').innerHTML=items.map((x,i)=>`<div class="item">
  <input data-name="${i}" placeholder="Produto" value="${x.name||''}">
  <input data-price="${i}" type="number" step="0.01" placeholder="Preço" value="${x.price||''}">
  <button data-del="${i}" class="secondary">×</button></div>`).join('');
  $('items').querySelectorAll('[data-name]').forEach(e=>e.oninput=()=>{items[e.dataset.name].name=e.value});
  $('items').querySelectorAll('[data-price]').forEach(e=>e.oninput=()=>{items[e.dataset.price].price=Number(e.value);calc()});
  $('items').querySelectorAll('[data-del]').forEach(e=>e.onclick=()=>{items.splice(e.dataset.del,1);renderItems();calc()});
}
function calc(){$('total').textContent=money(items.reduce((s,x)=>s+(Number(x.price)||0),0))}
$('loginBtn').onclick=()=>{
  const u=$('username').value.trim(),p=$('password').value;
  if(u && p){$('login').classList.add('hidden');$('orders').classList.remove('hidden'); if(!items.length){items=[{name:'',price:0}] ;renderItems()}}
  else $('loginMsg').textContent='Informe usuário e senha.';
};
$('logoutBtn').onclick=()=>{$('orders').classList.add('hidden');$('login').classList.remove('hidden')};
$('addItemBtn').onclick=()=>{items.push({name:'',price:0});renderItems()};
$('sendBtn').onclick=()=>{
  const order={cliente:$('cliente').value.trim(),telefone:$('telefone').value.trim(),endereco:$('endereco').value.trim(),referencia:$('referencia').value.trim(),observacoes:$('observacoes').value.trim(),items:items.filter(x=>x.name),total:items.reduce((s,x)=>s+(Number(x.price)||0),0),time:new Date().toLocaleString('pt-BR')};
  if(!order.cliente || !order.items.length){alert('Informe o cliente e pelo menos um item.');return}
  sent.unshift(order);
  $('ordersList').innerHTML=sent.map((o,i)=>`<div class="order"><strong>#${String(sent.length-i).padStart(3,'0')} — ${o.cliente}</strong><small>${o.time} · ${money(o.total)}</small></div>`).join('');
  alert('Pedido registrado nesta versão de teste.');
  $('cliente').value=$('telefone').value=$('endereco').value=$('referencia').value=$('observacoes').value='';
  items=[{name:'',price:0}];renderItems();calc();
};
items=[{name:'',price:0}];renderItems();calc();

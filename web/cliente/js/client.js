const db=window.db;
const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
let categories=[],products=[],cart=[],selectedCategory='todos';
window.categories=categories;window.products=products;window.cart=cart;
window.DELIVERY_FEE=Number(window.DELIVERY_FEE||0);

function toast(t){const el=$('toast');if(!el)return;el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
window.toast=toast;

function renderCategories(){
 const host=$('categories'); if(!host)return;
 const all=[{id:'todos',nome:'Todos',emoji:''},...categories.filter(c=>c.ativo!==false)];
 host.innerHTML=all.map(c=>`<button type="button" class="${String(selectedCategory)===String(c.id)?'active':''}" data-category-nav="${esc(c.id)}">${esc(c.nome)}</button>`).join('');
 host.querySelectorAll('[data-category-nav]').forEach(btn=>btn.onclick=()=>{
   const id=btn.dataset.categoryNav;selectedCategory=id;renderCategories();
   if(id==='todos'){window.scrollTo({top:0,behavior:'smooth'});return;}
   const target=document.getElementById('cat-'+String(id).replace(/[^a-zA-Z0-9_-]/g,'-'));
   if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
 });
}
window.renderCategories=renderCategories;

async function load(){
 try{
  const [c,p]=await Promise.all([
   db.from('categorias').select('*').order('ordem'),
   db.from('produtos').select('*,categorias(nome,emoji)').eq('ativo',true).order('ordem')
  ]);
  categories=c.data||[];products=p.data||[];cart=cart||[];
  window.categories=categories;window.products=products;window.cart=cart;
  renderCategories();
  if(window.renderFeatured)window.renderFeatured();
  if(window.renderProducts)window.renderProducts();
  if(window.renderCart)window.renderCart();
 }catch(e){console.error(e);toast('Não foi possível carregar o cardápio.');}
}
window.load=load;

function syncCart(){window.cart=cart;if(window.renderCart)window.renderCart()}
function addToCart(id){
 const p=products.find(x=>String(x.id)===String(id));if(!p)return;
 const found=cart.find(x=>String(x.id)===String(id));
 if(found)found.quantidade=Number(found.quantidade||0)+1;
 else cart.push({id:p.id,nome:p.nome,preco:Number(p.preco||0),quantidade:1,config:{},obs:''});
 syncCart();toast('Produto adicionado à sacola');
}
window.addToCart=addToCart;
window.changeQty=(id,d)=>{const x=cart.find(i=>String(i.id)===String(id));if(!x)return;x.quantidade+=d;if(x.quantidade<=0)cart=cart.filter(i=>String(i.id)!==String(id));syncCart()};
window.removeItem=id=>{cart=cart.filter(i=>String(i.id)!==String(id));syncCart()};

window.openProduct=id=>{
 const p=products.find(x=>String(x.id)===String(id));const modal=$('productModal'),body=$('productBody');if(!p||!modal||!body)return;
 body.innerHTML=`<div class="product-main">${p.imagem_url?`<img src="${esc(p.imagem_url)}" alt="${esc(p.nome)}" style="width:100%;max-height:230px;object-fit:cover;border-radius:14px;margin-bottom:14px">`:''}<h2>${esc(p.nome)}</h2><div class="big-price">${money(p.preco)}</div><p>${esc(p.descricao||'')}</p><div class="modal-actions"><button class="primary full" type="button" onclick="addToCart('${esc(p.id)}');closeProduct()">Adicionar à sacola</button></div></div>`;
 modal.classList.remove('hidden');
};
window.closeProduct=()=>{$('productModal')?.classList.add('hidden')};

function openCart(){$('shade')?.classList.add('open');$('cartDrawer')?.classList.add('open')}
function closeCart(){$('shade')?.classList.remove('open');$('cartDrawer')?.classList.remove('open')}

async function sendOrder(){
 if(!cart.length)return toast('Adicione produtos à sacola');
 const method=document.querySelector('.receive.selected')?.dataset.method||'entrega';
 const name=$('customerName')?.value.trim(),phone=$('customerPhone')?.value.trim();
 const address=method==='retirada'?'Retirada na loja':($('address')?.value.trim()||'');
 const reference=$('reference')?.value.trim()||'';
 if(!name||!phone)return toast('Preencha nome e telefone');
 if(method==='entrega'&&!address)return toast('Informe o endereço');
 const sub=cart.reduce((s,x)=>s+Number(x.preco)*Number(x.quantidade),0),fee=method==='entrega'?Number(window.DELIVERY_FEE||0):0,total=sub+fee;
 const items=cart.map(x=>({nome:x.nome,quantidade:x.quantidade,preco:x.preco,adicionais:x.config?.adicionais||[],obs:x.obs||''}));
 const obs=($('orderNote')?.value||'')+'\n\n[ML_ITENS]'+encodeURIComponent(JSON.stringify(items))+'[/ML_ITENS]\n[ML_ENTREGA]'+fee+'[/ML_ENTREGA]\n[ML_STATUS]novo[/ML_STATUS]';
 const payload={Cliente:name,telefone:phone,endereco:address,referencia:reference,total,observacoes:obs};
 const r=await db.from('pedidos').insert(payload).select('id').single();
 if(r.error){console.error(r.error);return toast('Erro ao enviar pedido');}
 try{await db.from('clientes').upsert({nome:name,telefone:phone,endereco:address,referencia:reference},{onConflict:'telefone'});}catch{}
 const num=String(r.data.id).slice(-5);
 cart=[];syncCart();closeCart();$('checkoutModal')?.classList.add('hidden');
 if($('orderNumber'))$('orderNumber').textContent='Pedido #'+num;
 $('successModal')?.classList.remove('hidden');
}
window.sendOrder=sendOrder;

document.addEventListener('DOMContentLoaded',()=>{
 $('navCart')?.addEventListener('click',openCart);$('closeCart')?.addEventListener('click',closeCart);$('shade')?.addEventListener('click',closeCart);
 $('clearCart')?.addEventListener('click',()=>{cart=[];syncCart()});
 $('checkoutBtn')?.addEventListener('click',()=>{if(!cart.length)return toast('Adicione produtos à sacola');closeCart();$('checkoutModal')?.classList.remove('hidden')});
 $('checkoutClose')?.addEventListener('click',()=>$('checkoutModal')?.classList.add('hidden'));
 $('productClose')?.addEventListener('click',window.closeProduct);
 $('successClose')?.addEventListener('click',()=>$('successModal')?.classList.add('hidden'));
 $('clearSearch')?.addEventListener('click',()=>{const s=$('search');if(s){s.value='';s.focus();if(window.renderProducts)renderProducts();if(window.renderFeatured)renderFeatured()}});
 document.querySelectorAll('.receive').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.receive').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');const delivery=b.dataset.method==='entrega';$('deliveryBox')?.classList.toggle('hidden',!delivery)}));
 $('checkoutForm')?.addEventListener('submit',e=>{e.preventDefault();sendOrder()});
});

const SUPABASE_URL="https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY="sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let products=[],cats=[],cart=[],cat="todos",bairros=[];
const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const uid=()=>crypto.randomUUID();

async function loadBairros(){
  const r=await db.from("bairros").select("id,nome,taxa_entrega,ativo").eq("ativo",true).order("nome");
  if(r.error){console.error(r.error);bairros=[];return;}
  bairros=(r.data||[]).map(b=>({id:b.id,nome:b.nome,taxa:Number(b.taxa_entrega||0)}));
  const s=$("bairro");
  if(s)s.innerHTML='<option value="">Selecione o bairro *</option>'+
    bairros.map(b=>`<option value="${esc(b.id)}">${esc(b.nome)} — ${money(b.taxa)}</option>`).join("");
}
async function init(){
  const [c,p]=await Promise.all([
    db.from("categorias").select("*").eq("ativo",true).order("ordem"),
    db.from("produtos").select("*,categorias(nome,emoji)").eq("ativo",true).order("ordem")
  ]);
  if(c.error||p.error){$("products").innerHTML='<div class="empty">Não foi possível carregar o cardápio.</div>';return}
  cats=c.data||[];products=p.data||[];renderCats();renderProducts();await loadBairros();
}
function renderCats(){
  $("categories").innerHTML=`<button class="${cat==="todos"?"active":""}" onclick="chooseCat('todos')">🍽️ Todos</button>`+
  cats.map(c=>`<button class="${String(cat)===String(c.id)?"active":""}" onclick="chooseCat('${c.id}')">${esc(c.emoji||"📦")} ${esc(c.nome)}</button>`).join("")
}
function chooseCat(id){cat=id;renderCats();renderProducts()}
function renderProducts(){
  const q=$("search").value.toLowerCase().trim();
  const list=products.filter(p=>(cat==="todos"||String(p.categoria_id)===String(cat))&&(!q||p.nome.toLowerCase().includes(q)));
  $("products").innerHTML=list.length?list.map(p=>`<article class="card"><div class="photo">${p.imagem_url?`<img src="${esc(p.imagem_url)}" alt="${esc(p.nome)}">`:esc(p.emoji||"🍔")}</div><div class="info"><h3>${esc(p.nome)}</h3><div class="bottom"><span class="price">${money(p.preco)}</span><button class="plus" onclick="openProduct('${p.id}')">+</button></div></div></article>`).join(""):'<div class="empty">Nenhum produto encontrado.</div>'
}
async function openProduct(id){
  const p=products.find(x=>String(x.id)===String(id));if(!p)return;
  const rel=await db.from("produto_ingredientes").select("ingrediente_id").eq("produto_id",id);
  const allowed=new Set((rel.data||[]).map(x=>String(x.ingrediente_id)));
  const ing=await db.from("ingredientes").select("*").eq("ativo",true).order("nome");
  const list=(ing.data||[]).filter(x=>allowed.has(String(x.id)));
  $("modalContent").innerHTML=`<h2>${esc(p.nome)}</h2><div class="form"><label>Quantidade<input id="qty" type="number" min="1" value="1"></label>${list.length?`<label>Adicionais</label><div class="checks">${list.map(i=>`<label class="check"><input type="checkbox" value="${i.id}" data-name="${esc(i.nome)}" data-price="${i.preco}"> ${esc(i.nome)} + ${money(i.preco)}</label>`).join("")}</div>`:""}<label>Observação<textarea id="itemObs" placeholder="Ex.: sem cebola..."></textarea></label><div class="actions"><button onclick="closeModal()">Voltar</button><button class="primary" onclick="addProduct('${p.id}')">Adicionar</button></div></div>`;
  $("modal").classList.remove("hidden")
}
function closeModal(){$("modal").classList.add("hidden")}
function addProduct(id){
  const p=products.find(x=>String(x.id)===String(id));let q=Math.max(1,Number($("qty").value||1));
  const adds=[...document.querySelectorAll("#modalContent input[type=checkbox]:checked")].map(x=>({nome:x.dataset.name,preco:Number(x.dataset.price||0)}));
  const obs=$("itemObs").value.trim(),price=Number(p.preco)+adds.reduce((s,x)=>s+x.preco,0);
  cart.push({key:uid(),id:p.id,nome:p.nome,preco:price,quantidade:q,adicionais:adds,obs});closeModal();renderCart()
}
function renderCart(){
  const n=cart.reduce((s,x)=>s+x.quantidade,0);$("cartCount").textContent=n;
  $("cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cartItem"><div class="cartLine"><span class="cartName">${x.quantidade}x ${esc(x.nome)}</span><span class="cartPrice">${money(x.preco*x.quantidade)}</span></div>${x.adicionais.length?`<small>+ ${x.adicionais.map(a=>esc(a.nome)).join(", ")}</small>`:""}${x.obs?`<small>${esc(x.obs)}</small>`:""}<div class="qty"><button onclick="qty('${x.key}',-1)">−</button><b>${x.quantidade}</b><button onclick="qty('${x.key}',1)">+</button><button class="remove" onclick="removeItem('${x.key}')">Excluir</button></div></div>`).join(""):'<div class="empty">Seu pedido está vazio.<br>Toque no + para adicionar.</div>';
  updateTotal()
}
function qty(k,d){const x=cart.find(x=>x.key===k);if(!x)return;x.quantidade+=d;if(x.quantidade<1)cart=cart.filter(y=>y.key!==k);renderCart()}
function removeItem(k){cart=cart.filter(x=>x.key!==k);renderCart()}
function openCart(){$("cart").classList.add("open");$("overlay").classList.add("open");document.body.style.overflow="hidden"}
function closeCart(){$("cart").classList.remove("open");$("overlay").classList.remove("open");document.body.style.overflow=""}
function phoneDigits(v){return String(v||"").replace(/\D/g,"")}
function validPhone(v){const n=phoneDigits(v);return n.length===11&&/^[1-9]{2}9[0-9]{8}$/.test(n)}
function selectedBairro(){const id=$("bairro")?.value;return bairros.find(b=>String(b.id)===String(id))||null}
function updateTotal(){
  const sub=cart.reduce((s,x)=>s+x.preco*x.quantidade,0),b=selectedBairro(),fee=Number(b?.taxa||0);
  $("subtotal").textContent=money(sub);$("deliveryFee").textContent=money(fee);$("total").textContent=money(sub+fee);
  updateTroco(sub+fee)
}
function updateTroco(total){
  const pag=$("pagamento")?.value,valor=Number($("valorPago")?.value||0);
  const box=$("trocoPreview");if(!box)return;
  if(pag==="Dinheiro"){const t=valor-total;box.textContent=t>=0?`Troco: ${money(t)}`:"Valor insuficiente.";box.style.color=t>=0?"#198754":"#c71926"}else box.textContent="";
}
async function sendOrder(){
  if(!cart.length)return alert("Adicione pelo menos um produto.");
  const nome=$("nome").value.trim(),phone=$("telefone").value.trim(),bairro=selectedBairro(),end=$("endereco").value.trim(),ref=$("referencia").value.trim();
  if(!nome)return alert("Informe seu nome.");
  if(!validPhone(phone))return alert("Número de WhatsApp inválido. Digite um celular brasileiro com DDD, por exemplo: (84) 99999-9999.");
  if(!bairro)return alert("Selecione o bairro.");
  if(!end)return alert("Informe o endereço.");
  if(!ref)return alert("Informe o ponto de referência.");
  const pag=$("pagamento").value;
  if(!pag)return alert("Selecione a forma de pagamento.");
  const sub=cart.reduce((s,x)=>s+x.preco*x.quantidade,0),fee=Number(bairro.taxa||0),total=sub+fee;
  const valorPago=pag==="Dinheiro"?Number($("valorPago").value||0):0;
  if(pag==="Dinheiro"&&(!valorPago||valorPago<total))return alert(`Informe um valor de pagamento igual ou maior que ${money(total)}.`);
  const troco=pag==="Dinheiro"?valorPago-total:0;
  const obs=$("observacoes").value.trim(),items=cart.map(x=>({nome:x.nome,quantidade:x.quantidade,preco:x.preco,adicionais:x.adicionais,obs:x.obs}));
  const packed=`${obs}
[ML_BAIRRO]${encodeURIComponent(bairro.nome)}[/ML_BAIRRO]
[ML_TAXA]${fee}[/ML_TAXA]
[ML_PAGAMENTO]${encodeURIComponent(pag)}[/ML_PAGAMENTO]
[ML_VALOR_PAGO]${valorPago}[/ML_VALOR_PAGO]
[ML_TROCO]${troco}[/ML_TROCO]
[ML_ITENS]${encodeURIComponent(JSON.stringify(items))}[/ML_ITENS]
[ML_STATUS]preparo[/ML_STATUS]`;
  const {error}=await db.from("pedidos").insert({Cliente:nome,telefone:phone,bairro:bairro.nome,endereco:end,referencia:ref,forma_pagamento:pag,valor_pago:valorPago,troco:troco,taxa_entrega:fee,observacoes:packed,total});
  if(error)return alert("Não foi possível enviar o pedido: "+error.message);
  await db.from("clientes").upsert({nome,telefone:phone,endereco:end,referencia:ref},{onConflict:"telefone"});
  cart=[];renderCart();closeCart();
  ["nome","telefone","endereco","referencia","observacoes","valorPago"].forEach(id=>$(id).value="");
  $("bairro").value="";$("pagamento").value="";$("paymentMoney").classList.add("hidden");$("trocoPreview").textContent="";
  alert("Pedido enviado com sucesso! Obrigado.")
}
$("search").oninput=renderProducts;$("openCart").onclick=openCart;$("closeCart").onclick=closeCart;$("overlay").onclick=closeCart;$("modalClose").onclick=closeModal;$("send").onclick=sendOrder;
$("bairro").onchange=updateTotal;
$("pagamento").onchange=()=>{const on=$("pagamento").value==="Dinheiro";$("paymentMoney").classList.toggle("hidden",!on);updateTotal()};
$("valorPago").oninput=()=>updateTroco(Number($("total").textContent.replace(/[^\d,-]/g,"").replace(".","").replace(",","."))||0);
init();renderCart();
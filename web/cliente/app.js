const SUPABASE_URL="https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY="sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let products=[],cats=[],cart=[],cat="todos",bairros=[],receiveMethod=null;
const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const uid=()=>crypto.randomUUID();
const PROFILE_KEY="miguel_lanches_cliente_endereco";

async function categoryConfig(id){
 const r=await db.from("configuracoes").select("valor").eq("chave","categoria_config").maybeSingle();
 let all={};try{all=JSON.parse(r.data?.valor||"{}")}catch{}
 return all[String(id)]||{ingredientes:true,observacao:true};
}
async function loadBairros(){
 const r=await db.from("bairros").select("id,nome,taxa_entrega,ativo").eq("ativo",true).order("nome");
 bairros=r.data||[];
 $("bairro").innerHTML='<option value="">Selecione o bairro *</option>'+bairros.map(b=>`<option value="${esc(b.id)}">${esc(b.nome)} — ${money(b.taxa_entrega)}</option>`).join("");
}
async function init(){
 const [c,p]=await Promise.all([
  db.from("categorias").select("*").eq("ativo",true).order("ordem"),
  db.from("produtos").select("*,categorias(nome,emoji)").eq("ativo",true).order("ordem")
 ]);
 cats=c.data||[];products=p.data||[];
 await loadBairros();
 renderCats();renderProducts();renderCart();renderAlso();
 loadSavedProfile();
}
function renderCats(){
 $("categories").innerHTML=`<button class="${cat==="todos"?"active":""}" onclick="chooseCat('todos')">🍽️ Todos</button>`+
 cats.map(c=>`<button class="${String(cat)===String(c.id)?"active":""}" onclick="chooseCat('${c.id}')">${esc(c.emoji||"📦")} ${esc(c.nome)}</button>`).join("");
}
function chooseCat(id){cat=id;renderCats();renderProducts()}
function renderProducts(){
 const q=$("search").value.toLowerCase().trim();
 const list=products.filter(p=>(cat==="todos"||String(p.categoria_id)===String(cat))&&(!q||p.nome.toLowerCase().includes(q)));
 $("products").innerHTML=list.length?list.map(p=>`<article class="card"><div class="photo">${p.imagem_url?`<img src="${esc(p.imagem_url)}" alt="${esc(p.nome)}">`:esc(p.emoji||"🍔")}</div><div class="info"><h3>${esc(p.nome)}</h3><div class="bottom"><span class="price">${money(p.preco)}</span><button class="plus" onclick="openProduct('${p.id}')">+</button></div></div></article>`).join(""):'<div class="empty">Nenhum produto encontrado.</div>';
}
async function openProduct(id){
 const p=products.find(x=>String(x.id)===String(id));if(!p)return;
 const catName=(p.categorias?.nome||"").toLowerCase();
 if(catName.includes("açaí")||catName.includes("acai")){await openAcaiConfigurator(p);return}
 const cfg=await categoryConfig(p.categoria_id);let addons="";
 if(cfg.ingredientes){
  const rel=await db.from("produto_ingredientes").select("ingrediente_id").eq("produto_id",id);
  const allowed=new Set((rel.data||[]).map(x=>String(x.ingrediente_id)));
  const ing=await db.from("ingredientes").select("*").eq("ativo",true).order("nome");
  const list=(ing.data||[]).filter(x=>allowed.has(String(x.id)));
  if(list.length)addons=`<label>Ingredientes adicionais</label><div class="checks">${list.map(i=>`<label class="check"><input type="checkbox" value="${i.id}" data-name="${esc(i.nome)}" data-price="${i.preco}"> ${esc(i.nome)} + ${money(i.preco)}</label>`).join("")}</div>`;
 }
 $("modalContent").innerHTML=`<h2>${esc(p.nome)}</h2><div class="form"><label>Quantidade<input id="qty" type="number" min="1" value="1"></label>${addons}${cfg.observacao?`<label>Observação<textarea id="itemObs" placeholder="Ex.: sem cebola..."></textarea></label>`:""}<div class="actions"><button onclick="closeModal()">Voltar</button><button class="primary" onclick="addConfigured('${p.id}',${cfg.ingredientes},${cfg.observacao})">Adicionar</button></div></div>`;
 $("modal").classList.remove("hidden");
}
function closeModal(){$("modal").classList.add("hidden")}
async function addConfigured(id,hasIng,hasObs){
 const p=products.find(x=>String(x.id)===String(id)),q=Math.max(1,Number($("qty").value||1));
 const adds=hasIng?[...document.querySelectorAll("#modalContent input[type=checkbox]:checked")].map(x=>({nome:x.dataset.name,preco:Number(x.dataset.price||0)})):[];
 const obs=hasObs?($("itemObs")?.value.trim()||""):"";
 cart.push({key:uid(),id:p.id,nome:p.nome,preco:Number(p.preco)+adds.reduce((s,x)=>s+x.preco,0),quantidade:q,adicionais:adds,obs,coberturas:[]});
 closeModal();renderCart();
}
const ACAI_TAMANHOS=["200 ml","300 ml","500 ml","1 litro"];
async function loadAcaiCoberturas(){
 const r=await db.from("configuracoes").select("valor").eq("chave","acai_coberturas").maybeSingle();
 try{return JSON.parse(r.data?.valor||"[]")}catch{return[]}
}
async function openAcaiConfigurator(p){
 const covers=(await loadAcaiCoberturas()).filter(x=>x&&x.ativo!==false);window._acaiProduct=p;
 $("modalContent").innerHTML=`<h2>🍧 Monte seu Açaí</h2><div class="form"><label>Tamanho</label><div class="checks">${ACAI_TAMANHOS.map(t=>`<label class="check"><input type="radio" name="acaiSize" value="${t}"> ${t}</label>`).join("")}</div><label>Escolha até 3 coberturas</label><div class="checks">${covers.length?covers.map(c=>`<label class="check"><input type="checkbox" value="${esc(c.nome)}" onchange="acaiLimit(this)"> ${esc(c.nome)}</label>`).join(""):"<small>Nenhuma cobertura cadastrada.</small>"}</div><small id="acaiCount">0/3 coberturas</small><div class="actions"><button onclick="closeModal()">Voltar</button><button class="primary" onclick="addAcai()">Adicionar</button></div></div>`;
 $("modal").classList.remove("hidden");
}
window.acaiLimit=el=>{const all=[...document.querySelectorAll("#modalContent input[type=checkbox]")];if(all.filter(x=>x.checked).length>3){el.checked=false;alert("Máximo de 3 coberturas.");}$("acaiCount").textContent=`${all.filter(x=>x.checked).length}/3 coberturas`};
window.addAcai=()=>{const size=document.querySelector('input[name="acaiSize"]:checked');if(!size)return alert("Escolha o tamanho.");const covers=[...document.querySelectorAll("#modalContent input[type=checkbox]:checked")].map(x=>x.value);const p=window._acaiProduct;cart.push({key:uid(),id:p.id,nome:`${p.nome} — ${size.value}`,preco:Number(p.preco||0),quantidade:1,adicionais:[],obs:"",coberturas:covers});closeModal();renderCart()};

function subtotal(){return cart.reduce((s,x)=>s+x.preco*x.quantidade,0)}
function selectedBairro(){return bairros.find(b=>String(b.id)==String($("bairro").value))}
function deliveryFee(){return receiveMethod==="entrega"?Number(selectedBairro()?.taxa_entrega||0):0}
function total(){return subtotal()+deliveryFee()}

function renderCart(){
 const count=cart.reduce((s,x)=>s+x.quantidade,0);$("cartCount").textContent=count;$("cartItemCount").textContent=`${count} ${count===1?"item":"itens"}`;
 $("cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cartItem"><div class="cartLine"><span>${x.quantidade}x ${esc(x.nome)}</span><span class="cartPrice">${money(x.preco*x.quantidade)}</span></div>${x.adicionais.length?`<small>+ ${x.adicionais.map(a=>esc(a.nome)).join(", ")}</small>`:""}${x.coberturas?.length?`<small>Coberturas: ${x.coberturas.map(esc).join(", ")}</small>`:""}${x.obs?`<small>${esc(x.obs)}</small>`:""}<div class="qty"><button onclick="changeQty('${x.key}',-1)">−</button><b>${x.quantidade}</b><button onclick="changeQty('${x.key}',1)">+</button><button class="remove" onclick="removeItem('${x.key}')">Remover</button></div></div>`).join(""):'<div class="empty">Sua sacola está vazia.</div>';
 updateSummary();
}
function changeQty(k,d){const x=cart.find(x=>x.key===k);if(!x)return;x.quantidade+=d;if(x.quantidade<1)cart=cart.filter(y=>y.key!==k);renderCart()}
function removeItem(k){cart=cart.filter(x=>x.key!==k);renderCart()}
function updateSummary(){
 const sub=subtotal(),fee=deliveryFee(),tot=sub+fee;
 $("subtotal").textContent=money(sub);$("deliveryFee").textContent=money(fee);$("total").textContent=money(tot);$("bottomCartTotal").textContent=money(tot);
 $("checkoutSubtotal").textContent=money(sub);$("checkoutFee").textContent=money(fee);$("checkoutTotal").textContent=money(tot);
 if($("pagamento").value==="Dinheiro")updateTroco(tot);
}
function renderAlso(){
 const list=products.slice(0,8);
 $("alsoProducts").innerHTML=list.map(p=>`<div class="also-card"><div class="also-photo">${p.imagem_url?`<img src="${esc(p.imagem_url)}">`:esc(p.emoji||"🍔")}</div><b>${esc(p.nome)}</b><span class="price">${money(p.preco)}</span><button onclick="openProduct('${p.id}')">Adicionar</button></div>`).join("");
}
function openCart(){if(!cart.length){alert("Sua sacola está vazia.");return}$("cart").classList.add("open");$("overlay").classList.add("open")}
function closeCart(){$("cart").classList.remove("open");$("overlay").classList.remove("open")}
function clearCart(){if(cart.length&&!confirm("Limpar toda a sacola?"))return;cart=[];renderCart()}
function openCheckout(){
 if(!cart.length)return alert("Adicione pelo menos um item.");
 closeCart();$("checkout").classList.remove("hidden");loadSavedProfile();updateSummary();
}
function closeCheckout(){$("checkout").classList.add("hidden")}
function chooseReceive(method){
 receiveMethod=method;
 document.querySelectorAll(".receive-option").forEach(b=>b.classList.toggle("active",b.dataset.method===method));
 $("customerSection").classList.remove("hidden");
 $("deliveryFields").classList.toggle("hidden",method!=="entrega");
 if(method!=="entrega"){$("bairro").value="";$("endereco").value="";$("referencia").value=""}
 updateSummary();
}
function saveProfile(){
 const profile={nome:$("nome").value.trim(),telefone:$("telefone").value.trim(),bairroId:$("bairro").value,endereco:$("endereco").value.trim(),referencia:$("referencia").value.trim()};
 localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
}
function loadSavedProfile(){
 try{
  const p=JSON.parse(localStorage.getItem(PROFILE_KEY)||"null");if(!p)return;
  $("nome").value=p.nome||"";$("telefone").value=p.telefone||"";$("bairro").value=p.bairroId||"";$("endereco").value=p.endereco||"";$("referencia").value=p.referencia||"";
  if(p.endereco||p.bairroId){$("savedAddress").classList.remove("hidden");$("savedAddressText").textContent=`${p.endereco||""}${p.bairroId?" • "+(bairros.find(b=>String(b.id)===String(p.bairroId))?.nome||""):""}`;}
 }catch{}
}
function changeSavedAddress(){$("savedAddress").classList.add("hidden");$("deliveryFields").classList.remove("hidden");$("endereco").focus()}
function updateTroco(tot){const v=Number($("valorPago").value||0),t=v-tot;$("trocoPreview").textContent=t>=0?`Troco: ${money(t)}`:"Valor insuficiente."}
function validPhone(v){const n=String(v||"").replace(/\D/g,"");return /^(?:[1-9]{2})9\d{8}$/.test(n)}
async function sendOrder(){
 if(!cart.length)return alert("Adicione pelo menos um item.");
 if(!receiveMethod)return alert("Escolha Entrega ou Retirada.");
 const nome=$("nome").value.trim(),phone=$("telefone").value.trim(),pag=$("pagamento").value;
 if(!nome)return alert("Informe seu nome.");
 if(!validPhone(phone))return alert("WhatsApp inválido. Digite um celular com DDD.");
 let bairro=null,end="",ref="";
 if(receiveMethod==="entrega"){bairro=selectedBairro();end=$("endereco").value.trim();ref=$("referencia").value.trim();if(!bairro)return alert("Selecione o bairro.");if(!end)return alert("Informe o endereço.");if(!ref)return alert("Informe a referência.")}
 if(!pag)return alert("Selecione a forma de pagamento.");
 const sub=subtotal(),fee=deliveryFee(),tot=sub+fee,valorPago=pag==="Dinheiro"?Number($("valorPago").value||0):0;
 if(pag==="Dinheiro"&&valorPago<tot)return alert(`O valor pago precisa ser pelo menos ${money(tot)}.`);
 const troco=pag==="Dinheiro"?valorPago-tot:0;
 const items=cart.map(x=>({nome:x.nome,quantidade:x.quantidade,preco:x.preco,adicionais:x.adicionais,coberturas:x.coberturas||[],obs:x.obs}));
 const obs=`${$("observacoes").value.trim()}\n[ML_ITENS]${encodeURIComponent(JSON.stringify(items))}[/ML_ITENS]\n[ML_RECEBIMENTO]${receiveMethod}[/ML_RECEBIMENTO]\n[ML_BAIRRO]${encodeURIComponent(bairro?.nome||"")}[/ML_BAIRRO]\n[ML_STATUS]preparo[/ML_STATUS]`;
 const r=await db.from("pedidos").insert({Cliente:nome,telefone:phone,bairro:bairro?.nome||"",taxa_entrega:fee,endereco:end,referencia:ref,forma_pagamento:pag,valor_pago:valorPago,troco,total:tot,observacoes:obs});
 if(r.error)return alert("Erro ao enviar pedido: "+r.error.message);
 saveProfile();cart=[];renderCart();closeCheckout();alert("Pedido enviado com sucesso!");
}

$("search").oninput=renderProducts;
$("bairro").onchange=updateSummary;
$("pagamento").onchange=()=>{const d=$("pagamento").value==="Dinheiro";$("paymentMoney").classList.toggle("hidden",!d);updateSummary()};
$("valorPago").oninput=()=>updateTroco(total());
$("openCart").onclick=openCart;$("closeCart").onclick=closeCart;$("overlay").onclick=closeCart;
$("clearCart").onclick=clearCart;$("addMore").onclick=closeCart;$("continueOrder").onclick=openCheckout;
$("closeCheckout").onclick=closeCheckout;$("changeAddress").onclick=changeSavedAddress;
document.querySelectorAll(".receive-option").forEach(b=>b.onclick=()=>chooseReceive(b.dataset.method));
$("modalClose").onclick=closeModal;$("send").onclick=sendOrder;
init();

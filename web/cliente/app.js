const SUPABASE_URL="https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY="sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let products=[],cats=[],cart=[],cat="todos",bairros=[];
const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const uid=()=>crypto.randomUUID();

async function categoryConfig(id){
  const r=await db.from("configuracoes").select("valor").eq("chave","categoria_config").maybeSingle();
  let all={};try{all=JSON.parse(r.data?.valor||"{}")}catch{}
  return all[String(id)]||{ingredientes:true,observacao:true};
}
async function loadBairros(){
  const r=await db.from("bairros").select("id,nome,taxa_entrega,ativo").eq("ativo",true).order("nome");
  bairros=r.data||[];
  $("bairro").innerHTML='<option value="">Selecione o bairro *</option>'+
    bairros.map(b=>`<option value="${esc(b.id)}">${esc(b.nome)} — ${money(b.taxa_entrega)}</option>`).join("");
}
async function init(){
  const [c,p]=await Promise.all([
    db.from("categorias").select("*").eq("ativo",true).order("ordem"),
    db.from("produtos").select("*,categorias(nome,emoji)").eq("ativo",true).order("ordem")
  ]);
  cats=c.data||[];products=p.data||[];
  renderCats();renderProducts();renderCart();await loadBairros();
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
  if(catName==="açaí"||catName==="acai"||catName.includes("açaí")||catName.includes("acai")){
    await openAcaiConfigurator(p);return;
  }
  const cfg=await categoryConfig(p.categoria_id);
  let addons="";
  if(cfg.ingredientes){
    const rel=await db.from("produto_ingredientes").select("ingrediente_id").eq("produto_id",id);
    const allowed=new Set((rel.data||[]).map(x=>String(x.ingrediente_id)));
    const ing=await db.from("ingredientes").select("*").eq("ativo",true).order("nome");
    const list=(ing.data||[]).filter(x=>allowed.has(String(x.id)));
    addons=list.length?`<label>Ingredientes adicionais</label><div class="checks">${list.map(i=>`<label class="check"><input type="checkbox" value="${i.id}" data-name="${esc(i.nome)}" data-price="${i.preco}"> ${esc(i.nome)} + ${money(i.preco)}</label>`).join("")}</div>`:"";
  }
  $("modalContent").innerHTML=`<h2>${esc(p.nome)}</h2><div class="form">
    <label>Quantidade<input id="qty" type="number" min="1" value="1"></label>
    ${addons}
    ${cfg.observacao?`<label>Observação<textarea id="itemObs" placeholder="Ex.: sem cebola..."></textarea></label>`:""}
    <div class="actions"><button onclick="closeModal()">Voltar</button><button class="primary" onclick="addConfigured('${p.id}',${cfg.ingredientes},${cfg.observacao})">Adicionar</button></div>
  </div>`;
  $("modal").classList.remove("hidden");
}
function closeModal(){$("modal").classList.add("hidden")}
async function addConfigured(id,hasIng,hasObs){
  const p=products.find(x=>String(x.id)===String(id)),q=Math.max(1,Number($("qty").value||1));
  const adds=hasIng?[...document.querySelectorAll("#modalContent input[type=checkbox]:checked")].map(x=>({nome:x.dataset.name,preco:Number(x.dataset.price||0)})):[];
  const obs=hasObs?($("itemObs")?.value.trim()||""):"";
  const price=Number(p.preco)+adds.reduce((s,x)=>s+x.preco,0);
  cart.push({key:uid(),id:p.id,nome:p.nome,preco:price,quantidade:q,adicionais:adds,obs,coberturas:[]});
  closeModal();renderCart();
}
const ACAI_TAMANHOS=["200 ml","300 ml","500 ml","1 litro"];
async function loadAcaiCoberturas(){
  const r=await db.from("configuracoes").select("valor").eq("chave","acai_coberturas").maybeSingle();
  try{return JSON.parse(r.data?.valor||"[]")}catch{return[]}
}
async function openAcaiConfigurator(p){
  const covers=(await loadAcaiCoberturas()).filter(x=>x&&x.ativo!==false);
  window._acaiProduct=p;
  $("modalContent").innerHTML=`<h2>🍧 Monte seu Açaí</h2><div class="form">
    <label>Tamanho</label><div class="acai-sizes">${ACAI_TAMANHOS.map(t=>`<label class="acai-size"><input type="radio" name="acaiSize" value="${t}"><span>${t}</span></label>`).join("")}</div>
    <label>Escolha até 3 coberturas</label><div class="acai-coverages">${covers.length?covers.map(c=>`<label class="acai-cover"><input type="checkbox" value="${esc(c.nome)}" onchange="acaiLimit(this)"> ${esc(c.nome)}</label>`).join(""):"<small>Nenhuma cobertura cadastrada.</small>"}</div>
    <small id="acaiCount">0/3 coberturas</small>
    <div class="actions"><button onclick="closeModal()">Voltar</button><button class="primary" onclick="addAcai()">Adicionar</button></div></div>`;
  $("modal").classList.remove("hidden");
}
window.acaiLimit=el=>{
  const all=[...document.querySelectorAll(".acai-coverages input")];
  if(all.filter(x=>x.checked).length>3){el.checked=false;alert("Máximo de 3 coberturas.");}
  $("acaiCount").textContent=`${all.filter(x=>x.checked).length}/3 coberturas`;
};
window.addAcai=()=>{
  const size=document.querySelector('input[name="acaiSize"]:checked');if(!size)return alert("Escolha o tamanho.");
  const covers=[...document.querySelectorAll(".acai-coverages input:checked")].map(x=>x.value);
  const p=window._acaiProduct;
  cart.push({key:uid(),id:p.id,nome:`${p.nome} — ${size.value}`,preco:Number(p.preco||0),quantidade:1,adicionais:[],obs:"",coberturas:covers});
  closeModal();renderCart();
};
function renderCart(){
  $("cartCount").textContent=cart.reduce((s,x)=>s+x.quantidade,0);
  $("cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cartItem"><div class="cartLine"><span>${x.quantidade}x ${esc(x.nome)}</span><span>${money(x.preco*x.quantidade)}</span></div>${x.adicionais.length?`<small>+ ${x.adicionais.map(a=>esc(a.nome)).join(", ")}</small>`:""}${x.coberturas?.length?`<small>Coberturas: ${x.coberturas.map(esc).join(", ")}</small>`:""}${x.obs?`<small>${esc(x.obs)}</small>`:""}<div class="qty"><button onclick="changeQty('${x.key}',-1)">−</button><b>${x.quantidade}</b><button onclick="changeQty('${x.key}',1)">+</button><button class="remove" onclick="removeItem('${x.key}')">Excluir</button></div></div>`).join(""):'<div class="empty">Seu pedido está vazio.</div>';
  updateTotal();
}
function changeQty(k,d){const x=cart.find(x=>x.key===k);if(!x)return;x.quantidade+=d;if(x.quantidade<1)cart=cart.filter(y=>y.key!==k);renderCart()}
function removeItem(k){cart=cart.filter(x=>x.key!==k);renderCart()}
function selectedBairro(){return bairros.find(b=>String(b.id)===String($("bairro").value))}
function updateTotal(){
  const sub=cart.reduce((s,x)=>s+x.preco*x.quantidade,0),fee=Number(selectedBairro()?.taxa_entrega||0);
  $("subtotal").textContent=money(sub);$("deliveryFee").textContent=money(fee);$("total").textContent=money(sub+fee);
  if($("pagamento").value==="Dinheiro")updateTroco(sub+fee);
}
function updateTroco(total){
  const v=Number($("valorPago").value||0),t=v-total;
  $("trocoPreview").textContent=t>=0?`Troco: ${money(t)}`:"Valor insuficiente.";
}
function validPhone(v){const n=String(v||"").replace(/\D/g,"");return /^(?:[1-9]{2})9\d{8}$/.test(n)}
async function sendOrder(){
  if(!cart.length)return alert("Adicione pelo menos um produto.");
  const nome=$("nome").value.trim(),phone=$("telefone").value.trim(),bairro=selectedBairro(),end=$("endereco").value.trim(),ref=$("referencia").value.trim(),pag=$("pagamento").value;
  if(!nome)return alert("Informe seu nome.");if(!validPhone(phone))return alert("WhatsApp inválido. Digite um celular com DDD.");
  if(!bairro)return alert("Selecione o bairro.");if(!end)return alert("Informe o endereço.");if(!ref)return alert("Informe a referência.");if(!pag)return alert("Selecione a forma de pagamento.");
  const sub=cart.reduce((s,x)=>s+x.preco*x.quantidade,0),fee=Number(bairro.taxa_entrega||0),total=sub+fee;
  const valorPago=pag==="Dinheiro"?Number($("valorPago").value||0):0;
  if(pag==="Dinheiro"&&valorPago<total)return alert(`O valor pago precisa ser pelo menos ${money(total)}.`);
  const troco=pag==="Dinheiro"?valorPago-total:0;
  const items=cart.map(x=>({nome:x.nome,quantidade:x.quantidade,preco:x.preco,adicionais:x.adicionais,coberturas:x.coberturas||[],obs:x.obs}));
  const observacoes=`${$("observacoes").value.trim()}\n[ML_ITENS]${encodeURIComponent(JSON.stringify(items))}[/ML_ITENS]\n[ML_BAIRRO]${encodeURIComponent(bairro.nome)}[/ML_BAIRRO]\n[ML_STATUS]preparo[/ML_STATUS]`;
  const r=await db.from("pedidos").insert({Cliente:nome,telefone:phone,bairro:bairro.nome,taxa_entrega:fee,endereco:end,referencia:ref,forma_pagamento:pag,valor_pago:valorPago,troco,total,observacoes});
  if(r.error)return alert("Erro ao enviar pedido: "+r.error.message);
  cart=[];renderCart();alert("Pedido enviado com sucesso!");
}
$("search").oninput=renderProducts;$("bairro").onchange=updateTotal;
$("pagamento").onchange=()=>{const d=$("pagamento").value==="Dinheiro";$("paymentMoney").classList.toggle("hidden",!d);updateTotal()};
$("valorPago").oninput=()=>updateTroco(Number($("total").textContent.replace(/[^\d,]/g,"").replace(".","").replace(",",".")||0));
$("openCart").onclick=()=>{$("cart").classList.add("open");$("overlay").classList.add("open")};
$("closeCart").onclick=()=>{$("cart").classList.remove("open");$("overlay").classList.remove("open")};
$("overlay").onclick=$("closeCart").onclick;
$("modalClose").onclick=closeModal;$("send").onclick=sendOrder;
init();

const db=window.db,$=id=>document.getElementById(id),money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
let cats=[],products=[],cart=[],cat="todos";
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}
function itemsPack(items,obs,fee,status="novo"){return `${obs||""}\n\n[ML_ITENS]${encodeURIComponent(JSON.stringify(items))}[/ML_ITENS]\n[ML_ENTREGA]${fee}[/ML_ENTREGA]\n[ML_STATUS]${status}[/ML_STATUS]`}
function statusOf(o){let m=[...String(o||"").matchAll(/\[ML_STATUS\](novo|preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/g)];return m.length?m.at(-1)[1]:"novo"}
async function load(){
 const [c,p]=await Promise.all([db.from("categorias").select("*").order("ordem"),db.from("produtos").select("*,categorias(nome,emoji)").eq("ativo",true).order("ordem")]);
 cats=c.data||[];products=p.data||[];renderCats();renderHighlights();renderProducts();renderCart();
}
function renderCats(){
 const visible=cats.filter(c=>c.ativo!==false);
 $("cats").innerHTML=visible.map(c=>`<button class="chip" data-cat="${c.id}">${esc(c.emoji||"📦")} ${esc(c.nome)}</button>`).join("");
 document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{
   const el=document.getElementById("cat-"+b.dataset.cat);
   if(el) el.scrollIntoView({behavior:"smooth",block:"start"});
 });
}
function productCard(p){
 return `<article class="product"><div class="photo">${p.imagem_url?`<img src="${esc(p.imagem_url)}" style="max-width:100%;max-height:100%;object-fit:cover" alt="">`:esc(p.emoji||"🍔")}</div><div class="pbody"><h3>${esc(p.nome)}</h3><p>${esc(p.descricao||"")}</p><div class="pfoot"><span class="price">${money(p.preco)}</span><button class="plus" data-add="${p.id}">+</button></div></div></article>`;
}
function bindAddButtons(){document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>add(b.dataset.add))}
function renderHighlights(){
 const featured=products.filter(p=>p.destaque===true || p.destaque==="true" || p.em_destaque===true).slice(0,8);
 const list=featured.length?featured:products.slice(0,4);
 $("highlights").innerHTML=list.map(productCard).join("")||"<div class=empty>Nenhum destaque disponível.</div>";
 bindAddButtons();
}
function renderProducts(){
 const q=$("search")?.value.toLowerCase().trim()||"";
 const all=products.filter(p=>!q||String(p.nome).toLowerCase().includes(q));
 const popular=all.slice(0,6);
 $("products").innerHTML=popular.map(productCard).join("")||"<div class=empty>Nenhum produto encontrado.</div>";
 const sections=cats.filter(c=>c.ativo!==false).map(c=>{
   const list=all.filter(p=>String(p.categoria_id)===String(c.id));
   if(!list.length)return "";
   return `<section class="category-block" id="cat-${c.id}" data-category="${c.id}"><div class="category-heading"><span>${esc(c.emoji||"📦")}</span><h3>${esc(c.nome)}</h3></div><div class="products">${list.map(productCard).join("")}</div></section>`;
 }).join("");
 $("categorySections").innerHTML=sections;
 bindAddButtons();
}
function add(id){let p=products.find(x=>String(x.id)===String(id));if(!p)return;let r=cart.find(x=>x.id===id);r?r.qty++:cart.push({id:p.id,name:p.nome,price:Number(p.preco),qty:1});renderCart();toast("Adicionado ao pedido")}
function change(id,d){let r=cart.find(x=>x.id===id);if(!r)return;r.qty+=d;if(r.qty<1)cart=cart.filter(x=>x.id!==id);renderCart()}
function renderCart(){let n=cart.reduce((a,x)=>a+x.qty,0),sub=cart.reduce((a,x)=>a+x.price*x.qty,0),fee=Number(window.DELIVERY_FEE||0);const badge=$("cartBadge"); if(badge) badge.textContent=n;
const bag=$("floatingBag"),bagCount=$("floatingBagCount");
if(bagCount) bagCount.textContent=n;
if(bag) bag.classList.toggle("show",n>0);
$("empty").style.display=cart.length?"none":"block";$("cartItems").innerHTML=cart.map(x=>`<div class=cart-row><div><b>${x.name}</b><br><small>${money(x.price)} cada</small></div><div class=qty><button data-q="${x.id}" data-d="-1">−</button><b>${x.qty}</b><button data-q="${x.id}" data-d="1">+</button></div><b>${money(x.price*x.qty)}</b></div>`).join("");$("subtotal").textContent=money(sub);$("delivery").textContent=money(fee);$("total").textContent=money(sub+fee);document.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>change(b.dataset.q,Number(b.dataset.d)))}
if($("search")) $("search").oninput=renderProducts;
$("send").onclick=async()=>{
 if(!cart.length)return toast("Adicione produtos ao pedido");
 let name=$("name").value.trim(),phone=$("phone").value.trim(),address=$("address").value.trim();
 if(!name||!phone||!address)return toast("Preencha nome, telefone e endereço");
 let sub=cart.reduce((a,x)=>a+x.price*x.qty,0),fee=Number(window.DELIVERY_FEE||0),total=sub+fee;
 let payload={Cliente:name,telefone:phone,endereco:address,referencia:$("reference").value.trim(),total,observacoes:itemsPack(cart.map(x=>({nome:x.name,quantidade:x.qty,preco:x.price,adicionais:[],obs:""})),$("notes").value.trim(),fee)};
 let r=await db.from("pedidos").insert(payload).select("id,created_at").single();
 if(r.error)return toast("Erro ao enviar: "+r.error.message);
 await db.from("clientes").upsert({nome:name,telefone:phone,endereco:address,referencia:$("reference").value.trim()},{onConflict:"telefone"});
 let num=String(r.data.id).slice(-5);toast("Pedido #"+num+" enviado!");
 cart=[];renderCart();location.hash="acompanhar";$("track").value=num;
 ["name","phone","address","reference","notes","change"].forEach(id=>$(id).value="");
};
$("trackBtn").onclick=async()=>{
 let n=$("track").value.trim();if(!n)return;
 const r=await db.from("pedidos").select("*").order("created_at",{ascending:false}).limit(200);let o=(r.data||[]).find(x=>String(x.id).slice(-5)===n);
 if(!o)return $("trackResult").innerHTML="<div class=track-card>Pedido não encontrado.</div>";
 let s=statusOf(o.observacoes),idx={novo:0,preparo:1,entrega:2,entregue:3}[s]??0,nm={novo:"Pedido recebido",preparo:"Em preparo",entrega:"Saiu para entrega",entregue:"Pedido entregue"};
 $("trackResult").innerHTML=`<div class=track-card><b>Pedido #${n}</b><p>${nm[s]||s}</p><div class=steps>${["Recebido","Em preparo","Saiu para entrega","Entregue"].map((x,i)=>`<div class="step ${i<=idx?"done":""}">${i<=idx?"✓ ":""}${x}</div>`).join("")}</div></div>`;
};
load();


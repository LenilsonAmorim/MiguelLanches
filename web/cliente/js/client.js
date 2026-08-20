const db=window.db,$=id=>document.getElementById(id),money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
let cats=[],products=[],cart=[],cat="todos";
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}
function itemsPack(items,obs,fee,status="novo"){return `${obs||""}\n\n[ML_ITENS]${encodeURIComponent(JSON.stringify(items))}[/ML_ITENS]\n[ML_ENTREGA]${fee}[/ML_ENTREGA]\n[ML_STATUS]${status}[/ML_STATUS]`}
function statusOf(o){let m=[...String(o||"").matchAll(/\[ML_STATUS\](novo|preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/g)];return m.length?m.at(-1)[1]:"novo"}
async function load(){
 const [c,p]=await Promise.all([db.from("categorias").select("*").order("ordem"),db.from("produtos").select("*,categorias(nome,emoji)").eq("ativo",true).order("ordem")]);
 cats=c.data||[];products=p.data||[];renderCats();renderProducts();renderCart();
}
function renderCats(){$("cats").innerHTML=`<button class="chip ${cat==="todos"?"active":""}" data-cat="todos">🍽️ Todos</button>`+cats.filter(c=>c.ativo!==false).map(c=>`<button class="chip ${cat===c.id?"active":""}" data-cat="${c.id}">${esc(c.emoji||"📦")} ${esc(c.nome)}</button>`).join("");document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{cat=b.dataset.cat;renderCats();renderProducts()})}
function renderProducts(){let q=$("search").value.toLowerCase().trim(),list=products.filter(p=>(cat==="todos"||String(p.categoria_id)===String(cat))&&(!q||String(p.nome).toLowerCase().includes(q)));$("products").innerHTML=list.map(p=>`<article class=product><div class=photo>${p.imagem_url?`<img src="${esc(p.imagem_url)}" style="max-width:100%;max-height:100%;object-fit:cover" alt="">`:esc(p.emoji||"🍔")}</div><div class=pbody><h3>${esc(p.nome)}</h3><p>${esc(p.descricao||"")}</p><div class=pfoot><span class=price>${money(p.preco)}</span><button class=plus data-add="${p.id}">+</button></div></div></article>`).join("")||"<div class=empty>Nenhum produto encontrado.</div>";document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>add(b.dataset.add))}
function add(id){let p=products.find(x=>String(x.id)===String(id));if(!p)return;let r=cart.find(x=>x.id===id);r?r.qty++:cart.push({id:p.id,name:p.nome,price:Number(p.preco),qty:1});renderCart();toast("Adicionado ao pedido")}
function change(id,d){let r=cart.find(x=>x.id===id);if(!r)return;r.qty+=d;if(r.qty<1)cart=cart.filter(x=>x.id!==id);renderCart()}
function renderCart(){let n=cart.reduce((a,x)=>a+x.qty,0),sub=cart.reduce((a,x)=>a+x.price*x.qty,0),fee=Number(window.DELIVERY_FEE||0);$("cartBadge").textContent=n;$("empty").style.display=cart.length?"none":"block";$("cartItems").innerHTML=cart.map(x=>`<div class=cart-row><div><b>${x.name}</b><br><small>${money(x.price)} cada</small></div><div class=qty><button data-q="${x.id}" data-d="-1">−</button><b>${x.qty}</b><button data-q="${x.id}" data-d="1">+</button></div><b>${money(x.price*x.qty)}</b></div>`).join("");$("subtotal").textContent=money(sub);$("delivery").textContent=money(fee);$("total").textContent=money(sub+fee);document.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>change(b.dataset.q,Number(b.dataset.d)))}
$("search").oninput=renderProducts;
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

/* Sacola flutuante mobile: aparece quando o primeiro produto é adicionado. */
(function(){
  const bag=document.getElementById('floatingBag');
  const count=document.getElementById('floatingBagCount');
  if(!bag) return;
  const refresh=()=>{
    let total=0;
    try{
      if(Array.isArray(window.cart)) total=window.cart.reduce((s,i)=>s+(Number(i.quantity||i.qty||1)),0);
      else if(window.cart && typeof window.cart==='object') total=Object.values(window.cart).reduce((s,i)=>s+(Number(i.quantity||i.qty||1)),0);
    }catch(e){}
    if(total>0){ count.textContent=total; bag.classList.add('show'); }
    else { count.textContent='0'; bag.classList.remove('show'); }
  };
  document.addEventListener('click',()=>setTimeout(refresh,120));
  window.addEventListener('storage',refresh);
  setTimeout(refresh,500);
})();

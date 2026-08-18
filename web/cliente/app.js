const SUPABASE_URL="https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY="sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

/* === AÇAÍ: tamanhos + até 3 coberturas === */
const ACAI_TAMANHOS=[
 {nome:"200 ml",valor:"200"},
 {nome:"300 ml",valor:"300"},
 {nome:"500 ml",valor:"500"},
 {nome:"1 litro",valor:"1000"}
];
async function loadAcaiCoberturas(){
 const r=await db.from("configuracoes").select("valor").eq("chave","acai_coberturas").maybeSingle();
 try{return JSON.parse(r.data?.valor||"[]")}catch{return[]}
}
async function openAcaiConfigurator(product){
 const covers=(await loadAcaiCoberturas()).filter(x=>x&&x.ativo!==false);
 window._acaiProduct=product;
 $("modalContent").innerHTML=`<h2>🍧 Monte seu Açaí</h2><div class="form">
 <label>Tamanho</label><div class="acai-sizes">${ACAI_TAMANHOS.map(t=>`<label class="acai-size"><input type="radio" name="acaiSize" value="${t.valor}"><span>${t.nome}</span></label>`).join("")}</div>
 <label>Escolha até 3 coberturas</label><div class="acai-coverages">${covers.length?covers.map(c=>`<label class="acai-cover"><input type="checkbox" value="${esc(c.nome)}" onchange="acaiLimit(this)"> ${esc(c.nome)}</label>`).join(""):"<small>Nenhuma cobertura cadastrada.</small>"}</div>
 <small id="acaiCount">0/3 coberturas selecionadas</small>
 <div class="actions"><button onclick="closeModal()">Voltar</button><button class="primary" onclick="addAcai()">Adicionar ao pedido</button></div></div>`;
 $("modal").classList.remove("hidden");
}
window.acaiLimit=function(el){
 const all=[...document.querySelectorAll(".acai-coverages input")],selected=all.filter(x=>x.checked);
 if(selected.length>3){el.checked=false;alert("Você pode escolher no máximo 3 coberturas.");}
 $("acaiCount").textContent=`${all.filter(x=>x.checked).length}/3 coberturas selecionadas`;
};
window.addAcai=function(){
 const size=document.querySelector('input[name="acaiSize"]:checked');
 if(!size)return alert("Escolha o tamanho do açaí.");
 const covers=[...document.querySelectorAll(".acai-coverages input:checked")].map(x=>x.value);
 if(covers.length>3)return alert("Escolha no máximo 3 coberturas.");
 const p=window._acaiProduct;
 cart.push({key:uid(),id:p.id,nome:`${p.nome} — ${size.parentElement.querySelector("span").textContent}`,preco:Number(p.preco||0),quantidade:1,adicionais:[],coberturas:covers,obs:""});
 closeModal();renderCart();
};
function renderAcaiCard(product){
 return `<article class="card"><div class="photo">${product.imagem_url?`<img src="${esc(product.imagem_url)}" alt="${esc(product.nome)}">`:"🍧"}</div><div class="info"><h3>${esc(product.nome)}</h3><div class="bottom"><span class="price">Escolha o tamanho</span><button class="plus" onclick="openAcaiConfigurator(${JSON.stringify(product).replaceAll('"','&quot;')})">+</button></div></div></article>`;
}

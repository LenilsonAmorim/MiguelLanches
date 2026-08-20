/* MIGUEL LANCHES — CLIENTE: ESGOTADO
   Produto inteiro e sabor/ingrediente individual podem estar esgotados.
*/
(() => {
"use strict";
const C=window.ML_CONFIG||{};
const D=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_KEY);
const escC=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

async function getOpts(pid){
 const [c,o]=await Promise.all([
  D.from("configuracao_opcoes").select("*").eq("produto_id",pid).maybeSingle(),
  D.from("opcoes_produto").select("*").eq("produto_id",pid).order("ordem")
 ]);
 return {cfg:c.data||null,opts:o.data||[],err:c.error||o.error};
}

function infer(p){
 const c=norm(p?.categorias?.nome);
 if(c.includes("pizza")||c.includes("pastel"))return "sabor_preco";
 if(c.includes("suco")||c.includes("milk")||c.includes("creme")||c.includes("acai"))return "sabor";
 return "adicional_preco";
}

function patchProductsQuery(){
 // Override loadProdutos only if the existing app exposes it; otherwise
 // the app.js query must be changed from .eq("ativo",true) to no ativo filter.
}

window.mlOpenOptions=async function(pid){
 const p=products.find(x=>String(x.id)===String(pid));if(!p)return;
 if(p.ativo===false){toast?.("Produto esgotado.");return;}
 const r=await getOpts(pid);
 if(r.err){toast?.("Não foi possível carregar as opções.");return;}
 const cfg=r.cfg||{tipo:infer(p),limite:1};
 const active=r.opts.filter(o=>o.ativo!==false);
 if(cfg.tipo==="nenhuma"||!active.length){
   if(typeof window.__mlOriginalOpenProduct==="function")return window.__mlOriginalOpenProduct(pid);
 }
 const limit=Math.max(1,Number(cfg.limite||1));
 const priceMode=cfg.tipo==="sabor_preco"||cfg.tipo==="adicional_preco";
 const title=cfg.tipo==="adicional_preco"?"Escolha os adicionais":(cfg.tipo==="sabor_preco"?"Escolha os sabores":"Escolha o sabor");
 const options=active.map(o=>`
   <button type="button" class="ml-client-option" data-name="${escC(o.nome)}" data-price="${Number(o.preco_adicional||0)}">
    <span>${escC(o.nome)}</span>${priceMode&&Number(o.preco_adicional||0)>0?`<strong>+ ${money(o.preco_adicional)}</strong>`:""}
   </button>`).join("");
 $("productBody").innerHTML=`
  <div class="product-main">
   <div class="product-hero">${p.imagem_url?`<img src="${escC(p.imagem_url)}" alt="${escC(p.nome)}">`:`<span>${escC(p.emoji||p.categorias?.emoji||"")}</span>`}
    <button class="hero-close" onclick="closeProduct()">×</button>
   </div>
   <div class="product-content">
    <h2>${escC(p.nome)}</h2><div class="modal-price">${money(p.preco)}</div>
    ${p.descricao?`<p class="modal-desc">${escC(p.descricao)}</p>`:""}
    <div class="ml-client-title">${title} <small>(até ${limit})</small></div>
    <div class="ml-client-options">${options}</div>
    <label class="field-label">Observação <small>(opcional)</small></label>
    <textarea id="productNote" class="field" placeholder="Alguma observação?"></textarea>
    <div class="qty-row"><b>Quantidade</b><div class="stepper"><button type="button" onclick="stepQty(-1)">−</button><span id="productQty">1</span><button type="button" onclick="stepQty(1)">+</button></div></div>
    <button id="mlClientAdd" type="button" class="main-btn">Adicionar à sacola · <span id="mlClientPrice">${money(p.preco)}</span></button>
   </div>
  </div>`;
 $("productModal").classList.remove("hidden");
 window.currentProduct=p;window.currentQty=1;
 const buttons=[...document.querySelectorAll(".ml-client-option")];
 buttons.forEach(b=>b.onclick=()=>{
   const selected=buttons.filter(x=>x.classList.contains("selected")).length;
   if(!b.classList.contains("selected")&&selected>=limit){toast?.(`Escolha no máximo ${limit}.`);return;}
   if(limit===1)buttons.forEach(x=>x.classList.remove("selected"));
   b.classList.toggle("selected");
   const extra=buttons.filter(x=>x.classList.contains("selected")).reduce((s,x)=>s+Number(x.dataset.price||0),0);
   $("mlClientPrice").textContent=money((Number(p.preco||0)+extra)*(window.currentQty||1));
 });
 $("mlClientAdd").onclick=()=>{
   const selected=buttons.filter(x=>x.classList.contains("selected"));
   if(cfg.tipo!=="nenhuma"&&selected.length<1){toast?.("Escolha pelo menos uma opção.");return;}
   const extra=selected.reduce((s,x)=>s+Number(x.dataset.price||0),0);
   cart.push({id:uid(),nome:selected.length?`${p.nome} — ${selected.map(x=>x.dataset.name).join(", ")}`:p.nome,preco:Number(p.preco||0)+extra,quantidade:window.currentQty||1,obs:$("productNote").value.trim(),config:{opcoes:selected.map(x=>x.dataset.name)}});
   renderCart();closeProduct();toast?.("Adicionado à sacola.");
 };
};

const style=document.createElement("style");style.textContent=`
.ml-client-title{font-weight:900;margin:16px 0 8px}.ml-client-title small{color:#777}
.ml-client-options{display:grid;gap:8px}.ml-client-option{display:flex;justify-content:space-between;align-items:center;border:1px solid #ddd;background:#fff;border-radius:12px;padding:12px;text-align:left;font-weight:800}
.ml-client-option.selected{background:#fff8d8;border-color:#e2b216;box-shadow:0 0 0 1px #e2b216 inset}.ml-client-option strong{color:#c71922}
.product-esgotado{opacity:.75}.esgotado-badge{position:absolute;top:12px;left:12px;background:#c62828;color:#fff;padding:7px 11px;border-radius:999px;font-size:12px;font-weight:900;z-index:3}.btn-esgotado{border:0!important;background:#eee!important;color:#c62828!important;font-weight:900!important;cursor:not-allowed!important}
`;document.head.appendChild(style);

setTimeout(()=>{
 if(typeof window.openProduct==="function"){
   window.__mlOriginalOpenProduct=window.openProduct;
   window.openProduct=window.mlOpenOptions;
 }
},0);
})();
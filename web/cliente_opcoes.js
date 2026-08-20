/* Cliente - opções padronizadas configuradas no Admin.
   Substitui as regras fixas de pizza/pastel/suco/milk/creme/açaí quando houver configuração no banco.
*/
(function(){
  const oldOpen=window.openProduct;
  const oldAdd=window.addCurrent;
  async function getCfg(pid){
    const [c,o]=await Promise.all([
      db.from("configuracao_opcoes").select("*").eq("produto_id",pid).maybeSingle(),
      db.from("opcoes_produto").select("*").eq("produto_id",pid).eq("ativo",true).order("ordem")
    ]);
    return {cfg:c.data, options:o.data||[], error:o.error};
  }
  function modeLabel(t){
    return ({sabor_preco:"Escolha os sabores",adicional_preco:"Escolha os adicionais",sabor:"Escolha o sabor",nenhuma:""})[t]||"Escolha as opções";
  }
  function renderOptions(cfg,options){
    if(!cfg || cfg.tipo==="nenhuma") return "";
    const limit=Math.max(1,Number(cfg.limite||1));
    const priceMode=cfg.tipo==="sabor_preco"||cfg.tipo==="adicional_preco";
    return `<div class="option-title">${modeLabel(cfg.tipo)} <small>(até ${limit})</small></div>
      <div class="options generic-options" data-limit="${limit}" data-type="${esc(cfg.tipo)}">
      ${options.map(o=>`<button type="button" class="option generic-option" data-name="${esc(o.nome)}" data-price="${Number(o.preco_adicional||0)}" onclick="pickGenericOption(this)"><span>${esc(o.nome)}</span>${priceMode?`<strong>${Number(o.preco_adicional||0)>0?"+ "+money(o.preco_adicional):"Sem adicional"}</strong>`:""}</button>`).join("")}
      </div>`;
  }
  window.pickGenericOption=function(el){
    const box=el.closest(".generic-options"),limit=Number(box.dataset.limit||1);
    if(!el.classList.contains("selected") && box.querySelectorAll(".selected").length>=limit)return;
    if(limit===1)box.querySelectorAll(".selected").forEach(x=>x.classList.remove("selected"));
    el.classList.toggle("selected");
  };
  window.openProduct=async function(pid){
    const p=products.find(x=>String(x.id)===String(pid));if(!p)return;
    const r=await getCfg(pid);
    if(r.error){ console.warn(r.error); return oldOpen(pid); }
    if(!r.cfg || r.cfg.tipo==="nenhuma") return oldOpen(pid);
    const img=productImage(p);
    const extra=renderOptions(r.cfg,r.options);
    $("productBody").innerHTML=`<div class="product-main"><div class="product-hero">${img?`<img src="${esc(img)}" alt="${esc(p.nome)}">`:`<span>${esc(p.emoji||p.categorias?.emoji||"")}</span>`}<button class="hero-close" onclick="closeProduct()">×</button></div><div class="product-content"><h2>${esc(p.nome)}</h2><div class="modal-price">${money(p.preco)}</div>${p.descricao?`<p class="modal-desc">${esc(p.descricao)}</p>`:""}${extra}<label class="field-label">Observação <small>(opcional)</small></label><textarea id="productNote" class="field" placeholder="Ex.: sem açúcar, bem gelado..."></textarea><div class="qty-row"><b>Quantidade</b><div class="stepper"><button onclick="stepQty(-1)">−</button><span id="productQty">1</span><button onclick="stepQty(1)">+</button></div></div><button class="main-btn" onclick="addCurrent('${p.id}')">Adicionar à sacola · <span id="addPrice">${money(p.preco)}</span></button></div></div>`;
    $("productModal").classList.remove("hidden");window.currentProduct=p;window.currentQty=1;window.currentGenericConfig=r.cfg;
  };
  window.addCurrent=async function(pid){
    const p=products.find(x=>String(x.id)===String(pid));if(!p)return;
    const cfg=window.currentGenericConfig;
    if(!cfg || cfg.tipo==="nenhuma") return oldAdd(pid);
    const selected=[...document.querySelectorAll(".generic-option.selected")];
    const limit=Math.max(1,Number(cfg.limite||1));
    if(selected.length<1)return alert(`Escolha pelo menos 1 opção.`);
    const qty=window.currentQty||1,note=$("productNote").value.trim();
    const add=selected.reduce((s,x)=>s+Number(x.dataset.price||0),0);
    const names=selected.map(x=>x.dataset.name);
    const item={id:uid(),nome:`${p.nome} — ${names.join(", ")}`,preco:Number(p.preco||0)+add,quantidade:qty,obs:note,config:{tipo:cfg.tipo,opcoes:names,adicionais:cfg.tipo==="adicional_preco"?add:0}};
    cart.push(item);renderCart();closeProduct();closeCart();
  };
})();

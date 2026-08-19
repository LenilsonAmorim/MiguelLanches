/* Miguel Lanches — correção do produto no ADMIN
   Usa o estado real do admin: state.products/state.ingredients.
   Mantém adicionais, observação, quantidade e imagem.
*/
(function(){
  const escA=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const cfg=async key=>{
    const r=await db.from("configuracoes").select("valor").eq("chave",key).maybeSingle();
    if(r.error)return{};
    try{return JSON.parse(r.data?.valor||"{}")||{}}catch{return{}}
  };

  window.openProduct=async function(id){
    const p=state.products.find(x=>String(x.id)===String(id));
    if(!p)return;

    const [rel,pcfg]=await Promise.all([
      db.from("produto_ingredientes").select("ingrediente_id").eq("produto_id",id),
      cfg("produto_config")
    ]);
    const allowed=new Set((rel.data||[]).map(x=>String(x.ingrediente_id)));
    const list=state.ingredients.filter(i=>allowed.has(String(i.id)));
    const desc=pcfg[p.id]||{descricao:"",mostrarDescricao:false};

    const image=p.imagem_url
      ? `<img src="${escA(p.imagem_url)}" alt="${escA(p.nome)}"
          style="width:100%;height:230px;object-fit:cover;border-radius:16px;margin-bottom:14px;display:block"
          onerror="this.style.display='none'">`
      :"";

    const addons=list.length?`
      <label>Ingredientes adicionais</label>
      <div class="checkboxes">
        ${list.map(i=>`<label class="check">
          <input type="checkbox" value="${escA(i.id)}"
            data-name="${escA(i.nome)}" data-price="${Number(i.preco||0)}">
          ${escA(i.nome)} + ${money(i.preco)}
        </label>`).join("")}
      </div>`:`<small>Este produto não possui adicionais cadastrados.</small>`;

    const description=desc.mostrarDescricao&&desc.descricao
      ?`<div style="padding:10px 0 16px;line-height:1.45"><b>Descrição</b><div>${escA(desc.descricao)}</div></div>`:"";

    $("modalContent").innerHTML=`
      ${image}
      <h2>${escA(p.nome)}</h2>
      ${description}
      <p class="muted">Escolha os adicionais e a quantidade.</p>
      <div class="form">
        <label>Quantidade</label>
        <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin:6px 0 18px">
          <button type="button" id="adminQtyMinus" style="width:46px;height:46px;font-size:25px;font-weight:800">−</button>
          <b id="adminQtyValue" style="font-size:20px">1</b>
          <button type="button" id="adminQtyPlus" style="width:46px;height:46px;font-size:25px;font-weight:800">+</button>
        </div>
        <input id="mQty" type="hidden" value="1">
        ${addons}
        <label>Observação<textarea id="mObs" placeholder="Ex.: sem cebola..."></textarea></label>
        <div class="form-actions">
          <button class="mini" onclick="closeModal()">Voltar</button>
          <button class="primary" onclick="addConfigured('${escA(p.id)}')">Adicionar ao pedido</button>
        </div>
      </div>`;

    $("adminQtyMinus").onclick=()=>{
      const n=Math.max(1,Number($("mQty").value||1)-1);
      $("mQty").value=n;$("adminQtyValue").textContent=n;
    };
    $("adminQtyPlus").onclick=()=>{
      const n=Number($("mQty").value||1)+1;
      $("mQty").value=n;$("adminQtyValue").textContent=n;
    };
    $("modal").classList.remove("hidden");
  };
})();
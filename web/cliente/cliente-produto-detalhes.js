/* Miguel Lanches - detalhes do produto no cliente */
(function(){
  const CFG='produto_config', CAT='categoria_config';
  const escD=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  async function getCfg(key){const r=await db.from('configuracoes').select('valor').eq('chave',key).maybeSingle();if(r.error)return{};try{return JSON.parse(r.data?.valor||'{}')||{}}catch{return{}}}
  window.openProduct=async function(id){
    const p=state.products.find(x=>String(x.id)===String(id));if(!p)return;
    const [rel,pcfg,ccfg]=await Promise.all([
      db.from('produto_ingredientes').select('ingrediente_id').eq('produto_id',id),
      getCfg(CFG),getCfg(CAT)
    ]);
    const allowed=new Set((rel.data||[]).map(x=>String(x.ingrediente_id)));
    const cat=ccfg[p.categoria_id]||{ingredientes:true,observacao:true};
    const cfg=pcfg[p.id]||{descricao:'',mostrarDescricao:false};
    const img=p.imagem_url?`<img src="${escD(p.imagem_url)}" alt="${escD(p.nome)}" style="width:100%;max-height:250px;object-fit:cover;border-radius:16px;margin-bottom:16px">`:'';
    const desc=cfg.mostrarDescricao&&cfg.descricao?`<div style="font-size:16px;line-height:1.5;color:#555;margin:0 0 18px"><strong>Descrição</strong><div>${escD(cfg.descricao)}</div></div>`:'';
    const adds=cat.ingredientes!==false&&state.ingredients.length?`<label>Ingredientes adicionais</label><div class="checkboxes">${state.ingredients.filter(i=>allowed.has(String(i.id))).map(i=>`<label class="check"><input type="checkbox" value="${i.id}" data-name="${escD(i.nome)}" data-price="${i.preco}"> ${escD(i.nome)} + ${money(i.preco)}</label>`).join('')||'<small>Este produto não possui adicionais cadastrados.</small>'}</div>`:'';
    const obs=cat.observacao!==false?`<label>Observação<textarea id="mObs" placeholder="Ex.: sem cebola..."></textarea></label>`:'';
    $('modalContent').innerHTML=`${img}<h2>${escD(p.nome)}</h2>${desc}<p class="muted">Escolha os adicionais e a quantidade.</p><div class="form"><label>Quantidade<input id="mQty" type="number" min="1" value="1"></label>${adds}${obs}<div class="form-actions"><button class="mini" onclick="closeModal()">Voltar</button><button class="primary" onclick="addConfigured('${p.id}')">Adicionar ao pedido</button></div></div>`;
    $('modal').classList.remove('hidden');
  };
})();
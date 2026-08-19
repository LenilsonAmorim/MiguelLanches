/* Miguel Lanches - editor de produtos com imagem, descrição e prévia */
(function(){
  const CFG='produto_config';
  const escP=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  async function cfgAll(){const r=await db.from('configuracoes').select('valor').eq('chave',CFG).maybeSingle();if(r.error)return{};try{return JSON.parse(r.data?.valor||'{}')||{}}catch{return{}}}
  async function saveCfg(v){const r=await db.from('configuracoes').upsert({chave:CFG,valor:JSON.stringify(v),updated_at:new Date().toISOString()},{onConflict:'chave'});if(r.error)throw r.error}
  function compressFile(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onerror=reject;fr.onload=()=>{const im=new Image();im.onerror=reject;im.onload=()=>{const max=700,s=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));c.getContext('2d').drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.78))};im.src=fr.result};fr.readAsDataURL(file)})}
  function form(row={}){
    cfgAll().then(cfg=>{
      const x=cfg[row.id]||{descricao:'',mostrarDescricao:true};
      $('modalContent').innerHTML=`<h2>${row.id?'Editar':'Adicionar'} produto</h2><div class="form">
      <label>Nome<input id="pfNome" value="${escP(row.nome||'')}"></label>
      <label>Categoria<select id="pfCat">${state.cats.map(c=>`<option value="${c.id}" ${String(c.id)===String(row.categoria_id)?'selected':''}>${escP(c.nome)}</option>`).join('')}</select></label>
      <label>Preço<input id="pfPreco" type="number" step="0.01" value="${row.preco||0}"></label>
      <label>Imagem do produto<input id="pfFile" type="file" accept="image/*"><small>Escolha uma foto da galeria. Ela será reduzida/comprimida antes de salvar.</small></label>
      <label>URL da imagem (opcional)<input id="pfUrl" placeholder="https://..." value="${escP(row.imagem_url&&String(row.imagem_url).startsWith('data:')?'':row.imagem_url||'')}"></label>
      <div id="pfPreview" style="margin:8px 0"></div>
      <label>Emoji reserva<input id="pfEmoji" value="${escP(row.emoji||'🍔')}"></label>
      <label>Ordem<input id="pfOrdem" type="number" value="${row.ordem||99}"></label>
      <label>Descrição do produto<textarea id="pfDesc" placeholder="Ex.: Hambúrguer artesanal, queijo cheddar e molho especial...">${escP(x.descricao||'')}</textarea></label>
      <label class="check"><input id="pfShowDesc" type="checkbox" ${x.mostrarDescricao!==false?'checked':''}> Mostrar descrição quando o cliente abrir o produto</label>
      <div class="form-actions"><button class="mini" onclick="closeModal()">Cancelar</button><button class="primary" id="pfSave">Salvar</button></div></div>`;
      let chosen='';
      const preview=src=>{const p=$('pfPreview');p.innerHTML=src?`<img src="${escP(src)}" style="width:190px;height:135px;object-fit:cover;border-radius:12px;display:block">`:''};
      if(row.imagem_url)preview(row.imagem_url);
      $('pfUrl').oninput=()=>{if(!$('pfFile').files[0])preview($('pfUrl').value.trim())};
      $('pfFile').onchange=async()=>{const f=$('pfFile').files[0];if(!f)return;try{chosen=await compressFile(f);preview(chosen)}catch(e){alert('Não foi possível ler a imagem.')}};
      $('pfSave').onclick=async()=>{
        const data={nome:$('pfNome').value.trim(),categoria_id:$('pfCat').value,preco:Number($('pfPreco').value||0),imagem_url:chosen||$('pfUrl').value.trim()||null,emoji:$('pfEmoji').value.trim()||'🍔',ordem:Number($('pfOrdem').value||99),ativo:true};
        if(!data.nome)return alert('Informe o nome do produto.');
        const r=row.id?await db.from('produtos').update(data).eq('id',row.id):await db.from('produtos').insert(data).select().single();
        if(r.error)return alert(r.error.message);
        const id=row.id||r.data?.id, all=await cfgAll();
        all[id]={descricao:$('pfDesc').value.trim(),mostrarDescricao:$('pfShowDesc').checked};
        try{await saveCfg(all)}catch(e){return alert('Produto salvo, mas a descrição não foi salva: '+e.message)}
        closeModal();await loadAll();
      };
      $('modal').classList.remove('hidden');
    });
  }
  const oldNew=window.adminNew,oldEdit=window.adminEdit;
  window.adminNew=function(t){if(t==='produtos')return form({});return oldNew(t)};
  window.adminEdit=function(t,id){if(t==='produtos')return form(state.products.find(p=>String(p.id)===String(id))||{});return oldEdit(t,id)};
})();
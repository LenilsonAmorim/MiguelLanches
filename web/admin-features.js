/* Miguel Lanches - recursos extras do Admin
   - Imagem das categorias por URL
   - Ingredientes/observacao por categoria
   - Configuracao completa do Acaí: tamanhos + ate 3 coberturas
*/
(function(){
  const CFG_CAT='categoria_config';
  const CFG_ACAI='acai_config';
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const money2=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const esc2=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  async function getCfg(key, fallback){
    const r=await db.from('configuracoes').select('valor').eq('chave',key).maybeSingle();
    if(r.error) return fallback;
    try{return JSON.parse(r.data?.valor||'null')??fallback}catch{return fallback}
  }
  async function saveCfg(key,value){
    const r=await db.from('configuracoes').upsert({chave:key,valor:JSON.stringify(value),updated_at:new Date().toISOString()},{onConflict:'chave'});
    if(r.error) throw r.error;
  }

  function addAcaiTab(){
    const tabs=document.querySelector('.admin-tabs');
    if(!tabs || tabs.querySelector('[data-admin="acai"]')) return;
    const b=document.createElement('button');
    b.className='admin-tab'; b.dataset.admin='acai'; b.textContent='🍧 Açaí';
    tabs.appendChild(b);
    b.onclick=()=>{
      tabs.querySelectorAll('.admin-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');
      state.admin='acai'; renderAcai();
    };
  }

  async function renderCategorias(){
    const box=document.getElementById('adminContent'); if(!box)return;
    const cfg=await getCfg(CFG_CAT,{});
    box.innerHTML=`<div class="admin-top"><h2>⚙️ Categorias</h2><button class="primary" id="newCatX">+ Adicionar</button></div>
      <div class="panel"><p>Defina imagem, ingredientes adicionais e observação de cada categoria.</p>
      <div id="catConfigRows">${(state.cats||[]).map(c=>{
        const x=cfg[c.id]||{ingredientes:true,observacao:true};
        return `<div class="admin-row catx" data-id="${c.id}">
          <div class="grow"><h3>${esc2(c.emoji||'📦')} ${esc2(c.nome)}</h3>
          <small>${c.imagem_url?'Imagem configurada':'Sem imagem de categoria'}</small></div>
          <div class="row-actions"><button class="mini" data-edit-cat="${c.id}">Editar</button><button class="mini danger" data-del-cat="${c.id}">Desativar</button></div>
        </div>`}).join('')||'<div class="empty">Nenhuma categoria.</div>'}</div></div>`;
    box.querySelector('#newCatX').onclick=()=>catForm();
    box.querySelectorAll('[data-edit-cat]').forEach(b=>b.onclick=()=>catForm(state.cats.find(c=>String(c.id)===String(b.dataset.editCat))));
    box.querySelectorAll('[data-del-cat]').forEach(b=>b.onclick=()=>window.adminDelete('categorias',b.dataset.delCat));
  }

  function catForm(row={}){
    const cfgPromise=getCfg(CFG_CAT,{});
    cfgPromise.then(cfg=>{
      const x=cfg[row.id]||{ingredientes:true,observacao:true};
      $('modalContent').innerHTML=`<h2>${row.id?'Editar':'Adicionar'} categoria</h2><div class="form">
        <label>Nome<input id="cx1" value="${esc2(row.nome||'')}"></label>
        <label>Emoji (opcional)<input id="cx2" value="${esc2(row.emoji||'📦')}"></label>
        <label>Imagem da categoria (URL)<input id="cxImg" placeholder="https://.../imagem.jpg" value="${esc2(row.imagem_url||'')}"></label>
        <div id="cxPreview" style="margin:8px 0"></div>
        <label>Ordem<input id="cx3" type="number" value="${row.ordem||99}"></label>
        <label class="check"><input id="cxIng" type="checkbox" ${x.ingredientes!==false?'checked':''}> Permitir ingredientes adicionais</label>
        <label class="check"><input id="cxObs" type="checkbox" ${x.observacao!==false?'checked':''}> Permitir observação do item</label>
        <div class="form-actions"><button class="mini" onclick="closeModal()">Cancelar</button><button class="primary" id="saveCatX">Salvar</button></div></div>`;
      const preview=()=>{const u=$('cxImg').value.trim();$('cxPreview').innerHTML=u?`<img src="${esc2(u)}" alt="Prévia" style="width:72px;height:52px;object-fit:cover;border-radius:8px" onerror="this.style.display='none'">`:''};
      $('cxImg').oninput=preview;preview();
      $('saveCatX').onclick=async()=>{
        const data={nome:$('cx1').value.trim(),emoji:$('cx2').value.trim()||'📦',imagem_url:$('cxImg').value.trim()||null,ordem:Number($('cx3').value||99),ativo:true};
        if(!data.nome)return alert('Informe o nome da categoria.');
        const r=row.id?await db.from('categorias').update(data).eq('id',row.id):await db.from('categorias').insert(data).select().single();
        if(r.error)return alert(r.error.message);
        const id=row.id||r.data?.id; cfg[id]={ingredientes:$('cxIng').checked,observacao:$('cxObs').checked};
        try{await saveCfg(CFG_CAT,cfg)}catch(e){return alert(e.message)}
        closeModal();await loadAll();renderCategorias();
      };
      $('modal').classList.remove('hidden');
    });
  }

  async function renderAcai(){
    const box=$('adminContent');if(!box)return;
    const cfg=await getCfg(CFG_ACAI,{tamanhos:[{nome:'200 ml',preco:0},{nome:'300 ml',preco:0},{nome:'500 ml',preco:0},{nome:'1 litro',preco:0}],coberturas:[]});
    cfg.tamanhos=Array.isArray(cfg.tamanhos)?cfg.tamanhos:[];cfg.coberturas=Array.isArray(cfg.coberturas)?cfg.coberturas:[];
    box.innerHTML=`<div class="admin-top"><h2>🍧 Açaí</h2></div>
      <div class="panel"><h3>Tamanhos</h3><p>Cadastre o tamanho e o preço do Açaí.</p><div id="acaiSizes"></div><button class="primary" id="addSizeX">+ Adicionar tamanho</button></div>
      <div class="panel"><h3>Coberturas</h3><p>O cliente poderá escolher no máximo <b>3 coberturas</b>.</p><div id="acaiTops"></div><button class="primary" id="addTopX">+ Adicionar cobertura</button></div>
      <button class="primary big" id="saveAcaiX">Salvar configuração do Açaí</button>`;
    const render=()=>{
      $('acaiSizes').innerHTML=cfg.tamanhos.map((s,i)=>`<div class="admin-row"><div class="grow"><input data-sn="${i}" value="${esc2(s.nome)}" placeholder="Ex.: 200 ml"><input data-sp="${i}" type="number" step="0.01" value="${Number(s.preco||0)}" placeholder="Preço"></div><div class="row-actions"><button class="mini danger" data-rs="${i}">Excluir</button></div></div>`).join('')||'<div class="empty">Nenhum tamanho.</div>';
      $('acaiTops').innerHTML=cfg.coberturas.map((s,i)=>`<div class="admin-row"><div class="grow"><input data-tn="${i}" value="${esc2(s.nome)}" placeholder="Ex.: Morango"><input data-tp="${i}" type="number" step="0.01" value="${Number(s.preco||0)}" placeholder="Preço adicional"></div><div class="row-actions"><button class="mini danger" data-rt="${i}">Excluir</button></div></div>`).join('')||'<div class="empty">Nenhuma cobertura.</div>';
      $('acaiSizes').querySelectorAll('[data-rs]').forEach(b=>b.onclick=()=>{cfg.tamanhos.splice(Number(b.dataset.rs),1);render()});
      $('acaiTops').querySelectorAll('[data-rt]').forEach(b=>b.onclick=()=>{cfg.coberturas.splice(Number(b.dataset.rt),1);render()});
    };
    $('addSizeX').onclick=()=>{cfg.tamanhos.push({nome:'',preco:0});render()};
    $('addTopX').onclick=()=>{cfg.coberturas.push({nome:'',preco:0});render()};
    $('saveAcaiX').onclick=async()=>{
      cfg.tamanhos=[...$('acaiSizes').querySelectorAll('[data-sn]')].map((e,i)=>({nome:e.value.trim(),preco:Number($('acaiSizes').querySelector(`[data-sp="${i}"]`)?.value||0)})).filter(s=>s.nome);
      cfg.coberturas=[...$('acaiTops').querySelectorAll('[data-tn]')].map((e,i)=>({nome:e.value.trim(),preco:Number($('acaiTops').querySelector(`[data-tp="${i}"]`)?.value||0)})).filter(s=>s.nome);
      if(!cfg.tamanhos.length)return alert('Cadastre pelo menos um tamanho.');
      try{await saveCfg(CFG_ACAI,cfg);alert('Configuração do Açaí salva!')}catch(e){alert(e.message)}
    };
    render();
  }

  function patchCategoryAdmin(){
    const tabs=document.querySelector('.admin-tabs');if(!tabs)return;
    const catBtn=tabs.querySelector('[data-admin="categorias"]');
    if(catBtn){catBtn.onclick=()=>{tabs.querySelectorAll('.admin-tab').forEach(x=>x.classList.remove('active'));catBtn.classList.add('active');state.admin='categorias';renderCategorias()};}
    addAcaiTab();
  }
  function boot(){patchCategoryAdmin();setTimeout(patchCategoryAdmin,500);setTimeout(patchCategoryAdmin,1500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.renderCategoriasX=renderCategorias;window.renderAcai=renderAcai;
})();

/* Miguel Lanches — configuração de Pizza/Pastel + lista do Admin
   Carregado pelo index principal depois dos demais patches.
*/
(function(){
  const STYLE=`.admin-category-group{margin:22px 0}.admin-category-group h2{font-size:24px;margin:0 0 10px}
.admin-list-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:12px 14px;margin:8px 0;display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer}
.admin-list-card h3{margin:0 0 5px;font-size:18px}.admin-list-card span{display:block;color:#667085;font-size:14px}.admin-list-card strong{display:block;color:#b71924;margin-top:6px}
.admin-list-img{width:100px;height:72px;border-radius:10px;overflow:hidden;background:#f0f1f3;display:flex;align-items:center;justify-content:center;font-size:38px}.admin-list-img img{width:100%;height:100%;object-fit:cover}
.special-rule{background:#f5f6f8;border-radius:10px;padding:10px;color:#667085;margin:8px 0 12px}.special-flavors{display:grid;gap:2px}.special-flavor{display:flex!important;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #e5e7eb}.special-flavor input{width:22px!important;flex:0 0 22px}.special-thumb{width:55px;height:55px;background:#f0f1f3;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center}.special-thumb img{width:100%;height:100%;object-fit:cover}.special-flavor>div:last-child{display:flex;flex-direction:column;gap:3px}.special-flavor small{color:#667085}.special-flavor strong{color:#b71924}
`; const st=document.createElement('style'); st.id='ml-admin-especiais-style'; st.textContent=STYLE; document.head.appendChild(st);
  const CFG='produto_especial_config';
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  async function getCfg(){const r=await db.from('configuracoes').select('valor').eq('chave',CFG).maybeSingle();try{return JSON.parse(r.data?.valor||'{}')||{}}catch{return{}}}
  async function saveCfg(v){const r=await db.from('configuracoes').upsert({chave:CFG,valor:JSON.stringify(v),updated_at:new Date().toISOString()},{onConflict:'chave'});if(r.error)throw r.error}
  function typeOf(p){const n=norm(p?.nome),c=norm(p?.categorias?.nome);if(n.includes('pastel')||c.includes('pastel'))return'pastel';if(n.includes('pizza')||c.includes('pizza'))return'pizza';return null}
  function autoMax(p,t){return t==='pastel'?1:(norm(p.nome).includes('2 sabores')?2:1)}
  function addTab(){
    const tabs=document.querySelector('.admin-tabs');if(!tabs||tabs.querySelector('[data-admin="especiais"]'))return;
    const b=document.createElement('button');b.className='admin-tab';b.dataset.admin='especiais';b.textContent='🍕 Pizza/Pastel';tabs.appendChild(b);
    b.onclick=()=>{tabs.querySelectorAll('.admin-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.admin='especiais';renderSpecialAdmin()};
  }
  async function renderSpecialAdmin(){
    const box=$('adminContent');if(!box)return;const cfg=await getCfg();
    const special=(state.products||[]).filter(p=>typeOf(p));
    box.innerHTML=`<div class="admin-top"><h2>🍕 Configuração de Pizza e Pastel</h2></div>
      <div class="panel"><p>Configure os sabores que aparecem quando o cliente/funcionário abre o produto. Pizza de 1 sabor aceita 1; pizza de 2 sabores aceita 2 e cobra o maior valor escolhido. Pastel M/G aceita 1 sabor.</p>
      <label>Produto<select id="spProduct">${special.map(p=>`<option value="${p.id}">${esc(p.nome)} — ${esc(p.categorias?.nome||'')}</option>`).join('')||'<option>Nenhum produto de pizza/pastel encontrado</option>'}</select></label>
      <div id="spForm"></div></div>`;
    const sel=$('spProduct');if(!sel||!special.length)return;
    const draw=()=>{
      const p=special.find(x=>String(x.id)===String(sel.value)),t=typeOf(p),x=cfg[p.id]||{tipo:t,maxSabores:autoMax(p,t),sabores:[]};
      const sabores=Array.isArray(x.sabores)?x.sabores:[];
      $('spForm').innerHTML=`<label>Tipo<select id="spType"><option value="pizza" ${t==='pizza'?'selected':''}>Pizza</option><option value="pastel" ${t==='pastel'?'selected':''}>Pastel</option></select></label>
        <label>Quantidade máxima de sabores<input id="spMax" type="number" min="1" max="2" value="${Number(x.maxSabores||autoMax(p,t))}"></label>
        <h3>Sabores</h3><div id="spRows"></div><button class="primary" id="spAdd">+ Adicionar sabor</button><button class="primary big" id="spSave" style="margin-top:12px">Salvar configuração</button>`;
      const rows=$('spRows');
      const renderRows=()=>{rows.innerHTML=sabores.map((s,i)=>`<div class="admin-row sp-row"><div class="grow"><input data-sn="${i}" value="${esc(s.nome||'')}" placeholder="Nome do sabor"><textarea data-sd="${i}" placeholder="Descrição">${esc(s.descricao||'')}</textarea><input data-sprice="${i}" type="number" step="0.01" value="${Number(s.preco||0)}" placeholder="Preço final do sabor"><input data-simg="${i}" value="${esc(s.imagem_url||'')}" placeholder="URL da imagem (opcional)"></div><div class="row-actions"><button class="mini danger" data-rm="${i}">Excluir</button></div></div>`).join('')||'<div class="empty">Nenhum sabor cadastrado.</div>';rows.querySelectorAll('[data-rm]').forEach(btn=>btn.onclick=()=>{sabores.splice(Number(btn.dataset.rm),1);renderRows()})};
      $('spAdd').onclick=()=>{sabores.push({nome:'',descricao:'',preco:0,imagem_url:''});renderRows()};
      $('spSave').onclick=async()=>{const type=$('spType').value,max=Math.min(2,Math.max(1,Number($('spMax').value||1)));const out=[...rows.querySelectorAll('[data-sn]')].map((e,i)=>({nome:e.value.trim(),descricao:rows.querySelector(`[data-sd="${i}"]`)?.value.trim()||'',preco:Number(rows.querySelector(`[data-sprice="${i}"]`)?.value||0),imagem_url:rows.querySelector(`[data-simg="${i}"]`)?.value.trim()||''})).filter(s=>s.nome);if(type==='pastel'&&max!==1)return alert('Pastel permite apenas 1 sabor.');cfg[p.id]={tipo:type,maxSabores:max,sabores:out};try{await saveCfg(cfg);alert('Configuração salva!')}catch(e){alert(e.message)}};
      renderRows();
    };
    sel.onchange=draw;draw();
  }
  function patchAdminList(){
    if(typeof state==='undefined'||!$('productGrid'))return;
    const grid=$('productGrid'),q=norm($('search')?.value||'');
    let list=(state.products||[]).filter(p=>!q||norm(p.nome).includes(q));
    const cats=Array.isArray(state.cats)?state.cats.filter(c=>c.ativo!==false):[];
    const card=p=>`<article class="admin-list-card" onclick="openProduct('${p.id}')"><div><h3>${esc(p.nome)}</h3><span>${esc(p.categorias?.nome||'')}</span><strong>${money(p.preco)}</strong></div><div class="admin-list-img">${p.imagem_url?`<img src="${esc(p.imagem_url)}" alt="">`:esc(p.emoji||'🍔')}</div></article>`;
    if(state.cat==='todos'){
      const groups=[];cats.forEach(c=>{const arr=list.filter(p=>String(p.categoria_id)===String(c.id)).sort((a,b)=>Number(a.ordem??999999)-Number(b.ordem??999999));if(arr.length)groups.push(`<section class="admin-category-group"><h2>${esc(c.emoji||'📦')} ${esc(c.nome)}</h2>${arr.map(card).join('')}</section>`)});grid.innerHTML=groups.join('')||'<div class="empty">Nenhum produto encontrado.</div>';
    }else{list=list.filter(p=>String(p.categoria_id)===String(state.cat)).sort((a,b)=>Number(a.ordem??999999)-Number(b.ordem??999999));grid.innerHTML=list.map(card).join('')||'<div class="empty">Nenhum produto encontrado.</div>'}
  }
  function patchOpen(){
    if(typeof state==='undefined')return;
    const current=window.openProduct;
    if(current&&current.__specialPatch)return;
    const fn=async function(id){const p=state.products.find(x=>String(x.id)===String(id));if(!p)return;const t=typeOf(p);if(!t)return current(id);const cfg=await getCfg(),x=cfg[p.id]||{},max=Number(x.maxSabores||autoMax(p,t)),sabores=Array.isArray(x.sabores)?x.sabores:[];$(\"modalContent\").innerHTML=`<h2>${t==='pastel'?'🥟':'🍕'} ${esc(p.nome)}</h2><p class="muted">Escolha ${max===2?'2 sabores':'1 sabor'}.</p><div class="special-rule">${max===2?'O valor final será o maior preço entre os 2 sabores.':'Escolha 1 sabor obrigatório.'}</div><div class="special-flavors\">${sabores.map(s=>`<label class="special-flavor\"><input class="special-choice\" type="${max===1?'radio':'checkbox'}\" name="spPick\" data-name="${esc(s.nome)}\" data-price="${Number(s.preco||0)}\"><div class="special-thumb\">${s.imagem_url?`<img src="${esc(s.imagem_url)}" alt="">`:''}</div><div><b>${esc(s.nome)}</b>${s.descricao?`<small>${esc(s.descricao)}</small>`:''}<strong>${money(s.preco)}</strong></div></label>`).join('')||'<div class="empty">Nenhum sabor configurado.</div>'}</div><label>Observação<textarea id="spObs\"></textarea></label><label>Quantidade<input id="spQty" type="number" min="1" value="1\"></label><div class="actions"><button onclick="closeModal()">Voltar</button><button class="primary" id="spAddCart">Adicionar ao pedido</button></div>`;$(\"modal\").classList.remove('hidden');const choices=[...document.querySelectorAll('.special-choice')];choices.forEach(c=>c.onchange=()=>{if(max===2){const n=choices.filter(z=>z.checked).length;choices.forEach(z=>z.disabled=!z.checked&&n>=2)}});$(\"spAddCart\").onclick=()=>{const sel=choices.filter(c=>c.checked);if(sel.length!==max)return alert(`Selecione ${max} ${max===1?'sabor':'sabores'}.`);const vals=sel.map(c=>({nome:c.dataset.name,preco:Number(c.dataset.price||0)}));const price=t==='pizza'?Math.max(...vals.map(v=>v.preco),Number(p.preco||0)):Number(p.preco||0)+Number(vals[0]?.preco||0);state.cart.push({key:uid(),id:p.id,nome:t==='pizza'?`${p.nome} — ${vals.map(v=>v.nome).join(' + ')}`:`${p.nome} — ${vals[0].nome}`,preco:price,quantidade:Math.max(1,Number($(\"spQty\").value||1)),base:Number(p.preco||0),adicionais:vals,obs:$(\"spObs\")?.value.trim()||''});closeModal();renderCart()};};fn.__specialPatch=true;window.openProduct=fn;
  }
  function boot(){
    addTab();patchOpen();patchAdminList();
    const search=$('search');if(search){search.oninput=patchAdminList;search.addEventListener('input',patchAdminList)}
    const observer=new MutationObserver(()=>{addTab();patchOpen();patchAdminList()});observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>{addTab();patchOpen();patchAdminList()},1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.renderSpecialAdmin=renderSpecialAdmin;
})();
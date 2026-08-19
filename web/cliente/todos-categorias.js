/* Miguel Lanches — lista profissional + pizza/pastel
   Pizza 1 sabor: 1 seleção.
   Pizza 2 sabores: exatamente 2; preço final = maior preço escolhido.
   Pastel M/G: cada produto é um tamanho; exatamente 1 sabor.
   Configuração: configuracoes.produto_especial_config
*/
(function(){
  const STYLE=`/* Miguel Lanches — visual da lista profissional */
.products{display:block!important}
.categoria-bloco{margin:26px 0 34px}
.categoria-titulo{display:flex;align-items:center;gap:10px;margin:0 0 14px}
.categoria-titulo h2{margin:0;font-size:27px;font-weight:900}
.categoria-titulo span{font-size:29px}
.categoria-titulo img{width:34px;height:34px;object-fit:cover;border-radius:50%}
.ml-list-products{display:grid;gap:12px}
.ml-list-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;min-height:122px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:14px;box-shadow:0 4px 14px rgba(16,24,40,.06);cursor:pointer}
.ml-list-info{min-width:0;flex:1}
.ml-list-info h3{margin:0 0 8px;font-size:20px;line-height:1.2}
.ml-list-info p{margin:0 0 12px;color:#667085;font-size:16px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ml-list-info strong{display:block;color:#b71924;font-size:19px;margin-top:8px}
.ml-list-image{width:170px;height:108px;flex:0 0 170px;border-radius:12px;overflow:hidden;background:#f0f1f3;display:flex;align-items:center;justify-content:center;font-size:52px}
.ml-list-image img{width:100%;height:100%;object-fit:cover}
.special-rule{background:#f5f6f8;border-radius:10px;padding:11px 12px;color:#667085;margin-bottom:10px;font-size:14px}
.special-flavors{display:grid;gap:2px;margin-bottom:12px}
.special-flavor{display:flex!important;align-items:center;gap:10px;background:#fff;border-bottom:1px solid #e5e7eb;padding:12px 0;font-weight:400!important;cursor:pointer}
.special-flavor input{width:22px!important;flex:0 0 22px}
.special-thumb{width:58px;height:58px;border-radius:9px;overflow:hidden;background:#f0f1f3;display:flex;align-items:center;justify-content:center}
.special-thumb img{width:100%;height:100%;object-fit:cover}
.special-flavor>div:last-child{display:flex;flex-direction:column;gap:3px}
.special-flavor b{font-size:16px}.special-flavor small{color:#667085}.special-flavor strong{color:#b71924}
@media(max-width:600px){
  .categoria-titulo h2{font-size:24px}.ml-list-card{min-height:108px;padding:12px}.ml-list-image{width:132px;height:92px;flex-basis:132px}.ml-list-info h3{font-size:18px}.ml-list-info p{font-size:14px}.ml-list-info strong{font-size:17px}
}`; const st=document.createElement('style'); st.id='ml-especiais-style'; st.textContent=STYLE; document.head.appendChild(st);
  const CFG='produto_especial_config';
  const client=window.supabase.createClient('https://lifsxhyeqwppfvajvhpn.supabase.co','sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ');
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const box=()=>document.getElementById('products');

  async function getCfg(){
    const r=await client.from('configuracoes').select('valor').eq('chave',CFG).maybeSingle();
    try{return JSON.parse(r.data?.valor||'{}')||{}}catch{return{}}
  }
  function typeOf(p){
    const n=norm(p?.nome), c=norm(p?.categorias?.nome);
    if(n.includes('pastel')||c.includes('pastel'))return 'pastel';
    if(n.includes('pizza')||c.includes('pizza'))return 'pizza';
    return null;
  }
  function maxOf(p,type,cfg){
    const x=cfg?.[p.id];
    if(x?.maxSabores)return Number(x.maxSabores);
    if(type==='pastel')return 1;
    return norm(p.nome).includes('2 sabores')?2:1;
  }
  function card(p){
    return `<article class="ml-list-card" onclick="openProduct('${p.id}')">
      <div class="ml-list-info"><h3>${esc(p.nome)}</h3>
      ${p.descricao?`<p>${esc(p.descricao)}</p>`:''}
      <strong>${money(p.preco)}</strong></div>
      <div class="ml-list-image">${p.imagem_url?`<img src="${esc(p.imagem_url)}" alt="${esc(p.nome)}">`:esc(p.emoji||'🍔')}</div>
    </article>`;
  }
  async function renderTodos(){
    const b=box(); if(!b)return;
    const search=norm(document.getElementById('search')?.value||'');
    const [cr,pr]=await Promise.all([
      client.from('categorias').select('*').eq('ativo',true).order('ordem',{ascending:true}),
      client.from('produtos').select('*,categorias(nome,emoji)').eq('ativo',true).order('ordem',{ascending:true})
    ]);
    if(cr.error||pr.error)return;
    const categorias=cr.data||[], produtos=pr.data||[];
    b.classList.add('todos-agrupado');
    let html='';
    for(const c of categorias){
      const arr=produtos.filter(p=>String(p.categoria_id)===String(c.id)&&(!search||norm(p.nome).includes(search)));
      if(!arr.length)continue;
      html+=`<section class="categoria-bloco"><div class="categoria-titulo">
        ${c.imagem_url?`<img src="${esc(c.imagem_url)}" alt="">`:`<span>${esc(c.emoji||'📦')}</span>`}
        <h2>${esc(c.nome)}</h2></div><div class="ml-list-products">${arr.map(card).join('')}</div></section>`;
    }
    const known=new Set(categorias.map(c=>String(c.id)));
    const other=produtos.filter(p=>!known.has(String(p.categoria_id))&&(!search||norm(p.nome).includes(search)));
    if(other.length)html+=`<section class="categoria-bloco"><div class="categoria-titulo"><span>📦</span><h2>Outros</h2></div><div class="ml-list-products">${other.map(card).join('')}</div></section>`;
    b.innerHTML=html||'<div class="empty">Nenhum produto encontrado.</div>';
  }
  function renderCategory(){
    const b=box();if(!b)return;
    const search=norm(document.getElementById('search')?.value||'');
    const list=products.filter(p=>String(p.categoria_id)===String(cat)&&(!search||norm(p.nome).includes(search)));
    b.classList.remove('todos-agrupado');
    b.innerHTML=list.length?list.map(card).join(''):'<div class="empty">Nenhum produto encontrado.</div>';
  }
  function render(){if(cat==='todos')renderTodos();else renderCategory()}

  function openSpecial(p,type,cfg){
    const x=cfg[p.id]||{}, max=maxOf(p,type,cfg), sabores=Array.isArray(x.sabores)?x.sabores:[];
    const titulo=type==='pastel'?'🥟 '+p.nome:'🍕 '+p.nome;
    $("modalContent").innerHTML=`<h2>${esc(titulo)}</h2>
      <p class="muted">Escolha ${max===2?'2 sabores':'1 sabor'}.</p>
      <div class="special-rule">${max===2?'Escolha exatamente 2 sabores. O valor final será o maior preço entre os dois sabores.':'Escolha 1 sabor obrigatório.'}</div>
      <div class="special-flavors">${sabores.map((s,i)=>`
        <label class="special-flavor"><input class="special-choice" type="${max===1?'radio':'checkbox'}" name="specialFlavor" value="${i}" data-name="${esc(s.nome)}" data-desc="${esc(s.descricao||'')}" data-price="${Number(s.preco||0)}">
        <div class="special-thumb">${s.imagem_url?`<img src="${esc(s.imagem_url)}" alt="">`:''}</div>
        <div><b>${esc(s.nome)}</b>${s.descricao?`<small>${esc(s.descricao)}</small>`:''}<strong>${money(s.preco)}</strong></div></label>`).join('')||'<div class="empty">Nenhum sabor cadastrado no Admin.</div>'}</div>
      <label>Observação<textarea id="specialObs" placeholder="Ex.: sem cebola..."></textarea></label>
      <label>Quantidade<input id="specialQty" type="number" min="1" value="1"></label>
      <div class="actions"><button onclick="closeModal()">Voltar</button><button class="primary" id="specialAdd">Adicionar ao pedido</button></div>`;
    $("modal").classList.remove('hidden');
    const choices=[...document.querySelectorAll('.special-choice')];
    choices.forEach(ch=>ch.addEventListener('change',()=>{
      if(max===2){const n=choices.filter(x=>x.checked).length;choices.forEach(x=>x.disabled=!x.checked&&n>=2)}
    }));
    $("specialAdd").onclick=()=>{
      const selected=choices.filter(x=>x.checked);
      if(selected.length!==max)return alert(`Selecione ${max} ${max===1?'sabor':'sabores'}.`);
      const vals=selected.map(x=>({nome:x.dataset.name,preco:Number(x.dataset.price||0),descricao:x.dataset.desc}));
      const price=type==='pizza'
        ? Math.max(...vals.map(v=>v.preco),Number(p.preco||0))
        : Number(p.preco||0)+Number(vals[0]?.preco||0);
      const q=Math.max(1,Number($("specialQty").value||1));
      const name=type==='pizza'?`${p.nome} — ${vals.map(v=>v.nome).join(' + ')}`:`${p.nome} — ${vals[0].nome}`;
      cart.push({key:uid(),id:p.id,nome:name,preco:price,quantidade:q,adicionais:vals,obs:$("specialObs")?.value.trim()||''});
      closeModal();renderCart();
    };
  }
  const oldOpen=window.openProduct;
  window.openProduct=async function(id){
    const p=products.find(x=>String(x.id)===String(id));if(!p)return;
    const t=typeOf(p);if(!t)return oldOpen(id);
    return openSpecial(p,t,await getCfg());
  };
  window.renderProducts=render;
  document.addEventListener('click',e=>{if(e.target.closest('#categories button'))setTimeout(render,100)});
  document.getElementById('search')?.addEventListener('input',render);
  setTimeout(render,500);
})();
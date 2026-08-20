/* Miguel Lanches — home mobile premium */
(function(){
  const money2=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const esc2=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const norm2=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  window.renderFeatured=function(){
    const host=document.getElementById('featured');
    if(!host)return;
    const saved=(()=>{try{return JSON.parse(localStorage.getItem('miguel_lanches_destaques')||'null')}catch{return null}})();
    let list=[];
    if(Array.isArray(saved)&&saved.length){
      list=saved.map(id=>products.find(p=>String(p.id)===String(id))).filter(Boolean);
    }
    if(!list.length)list=[...products].slice(0,6);
    host.innerHTML=list.length?list.map((p,i)=>`<button class="highlight-card" onclick="openProduct('${p.id}')"><div class="highlight-photo">${p.imagem_url?`<img src="${esc2(p.imagem_url)}" alt="${esc2(p.nome)}">`:`<span>${esc2(p.emoji||p.categorias?.emoji||'🍔')}</span>`}<b class="highlight-badge">${i===0?'Mais pedido':''}</b></div><div class="highlight-body"><small>A partir de</small><strong>${money2(p.preco)}</strong><span>${esc2(p.nome)}</span></div></button>`).join(''):'<div class="empty-inline">Os produtos aparecerão aqui.</div>';
  };

  function popularCard(p){
    return `<article class="popular-row" onclick="openProduct('${p.id}')"><div class="popular-copy"><small class="popular-tag">${p===products[0]?'O mais pedido':''}</small><h3>${esc2(p.nome)}</h3><p>${esc2(p.descricao||'Toque para ver as opções.')}</p><b>A partir de <span>${money2(p.preco)}</span></b></div><div class="popular-image">${p.imagem_url?`<img src="${esc2(p.imagem_url)}" alt="${esc2(p.nome)}">`:`<span>${esc2(p.emoji||p.categorias?.emoji||'🍔')}</span>`}</div></article>`;
  }

  window.renderProducts=function(){
    const host=document.getElementById('products');
    if(!host)return;
    const q=norm2(document.getElementById('search')?.value||'');
    const list=products.filter(p=>!q||norm2(p.nome).includes(q)||norm2(p.descricao).includes(q));
    const pizzaCatIds=categories.filter(c=>norm2(c.nome).includes('pizza')).map(c=>String(c.id));
    let popular=list.filter(p=>pizzaCatIds.includes(String(p.categoria_id)));
    if(!popular.length) popular=list.filter(p=>norm2(p.nome).includes('pizza'));
    if(!popular.length) popular=[...list];
    popular=popular.sort((a,b)=>Number(a.ordem??99999)-Number(b.ordem??99999)).slice(0,6);
    const grouped=categories.map(c=>({cat:c,items:list.filter(p=>String(p.categoria_id)===String(c.id)).sort((a,b)=>Number(a.ordem??99999)-Number(b.ordem??99999)||String(a.nome).localeCompare(String(b.nome)))})).filter(g=>g.items.length);
    let html=`<section class="popular-block"><div class="section-head"><h2>Mais pedidos</h2></div>${popular.map(popularCard).join('')}</section>`;
    html+=grouped.map(g=>`<section class="category-block" id="cat-${String(g.cat.id).replace(/[^a-zA-Z0-9_-]/g,'-')}" data-category-id="${esc2(g.cat.id)}"><div class="category-heading"><span>${esc2(g.cat.emoji||'📦')}</span><h2>${esc2(g.cat.nome)}</h2><button type="button">Ver todos</button></div><div class="category-products">${g.items.map(p=>`<article class="menu-row" onclick="openProduct('${p.id}')"><div class="menu-photo">${p.imagem_url?`<img src="${esc2(p.imagem_url)}" alt="${esc2(p.nome)}">`:`<span>${esc2(p.emoji||g.cat.emoji||'🍔')}</span>`}</div><div class="menu-info"><h3>${esc2(p.nome)}</h3><p>${esc2(p.descricao||'')}</p><b>${money2(p.preco)}</b></div><button class="plus" type="button" onclick="event.stopPropagation();openProduct('${p.id}')">+</button></article>`).join('')}</div></section>`).join('');
    const uncategorized=list.filter(p=>!categories.some(c=>String(c.id)===String(p.categoria_id)));
    if(uncategorized.length)html+=`<section class="category-block" id="cat-sem-categoria"><div class="category-heading"><span>📦</span><h2>Outros</h2></div><div class="category-products">${uncategorized.map(p=>`<article class="menu-row" onclick="openProduct('${p.id}')"><div class="menu-photo">${p.imagem_url?`<img src="${esc2(p.imagem_url)}" alt="${esc2(p.nome)}">`:`<span>📦</span>`}</div><div class="menu-info"><h3>${esc2(p.nome)}</h3><p>${esc2(p.descricao||'')}</p><b>${money2(p.preco)}</b></div><button class="plus" type="button" onclick="event.stopPropagation();openProduct('${p.id}')">+</button></article>`).join('')}</div></section>`;
    host.innerHTML=html||'<div class="empty-inline">Nenhum produto encontrado.</div>';
    if(window.setupCategoryObserver)setupCategoryObserver();
  };

  window.renderCart=function(){
    const count=cart.reduce((s,x)=>s+Number(x.quantidade||0),0);
    const sub=cart.reduce((s,x)=>s+Number(x.preco||0)*Number(x.quantidade||0),0);
    const nc=document.getElementById('navCount');
    if(nc)nc.textContent=count;
    const items=document.getElementById('cartItems'),empty=document.getElementById('emptyCart');
    if(items)items.innerHTML=cart.length?cart.map(x=>`<div class="drawer-item"><div><b>${x.quantidade}x ${esc2(x.nome)}</b>${x.config?.sabores?.length?`<small>Sabores: ${esc2(x.config.sabores.join(' + '))}</small>`:''}${x.config?.coberturas?.length?`<small>Coberturas: ${esc2(x.config.coberturas.join(', '))}</small>`:''}${x.obs?`<small>Obs.: ${esc2(x.obs)}</small>`:''}</div><strong>${money2(Number(x.preco)*Number(x.quantidade))}</strong><div class="qty"><button type="button" onclick="changeQty('${x.id}',-1)">−</button><b>${x.quantidade}</b><button type="button" onclick="changeQty('${x.id}',1)">+</button><button type="button" class="remove" onclick="removeItem('${x.id}')">Excluir</button></div></div>`).join(''):'';
    if(empty)empty.classList.toggle('hidden',!!cart.length);
    const ct=document.getElementById('cartTotal');if(ct)ct.textContent=money2(sub);
    const status=document.getElementById('bagStatus');if(status)status.textContent=count?`${count} ${count===1?'item':'itens'} na sacola`:'Sua sacola está vazia';
    const bar=document.getElementById('bagBar');if(bar)bar.classList.toggle('has-items',count>0);
    if(typeof checkoutTotal!=='undefined'){
      const ids=[['cartSubtotal',sub],['checkoutSubtotal',sub],['checkoutTotal',sub]];
      ids.forEach(([id2,val])=>{const el=document.getElementById(id2);if(el)el.textContent=money2(val)});
      const total=document.getElementById('checkoutTotal');if(total)total.dataset.value=sub;
    }
  };

  window.setupCategoryObserver=function(){
    const sections=[...document.querySelectorAll('.category-block')];
    if(!sections.length||!window.IntersectionObserver)return;
    if(window._mlCategoryObserver)window._mlCategoryObserver.disconnect();
    window._mlCategoryObserver=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      const id=visible.target.dataset.categoryId;if(!id)return;
      if(String(selectedCategory)!==String(id)){selectedCategory=String(id);if(window.renderCategories)renderCategories();}
    },{rootMargin:'-120px 0px -55% 0px',threshold:[0.15,0.4,0.7]});
    sections.forEach(s=>window._mlCategoryObserver.observe(s));
  };

  document.addEventListener('DOMContentLoaded',()=>{
    const search=document.getElementById('search');
    if(search){
      search.addEventListener('click',()=>search.focus());
      search.addEventListener('input',()=>{if(window.renderProducts)renderProducts();if(window.renderFeatured)renderFeatured();document.getElementById('featuredSection')?.classList.toggle('hidden',!!search.value.trim())});
    }
  });

  window.addEventListener('load',()=>{setTimeout(()=>{if(typeof load==='function')load()},25)});
})();

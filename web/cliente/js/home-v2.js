/* Miguel Lanches — layout final: sem Mais pedidos */
(function(){
const money2=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc2=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const norm2=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

window.renderFeatured=function(){
 const host=document.getElementById('featured');if(!host)return;
 let saved=null;try{saved=JSON.parse(localStorage.getItem('miguel_lanches_destaques')||'null')}catch{}
 let list=Array.isArray(saved)&&saved.length?saved.map(id=>products.find(p=>String(p.id)===String(id))).filter(Boolean):[...products].slice(0,8);
 host.innerHTML=list.map((p,i)=>`<button class="highlight-card" onclick="openProduct('${p.id}')"><div class="highlight-photo">${p.imagem_url?`<img src="${esc2(p.imagem_url)}" alt="${esc2(p.nome)}">`:`<span>${esc2(p.emoji||p.categorias?.emoji||'🍔')}</span>`}${i===0?'<b class="highlight-badge">Mais pedido</b>':''}</div><div class="highlight-body"><small>A partir de</small><strong>${money2(p.preco)}</strong><span>${esc2(p.nome)}</span></div></button>`).join('');
};

window.scrollToCategory=function(id){
 const safe=String(id).replace(/[^a-zA-Z0-9_-]/g,'-');
 const target=document.getElementById('cat-'+safe);
 if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
};
window.renderProducts=function(){
 const host=document.getElementById('products');if(!host)return;
 const q=norm2(document.getElementById('search')?.value||'');
 const list=products.filter(p=>!q||norm2(p.nome).includes(q)||norm2(p.descricao).includes(q));
 const grouped=categories.map(c=>({cat:c,items:list.filter(p=>String(p.categoria_id)===String(c.id)).sort((a,b)=>Number(a.ordem??99999)-Number(b.ordem??99999)||String(a.nome).localeCompare(String(b.nome)))})).filter(g=>g.items.length);
 let html=grouped.map(g=>`<section class="category-block" id="cat-${String(g.cat.id).replace(/[^a-zA-Z0-9_-]/g,'-')}" data-category-id="${esc2(g.cat.id)}"><div class="category-heading"><span>${esc2(g.cat.emoji||'📦')}</span><h2>${esc2(g.cat.nome)}</h2><button type="button">Ver todos</button></div><div class="category-products">${g.items.map(p=>`<article class="menu-card" onclick="openProduct('${p.id}')"><div class="menu-photo">${p.imagem_url?`<img src="${esc2(p.imagem_url)}" alt="${esc2(p.nome)}">`:`<span>${esc2(p.emoji||g.cat.emoji||'🍔')}</span>`}</div><div class="menu-info"><h3>${esc2(p.nome)}</h3><p>${esc2(p.descricao||'')}</p><b>${money2(p.preco)}</b></div><button class="plus" type="button" onclick="event.stopPropagation();openProduct('${p.id}')">+</button></article>`).join('')}</div></section>`).join('');
 host.innerHTML=html||'<p style="padding:20px">Nenhum produto encontrado.</p>';
};

window.renderCart=function(){
 const count=cart.reduce((s,x)=>s+Number(x.quantidade||0),0),sub=cart.reduce((s,x)=>s+Number(x.preco||0)*Number(x.quantidade||0),0);
 const nc=document.getElementById('navCount');if(nc)nc.textContent=count;
 const items=document.getElementById('cartItems'),empty=document.getElementById('emptyCart');
 if(items)items.innerHTML=cart.length?cart.map(x=>`<div class="drawer-item"><div><b>${x.quantidade}x ${esc2(x.nome)}</b></div><strong>${money2(Number(x.preco)*Number(x.quantidade))}</strong><div class="qty"><button onclick="changeQty('${x.id}',-1)">−</button><b>${x.quantidade}</b><button onclick="changeQty('${x.id}',1)">+</button><button onclick="removeItem('${x.id}')">Excluir</button></div></div>`).join(''):'';
 if(empty)empty.classList.toggle('hidden',!!cart.length);
 const ct=document.getElementById('cartTotal');if(ct)ct.textContent=money2(sub);
 const st=document.getElementById('bagStatus');if(st)st.textContent=count?`${count} ${count===1?'item':'itens'} na sacola`:'Sua sacola está vazia';
 ['checkoutSubtotal','checkoutTotal'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=money2(sub)});
};

document.addEventListener('DOMContentLoaded',()=>{
 const s=document.getElementById('search');
 if(s)s.addEventListener('input',()=>{renderProducts();});
});
})();

document.addEventListener('click',function(e){
 const btn=e.target.closest?.('[data-category-nav]');
 if(!btn)return;
 const id=btn.dataset.categoryNav;
 if(id==='todos'){e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});return;}
 const target=document.getElementById('cat-'+String(id).replace(/[^a-zA-Z0-9_-]/g,'-'));
 if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}
});

window.addEventListener('load',()=>setTimeout(()=>{if(typeof load==='function')load()},25));


(function(){
  function parseMoney(v){
    return Number(String(v||'').replace(/\./g,'').replace(',','.')) || 0;
  }
  function updateCashChange(){
    const payment=document.getElementById('payment');
    const box=document.getElementById('cashBox');
    const input=document.getElementById('cashValue');
    const out=document.getElementById('changeValue');
    const totalText=document.getElementById('checkoutTotal')?.textContent||'';
    const total=parseMoney(totalText.replace(/[^\d,.-]/g,''));
    const cash=parseMoney(input?.value);
    const isCash=payment?.value==='Dinheiro';
    box?.classList.toggle('hidden',!isCash);
    if(out) out.textContent=isCash && cash>=total ? money2(cash-total) : 'R$ 0,00';
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const payment=document.getElementById('payment');
    const cash=document.getElementById('cashValue');
    payment?.addEventListener('change',updateCashChange);
    cash?.addEventListener('input',updateCashChange);
  });
  const oldSend=window.sendOrder;
  window.sendOrder=async function(){
    const payment=document.getElementById('payment')?.value||'';
    const cash=parseMoney(document.getElementById('cashValue')?.value);
    const total=parseMoney((document.getElementById('checkoutTotal')?.textContent||'').replace(/[^\d,.-]/g,''));
    if(!payment){ toast('Escolha a forma de pagamento'); return; }
    if(payment==='Dinheiro'){
      if(cash<=0){ toast('Informe o valor que vai pagar'); return; }
      if(cash<total){ toast('O valor pago é menor que o total'); return; }
    }
    const originalInsert=window.db.from.bind(window.db);
    let captured=null;
    // The existing sendOrder builds and inserts the order. We append payment data
    // to the observation field immediately before calling it by temporarily wrapping db.from.
    window.db.from=function(table){
      const q=originalInsert(table);
      if(table!=='pedidos') return q;
      const originalInsertMethod=q.insert.bind(q);
      q.insert=function(payload){
        if(payload && typeof payload.observacoes==='string'){
          const change=payment==='Dinheiro'?cash-total:0;
          payload.observacoes += `\n[ML_PAGAMENTO]${encodeURIComponent(JSON.stringify({forma:payment,valor_pago:cash,troco:change}))}[/ML_PAGAMENTO]`;
        }
        return originalInsertMethod(payload);
      };
      return q;
    };
    try{ return await oldSend(); } finally { window.db.from=originalInsert; }
  };
  updateCashChange();
})();

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
  const $=id=>document.getElementById(id);
  let integerDigits='';

  function parseBR(v){
    let s=String(v||'').replace(/\s/g,'');
    if(!s)return 0;
    if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
    return Number(s)||0;
  }

  function totalPedido(){
    const el=$('checkoutTotal');
    const shown=parseBR(el?.textContent||'');
    if(shown>0)return shown;
    const items=Array.isArray(window.cart)?window.cart:[];
    return items.reduce((s,x)=>s+(Number(x.preco)||0)*(Number(x.quantidade)||0),0);
  }

  function update(){
    const payment=$('payment'), input=$('cashValue');
    const box=$('cashBox'), out=$('changeValue'), err=$('cashError');
    if(!payment||!input)return;

    const cash=payment.value==='Dinheiro';
    box?.classList.toggle('hidden',!cash);

    if(!cash){
      if(out)out.textContent='R$ 0,00';
      if(err)err.textContent='';
      return;
    }

    const paid=parseBR(input.value);
    const total=totalPedido();

    if(!input.value){
      if(out)out.textContent='R$ 0,00';
      if(err)err.textContent='';
    }else if(paid<total){
      if(out)out.textContent='R$ 0,00';
      if(err)err.textContent='Valor insuficiente. Faltam '+money2(total-paid)+'.';
    }else{
      if(out)out.textContent=money2(paid-total);
      if(err)err.textContent='';
    }
  }

  // Controlled integer input:
  // Typing 1 -> 1,00; typing 0 next -> 10,00.
  // The automatically added ",00" is never treated as user input, preventing
  // the "01,1" / "1,10" behavior from the previous version.
  function renderInput(input){
    input.value=integerDigits ? integerDigits+',00' : '';
    const pos=integerDigits.length;
    try{input.setSelectionRange(pos,pos);}catch(e){}
    update();
  }

  function setup(){
    const input=$('cashValue'), payment=$('payment');
    if(!input||!payment)return;

    integerDigits=(input.value.match(/\d+/)?.[0]||'').replace(/^0+(?=\d)/,'');
    renderInput(input);

    input.addEventListener('beforeinput',function(e){
      if(e.inputType==='insertText' && /\d/.test(e.data||'')){
        e.preventDefault();
        integerDigits += String(e.data).replace(/\D/g,'');
        integerDigits=integerDigits.replace(/^0+(?=\d)/,'');
        renderInput(input);
        return;
      }

      if(e.inputType==='deleteContentBackward' || e.inputType==='deleteContentForward'){
        e.preventDefault();
        integerDigits=integerDigits.slice(0,-1);
        renderInput(input);
        return;
      }

      if(e.inputType==='insertFromPaste'){
        e.preventDefault();
        const pasted=String(e.data||'').replace(/\D/g,'');
        integerDigits=pasted.replace(/^0+(?=\d)/,'');
        renderInput(input);
      }
    });

    // Android keyboards can skip beforeinput, so input is also handled.
    input.addEventListener('input',function(){
      const digits=input.value.replace(/\D/g,'');
      // Ignore the auto ",00" suffix when reconstructing.
      if(digits.length>=2 && input.value.endsWith(',00')){
        integerDigits=digits.slice(0,-2).replace(/^0+(?=\d)/,'');
      }else{
        integerDigits=digits.replace(/^0+(?=\d)/,'');
      }
      renderInput(input);
    });

    input.addEventListener('focus',function(){
      renderInput(input);
    });

    payment.addEventListener('change',update);
    document.addEventListener('click',()=>setTimeout(update,20));
    update();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);
  else setup();

  const originalSend=window.sendOrder;
  if(typeof originalSend==='function'){
    window.sendOrder=async function(){
      const payment=$('payment')?.value||'';
      const paid=parseBR($('cashValue')?.value||'');
      const total=totalPedido();

      if(!payment){toast('Escolha a forma de pagamento');return;}
      if(payment==='Dinheiro' && paid<total){
        update();
        toast(paid>0?'Valor insuficiente. O total é '+money2(total):'Informe o valor que você vai pagar');
        $('cashValue')?.focus();
        return;
      }

      const note=$('orderNote');
      const old=note?.value||'';
      if(note && payment==='Dinheiro'){
        note.value=old+'\n[ML_PAGAMENTO]'+encodeURIComponent(JSON.stringify({
          forma:'Dinheiro',valor_pago:paid,troco:paid-total
        }))+'[/ML_PAGAMENTO]';
      }
      try{return await originalSend();}
      finally{if(note)note.value=old;}
    };
  }
})();


/* Miguel Lanches — modal de produto profissional + quantidade +/− */
(function(){
  function esc(v){
    return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
      .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }
  function money(v){
    return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
  function getProducts(){
    return window.products || [];
  }

  let current=null;
  let qty=1;

  function close(){
    const m=document.getElementById('productModal');
    if(m)m.classList.add('hidden');
  }

  function render(p){
    current=p;
    qty=1;

    const modal=document.getElementById('productModal');
    const body=document.getElementById('productBody');
    if(!modal||!body)return;

    const image=p.imagem_url||p.imagem||p.image_url||'';
    const placeholder=p.emoji||p.categorias?.emoji||'🍔';

    body.innerHTML=`
      <div class="product-main ml-product-sheet">
        <div class="ml-product-hero">
          ${image
            ? `<img src="${esc(image)}" alt="${esc(p.nome)}">`
            : `<div class="ml-product-placeholder">${esc(placeholder)}</div>`}
          <button type="button" class="ml-product-close" aria-label="Fechar">×</button>
        </div>

        <h2 class="ml-product-main-title">${esc(p.nome)}</h2>
        <div class="ml-product-price">${money(p.preco)}</div>

        ${p.descricao
          ? `<p class="ml-product-desc">${esc(p.descricao)}</p>`
          : `<div style="height:12px"></div>`}

        <label class="ml-product-label" for="mlProductNote">Observação <span style="font-weight:500;color:#888">(opcional)</span></label>
        <textarea id="mlProductNote" class="ml-product-note"
          placeholder="Ex.: sem cebola, bem passado..."></textarea>

        <div class="ml-product-qty-row">
          <span class="ml-product-qty-title">Quantidade</span>
          <div class="ml-product-stepper">
            <button type="button" id="mlQtyMinus" aria-label="Diminuir">−</button>
            <span id="mlQty" class="ml-product-qty">1</span>
            <button type="button" id="mlQtyPlus" aria-label="Aumentar">+</button>
          </div>
        </div>

        <button type="button" class="ml-product-add" id="mlProductAdd">
          ADICIONAR À SACOLA · ${money(p.preco)}
        </button>
      </div>
    `;

    modal.classList.remove('hidden');

    body.querySelector('.ml-product-close').onclick=close;

    function updateQty(){
      document.getElementById('mlQty').textContent=qty;
      document.getElementById('mlProductAdd').textContent=
        `ADICIONAR À SACOLA · ${money(Number(p.preco||0)*qty)}`;
    }

    document.getElementById('mlQtyMinus').onclick=()=>{
      qty=Math.max(1,qty-1);
      updateQty();
    };
    document.getElementById('mlQtyPlus').onclick=()=>{
      qty=Math.min(99,qty+1);
      updateQty();
    };

    document.getElementById('mlProductAdd').onclick=()=>{
      const note=document.getElementById('mlProductNote')?.value.trim()||'';

      // Usa a função existente do projeto para manter toda a lógica da sacola.
      if(typeof window.addToCart!=='function'){
        alert('Não foi possível adicionar o produto.');
        return;
      }

      for(let i=0;i<qty;i++) window.addToCart(p.id);

      // Guarda a observação no item adicionado/atualizado.
      const cart=window.cart||[];
      const item=cart.find(x=>String(x.id)===String(p.id));
      if(item && note)item.obs=note;

      if(typeof window.renderCart==='function')window.renderCart();
      if(typeof window.toast==='function')window.toast(
        qty>1 ? `${qty}x ${p.nome} adicionados à sacola` : 'Produto adicionado à sacola'
      );

      close();
    };
  }

  function openProductProfessional(id){
    const p=getProducts().find(x=>String(x.id)===String(id));
    if(!p)return;
    render(p);
  }

  // Espera o restante do projeto carregar e então assume o ponto de entrada.
  window.addEventListener('load',()=>{
    setTimeout(()=>{
      window.openProduct=openProductProfessional;
    },100);
  });

  // Também funciona se o projeto chamar openProduct depois do carregamento.
  window.mlOpenProductProfessional=openProductProfessional;
})();

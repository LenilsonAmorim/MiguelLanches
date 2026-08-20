/* Miguel Lanches — renderização compatível com style.css atual */
(function(){
"use strict";

const money2=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc2=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const norm2=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

window.renderFeatured=function(){
  const host=document.getElementById("featured");
  if(!host)return;

  let saved=null;
  try{saved=JSON.parse(localStorage.getItem("miguel_lanches_destaques")||"null")}catch(_){}

  const list=Array.isArray(saved)&&saved.length
    ? saved.map(id=>products.find(p=>String(p.id)===String(id))).filter(Boolean)
    : [...products].slice(0,8);

  host.innerHTML=list.map((p,i)=>`
    <button type="button" class="highlight" onclick="openProduct('${esc2(p.id)}')">
      <div class="highlight-img">
        ${p.imagem_url
          ? `<img src="${esc2(p.imagem_url)}" alt="${esc2(p.nome)}">`
          : `<span>${esc2(p.emoji||p.categorias?.emoji||"🍔")}</span>`}
      </div>
      <div class="highlight-body">
        <small>${i===0?"Mais pedido":"Destaque"}</small>
        <b>${esc2(p.nome)}</b>
        <strong>${money2(p.preco)}</strong>
      </div>
    </button>
  `).join("");
};

window.renderProducts=function(){
  const host=document.getElementById("products");
  if(!host)return;

  const q=norm2(document.getElementById("search")?.value||"");
  const list=products.filter(p=>
    !q ||
    norm2(p.nome).includes(q) ||
    norm2(p.descricao).includes(q)
  );

  const grouped=categories
    .map(c=>({
      cat:c,
      items:list
        .filter(p=>String(p.categoria_id)===String(c.id))
        .sort((a,b)=>
          Number(a.ordem??99999)-Number(b.ordem??99999) ||
          String(a.nome).localeCompare(String(b.nome))
        )
    }))
    .filter(g=>g.items.length);

  host.innerHTML=grouped.map(g=>`
    <section class="category-block"
      id="cat-${String(g.cat.id).replace(/[^a-zA-Z0-9_-]/g,"-")}"
      data-category-id="${esc2(g.cat.id)}">

      <div class="section-title">
        <h2>${esc2(g.cat.emoji||"📦")} ${esc2(g.cat.nome)}</h2>
      </div>

      <div class="products">
        ${g.items.map(p=>`
          <article class="product" onclick="openProduct('${esc2(p.id)}')">
            <div class="product-img">
              ${p.imagem_url
                ? `<img src="${esc2(p.imagem_url)}" alt="${esc2(p.nome)}">`
                : `<span>${esc2(p.emoji||g.cat.emoji||"🍔")}</span>`}
            </div>

            <div class="product-body">
              <h3>${esc2(p.nome)}</h3>
              <p>${esc2(p.descricao||"Toque para ver as opções.")}</p>

              <div class="product-foot">
                <strong>${money2(p.preco)}</strong>
                <button type="button"
                  onclick="event.stopPropagation();openProduct('${esc2(p.id)}')">+</button>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `).join("") || '<p style="padding:20px">Nenhum produto encontrado.</p>';
};

window.renderCart=function(){
  const c=Array.isArray(window.cart)?window.cart:[];
  const count=c.reduce((s,x)=>s+Number(x.quantidade||0),0);
  const sub=c.reduce((s,x)=>s+Number(x.preco||0)*Number(x.quantidade||0),0);

  const items=document.getElementById("cartItems");
  if(items){
    items.innerHTML=c.length
      ? c.map(x=>`
        <div class="cart-item">
          <div class="cart-item-top">
            <div>
              <b>${x.quantidade}x ${esc2(x.nome)}</b>
              ${x.obs?`<small>${esc2(x.obs)}</small>`:""}
            </div>
            <strong>${money2(Number(x.preco)*Number(x.quantidade))}</strong>
          </div>

          <div class="item-actions">
            <button type="button" onclick="changeQty('${esc2(x.id)}',-1)">−</button>
            <b>${x.quantidade}</b>
            <button type="button" onclick="changeQty('${esc2(x.id)}',1)">+</button>
            <button type="button" class="remove"
              onclick="removeItem('${esc2(x.id)}')">Excluir</button>
          </div>
        </div>
      `).join("")
      : `<div class="empty-cart">
           <div class="empty-bag">🛍️</div>
           <b>Sua sacola está vazia</b>
           <p>Adicione produtos para continuar.</p>
         </div>`;
  }

  const empty=document.getElementById("emptyCart");
  if(empty)empty.classList.toggle("hidden",!!c.length);

  const total=money2(sub);
  ["cartSubtotal","cartTotal","checkoutSubtotal","checkoutTotal"].forEach(id=>{
    const e=document.getElementById(id);
    if(e)e.textContent=total;
  });

  const navCount=document.getElementById("navCount");
  if(navCount)navCount.textContent=count;

  const bagStatus=document.getElementById("bagStatus");
  if(bagStatus)bagStatus.textContent=count
    ? `${count} ${count===1?"item":"itens"} na sacola`
    : "Sua sacola está vazia";
};

window.scrollToCategory=function(id){
  const safe=String(id).replace(/[^a-zA-Z0-9_-]/g,"-");
  const target=document.getElementById("cat-"+safe);
  if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
};

document.addEventListener("DOMContentLoaded",()=>{
  const s=document.getElementById("search");
  if(s)s.addEventListener("input",()=>{
    if(typeof window.renderProducts==="function")window.renderProducts();
    if(typeof window.renderFeatured==="function")window.renderFeatured();
  });
});

document.addEventListener("click",e=>{
  const btn=e.target.closest?.("[data-category-nav]");
  if(!btn)return;
  e.preventDefault();
  const id=btn.dataset.categoryNav;
  if(id==="todos"){
    window.scrollTo({top:0,behavior:"smooth"});
    return;
  }
  window.scrollToCategory(id);
});

window.addEventListener("load",()=>{
  setTimeout(()=>{
    if(typeof window.load==="function")window.load();
  },25);
});

/* Pagamento em dinheiro — mantido da versão anterior */
(function(){
  const $=id=>document.getElementById(id);

  function parseBR(v){
    let s=String(v||"").replace(/\s/g,"");
    if(!s)return 0;
    if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");
    return Number(s)||0;
  }

  function totalPedido(){
    const shown=parseBR($("checkoutTotal")?.textContent||"");
    if(shown>0)return shown;
    const items=Array.isArray(window.cart)?window.cart:[];
    return items.reduce((s,x)=>s+(Number(x.preco)||0)*(Number(x.quantidade)||0),0);
  }

  function update(){
    const payment=$("payment"),input=$("cashValue");
    const box=$("cashBox"),out=$("changeValue"),err=$("cashError");
    if(!payment||!input)return;

    const cash=payment.value==="Dinheiro";
    box?.classList.toggle("hidden",!cash);

    if(!cash){
      if(out)out.textContent="R$ 0,00";
      if(err)err.textContent="";
      return;
    }

    const paid=parseBR(input.value),total=totalPedido();

    if(!input.value){
      if(out)out.textContent="R$ 0,00";
      if(err)err.textContent="";
    }else if(paid<total){
      if(out)out.textContent="R$ 0,00";
      if(err)err.textContent="Valor insuficiente. Faltam "+money2(total-paid)+".";
    }else{
      if(out)out.textContent=money2(paid-total);
      if(err)err.textContent="";
    }
  }

  let integerDigits="";

  function renderInput(input){
    input.value=integerDigits?integerDigits+",00":"";
    try{input.setSelectionRange(integerDigits.length,integerDigits.length)}catch(_){}
    update();
  }

  function setup(){
    const input=$("cashValue"),payment=$("payment");
    if(!input||!payment)return;

    input.addEventListener("beforeinput",e=>{
      if(e.inputType==="insertText"&&/\d/.test(e.data||"")){
        e.preventDefault();
        integerDigits+=String(e.data).replace(/\D/g,"");
        integerDigits=integerDigits.replace(/^0+(?=\d)/,"");
        renderInput(input);
      }else if(e.inputType==="deleteContentBackward"){
        e.preventDefault();
        integerDigits=integerDigits.slice(0,-1);
        renderInput(input);
      }else if(e.inputType==="insertFromPaste"){
        e.preventDefault();
        integerDigits=String(e.data||"").replace(/\D/g,"").replace(/^0+(?=\d)/,"");
        renderInput(input);
      }
    });

    input.addEventListener("input",()=>{
      const digits=input.value.replace(/\D/g,"");
      integerDigits=(input.value.endsWith(",00")&&digits.length>=2
        ? digits.slice(0,-2)
        : digits).replace(/^0+(?=\d)/,"");
      renderInput(input);
    });

    payment.addEventListener("change",update);
    update();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);
  else setup();

  const originalSend=window.sendOrder;
  if(typeof originalSend==="function"){
    window.sendOrder=async function(){
      const payment=$("payment")?.value||"";
      const paid=parseBR($("cashValue")?.value||"");
      const total=totalPedido();

      if(!payment){
        if(typeof window.toast==="function")toast("Escolha a forma de pagamento");
        return;
      }

      if(payment==="Dinheiro"&&paid<total){
        update();
        if(typeof window.toast==="function")toast(
          paid>0?"Valor insuficiente. O total é "+money2(total):
          "Informe o valor que você vai pagar"
        );
        $("cashValue")?.focus();
        return;
      }

      const note=$("orderNote"),old=note?.value||"";

      if(note&&payment==="Dinheiro"){
        note.value=old+"\n[ML_PAGAMENTO]"+
          encodeURIComponent(JSON.stringify({
            forma:"Dinheiro",
            valor_pago:paid,
            troco:paid-total
          }))+"[/ML_PAGAMENTO]";
      }

      try{return await originalSend()}
      finally{if(note)note.value=old}
    };
  }
})();
})();

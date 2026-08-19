/* "TODOS": categorias inteiras em sequência.
   Ordem das categorias = categorias.ordem (Admin/Supabase)
   Ordem dos produtos = produtos.ordem
*/
(function(){
  const URL="https://lifsxhyeqwppfvajvhpn.supabase.co";
  const KEY="sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
  const client=window.supabase.createClient(URL,KEY);

  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const productsBox=()=>document.getElementById("products");

  function card(p){
    return `<article class="card">
      <div class="photo">${p.imagem_url
        ?`<img src="${esc(p.imagem_url)}" alt="${esc(p.nome)}">`
        :esc(p.emoji||"🍔")}</div>
      <div class="info"><h3>${esc(p.nome)}</h3>
        <div class="bottom"><span class="price">${money(p.preco)}</span>
          <button class="plus" onclick="openProduct('${p.id}')">+</button>
        </div>
      </div>
    </article>`;
  }

  async function renderTodos(){
    const box=productsBox();
    if(!box)return;

    const search=(document.getElementById("search")?.value||"").trim().toLowerCase();

    const [cr,pr]=await Promise.all([
      client.from("categorias").select("*").eq("ativo",true).order("ordem",{ascending:true}),
      client.from("produtos").select("*").eq("ativo",true).order("ordem",{ascending:true})
    ]);

    if(cr.error||pr.error)return;

    const categorias=cr.data||[];
    const produtos=pr.data||[];

    /* IMPORTANTÍSSIMO:
       O container inteiro deixa de ser um grid quando "Todos" está ativo.
       Assim uma categoria NÃO fica ao lado da outra.
    */
    box.classList.add("todos-agrupado");

    let html="";
    for(const categoria of categorias){
      const itens=produtos.filter(p=>
        String(p.categoria_id)===String(categoria.id) &&
        (!search || String(p.nome||"").toLowerCase().includes(search))
      );

      if(!itens.length)continue;

      html+=`
        <section class="categoria-bloco">
          <div class="categoria-titulo">
            ${categoria.imagem_url
              ?`<img src="${esc(categoria.imagem_url)}" alt="">`
              :`<span>${esc(categoria.emoji||"📦")}</span>`}
            <h2>${esc(categoria.nome)}</h2>
          </div>
          <div class="categoria-produtos">
            ${itens.map(card).join("")}
          </div>
        </section>`;
    }

    box.innerHTML=html || '<div class="empty">Nenhum produto encontrado.</div>';
  }

  function isTodosButton(btn){
    const txt=(btn?.textContent||"").trim().toLowerCase();
    return txt.includes("todos");
  }

  /* O app.js original usa let cat, então não tentamos acessar window.cat.
     Detectamos a seleção diretamente no botão da categoria. */
  document.addEventListener("click",e=>{
    const btn=e.target.closest("#categories button");
    if(!btn)return;

    if(isTodosButton(btn)){
      setTimeout(renderTodos,80);
    }else{
      const box=productsBox();
      box?.classList.remove("todos-agrupado");
    }
  });

  document.getElementById("search")?.addEventListener("input",()=>{
    const active=document.querySelector("#categories button.active");
    if(active && isTodosButton(active))renderTodos();
  });

  /* Espera o app.js carregar categorias/produtos e renderizar o primeiro estado. */
  setTimeout(()=>{
    const active=document.querySelector("#categories button.active");
    if(active && isTodosButton(active))renderTodos();
  },500);
})();
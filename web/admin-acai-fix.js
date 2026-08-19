/* Miguel Lanches — Admin: garantir Açaí no catálogo de produtos.
   O cliente e o Admin usam a mesma tabela "produtos".
   Este patch não cria produto duplicado: apenas busca o Açaí no Supabase
   e o apresenta no Admin caso a lista atual não o esteja mostrando.
*/
(function(){
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  async function ensureAcai(){
    if(!window.db)return;
    const box=document.getElementById("adminContent");
    if(!box)return;

    /* Só interfere na aba Produtos. */
    const active=document.querySelector('.admin-tab[data-admin="produtos"]');
    if(!active || !active.classList.contains("active"))return;

    const r=await db.from("produtos").select("*,categorias(nome,emoji)").eq("ativo",true).order("ordem");
    if(r.error)return;

    const acai=(r.data||[]).find(p=>norm(p.nome).includes("acai"));
    if(!acai)return; // não inventa um produto que não exista no banco.

    /* Se já aparece normalmente, não duplica. */
    const text=box.textContent||"";
    if(text.toLowerCase().includes(String(acai.nome).toLowerCase()))return;

    let holder=box.querySelector("[data-acai-admin-fallback]");
    if(!holder){
      holder=document.createElement("div");
      holder.setAttribute("data-acai-admin-fallback","");
      holder.style.marginTop="16px";
      holder.innerHTML=`
        <div class="panel" style="border:2px solid #b71924">
          <div class="admin-top">
            <h2>🍧 Açaí</h2>
            <button class="mini" data-acai-edit>Editar</button>
          </div>
          <div class="admin-row">
            <div class="grow">
              <h3 data-acai-name></h3>
              <small data-acai-cat></small>
            </div>
            <strong data-acai-price></strong>
          </div>
        </div>`;
      box.appendChild(holder);
    }

    holder.querySelector("[data-acai-name]").textContent=acai.nome;
    holder.querySelector("[data-acai-cat]").textContent=`${acai.categorias?.nome||"Sem categoria"} · ${money(acai.preco)}`;
    holder.querySelector("[data-acai-price]").textContent=money(acai.preco);
    holder.querySelector("[data-acai-edit]").onclick=()=>{
      if(typeof window.adminEdit==="function")window.adminEdit("produtos",acai.id);
      else if(typeof window.editProduct==="function")window.editProduct(acai.id);
    };
  }

  function boot(){
    ensureAcai();
    const obs=new MutationObserver(()=>ensureAcai());
    const box=document.getElementById("adminContent");
    if(box)obs.observe(box,{childList:true,subtree:true});
    document.addEventListener("click",e=>{
      if(e.target.closest('.admin-tab[data-admin="produtos"]'))setTimeout(ensureAcai,150);
    });
    setInterval(ensureAcai,2000);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
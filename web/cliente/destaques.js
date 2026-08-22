/* Destaques reais: somente produtos com destaque=true */
(function(){
  "use strict";
  const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const products=()=>Array.isArray(window.products)?window.products:[];
  const image=p=>p?.imagem_url||p?.imagem||p?.image_url||"";

  function list(){return products().filter(p=>p && (p.destaque===true || p.destaque==="true"));}

  function card(p){
    const src=image(p);
    return `<button class="highlight" type="button" data-featured-id="${esc(p.id)}">
      <div class="highlight-img">${src?`<img src="${esc(src)}" alt="${esc(p.nome)}">`:`<span>${esc(p.emoji||"🍔")}</span>`}</div>
      <div class="highlight-body"><small>EM DESTAQUE</small><b>${esc(p.nome)}</b><strong>${money(p.preco)}</strong></div>
    </button>`;
  }

  function bind(root){
    root.querySelectorAll("[data-featured-id]").forEach(b=>{
      if(b.dataset.bound)return;
      b.dataset.bound="1";
      b.onclick=()=>window.openProduct?.(b.dataset.featuredId);
    });
  }

  function render(){
    const host=document.getElementById("featured");
    if(!host)return;
    const items=list();
    host.innerHTML=items.length?items.slice(0,6).map(card).join(""):`<div class="featured-empty">Nenhum produto em destaque no momento.</div>`;
    bind(host);
  }

  function openAll(){
    const items=list();
    let modal=document.getElementById("featuredAllModal");
    if(!modal){
      modal=document.createElement("div");
      modal.id="featuredAllModal";
      modal.className="featured-all-modal hidden";
      modal.innerHTML=`<div class="featured-all-card"><div class="featured-all-head"><div><small>SELEÇÃO DA CASA</small><h2>Todos os destaques</h2><p id="featuredAllCount"></p></div><button class="featured-all-close" type="button">×</button></div><div id="featuredAllList" class="featured-all-list"></div></div>`;
      document.body.appendChild(modal);
      modal.onclick=e=>{if(e.target===modal)closeAll()};
      modal.querySelector(".featured-all-close").onclick=closeAll;
    }
    document.getElementById("featuredAllCount").textContent=`${items.length} ${items.length===1?"produto":"produtos"} em destaque`;
    const host=document.getElementById("featuredAllList");
    host.innerHTML=items.length?items.map(card).join(""):`<div class="featured-empty">Nenhum produto em destaque no momento.</div>`;
    bind(host);
    modal.classList.remove("hidden");
    document.body.classList.add("featured-modal-open");
  }

  function closeAll(){
    document.getElementById("featuredAllModal")?.classList.add("hidden");
    document.body.classList.remove("featured-modal-open");
  }

  function install(){
    const link=document.querySelector(".featured-section .section-link");
    if(link && link.dataset.featuredBound!=="1"){
      link.dataset.featuredBound="1";
      link.removeAttribute("onclick");
      link.onclick=e=>{e.preventDefault();openAll()};
    }
    render();
  }

  window.renderRealFeatured=render;
  window.openAllFeatured=openAll;
  window.closeAllFeatured=closeAll;

  const timer=setInterval(()=>{
    install();
    if(products().length)clearInterval(timer);
  },200);
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",install,{once:true}):install();
})();
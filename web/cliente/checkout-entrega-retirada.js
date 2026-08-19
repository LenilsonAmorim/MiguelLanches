/* Miguel Lanches — Entrega, Retirada e Endereço Salvo */
(function(){
  const $=id=>document.getElementById(id);
  const KEY="miguel_lanches_endereco_salvo";
  const get=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null")}catch{return null}};
  const save=d=>{try{localStorage.setItem(KEY,JSON.stringify(d))}catch{}};
  const has=d=>!!(d&&String(d.endereco||"").trim());

  function fill(d){
    if(!d)return;
    ["nome","telefone","bairro","endereco","referencia","pagamento"].forEach(id=>{
      const e=$(id); if(e && d[id]!=null)e.value=d[id];
    });
  }
  function showSaved(){
    const box=$("savedAddress"), text=$("savedAddressText"), d=get();
    if(!box||!text)return;
    if(!has(d)){box.classList.add("hidden");text.textContent="";return}
    text.textContent=[d.bairro,d.endereco,d.referencia].filter(Boolean).join(" • ");
    box.classList.remove("hidden");
  }
  function openReceive(method){
    const section=$("customerSection"), fields=$("deliveryFields"), checkout=$("checkout");
    if(!section)return;
    checkout?.classList.remove("hidden");
    section.classList.remove("hidden");
    fill(get());
    if(fields)fields.classList.toggle("hidden",method!=="entrega");
    document.querySelectorAll(".receive-option").forEach(b=>b.classList.toggle("selected",b.dataset.method===method));
    showSaved();
    if(method==="entrega")setTimeout(()=>$("endereco")?.focus({preventScroll:true}),80);
    else setTimeout(()=>$("nome")?.focus({preventScroll:true}),80);
  }

  document.addEventListener("click",e=>{
    const opt=e.target.closest?.(".receive-option");
    if(opt){e.preventDefault();openReceive(opt.dataset.method||"entrega");return}
    const change=e.target.closest?.("#changeAddress");
    if(change){e.preventDefault();openReceive("entrega");return}
    const close=e.target.closest?.("#closeCheckout");
    if(close){e.preventDefault();$("checkout")?.classList.add("hidden");return}
  },true);

  document.addEventListener("input",e=>{
    if(["nome","telefone","bairro","endereco","referencia","pagamento"].includes(e.target.id)){
      const d=get()||{};
      d[e.target.id]=e.target.value;
      if(String(d.endereco||"").trim())save(d);
      showSaved();
    }
  });

  showSaved();
  window.mlCheckoutAddress={openReceive,showSaved};
})();
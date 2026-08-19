
/* Dados do cliente: salvar no celular somente após finalizar o pedido */
(() => {
  const KEY = "miguel_lanches_cliente_v1";
  const $ = id => document.getElementById(id);

  function getSaved(){
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch { return null; }
  }

  function saveAfterOrder(){
    const data = {
      nome: $("nome")?.value.trim() || "",
      telefone: $("telefone")?.value.trim() || "",
      bairro: $("bairro")?.value || "",
      endereco: $("endereco")?.value.trim() || "",
      referencia: $("referencia")?.value.trim() || "",
      pagamento: $("pagamento")?.value || ""
    };
    if (data.telefone || data.nome || data.endereco) {
      localStorage.setItem(KEY, JSON.stringify(data));
    }
  }

  function restore(){
    const d=getSaved();
    if(!d) return;
    const set=(id,v)=>{
      const el=$(id);
      if(el && v !== undefined && v !== null) el.value=v;
    };
    set("nome",d.nome); set("telefone",d.telefone); set("bairro",d.bairro);
    set("endereco",d.endereco); set("referencia",d.referencia); set("pagamento",d.pagamento);

    const box=$("savedAddress"), text=$("savedAddressText");
    if(box && (d.endereco || d.bairro)){
      const address=[d.bairro,d.endereco,d.referencia].filter(Boolean).join(" • ");
      if(text) text.textContent=address;
      box.classList.remove("hidden");
    }
  }

  // Capture the values immediately before the existing sendOrder runs.
  document.addEventListener("click", e=>{
    if(e.target?.id === "send") saveAfterOrder();
  }, true);

  // When checkout is opened, restore the previously saved data.
  const observer=new MutationObserver(restore);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(restore,500);
  setTimeout(restore,1500);

  window.mlRestoreCustomer=restore;
})();

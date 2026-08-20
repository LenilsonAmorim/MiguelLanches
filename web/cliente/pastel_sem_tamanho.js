/* Miguel Lanches — Pastel sem seletor de tamanho
   Médio e Grande já são produtos separados no cadastro.
   Portanto, no modal do pastel mostramos somente o sabor.
*/
(function(){
  "use strict";

  function isPastel(p){
    const norm = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    return !!p && (
      norm(p?.categorias?.nome).includes("pastel") ||
      norm(p?.nome).includes("pastel")
    );
  }

  function limparTamanho(){
    const modal=document.getElementById("productModal");
    if(!modal) return;

    const content=modal.querySelector(".product-content");
    if(!content) return;

    // Remove o bloco "Tamanho" e seus dois botões.
    const titles=[...content.querySelectorAll(".option-title")];
    const sizeTitle=titles.find(x=>x.textContent.trim().toLowerCase().startsWith("tamanho"));
    if(sizeTitle){
      const options=sizeTitle.nextElementSibling;
      sizeTitle.remove();
      options?.remove();
    }

    // Se houver um título de sabor, deixa apenas "Escolha 1 sabor".
    const flavorTitle=[...content.querySelectorAll(".option-title")]
      .find(x=>x.textContent.toLowerCase().includes("sabor"));
    if(flavorTitle) flavorTitle.innerHTML="Escolha 1 sabor";

    // Remove qualquer seletor de tamanho que tenha sobrado.
    content.querySelectorAll(".pastel-size").forEach(x=>x.remove());
  }

  // Funciona mesmo se outro script tiver substituído openProduct.
  const oldOpen=window.openProduct;
  if(typeof oldOpen==="function"){
    window.openProduct=function(pid){
      const result=oldOpen(pid);
      // cliente_opcoes.js é assíncrono; dá alguns ciclos para o modal terminar.
      setTimeout(limparTamanho,0);
      setTimeout(limparTamanho,80);
      setTimeout(limparTamanho,250);
      return result;
    };
  }

  // O app.js antigo exige .pastel-size.selected.
  // Como o tamanho já é o próprio produto, criamos esse valor internamente
  // somente no momento de adicionar, sem mostrar o seletor ao cliente.
  const oldAdd=window.addCurrent;
  if(typeof oldAdd==="function"){
    window.addCurrent=function(pid){
      const p=window.currentProduct;
      if(!isPastel(p)){
        return oldAdd(pid);
      }

      const content=document.getElementById("productBody");
      if(!content) return;

      const flavor=content.querySelector(".pastel-flavor.selected");
      if(!flavor){
        alert("Escolha 1 sabor.");
        return;
      }

      // Cria um seletor interno, invisível, usando o preço do produto atual.
      let fake=content.querySelector(".pastel-size.ml-hidden-size");
      if(!fake){
        fake=document.createElement("button");
        fake.type="button";
        fake.className="pastel-size ml-hidden-size selected";
        fake.dataset.size=String(p?.nome || "").match(/grande|g\b/i) ? "G" : "M";
        fake.dataset.price=String(Number(p?.preco||0));
        fake.style.display="none";
        content.appendChild(fake);
      }
      fake.classList.add("selected");

      return oldAdd(pid);
    };
  }

  // Se o modal foi aberto antes deste script executar, corrige também.
  setTimeout(limparTamanho,50);
})();

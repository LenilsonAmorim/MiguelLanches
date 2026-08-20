
(function(){
  const $=id=>document.getElementById(id);
  let digits="";

  const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const total=()=>Number($("checkoutTotal")?.dataset.value||0);

  function render(){
    const input=$("cashValue"), out=$("change"), err=$("cashError");
    if(!input)return;
    input.value=digits?digits+",00":"";
    const paid=Number(digits||0), t=total();
    if(!digits){ if(out)out.textContent="R$ 0,00"; if(err)err.textContent=""; return; }
    if(paid<t){
      if(out)out.textContent="R$ 0,00";
      if(err)err.textContent="Valor insuficiente. Faltam "+money(t-paid)+".";
    }else{
      if(out)out.textContent=money(paid-t);
      if(err)err.textContent="";
    }
  }

  function setupMoney(){
    const input=$("cashValue");
    if(!input)return;
    digits=(input.value||"").replace(/\D/g,"").replace(/^0+(?=\d)/,"");
    render();
    input.addEventListener("beforeinput",e=>{
      if(e.inputType==="insertText" && /\d/.test(e.data||"")){
        e.preventDefault();digits+=e.data.replace(/\D/g,"");digits=digits.replace(/^0+(?=\d)/,"");render();
      }else if(e.inputType==="deleteContentBackward"){
        e.preventDefault();digits=digits.slice(0,-1);render();
      }else if(e.inputType==="insertFromPaste"){
        e.preventDefault();digits=String(e.data||"").replace(/\D/g,"").replace(/^0+(?=\d)/,"");render();
      }
    });
    input.addEventListener("input",()=>{
      const raw=input.value, d=raw.replace(/\D/g,"");
      digits=raw.endsWith(",00")&&d.length>=2?d.slice(0,-2):d;
      digits=digits.replace(/^0+(?=\d)/,"");render();
    });
  }

  // IMPORTANT: this is the actual customer -> Supabase -> Admin path.
  // We write the exact fields the Admin reads: Cliente + observacoes with
  // [ML_ITENS] and [ML_STATUS]novo[/ML_STATUS].
  async function sendOrder(e){
    e.preventDefault();

    if(!window.db)return alert("Sistema ainda está carregando. Tente novamente.");
    if(!window.cart || !cart.length)return alert("Sua sacola está vazia.");
    if(!window.receiveMethod)return alert("Escolha Entrega ou Retirada.");
    if(!$("customerName").value.trim()||!$("customerPhone").value.trim())return alert("Informe nome e WhatsApp.");
    if(!$("payment").value)return alert("Escolha a forma de pagamento.");

    const delivery=receiveMethod==="entrega";
    if(delivery&&!$("address").value.trim())return alert("Informe o endereço.");

    const t=total();
    let paid=null;
    if($("payment").value==="Dinheiro"){
      paid=Number(digits||0);
      if(!paid)return alert("Informe o valor que você vai pagar.");
      if(paid<t){render();return alert("O valor pago precisa ser igual ou maior que o total.");}
    }

    const cliente=$("customerName").value.trim();
    const telefone=$("customerPhone").value.trim();
    const observacao=$("orderNote").value.trim();

    if(delivery)localStorage.setItem("miguel_lanches_cliente_v1",JSON.stringify({
      nome:cliente,telefone,
      bairro:$("neighborhood")?.value||"",
      endereco:$("address").value.trim(),
      referencia:$("reference").value.trim()
    }));
    localStorage.setItem("miguel_lanches_ultimo_telefone",telefone);

    const packed=[
      observacao,
      `[ML_ITENS]${encodeURIComponent(JSON.stringify(cart))}[/ML_ITENS]`,
      `[ML_RECEBIMENTO]${receiveMethod}[/ML_RECEBIMENTO]`,
      `[ML_PAGAMENTO]${$("payment").value}[/ML_PAGAMENTO]`,
      `[ML_STATUS]novo[/ML_STATUS]`
    ].filter(Boolean).join("\n");

    const payload={
      Cliente:cliente,
      telefone,
      endereco:delivery?$("address").value.trim():"",
      referencia:delivery?$("reference").value.trim():"",
      observacoes:packed,
      total:t
    };

    const btn=e.submitter;
    if(btn){btn.disabled=true;btn.dataset.oldText=btn.textContent;btn.textContent="Enviando...";}

    try{
      const r=await window.db.from("pedidos").insert(payload).select("id").maybeSingle();
      if(r.error){
        console.error("Erro ao enviar pedido:",r.error);
        alert("Não foi possível enviar o pedido. "+(r.error.message||"Verifique a conexão."));
        return;
      }

      // O Admin escuta realtime na tabela pedidos. Assim que este INSERT
      // acontece, o pedido aparece em Pedidos novos/Comandas.
      const num=r.data?.id||Math.floor(Math.random()*9000+1000);
      window.cart=[];
      if(typeof window.renderCart==="function")window.renderCart();
      if(typeof window.closeCheckout==="function")window.closeCheckout();
      if($("orderNumber"))$("orderNumber").textContent=`Pedido #${num}`;
      $("successModal")?.classList.remove("hidden");
    }finally{
      if(btn){btn.disabled=false;btn.textContent=btn.dataset.oldText||"Enviar pedido";}
    }
  }

  function setup(){
    setupMoney();
    const form=$("checkoutForm");
    if(form)form.onsubmit=sendOrder;
    $("payment")?.addEventListener("change",()=>{
      if($("payment").value!=="Dinheiro"){digits="";render();}
    });
    $("cashValue")?.addEventListener("input",render);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);
  else setup();
})();

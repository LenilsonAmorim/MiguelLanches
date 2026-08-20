
(function(){
  const $=id=>document.getElementById(id);
  let digits="";

  function money(v){
    return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  }
  function parseMoney(v){
    let s=String(v||"").replace(/\s/g,"");
    if(!s)return 0;
    if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");
    return Number(s)||0;
  }
  function total(){
    return Number($("checkoutTotal")?.dataset.value||0);
  }
  function render(){
    const input=$("cashValue"), out=$("change"), err=$("cashError");
    if(!input)return;
    input.value=digits?digits+",00":"";
    const paid=Number(digits||0);
    const t=total();
    if(!digits){
      if(out)out.textContent="R$ 0,00";
      if(err)err.textContent="";
      return;
    }
    if(paid<t){
      if(out)out.textContent="R$ 0,00";
      if(err)err.textContent="Valor insuficiente. Faltam "+money(t-paid)+".";
    }else{
      if(out)out.textContent=money(paid-t);
      if(err)err.textContent="";
    }
    try{input.setSelectionRange(digits.length,digits.length)}catch(e){}
  }

  function setup(){
    const input=$("cashValue"), payment=$("payment"), form=$("checkoutForm");
    if(!input||!payment||!form)return;

    digits=(input.value||"").replace(/\D/g,"").replace(/^0+(?=\d)/,"");
    render();

    input.addEventListener("beforeinput",function(e){
      if(e.inputType==="insertText" && /\d/.test(e.data||"")){
        e.preventDefault();
        digits+=String(e.data).replace(/\D/g,"");
        digits=digits.replace(/^0+(?=\d)/,"");
        render(); return;
      }
      if(e.inputType==="deleteContentBackward"||e.inputType==="deleteContentForward"){
        e.preventDefault();digits=digits.slice(0,-1);render();return;
      }
      if(e.inputType==="insertFromPaste"){
        e.preventDefault();
        digits=String(e.data||"").replace(/\D/g,"").replace(/^0+(?=\d)/,"");
        render();
      }
    });
    input.addEventListener("input",function(){
      // Android keyboards may bypass beforeinput.
      const raw=input.value;
      const d=raw.replace(/\D/g,"");
      if(raw.endsWith(",00") && d.length>=2) digits=d.slice(0,-2).replace(/^0+(?=\d)/,"");
      else if(d) digits=d.replace(/^0+(?=\d)/,"");
      else digits="";
      render();
    });
    payment.addEventListener("change",function(){
      if(payment.value!=="Dinheiro"){digits="";render();}
      else render();
    });

    // app.js installs its own onsubmit handler. Wrap that real handler so the
    // database schema and all existing order logic stay intact.
    const originalSubmit=form.onsubmit;
    form.onsubmit=async function(e){
      if(payment.value==="Dinheiro"){
        const paid=Number(digits||0), t=total();
        if(!digits){
          e.preventDefault();if($("cashError"))$("cashError").textContent="Informe o valor que você vai pagar.";return false;
        }
        if(paid<t){
          e.preventDefault();render();return false;
        }
        const old=input.value;
        input.value=paid.toFixed(2);
        try{
          const phone=$("customerPhone")?.value.trim()||"";
          const result=await originalSubmit.call(this,e);
          // Save phone; tracking page will find the newest order for this phone.
          if(phone)localStorage.setItem("miguel_lanches_ultimo_telefone",phone);
          return result;
        }finally{
          if(document.body.contains(input))input.value=old;
        }
      }

      const phone=$("customerPhone")?.value.trim()||"";
      const result=await originalSubmit.call(this,e);
      if(phone)localStorage.setItem("miguel_lanches_ultimo_telefone",phone);
      return result;
    };

    // app.js writes the success modal. Keep the requested two actions.
    $("trackOrderBtn")?.addEventListener("click",function(){
      if(localStorage.getItem("miguel_lanches_ultimo_telefone")) location.href="acompanhar-pedido.html";
      else alert("Você ainda não tem um pedido.");
    });
    $("successClose")?.addEventListener("click",function(){location.reload();});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);
  else setup();
})();

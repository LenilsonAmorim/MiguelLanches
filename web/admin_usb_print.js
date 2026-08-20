/* MIGUEL LANCHES — IMPRESSÃO USB ESC/POS 58 mm
   Compatível com impressoras térmicas USB que expõem uma interface
   de saída ESC/POS, incluindo VS-5890C/Luogao em ambientes compatíveis
   com WebUSB.
*/
(() => {
  "use strict";

  let device = null;
  let endpoint = null;
  let iface = null;

  const strip = s => String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n\r]/g, "");

  const money = v => Number(v || 0).toLocaleString("pt-BR", {
    style:"currency", currency:"BRL"
  });

  function itemsOf(v) {
    const m = String(v || "").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/);
    if (!m) return [];
    try { return JSON.parse(decodeURIComponent(m[1])); } catch { return []; }
  }

  function fit(s,n=32) {
    s=strip(s);
    return s.length>n ? s.slice(0,n) : s.padEnd(n," ");
  }

  function twoCol(a,b,n=32) {
    a=strip(a); b=strip(b);
    if (a.length+b.length+1>n) a=a.slice(0,Math.max(0,n-b.length-1));
    return a + " ".repeat(Math.max(1,n-a.length-b.length)) + b;
  }

  function receipt(order) {
    const lines=[];
    const sep="--------------------------------";
    const id=String(order?.id ?? "").slice(-5).padStart(3,"0");
    const items=itemsOf(order?.observacoes);

    lines.push("\x1B\x40");                 // init
    lines.push("\x1B\x61\x01");             // center
    lines.push("MIGUEL LANCHES");
    lines.push("\x1B\x61\x00");             // left
    lines.push(sep);
    lines.push("PEDIDO: #"+id);
    if(order?.created_at) lines.push("DATA/HORA: "+new Date(order.created_at).toLocaleString("pt-BR"));
    lines.push("");
    lines.push("CLIENTE: "+strip(order?.cliente || order?.Cliente || "Cliente"));
    if(order?.endereco) lines.push("ENDERECO: "+strip(order.endereco));
    if(order?.referencia) lines.push("REF: "+strip(order.referencia));
    lines.push(sep);
    lines.push(fit("QTD  ITEM                         VALOR"));
    lines.push(sep);

    if(items.length){
      items.forEach(i=>{
        const q=Number(i.quantidade||1);
        const total=Number(i.preco||0)*q;
        let name=strip(i.nome||"Item");
        lines.push(twoCol(`${String(q).padStart(2,"0")}   ${name}`,money(total)));
      });
    } else {
      lines.push("Itens do pedido");
    }

    lines.push(sep);
    lines.push(twoCol("TOTAL:",money(order?.total)));
    if(order?.observacoes){
      const clean=String(order.observacoes)
        .replace(/\[ML_ITENS\][\s\S]*?\[\/ML_ITENS\]/,"")
        .replace(/\[ML_STATUS\].*?\[\/ML_STATUS\]/g,"")
        .trim();
      if(clean){
        lines.push(sep);
        lines.push("OBSERVACOES:");
        clean.split(/\r?\n/).forEach(x=>{if(x.trim()) lines.push(strip(x.trim()).slice(0,32));});
      }
    }
    lines.push(sep);
    lines.push("\x1B\x61\x01");
    lines.push("OBRIGADO!");
    lines.push("\x1B\x64\x04");             // feed
    lines.push("\x1D\x56\x00");             // cut if supported
    return new TextEncoder().encode(lines.join("\n")+"\n");
  }

  async function findEndpoint() {
    if(!device) throw new Error("Impressora não conectada.");

    if(!device.opened) await device.open();
    if(!device.configuration) await device.selectConfiguration(1);

    for(const intf of device.configuration.interfaces){
      for(const alt of intf.alternates){
        const out=alt.endpoints.find(e=>e.direction==="out" && (e.type==="bulk" || e.type==="interrupt"));
        if(out){
          await device.claimInterface(intf.interfaceNumber);
          iface=intf.interfaceNumber;
          endpoint=out.endpointNumber;
          return;
        }
      }
    }
    throw new Error("Não encontrei uma saída USB para a impressora.");
  }

  async function connect() {
    if(!("usb" in navigator)) {
      throw new Error("Este navegador não oferece WebUSB. Use Chrome/Chromium em um ambiente compatível.");
    }
    if(!device){
      device=await navigator.usb.requestDevice({filters:[]});
    }
    await findEndpoint();
    try{ localStorage.setItem("ml_usb_printer","1"); }catch(_){}
  }

  async function send(data){
    if(!device || endpoint===null) await connect();

    const chunk=512;
    for(let i=0;i<data.length;i+=chunk){
      await device.transferOut(endpoint,data.slice(i,i+chunk));
    }
  }

  async function printUsb(order){
    try{
      await send(receipt(order));
      if(typeof window.toast==="function") window.toast("Impressão enviada para a impressora USB.");
    }catch(err){
      console.error(err);
      if(typeof window.toast==="function") window.toast("Impressora USB: "+err.message);
      alert("Não foi possível imprimir pela USB.\n\n"+err.message+
            "\n\nSe o navegador não suportar WebUSB, use o botão de impressão normal do computador.");
    }
  }

  function intercept(){
    document.addEventListener("click", e=>{
      const btn=e.target.closest?.("[data-print]");
      if(!btn) return;

      // Captura antes do handler atual do admin.js.
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const id=String(btn.dataset.print);
      const orders=window.orders || [];
      const order=orders.find(o=>String(o.id)===id);

      if(!order){
        alert("Pedido não encontrado para impressão.");
        return;
      }
      printUsb(order);
    }, true);
  }

  // Botão opcional para conectar/testar a impressora no painel.
  function addConnectButton(){
    const topbar=document.querySelector(".topbar");
    if(!topbar || document.getElementById("usbPrinterBtn")) return;

    const b=document.createElement("button");
    b.id="usbPrinterBtn";
    b.type="button";
    b.className="btn";
    b.textContent="USB";
    b.title="Conectar impressora térmica USB";
    b.onclick=async()=>{
      try{
        await connect();
        b.textContent="USB ✓";
        if(typeof window.toast==="function") window.toast("Impressora USB conectada.");
      }catch(e){
        if(typeof window.toast==="function") window.toast(e.message);
        else alert(e.message);
      }
    };
    topbar.appendChild(b);
  }

  function boot(){
    intercept();
    addConnectButton();
  }

  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();

  window.mlUsbPrint=printUsb;
  window.mlUsbConnect=connect;
})();

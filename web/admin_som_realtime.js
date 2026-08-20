/* Miguel Lanches — alerta sonoro de novo pedido + realtime */
(() => {
  "use strict";
  const C=window.ML_CONFIG||{};
  if(!window.supabase || !C.SUPABASE_URL || !C.SUPABASE_KEY) return;
  const R=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_KEY);
  let audioCtx=null;
  let armed=false;

  function arm(){
    if(armed)return;
    try{
      audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==="suspended") audioCtx.resume();
      armed=true;
    }catch(e){}
  }
  ["click","touchstart","keydown"].forEach(ev=>window.addEventListener(ev,arm,{once:true,passive:true}));

  function beep(){
    if(!audioCtx)return;
    try{
      if(audioCtx.state==="suspended") audioCtx.resume();
      const now=audioCtx.currentTime;
      [0,0.16,0.32].forEach((d,i)=>{
        const o=audioCtx.createOscillator(), g=audioCtx.createGain();
        o.type="sine";
        o.frequency.value=i===1?880:660;
        g.gain.setValueAtTime(0,now+d);
        g.gain.linearRampToValueAtTime(.16,now+d+.02);
        g.gain.exponentialRampToValueAtTime(.001,now+d+.12);
        o.connect(g);g.connect(audioCtx.destination);
        o.start(now+d);o.stop(now+d+.13);
      });
    }catch(e){}
  }

  // A new order only. No visual notification and no counter.
  R.channel("ml-admin-new-order-sound")
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"pedidos"},payload=>{
      beep();
      if(typeof window.load==="function") window.load();
   })
   .subscribe();

  // If the existing admin channel misses an update, refresh silently.
  R.channel("ml-admin-order-sync")
   .on("postgres_changes",{event:"UPDATE",schema:"public",table:"pedidos"},()=>{
      if(typeof window.load==="function") window.load();
   })
   .subscribe();
})();
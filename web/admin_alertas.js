/* MIGUEL LANCHES — ALERTA DE NOVO PEDIDO */
(() => {
  "use strict";
  let audioCtx = null;

  const $ = id => document.getElementById(id);

  function vibrate() {
    try {
      if ("vibrate" in navigator) navigator.vibrate([250,120,250,120,500]);
    } catch (_) {}
  }

  function testSound() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      if (!audioCtx) audioCtx = new AC();

      const play = () => {
        const now = audioCtx.currentTime;
        [0,.16,.32].forEach((d,i) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = "sine";
          o.frequency.value = i === 1 ? 880 : 660;
          g.gain.setValueAtTime(.0001, now+d);
          g.gain.exponentialRampToValueAtTime(.18, now+d+.02);
          g.gain.exponentialRampToValueAtTime(.001, now+d+.13);
          o.connect(g); g.connect(audioCtx.destination);
          o.start(now+d); o.stop(now+d+.14);
        });
      };

      if (audioCtx.state === "suspended") audioCtx.resume().then(play).catch(()=>{});
      else play();
      return true;
    } catch (_) { return false; }
  }

  function armAlerts() {
    testSound();
    vibrate();
    const btn = $("enableAlerts");
    if (btn) {
      btn.textContent = "🔔 Alertas ativados";
      btn.classList.add("enabled");
    }
    try { localStorage.setItem("ml_admin_alerts_armed","1"); } catch (_) {}
  }

  function addButton() {
    if (!$("app") || $("enableAlerts")) return;
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;

    const btn = document.createElement("button");
    btn.id = "enableAlerts";
    btn.type = "button";
    btn.className = "btn alert-enable";
    btn.textContent = "🔔 Ativar alertas";
    btn.title = "Permitir som e vibração para novos pedidos";
    btn.onclick = armAlerts;
    topbar.appendChild(btn);
  }

  function setupVibrationRealtime() {
    if (!window.db) return;
    if (window.mlVibrationChannel) {
      try { window.db.removeChannel(window.mlVibrationChannel); } catch (_) {}
    }

    window.mlVibrationChannel = window.db
      .channel("miguel-lanches-alerta-vibracao")
      .on("postgres_changes", {
        event:"INSERT", schema:"public", table:"pedidos"
      }, () => vibrate())
      .subscribe();
  }

  function boot() {
    addButton();
    setupVibrationRealtime();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();

  window.mlArmAlerts = armAlerts;
  window.mlVibrateNewOrder = vibrate;
})();

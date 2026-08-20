/* Miguel Lanches — vibração para novo pedido */
(() => {
  "use strict";
  window.mlVibrateNewOrder = function () {
    try {
      if ("vibrate" in navigator) navigator.vibrate([250,120,250,120,500]);
    } catch (_) {}
  };

  if (window.db) {
    const channel = window.db
      .channel("miguel-lanches-vibracao")
      .on("postgres_changes", {
        event:"INSERT",
        schema:"public",
        table:"pedidos"
      }, () => window.mlVibrateNewOrder())
      .subscribe();

    window.mlVibrationChannel = channel;
  }
})();

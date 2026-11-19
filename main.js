/* CYBER BOTS - main.js
   Start, Spielschleife mit festem Zeitschritt, Fenstergroesse, automatische Pause. */
(function (CB) {
  "use strict";

  var W = CB.W, H = CB.H;
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");

  CB.Save.load();
  // Auf Touch-Geraeten ist Auto-Fire beim allerersten Start an
  if (CB.Save.fresh && (("ontouchstart" in window) || navigator.maxTouchPoints > 0)) {
    CB.Save.data.settings.autoFire = true;
    CB.Save.save();
  }

  CB.Input.bindCanvas(canvas);
  CB.Input.bindTouchButtons(document.getElementById("touch"));
  CB.UI.init();

  // Spielflaeche an das Fenster anpassen (16:9, ohne Verzerrung)
  function resize() {
    var u = Math.min(window.innerWidth / W, window.innerHeight / H);
    document.documentElement.style.setProperty("--u", Math.max(0.5, u).toFixed(4));
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", resize);
  resize();

  // Audio darf erst nach einer Nutzeraktion starten
  var audioStarted = false;
  function startAudio() {
    if (audioStarted) return;
    audioStarted = true;
    CB.Audio.init();
  }
  window.addEventListener("pointerdown", startAudio, { once: false });
  CB.Input.onAnyKey = startAudio;

  // Automatisch pausieren, wenn der Tab verlassen wird
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { CB.UI.pause(); CB.Save.save(); }
  });
  window.addEventListener("beforeunload", function () { CB.Save.save(); });

  // Spielschleife: Logik in festen 1/60-Sekunden-Schritten, Zeichnen so oft wie moeglich
  var last = performance.now(), acc = 0;
  function frame(now) {
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;           // nach Tab-Wechsel nicht "aufholen"
    acc += dt;
    CB.Input.pollGamepad();             // Controller einmal pro Bild abfragen
    CB.UI.syncMode();
    while (acc >= CB.STEP) {
      CB.Game.update(CB.STEP);
      acc -= CB.STEP;
    }
    CB.Render.draw(ctx, CB.Game);
    CB.UI.updateHud();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.CYBERBOTS = CB;   // zum Debuggen in der Browser-Konsole
})(window.CB);

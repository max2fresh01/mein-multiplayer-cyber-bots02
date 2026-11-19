/* CYBER BOTS - input.js
   Tastatur, Maus und Touch. Die Spiellogik liest nur CB.Input.state. */
(function (CB) {
  "use strict";

  var W = CB.W, H = CB.H;

  var Input = {
    left: false, right: false, jump: false, drop: false,
    fire: false,                 // linke Maustaste oder Touch-Feuerknopf
    pointerAim: true,            // false, wenn per Feuerknopf (ohne Zielpunkt) geschossen wird
    mouse: { x: W / 2, y: H / 2, active: false },
    touchMode: false,            // zuletzt per Touch bedient?
    jumpBuffer: 0,               // kurzer Puffer, damit knappes Springen klappt
    abilityQueued: false,
    // Controller (Gamepad-API, Xbox-Layout)
    padMode: false,              // true, solange zuletzt der Controller benutzt wurde
    padConnected: false,
    padMove: 0, padJump: false, padDrop: false, padFire: false,
    padAim: { x: 1, y: 0, mag: 0 },
    onPause: null, onAuto: null, onAnyKey: null,
    onNav: null, onConfirm: null, onBack: null, onPadWake: null,
    canvas: null
  };

  var keyMap = {
    KeyA: "left", ArrowLeft: "left",
    KeyD: "right", ArrowRight: "right",
    Space: "jump", KeyW: "jump", ArrowUp: "jump",
    KeyS: "drop", ArrowDown: "drop"
  };

  function inGame() { return CB.Game && (CB.Game.state === "playing"); }

  function typing(e) { var t = e.target && e.target.tagName; return t === "INPUT" || t === "SELECT" || t === "TEXTAREA"; }
  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
    Input.padMode = false;
    if (Input.onAnyKey) Input.onAnyKey();
    var k = keyMap[e.code];
    if (k) {
      if (inGame() && (e.code === "Space" || e.code.indexOf("Arrow") === 0)) e.preventDefault();
      if (k === "jump" && !Input.jump) Input.jumpBuffer = 0.14;
      Input[k] = true;
      Input.touchMode = false;
      return;
    }
    if (e.repeat) return;
    if (e.code === "KeyF") { if (Input.onAuto) Input.onAuto(); }
    else if (e.code === "Escape") { if (Input.onPause) Input.onPause(); }
    else if (e.code === "KeyQ" || e.code === "KeyE" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
      if (inGame()) { Input.abilityQueued = true; e.preventDefault(); }
    }
  });

  window.addEventListener("keyup", function (e) {
    var k = keyMap[e.code];
    if (k) Input[k] = false;
  });

  function reset() {
    Input.left = Input.right = Input.jump = Input.drop = Input.fire = false;
    Input.padMove = 0; Input.padJump = Input.padDrop = Input.padFire = false;
    Input.abilityQueued = false;
  }
  window.addEventListener("blur", reset);

  // Mausposition in Spielkoordinaten (480x270) umrechnen
  function setMouse(clientX, clientY) {
    var c = Input.canvas;
    if (!c) return;
    var r = c.getBoundingClientRect();
    Input.mouse.x = (clientX - r.left) / r.width * W;
    Input.mouse.y = (clientY - r.top) / r.height * H;
    Input.mouse.active = true;
  }

  Input.bindCanvas = function (canvas) {
    Input.canvas = canvas;
    var activeId = null;           // welcher Finger / welche Maus feuert gerade
    canvas.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      Input.padMode = false;
      Input.touchMode = e.pointerType !== "mouse";
      Input.pointerAim = true;
      setMouse(e.clientX, e.clientY);
      Input.fire = true;
      activeId = e.pointerId;
      if (e.pointerType !== "mouse") { try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* egal */ } }
    });
    canvas.addEventListener("pointermove", function (e) {
      if (e.pointerType === "mouse") { Input.touchMode = false; if (Input.padMode && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) Input.padMode = false; }
      if (e.pointerType === "mouse" || e.pointerId === activeId) setMouse(e.clientX, e.clientY);
    });
    canvas.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "mouse") Input.mouse.active = false;
    });
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    function release(e) {
      if (e.pointerId === activeId || (e.pointerType === "mouse" && e.button === 0)) { Input.fire = false; activeId = null; }
    }
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  };

  // Touch-Knoepfe: data-key="left|right|jump|fire|ability|pause"
  Input.bindTouchButtons = function (root) {
    var buttons = root.querySelectorAll("[data-key]");
    Array.prototype.forEach.call(buttons, function (btn) {
      var key = btn.getAttribute("data-key");
      var held = {};
      function down(e) {
        e.preventDefault();
        Input.touchMode = true; Input.padMode = false;
        if (Input.onAnyKey) Input.onAnyKey();
        held[e.pointerId] = true;
        btn.classList.add("down");
        try { btn.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
        if (key === "ability") Input.abilityQueued = true;
        else if (key === "pause") { if (Input.onPause) Input.onPause(); }
        else if (key === "auto") { if (Input.onAuto) Input.onAuto(); }
        else if (key === "fire") { Input.fire = true; Input.pointerAim = false; }
        else if (key === "jump") { if (!Input.jump) Input.jumpBuffer = 0.14; Input.jump = true; }
        else Input[key] = true;
      }
      function up(e) {
        if (!held[e.pointerId]) return;
        delete held[e.pointerId];
        if (Object.keys(held).length) return;
        btn.classList.remove("down");
        if (key === "fire") Input.fire = false;
        else if (key === "left" || key === "right" || key === "jump") Input[key] = false;
      }
      btn.addEventListener("pointerdown", down);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointercancel", up);
      btn.addEventListener("lostpointercapture", up);
      btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    });
  };


  // ---------- Controller (Xbox / Standard-Gamepad-Layout) ----------
  // A = Springen, B/X/LB = Spezialfaehigkeit, Y = Auto-Fire, RT/RB = Schiessen,
  // Linker Stick / Steuerkreuz = Bewegen, Rechter Stick = Zielen, Start = Pause.
  var BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
  var prevBtn = [], nav = { dir: "", next: 0 }, lastRumble = 0;

  function getPad() {
    var list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].connected) return list[i];
    return null;
  }
  function down(g, i) {
    var b = g.buttons[i];
    return !!b && (typeof b === "object" ? (b.pressed || b.value > 0.5) : b === 1);
  }
  function analog(g, i) {
    var b = g.buttons[i];
    return b ? (typeof b === "object" ? Math.max(b.value || 0, b.pressed ? 1 : 0) : b) : 0;
  }
  function stickZero(v, dz) {
    var a = Math.abs(v);
    return a < dz ? 0 : (v < 0 ? -1 : 1) * Math.min(1, (a - dz) / (1 - dz));
  }

  Input.pollGamepad = function () {
    var g = getPad();
    if (!g) {
      if (Input.padConnected) { Input.padConnected = false; Input.padMove = 0; Input.padJump = Input.padDrop = Input.padFire = false; Input.padAim.mag = 0; }
      return;
    }
    Input.padConnected = true;
    var i, now = performance.now(), cur = [], edge = [];
    for (i = 0; i < 17; i++) { cur[i] = down(g, i); edge[i] = cur[i] && !prevBtn[i]; }
    prevBtn = cur;

    var lx = g.axes[0] || 0, ly = g.axes[1] || 0, rx = g.axes[2] || 0, ry = g.axes[3] || 0;
    var lmag = Math.hypot(lx, ly), rmag = Math.hypot(rx, ry);

    // Wenn der Controller benutzt wird, wechselt das Spiel in den Controller-Modus
    var d = "";                                 // gehaltene Menue-Richtung
    if (cur[BTN.UP] || ly < -0.6) d = "up";
    else if (cur[BTN.DOWN] || ly > 0.6) d = "down";
    else if (cur[BTN.LEFT] || lx < -0.6) d = "left";
    else if (cur[BTN.RIGHT] || lx > 0.6) d = "right";

    var active = lmag > 0.5 || rmag > 0.5 || analog(g, BTN.RT) > 0.5 || analog(g, BTN.LT) > 0.5;
    for (i = 0; i < 16 && !active; i++) if (cur[i]) active = true;
    if (active && !Input.padMode) {
      Input.padMode = true; Input.touchMode = false;
      nav.dir = d; nav.next = now + 380;        // die Aufweck-Richtung zaehlt nicht als Navigation
      if (Input.onPadWake) Input.onPadWake();
      return;                                   // der erste Tastendruck weckt nur den Controller-Modus auf
    }
    if (!Input.padMode) {                       // Tastatur/Maus aktiv: Controller-Werte neutral halten
      Input.padMove = 0; Input.padJump = Input.padDrop = Input.padFire = false; Input.padAim.mag = 0;
      return;
    }

    var state = CB.Game ? CB.Game.state : "menu";
    var mx = stickZero(lx, 0.22);
    if (cur[BTN.LEFT]) mx = -1; else if (cur[BTN.RIGHT]) mx = 1;

    if (edge[BTN.START] && Input.onPause) Input.onPause();

    if (state === "playing") {
      Input.padMove = mx;
      Input.padJump = cur[BTN.A];
      if (edge[BTN.A]) Input.jumpBuffer = 0.14;
      Input.padDrop = cur[BTN.DOWN] || ly > 0.75;
      Input.padFire = cur[BTN.RB] || analog(g, BTN.RT) > 0.3;
      if (edge[BTN.B] || edge[BTN.X] || edge[BTN.LB]) Input.abilityQueued = true;
      if (edge[BTN.Y] && Input.onAuto) Input.onAuto();
      var rm = Math.hypot(rx, ry);
      if (rm > 0.3) { Input.padAim.x = rx / rm; Input.padAim.y = ry / rm; Input.padAim.mag = Math.min(1, rm); }
      else Input.padAim.mag = 0;
      nav.dir = "";
      return;
    }

    // Menues: Steuerkreuz / linker Stick navigiert, A bestaetigt, B geht zurueck
    Input.padMove = 0; Input.padJump = Input.padDrop = Input.padFire = false; Input.padAim.mag = 0;
    if (state === "dying" || state === "won") return;
    if (!d) nav.dir = "";
    else if (d !== nav.dir || now >= nav.next) {
      var first = d !== nav.dir;
      nav.dir = d; nav.next = now + (first ? 380 : 140);
      if (Input.onNav) Input.onNav(d);
    }
    if (edge[BTN.A] && Input.onConfirm) Input.onConfirm();
    if (edge[BTN.B] && Input.onBack) Input.onBack();
  };

  // Vibration (nur im Controller-Modus und wenn in den Einstellungen aktiviert)
  Input.rumble = function (strong, weak, ms) {
    if (!Input.padMode || !CB.Save || !CB.Save.data.settings.rumble) return;
    var now = performance.now();
    if (now - lastRumble < 60) return;
    lastRumble = now;
    var g = getPad();
    if (!g) return;
    var a = g.vibrationActuator || (g.hapticActuators && g.hapticActuators[0]);
    try {
      if (a && a.playEffect) a.playEffect("dual-rumble", { startDelay: 0, duration: ms, weakMagnitude: weak, strongMagnitude: strong });
      else if (a && a.pulse) a.pulse(Math.max(strong, weak), ms);
    } catch (e) { /* Vibration nicht verfuegbar */ }
  };

  window.addEventListener("gamepadconnected", function () {
    if (CB.UI && CB.UI.toast) CB.UI.toast("CONTROLLER CONNECTED - PRESS ANY BUTTON", "good");
  });
  window.addEventListener("gamepaddisconnected", function () {
    Input.padConnected = false; Input.padMove = 0; Input.padJump = Input.padDrop = Input.padFire = false; Input.padAim.mag = 0;
    if (CB.UI && CB.UI.toast) CB.UI.toast("CONTROLLER DISCONNECTED", "bad");
    // Beim Abziehen mitten im Spiel automatisch pausieren
    if (CB.Game && CB.Game.state === "playing" && Input.padMode && Input.onPause) Input.onPause();
  });

  Input.reset = reset;
  CB.Input = Input;
})(window.CB);

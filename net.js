/* CYBER BOTS - net.js
   Multiplayer-Client (WebSocket): Raeume, Lobby, Start, Mitspieler als "Geister" im Spiel.
   Jeder Spieler simuliert sein eigenes Spiel; der Server (server/server.js) reicht nur die Zustaende weiter. */
(function (CB) {
  "use strict";

  var COLORS = ["#35f0ff", "#ff2bd6", "#ffd23f", "#6bff8a"];
  var Net = {
    ws: null, connected: false, id: 0, name: "PLAYER", room: null, rooms: [], err: "", active: false,
    ghosts: {}, onChange: null, sectorAtStart: 0,
    sentDone: false, _tick: null
  };

  function changed() { if (Net.onChange) Net.onChange(); }
  function send(o) { if (Net.ws && Net.ws.readyState === 1) Net.ws.send(JSON.stringify(o)); }
  Net.send = send;

  function validUrl(u) { return /^wss?:\/\/[\w.\-]+(:\d{1,5})?(\/[\w.\-\/]*)?$/.test(u); }
  Net.validUrl = validUrl;

  Net.defaultUrl = function () {
    if (location.protocol === "http:" || location.protocol === "https:") return (location.protocol === "https:" ? "wss://" : "ws://") + location.host;
    return "ws://localhost:8080";
  };

  Net.connect = function (url, name) {
    Net.disconnect();
    Net.err = "";
    if (!validUrl(url)) { Net.err = "INVALID SERVER ADDRESS"; changed(); return; }
    Net.name = (name || "PLAYER").replace(/[^\w \-.!?]/g, "").slice(0, 12) || "PLAYER";
    var ws;
    try { ws = new WebSocket(url); } catch (e) { Net.err = "CONNECTION FAILED"; changed(); return; }
    Net.ws = ws; Net.err = "CONNECTING...";
    ws.onopen = function () {
      Net.connected = true; Net.err = "";
      send({ t: "hello", name: Net.name, robot: CB.Save.data.selRobot });
      send({ t: "list" });
      changed();
    };
    ws.onmessage = function (e) {
      var m; try { m = JSON.parse(e.data); } catch (x) { return; }
      onMsg(m);
    };
    ws.onclose = function () {
      var wasOpen = Net.connected;
      if (Net.ws === ws) { Net.ws = null; Net.connected = false; Net.room = null; Net.active = false; Net.ghosts = {}; if (!Net.err || Net.err === "CONNECTING...") Net.err = wasOpen ? "CONNECTION LOST" : "SERVER NOT REACHABLE"; changed(); }
    };
    ws.onerror = function () { /* onclose meldet den Fehler */ };
    changed();
  };

  Net.disconnect = function () {
    var ws = Net.ws; Net.ws = null; Net.connected = false; Net.room = null; Net.active = false; Net.ghosts = {};
    if (ws) { try { ws.close(); } catch (e) { /* */ } }
  };

  function onMsg(m) {
    switch (m.t) {
      case "welcome": Net.id = m.id; break;
      case "rooms": Net.rooms = Array.isArray(m.rooms) ? m.rooms : []; break;
      case "room":
        Net.room = m;
        Object.keys(Net.ghosts).forEach(function (k) { if (!m.players.some(function (p) { return String(p.id) === k; })) delete Net.ghosts[k]; });
        break;
      case "left":
        if (m.you) { Net.room = null; Net.active = false; Net.ghosts = {}; if (m.kicked) Net.err = "YOU WERE KICKED"; }
        else delete Net.ghosts[m.id];
        break;
      case "err": Net.err = String(m.msg || "ERROR").slice(0, 40); break;
      case "start": startGame(m); return;
      case "st": {
        var g = Net.ghosts[m.id];
        if (!g) { g = Net.ghosts[m.id] = { x: m.x, y: m.y }; }
        g.tx = m.x; g.ty = m.y; g.f = m.f; g.aim = m.aim; g.hp = m.hp; g.k = m.k; g.dead = !!m.dead; g.seen = performance.now();
        return;
      }
      case "ev":
        if (m.k === "done" && CB.UI && Net.active) CB.UI.toast((m.name || "PLAYER") + (m.result === "win" ? " CLEARED THE SECTOR" : " IS OUT"));
        break;
    }
    changed();
  }

  function startGame(m) {
    if (!CB.byId(CB.SECTORS, m.sector)) return;
    Net.active = true; Net.sentDone = false; Net.ghosts = {};
    if (!Net._tick) Net._tick = setInterval(tick, 66);
    CB.UI.launch(m.sector);
  }

  // Eigenen Zustand senden (~15x pro Sekunde), Ende melden
  function tick() {
    if (!Net.active || !Net.connected) return;
    var G = CB.Game, p = G.p;
    if (!p) return;
    if (G.state === "result" || G.state === "menu") {
      if (!Net.sentDone) { Net.sentDone = true; send({ t: "done", result: G.state === "result" && G.win ? "win" : "lose", k: G.run ? G.run.kills : 0 }); }
      return;
    }
    send({ t: "st", x: p.x, y: p.y, f: p.face < 0 ? -1 : 1, aim: p.aim || 0, hp: Math.max(0, p.hp / p.maxHp), k: G.run.kills, dead: !p.alive });
  }

  // Beim Verlassen des Spiels (Menue): Ende melden, aber im Raum bleiben
  Net.leaveGame = function () {
    if (Net.active && !Net.sentDone && Net.connected) { Net.sentDone = true; send({ t: "done", result: "lose", k: CB.Game.run ? CB.Game.run.kills : 0 }); }
    Net.active = false; Net.ghosts = {};
  };

  Net.createRoom = function (pub, sector) { send({ t: "create", pub: !!pub, sector: sector || 1 }); };
  Net.joinRoom = function (code) { send({ t: "join", code: String(code || "").toUpperCase().slice(0, 4) }); };
  Net.leaveRoom = function () { send({ t: "leave" }); };
  Net.setReady = function (v) { send({ t: "ready", v: !!v }); };
  Net.setSector = function (id) { send({ t: "sector", id: id }); };
  Net.setPublic = function (v) { send({ t: "pub", v: !!v }); };
  Net.kick = function (id) { send({ t: "kick", id: id }); };
  Net.start = function () { send({ t: "start" }); };
  Net.refresh = function () { send({ t: "list" }); };

  // Mitspieler zeichnen (Geister) + Team-Anzeige
  Net.draw = function (ctx, camX, t) {
    var room = Net.room, ids = Object.keys(Net.ghosts), i;
    var order = room ? room.players.map(function (p) { return p.id; }) : [];
    ctx.save();
    ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
    for (i = 0; i < ids.length; i++) {
      var g = Net.ghosts[ids[i]];
      if (performance.now() - g.seen > 4000) continue;                       // Spieler ist weg / Verbindung haengt
      g.x += (g.tx - g.x) * 0.35; g.y += (g.ty - g.y) * 0.35;                // glaetten
      var info = room && room.players.filter(function (p) { return String(p.id) === ids[i]; })[0];
      if (!info) continue;
      var spr = CB.Sprites.robot[info.robot] || CB.Sprites.robot.nova, img = spr.frames[0];
      var x = Math.round(g.x - camX), col = COLORS[Math.max(0, order.indexOf(info.id)) % 4];
      if (x < -40 || x > CB.W + 40) {                                        // Pfeil am Rand
        ctx.globalAlpha = 0.8; ctx.fillStyle = col; ctx.fillText(x < 0 ? "<" : ">", x < 0 ? 8 : CB.W - 8, 20); ctx.globalAlpha = 1; continue;
      }
      ctx.globalAlpha = g.dead ? 0.25 : 0.8;
      ctx.save(); ctx.translate(x, Math.round(g.y) + 1); if (g.f < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -(img.width >> 1), -img.height); ctx.restore();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#07031a"; ctx.fillText(info.name, x + 1, g.y - img.height - 3); ctx.fillStyle = col; ctx.fillText(info.name, x, g.y - img.height - 4);
      ctx.fillStyle = "#07031a"; ctx.fillRect(x - 10, g.y - img.height - 2, 20, 3); ctx.fillStyle = g.hp > 0.35 ? "#6bff8a" : "#ff4b6b"; ctx.fillRect(x - 9, g.y - img.height - 1, Math.round(18 * g.hp), 1);
    }
    // Team-Liste rechts oben
    if (room) {
      ctx.textAlign = "right";
      var y = 40, G = CB.Game;
      for (i = 0; i < room.players.length; i++) {
        var pl = room.players[i], me = pl.id === Net.id, gg = Net.ghosts[pl.id];
        var kills = me ? G.run.kills : gg ? gg.k : pl.kills, hp = me ? G.p.hp / G.p.maxHp : gg ? gg.hp : 1;
        ctx.fillStyle = "rgba(7,3,26,0.6)"; ctx.fillRect(CB.W - 92, y - 7, 88, 10);
        ctx.fillStyle = COLORS[i % 4]; ctx.fillText(pl.name.slice(0, 8), CB.W - 56, y);
        ctx.fillStyle = "#fff"; ctx.fillText(String(kills | 0), CB.W - 6, y);
        ctx.fillStyle = hp > 0.35 ? "#6bff8a" : "#ff4b6b"; ctx.fillRect(CB.W - 90, y + 1, Math.round(30 * Math.max(0, Math.min(1, hp))), 1);
        y += 11;
      }
    }
    ctx.restore();
  };

  CB.Net = Net;
})(window.CB);

/* CYBER BOTS - online.js
   Oberflaeche fuer den Online-Modus: Verbinden, Raum erstellen/beitreten, Lobby (Bereit/Start). */
(function (CB) {
  "use strict";
  var Net = CB.Net;
  function $(id) { return document.getElementById(id); }
  var KEY = "cyberbots-mp";

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function store(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* */ } }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }  // nur textContent -> kein HTML aus Fremddaten

  function secName(id) { var s = CB.byId(CB.SECTORS, id); return s ? String(id).padStart(2, "0") + " " + s.name : "?"; }

  function render() {
    var saved = load();
    if (!$("onUrl").value) $("onUrl").value = saved.url || Net.defaultUrl();
    if (!$("onName").value) $("onName").value = saved.name || "PLAYER";
    var conn = Net.connected, room = Net.room;
    $("onConn").hidden = conn;
    $("onLobby").hidden = !conn || !!room;
    $("onRoom").hidden = !room;
    $("onMsg").textContent = Net.err || "";

    if (conn && !room) {
      var list = $("onRooms"); list.textContent = "";
      if (!Net.rooms.length) list.appendChild(el("div", "on-item", "NO OPEN ROOMS"));
      Net.rooms.forEach(function (r) {
        var row = el("div", "on-item"), info = el("span", null, r.code + "  " + secName(r.sector) + "  " + r.n + "/" + r.max + "  (" + r.host + ")");
        var b = el("button", "btn small", "JOIN"); b.onclick = function () { CB.Audio.play("click"); Net.joinRoom(r.code); };
        row.appendChild(info); row.appendChild(b); list.appendChild(row);
      });
    }
    if (room) {
      var me = Net.id, host = room.host === me;
      $("onRoomCode").textContent = room.code;
      var pl = $("onPlayers"); pl.textContent = "";
      room.players.forEach(function (p) {
        var row = el("div", "on-item"), left = el("span", null, p.name + (p.id === room.host ? "  [HOST]" : "") + (p.id === me ? "  (YOU)" : ""));
        var right = el("span");
        var st = el("span", p.ready || p.id === room.host ? "tag ok" : "tag no", room.state === "play" ? (p.done ? (p.done === "win" ? "CLEARED" : "OUT") : "PLAYING") : (p.ready || p.id === room.host ? "READY" : "WAITING"));
        right.appendChild(st);
        if (host && p.id !== me && room.state === "lobby") { var k = el("button", "btn small", "KICK"); k.onclick = function () { Net.kick(p.id); }; right.appendChild(document.createTextNode(" ")); right.appendChild(k); }
        row.appendChild(left); row.appendChild(right); pl.appendChild(row);
      });
      $("onHost").hidden = !host;
      var sel = $("onSector");
      if (!sel.options.length) CB.SECTORS.forEach(function (s) { var o = document.createElement("option"); o.value = s.id; o.textContent = secName(s.id); sel.appendChild(o); });
      sel.value = String(room.sector); $("onPub2").checked = !!room.pub;
      if (!host) { var sline = $("onPlayers"); sline.appendChild(el("div", "on-item", "SECTOR: " + secName(room.sector))); }
      $("onStart").hidden = !host; $("onReady").hidden = host;
      var mine = room.players.filter(function (p) { return p.id === me; })[0];
      $("onReady").textContent = mine && mine.ready ? "NOT READY" : "READY";
      var lobby = room.state === "lobby";
      $("onStart").disabled = !lobby; $("onReady").disabled = !lobby;
      if (!lobby && !Net.err) $("onMsg").textContent = "GAME IN PROGRESS...";
    }
  }

  function init() {
    $("onConnect").onclick = function () {
      CB.Audio.init(); CB.Audio.play("click");
      var url = $("onUrl").value.trim(), name = $("onName").value.trim();
      store({ url: url, name: name });
      Net.connect(url, name);
    };
    $("onCreate").onclick = function () { CB.Audio.play("buy"); Net.createRoom($("onPub").checked, 1); };
    $("onJoin").onclick = function () { CB.Audio.play("click"); Net.joinRoom($("onCode").value); };
    $("onCode").addEventListener("keydown", function (e) { if (e.key === "Enter") Net.joinRoom($("onCode").value); });
    $("onRefresh").onclick = function () { Net.refresh(); };
    $("onSector").onchange = function () { Net.setSector(parseInt($("onSector").value, 10)); };
    $("onPub2").onchange = function () { Net.setPublic($("onPub2").checked); };
    $("onStart").onclick = function () { Net.err = ""; CB.Audio.play("buy"); Net.start(); };
    $("onReady").onclick = function () {
      var mine = Net.room && Net.room.players.filter(function (p) { return p.id === Net.id; })[0];
      Net.err = ""; CB.Audio.play("click"); Net.setReady(!(mine && mine.ready));
    };
    $("onLeave").onclick = function () { Net.err = ""; CB.Audio.play("click"); Net.leaveRoom(); };
    $("onBack").onclick = function () {
      CB.Audio.play("click");
      if (Net.room) Net.leaveRoom();
      Net.disconnect(); Net.err = "";
      CB.UI.show("main");
    };
    Net.onChange = function () { if (document.getElementById("scr-online").classList.contains("open")) render(); };
  }

  CB.Online = { render: render };
  init();
})(window.CB);

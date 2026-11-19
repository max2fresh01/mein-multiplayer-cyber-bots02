/* CYBER BOTS - Multiplayer-Server (ohne externe Pakete, nur Node.js >= 18)
   Startet:  node server/server.js            (Port 8080, oeffnet http://localhost:8080)
             PORT=3000 node server/server.js
   Aufgaben: 1) liefert das Spiel (Ordner darueber) per HTTP aus
             2) WebSocket-Raumserver: Raeume erstellen/beitreten (Code), Lobby, Bereit, Start, Spielerzustand weiterreichen
   Der Server ist ein Relay: jeder Spieler simuliert sein eigenes Spiel, die Mitspieler werden live als "Geister" angezeigt. */
"use strict";
var http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");

var PORT = parseInt(process.env.PORT, 10) || 8080;
var ROOT = path.resolve(__dirname, "..");
var MAX_PLAYERS = 4, MAX_ROOMS = 200, MAX_MSG = 2048, MAX_CONN = 1000;
var SECTOR_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
var ROBOT_IDS = null;   // wird nicht geprueft (nur Laenge/Zeichen), das Spiel faellt auf "nova" zurueck

// ---------------------------------------------------------------- HTTP (statische Dateien)
var MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };
var PUBLIC = /^\/(index\.html|favicon\.svg|css\/[\w.-]+|js\/[\w.-]+)?$/;

var server = http.createServer(function (req, res) {
  var url = (req.url || "/").split("?")[0];
  if (url === "/health") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ ok: true, rooms: rooms.size, players: clients.size })); }
  if (!PUBLIC.test(url)) { res.writeHead(404); return res.end("Not found"); }
  if (url === "/") url = "/index.html";
  var file = path.join(ROOT, url);
  if (file.indexOf(ROOT + path.sep) !== 0) { res.writeHead(403); return res.end(); }
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
    });
    res.end(data);
  });
});

// ---------------------------------------------------------------- WebSocket (RFC 6455, minimal)
var GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
var clients = new Map(), nextId = 1;

server.on("upgrade", function (req, socket) {
  var key = req.headers["sec-websocket-key"];
  if (!key || (req.headers.upgrade || "").toLowerCase() !== "websocket" || clients.size >= MAX_CONN) { socket.destroy(); return; }
  var accept = crypto.createHash("sha1").update(key + GUID).digest("base64");
  socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
  socket.setNoDelay(true);
  var c = { id: nextId++, socket: socket, buf: Buffer.alloc(0), name: "PLAYER", robot: "nova", room: null, alive: true, tokens: 80, tokT: Date.now(), frag: null };
  clients.set(c.id, c);
  socket.on("data", function (d) { onData(c, d); });
  socket.on("close", function () { drop(c); });
  socket.on("error", function () { drop(c); });
  send(c, { t: "welcome", id: c.id, max: MAX_PLAYERS, sectors: SECTOR_IDS });
});

function frame(op, payload) {
  var len = payload.length, head;
  if (len < 126) head = Buffer.from([0x80 | op, len]);
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([head, payload]);
}
function rawSend(c, buf) { if (c.socket.writable) { try { c.socket.write(buf); } catch (e) { /* ignorieren */ } } }
function send(c, obj) { rawSend(c, frame(0x1, Buffer.from(JSON.stringify(obj)))); }

function onData(c, d) {
  c.buf = Buffer.concat([c.buf, d]);
  if (c.buf.length > MAX_MSG * 4) return kill(c);
  while (c.buf.length >= 2) {
    var b0 = c.buf[0], b1 = c.buf[1], fin = !!(b0 & 0x80), op = b0 & 0x0f, masked = !!(b1 & 0x80), len = b1 & 0x7f, off = 2;
    if (!masked) return kill(c);                                  // Clients muessen maskieren
    if (len === 126) { if (c.buf.length < 4) return; len = c.buf.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (c.buf.length < 10) return; var big = c.buf.readBigUInt64BE(2); if (big > BigInt(MAX_MSG)) return kill(c); len = Number(big); off = 10; }
    if (len > MAX_MSG) return kill(c);
    if (c.buf.length < off + 4 + len) return;
    var mask = c.buf.slice(off, off + 4), data = Buffer.from(c.buf.slice(off + 4, off + 4 + len));
    for (var i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
    c.buf = c.buf.slice(off + 4 + len);
    if (op === 0x8) { rawSend(c, frame(0x8, Buffer.alloc(0))); return kill(c); }
    if (op === 0x9) { rawSend(c, frame(0xA, data)); continue; }
    if (op === 0xA) { c.alive = true; continue; }
    if (op === 0x1 || op === 0x0) {
      if (op === 0x1) c.frag = [];
      if (!c.frag) return kill(c);
      c.frag.push(data);
      if (fin) { var msg = Buffer.concat(c.frag).toString("utf8"); c.frag = null; handle(c, msg); }
    }
  }
}
function kill(c) { try { c.socket.destroy(); } catch (e) { /* */ } drop(c); }
function drop(c) { if (!clients.has(c.id)) return; clients.delete(c.id); leaveRoom(c); }

setInterval(function () {                                         // Verbindungen pruefen
  clients.forEach(function (c) {
    if (!c.alive) return kill(c);
    c.alive = false; rawSend(c, frame(0x9, Buffer.alloc(0)));
  });
}, 20000);

// ---------------------------------------------------------------- Raeume
var rooms = new Map();
var CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode() {
  for (var n = 0; n < 50; n++) {
    var s = ""; for (var i = 0; i < 4; i++) s += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    if (!rooms.has(s)) return s;
  }
  return null;
}
function clean(s, max, dflt) { s = String(s == null ? "" : s).replace(/[^\w \-.!?]/g, "").trim().slice(0, max); return s || dflt; }
function members(r) { return r.members.map(function (id) { return clients.get(id); }).filter(Boolean); }

function roomInfo(r) {
  return { t: "room", code: r.code, host: r.host, sector: r.sector, pub: r.pub, state: r.state, max: MAX_PLAYERS,
    players: members(r).map(function (m) { return { id: m.id, name: m.name, robot: m.robot, ready: !!m.ready, kills: m.kills | 0, hp: m.hp == null ? 1 : m.hp, dead: !!m.dead, done: m.done || null }; }) };
}
function broadcast(r, obj, exceptId) { members(r).forEach(function (m) { if (m.id !== exceptId) send(m, obj); }); }
function pushRoom(r) { broadcast(r, roomInfo(r)); }

function leaveRoom(c) {
  var r = c.room && rooms.get(c.room);
  c.room = null; c.ready = false; c.done = null; c.dead = false; c.kills = 0;
  if (!r) return;
  r.members = r.members.filter(function (id) { return id !== c.id; });
  if (!r.members.length) { rooms.delete(r.code); return; }
  if (r.host === c.id) r.host = r.members[0];                     // Host-Wechsel
  broadcast(r, { t: "left", id: c.id });
  if (r.state === "play" && members(r).every(function (m) { return m.done; })) r.state = "lobby";
  pushRoom(r);
}
function joinRoom(c, r) {
  if (r.members.length >= MAX_PLAYERS) return send(c, { t: "err", msg: "ROOM IS FULL" });
  if (r.state !== "lobby") return send(c, { t: "err", msg: "GAME ALREADY RUNNING" });
  leaveRoom(c);
  r.members.push(c.id); c.room = r.code; c.ready = false; c.done = null; c.kills = 0; c.dead = false; c.hp = 1;
  pushRoom(r);
}

function listRooms() {
  var out = [];
  rooms.forEach(function (r) { if (r.pub && r.state === "lobby" && r.members.length < MAX_PLAYERS) out.push({ code: r.code, sector: r.sector, n: r.members.length, max: MAX_PLAYERS, host: (clients.get(r.host) || {}).name || "?" }); });
  return out.slice(0, 30);
}

function handle(c, text) {
  var now = Date.now();                                           // Rate-Limit: ~80 Nachrichten/s
  c.tokens = Math.min(80, c.tokens + (now - c.tokT) * 0.08); c.tokT = now;
  if (--c.tokens < 0) return;
  var m; try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || typeof m !== "object" || typeof m.t !== "string") return;
  var r = c.room && rooms.get(c.room);

  switch (m.t) {
    case "hello":
      c.name = clean(m.name, 12, "PLAYER"); c.robot = clean(m.robot, 16, "nova").toLowerCase().replace(/[^a-z0-9]/g, "") || "nova";
      if (r) pushRoom(r);
      send(c, { t: "hello", id: c.id, name: c.name });
      break;
    case "list": send(c, { t: "rooms", rooms: listRooms() }); break;
    case "create":
      if (rooms.size >= MAX_ROOMS) return send(c, { t: "err", msg: "SERVER BUSY" });
      leaveRoom(c);
      var code = newCode(); if (!code) return send(c, { t: "err", msg: "SERVER BUSY" });
      var sec = SECTOR_IDS.indexOf(m.sector | 0) >= 0 ? m.sector | 0 : 1;
      r = { code: code, host: c.id, members: [c.id], sector: sec, pub: !!m.pub, state: "lobby", seed: 0 };
      rooms.set(code, r); c.room = code; c.ready = false; c.kills = 0; c.done = null; c.dead = false; c.hp = 1;
      pushRoom(r);
      break;
    case "join":
      var rr = rooms.get(clean(m.code, 4, "").toUpperCase());
      if (!rr) return send(c, { t: "err", msg: "ROOM NOT FOUND" });
      joinRoom(c, rr);
      break;
    case "leave": leaveRoom(c); send(c, { t: "left", id: c.id, you: true }); break;
    case "ready": if (r && r.state === "lobby") { c.ready = !!m.v; pushRoom(r); } break;
    case "sector": if (r && r.host === c.id && r.state === "lobby" && SECTOR_IDS.indexOf(m.id | 0) >= 0) { r.sector = m.id | 0; members(r).forEach(function (x) { x.ready = x.id === r.host ? x.ready : false; }); pushRoom(r); } break;
    case "pub": if (r && r.host === c.id) { r.pub = !!m.v; pushRoom(r); } break;
    case "kick":
      if (r && r.host === c.id && r.state === "lobby") { var k = clients.get(m.id | 0); if (k && k.room === r.code && k.id !== c.id) { leaveRoom(k); send(k, { t: "left", id: k.id, you: true, kicked: true }); } }
      break;
    case "start":
      if (!r || r.host !== c.id || r.state !== "lobby") return;
      var ms = members(r);
      if (ms.some(function (x) { return x.id !== r.host && !x.ready; })) return send(c, { t: "err", msg: "NOT EVERYONE IS READY" });
      r.state = "play"; r.seed = crypto.randomInt(1, 2147483647);
      ms.forEach(function (x) { x.done = null; x.dead = false; x.kills = 0; x.hp = 1; });
      broadcast(r, { t: "start", sector: r.sector, seed: r.seed });
      pushRoom(r);
      break;
    case "st":                                                    // Spielerzustand (~15x pro Sekunde) an die Mitspieler
      if (!r || r.state !== "play") return;
      if (typeof m.x !== "number" || typeof m.y !== "number" || !isFinite(m.x) || !isFinite(m.y) || m.x < -100 || m.x > 20000 || m.y < -500 || m.y > 1000) return;
      var x = m.x, y = m.y, aim = typeof m.aim === "number" ? m.aim : 0;
      c.hp = Math.max(0, Math.min(1, +m.hp || 0)); c.kills = Math.max(0, Math.min(99999, m.k | 0)); c.dead = !!m.dead;
      broadcast(r, { t: "st", id: c.id, x: Math.round(x), y: Math.round(y), f: m.f < 0 ? -1 : 1, aim: isFinite(aim) ? Math.round(aim * 100) / 100 : 0, hp: c.hp, k: c.kills, dead: c.dead, a: m.a ? 1 : 0, g: m.g ? 1 : 0 }, c.id);
      break;
    case "done":                                                  // Sektor beendet: result = "win" | "lose"
      if (!r || r.state !== "play" || c.done) return;
      c.done = m.result === "win" ? "win" : "lose"; c.kills = Math.max(0, Math.min(99999, m.k | 0));
      broadcast(r, { t: "ev", k: "done", id: c.id, name: c.name, result: c.done });
      if (members(r).every(function (x) { return x.done; })) { r.state = "lobby"; members(r).forEach(function (x) { x.ready = false; }); }
      pushRoom(r);
      break;
    case "ping": send(c, { t: "pong", n: m.n | 0 }); break;
  }
}

server.listen(PORT, function () {
  console.log("CYBER BOTS Multiplayer-Server laeuft: http://localhost:" + PORT + "  (WebSocket auf demselben Port)");
});
process.on("SIGINT", function () { process.exit(0); });

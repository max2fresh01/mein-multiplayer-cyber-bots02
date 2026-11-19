/* CYBER BOTS - hazards.js
   Umgebungs-Mechaniken der Weltraum-Sektoren: Laser-Tore, Schwerkraft-Zonen, Deckung/Kisten, Daempfe, Saeure,
   Portale, Foerderbaender, Wind, Schwerkraft-Brunnen, Meteore, bewegliche Plattformen sowie
   allgemeine Angriffs-Bausteine fuer Gegner und Bosse: Einschlaege (strike), Strahlen (beam), Feuerfelder, Explosionen. */
(function (CB) {
  "use strict";

  var W = CB.W, GROUND = CB.GROUND;
  var Hz = {}, S = null;

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function reset() {
    S = { gates: [], zones: [], props: [], strikes: [], beams: [], fires: [], vents: [], portals: [], t: 0, acidT: 0, wellT: 0, metT: 5, portalCd: 0, sec: null, bob: 0 };
  }
  reset();
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sgn(v) { return v < 0 ? -1 : 1; }
  function api() { return CB.Game.api; }
  function dmgMul() { return CB.Game.sec ? CB.Game.sec.dmgMul : 1; }
  function hurt(dmg, x) { api().hurtPlayer(dmg * dmgMul(), x); }

  Hz.clear = reset;
  Hz.state = function () { return S; };

  // ---------- Aufbau eines Sektors (feste Zufallszahlen: jeder Durchlauf sieht gleich aus) ----------
  Hz.build = function (sec, g) {
    reset();
    S.sec = sec;
    var cfg = sec.hz;
    if (!cfg) return;
    var r = mulberry(sec.id * 104729 + 17), used = [];
    function slots(n, from, to) {
      var out = [], span = (to - from) / n;
      for (var i = 0; i < n; i++) out.push(from + span * (i + 0.5) + (r() - 0.5) * span * 0.6);
      return out;
    }
    function free(x, d) { for (var i = 0; i < used.length; i++) if (Math.abs(used[i] - x) < d) return false; return true; }
    function place(n, from, to, d, fn) {
      slots(n, from, to).forEach(function (x) {
        x = Math.round(x);
        var tries = 0;
        while (!free(x, d) && tries++ < 6) x += d;
        used.push(x);
        fn(x);
      });
    }
    function addProp(p) {
      S.props.push(p);
      if (p.solid) g.platforms.push({ x: p.x, y: p.y, w: p.w, hidden: true, prop: p });
    }
    var from = 260, to = sec.width - 320;
    if (cfg.crates) place(cfg.crates, from, to, 70, function (x) {
      var w = 24 + ((r() * 3) | 0) * 4, h = 14 + ((r() * 2) | 0) * 4;
      addProp({ kind: "crate", x: x, y: GROUND - h, w: w, h: h, solid: true, hp: Infinity });
    });
    if (cfg.armor) place(cfg.armor, from, to, 80, function (x) {
      var w = 28 + ((r() * 3) | 0) * 4, h = 20 + ((r() * 3) | 0) * 3;
      addProp({ kind: "armor", x: x, y: GROUND - h, w: w, h: h, solid: true, hp: Infinity });
    });
    if (cfg.canisters) place(cfg.canisters, from, to, 46, function (x) {
      addProp({ kind: "canister", x: x, y: GROUND - 14, w: 10, h: 14, solid: false, hp: 22 });
    });
    if (cfg.gates) place(cfg.gates, from, to, 90, function (x) {
      var period = 4.2 + r() * 0.8;
      S.gates.push({ x: x, period: period, on: 1.6, warn: 0.7, ph: r() * period });
    });
    if (cfg.vents) place(cfg.vents, from, to, 80, function (x) {
      var period = 4.4 + r();
      S.vents.push({ x: x, period: period, on: 1.3, warn: 0.9, ph: r() * period });
    });
    if (cfg.lowg) place(cfg.lowg, from + 100, to - 100, 300, function (x) { S.zones.push({ type: "lowg", x: x - 140, w: 280, mul: 0.4 }); });
    if (cfg.acid) place(cfg.acid, from + 60, to, 150, function (x) { S.zones.push({ type: "acid", x: x - 55, w: 90 + ((r() * 4) | 0) * 10 }); });
    if (cfg.conv) place(cfg.conv, from, to, 190, function (x) {
      S.zones.push({ type: "conv", x: x - 90, w: 180 + ((r() * 3) | 0) * 20, vx: (r() < 0.5 ? -1 : 1) * 58 });
    });
    if (cfg.wind) place(cfg.wind, from + 100, to - 100, 330, function (x) { S.zones.push({ type: "wind", x: x - 150, w: 300, vx: (r() < 0.5 ? -1 : 1) * 42 }); });
    if (cfg.wells) place(cfg.wells, from + 150, to - 100, 380, function (x) {
      S.zones.push({ type: "well", x: x, y: 105 + r() * 55, r: 108, pull: 62 });
    });
    if (cfg.portals) {
      var xs = slots(cfg.portals * 2, from + 80, to - 40);
      for (var k = 0; k < cfg.portals; k++) {
        var a = { x: Math.round(xs[k * 2]), pair: S.portals.length + 1, hue: k % 3 }, b = { x: Math.round(xs[k * 2 + 1]), pair: S.portals.length, hue: k % 3 };
        S.portals.push(a, b);
      }
    }
    if (cfg.bob) {
      for (var i = 0; i < g.platforms.length; i++) {
        var pl = g.platforms[i];
        if (pl.hidden) continue;
        pl.y0 = pl.y; pl.bph = r() * 6.28; pl.bsp = 0.7 + r() * 0.6; pl.bamp = cfg.bob;
      }
      S.bob = cfg.bob;
    }
    S.meteors = cfg.meteors || 0;
  };

  // ---------- Bausteine fuer Gegner/Bosse ----------
  // Senkrechter Einschlag: Warnung am Boden, dann Schaden (dmg ist schon fertig skaliert)
  Hz.strike = function (x, w, warn, dmg, kind) {
    var st = { x: x, w: w, t: 0, warn: warn, dur: 0.3, dmg: dmg, kind: kind || "laser", hit: false, fired: false };
    S.strikes.push(st);
    if (S.strikes.length > 60) S.strikes.shift();
    return st;
  };
  // Strahl von (x,y) in Richtung ang. Erst Warnlinie, dann Schaden. trackUntil: so lange folgt er dem Spieler (begrenzte Drehung)
  Hz.beam = function (x, y, ang, len, warn, dur, dmg, w, col) {
    var b = { x: x, y: y, ang: ang, len: len, t: 0, warn: warn, dur: dur, dmg: dmg, w: w || 6, col: col || "#ff3b6b", cd: 0, fired: false,
      trackUntil: 0, sweep: 0, src: null, ox: 0, oy: 0, owner: null, dead: false, turn: 1.9 };
    S.beams.push(b);
    return b;
  };
  // zeitlich begrenzter Schwerkraft-Brunnen (Endboss)
  Hz.addWell = function (x, y, r, pull, life) { S.zones.push({ type: "well", x: x, y: y, r: r, pull: pull, life: life, temp: true }); };
  Hz.fire = function (x, w, life) { S.fires.push({ x: x, w: w, life: life || 4, max: life || 4, tick: 0 }); if (S.fires.length > 24) S.fires.shift(); };
  Hz.blast = function (x, y, r, dmg, col) {
    var A = api(), p = CB.Game.p;
    A.burst(x, y, 16, ["#ffffff", col || "#ffa23a", "#ff6a1f"], 110, 0.45, 40, 2);
    A.ring(x, y, r, col || "#ffa23a", 0.3);
    A.sfx("explode"); A.shake(2);
    if (p && p.alive && Math.hypot(p.x - x, (p.y - p.h / 2) - y) < r + p.w / 2) A.hurtPlayer(dmg, x);
  };

  function explodeProp(pr) {
    var i = S.props.indexOf(pr);
    if (i < 0) return;
    S.props.splice(i, 1);
    var A = api(), G = CB.Game, cx = pr.x + pr.w / 2, cy = pr.y + pr.h / 2, R = 54;
    A.burst(cx, cy, 34, ["#ffffff", "#9dff4a", "#ffe14a", "#ff8a1f"], 150, 0.6, 40, 2);
    A.ring(cx, cy, R, "#9dff4a", 0.35); A.ring(cx, cy, R * 0.6, "#ffffff", 0.25);
    A.sfx("bigboom"); A.shake(5); A.rumble(0.5, 0.7, 220);
    for (var k = 0; k < G.enemies.length; k++) {
      var e = G.enemies[k];
      if (e.dead) continue;
      if (Math.hypot(e.x - cx, (e.y - e.h / 2) - cy) - Math.max(e.w, e.h) / 2 < R) A.hurtEnemy(e, 75, sgn(e.x - cx), "area");
    }
    var p = G.p;
    if (p.alive && Math.hypot(p.x - cx, (p.y - p.h / 2) - cy) < R) A.hurtPlayer(Math.round(18 * dmgMul()), cx);
    for (var j = S.props.length - 1; j >= 0; j--) {
      var o = S.props[j];
      if (o.kind === "canister" && Math.hypot(o.x - pr.x, o.y - pr.y) < R) explodeProp(o);
    }
    if (pr.kind === "canister") Hz.fire(cx, 30, 3);
  }

  function propHit(px, py, r, dmg) {
    for (var i = 0; i < S.props.length; i++) {
      var pr = S.props[i];
      if (px > pr.x - r && px < pr.x + pr.w + r && py > pr.y - r && py < pr.y + pr.h + r) {
        if (pr.hp !== Infinity) { pr.hp -= dmg; if (pr.hp <= 0) explodeProp(pr); }
        else api().sfx("block");
        return true;
      }
    }
    return false;
  }
  Hz.shotHit = function (s) { return S.props.length ? propHit(s.x, s.y, s.r || 2, s.dmg || 5) : false; };
  Hz.eshotHit = function (b) { return S.props.length ? propHit(b.x, b.y, b.r || 2, b.dmg * 0.5) : false; };

  // Feste Kisten: Spieler und Bodengegner laufen nicht hindurch (von oben kann man darauf landen)
  Hz.blockX = function (ent, px0) {
    for (var i = 0; i < S.props.length; i++) {
      var pr = S.props[i];
      if (!pr.solid) continue;
      if (ent.y > pr.y + 2 && ent.y - ent.h < pr.y + pr.h) {
        var hw = ent.w / 2;
        if (ent.x + hw > pr.x && ent.x - hw < pr.x + pr.w) {
          if (ent.cfg) { if (ent.onGround && !ent.cfg.fly) ent.vy = -215; continue; }   // Gegner huepfen ueber Kisten
          ent.x = px0 <= pr.x + pr.w / 2 ? pr.x - hw - 0.01 : pr.x + pr.w + hw + 0.01;
          if (ent.vx) ent.vx = 0;
        }
      }
    }
  };

  function cyc(o, t) {          // Zustand eines Zyklus: off -> warn -> on
    var u = (t + o.ph) % o.period, off = o.period - o.on - o.warn;
    return u < off ? "off" : u < off + o.warn ? "warn" : "on";
  }
  function rectHit(p, x0, x1, y0, y1) { return p.x + p.w / 2 > x0 && p.x - p.w / 2 < x1 && p.y > y0 && p.y - p.h < y1; }
  function segDist(px, py, x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1, t = clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1);
    return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
  }

  // ---------- Update ----------
  Hz.update = function (dt, live) {
    var G = CB.Game, A = api(), p = G.p, i, k;
    S.t += dt;
    G.gravMul = 1; G.extVx = 0;
    if (!p) return;
    var on = live && p.alive;

    for (i = S.zones.length - 1; i >= 0; i--) if (S.zones[i].temp) { S.zones[i].life -= dt; if (S.zones[i].life <= 0) S.zones.splice(i, 1); }
    for (i = 0; i < S.zones.length; i++) {
      var z = S.zones[i];
      if (!on) break;
      if (z.type === "well") {
        var wx = z.x - p.x, wy = z.y - (p.y - p.h / 2), d = Math.hypot(wx, wy);
        if (d < z.r) {
          G.extVx += sgn(wx) * z.pull * (1 - d / z.r) * 1.4;
          if (d < 16) { S.wellT -= dt; if (S.wellT <= 0) { S.wellT = 0.5; hurt(14, z.x); } }
        }
        continue;
      }
      if (p.x < z.x || p.x > z.x + z.w) continue;
      if (z.type === "lowg") G.gravMul = Math.min(G.gravMul, z.mul);
      else if (z.type === "wind") G.extVx += z.vx;
      else if (z.type === "conv") { if (p.onGround && p.y >= GROUND - 1) G.extVx += z.vx; }
      else if (z.type === "acid") {
        if (p.onGround && p.y >= GROUND - 1) { S.acidT -= dt; if (S.acidT <= 0) { S.acidT = 0.5; hurt(7, p.x); A.burst(p.x, GROUND - 2, 4, ["#9dff4a", "#ffffff"], 40, 0.3, 0, 1); } }
      }
    }
    if (on) {
      for (i = 0; i < S.gates.length; i++) {
        var gt = S.gates[i];
        if (cyc(gt, S.t) === "on" && rectHit(p, gt.x - 2.5, gt.x + 2.5, GROUND - 28, GROUND)) hurt(14, gt.x);
      }
      for (i = 0; i < S.vents.length; i++) {
        var vt = S.vents[i];
        if (cyc(vt, S.t) === "on" && rectHit(p, vt.x - 9, vt.x + 9, GROUND - 80, GROUND)) { hurt(12, vt.x); if (p.vy > -120) p.vy = -120; }
      }
      for (i = 0; i < S.fires.length; i++) {
        var f = S.fires[i];
        f.tick -= dt;
        if (f.tick <= 0 && rectHit(p, f.x - f.w / 2, f.x + f.w / 2, GROUND - 16, GROUND)) { f.tick = 0.5; hurt(8, f.x); }
      }
      S.portalCd -= dt;
      if (S.portalCd <= 0 && S.portals.length) {
        for (i = 0; i < S.portals.length; i++) {
          var po = S.portals[i];
          if (i % 2 === 0 && p.vx > 20 && Math.abs(p.x - po.x) < 9 && p.y > GROUND - 44) {
            var to = S.portals[po.pair];
            A.burst(p.x, p.y - p.h / 2, 12, ["#b86bff", "#ffffff", "#35f0ff"], 90, 0.4, 0, 1);
            p.x = to.x + (p.face || 1) * 16; p.vy = Math.min(p.vy, 0); S.portalCd = 1.1;
            A.burst(p.x, p.y - p.h / 2, 12, ["#b86bff", "#ffffff", "#35f0ff"], 90, 0.4, 0, 1);
            A.ring(p.x, p.y - p.h / 2, 24, "#b86bff", 0.3); A.sfx("portal");
            break;
          }
        }
      }
    }
    for (i = S.fires.length - 1; i >= 0; i--) { S.fires[i].life -= dt; if (S.fires[i].life <= 0) S.fires.splice(i, 1); }

    // Einschlaege
    for (i = S.strikes.length - 1; i >= 0; i--) {
      var st = S.strikes[i], prevT = st.t;
      st.t += dt;
      if (!st.fired && st.t >= st.warn) {
        st.fired = true;
        A.shake(st.kind === "meteor" || st.kind === "shell" ? 3 : 1.5);
        var col = STRIKE[st.kind] ? STRIKE[st.kind].col : "#ff3b6b";
        A.burst(st.x, GROUND - 4, 12, ["#ffffff", col], 100, 0.4, 30, 1);
        A.sfx(st.kind === "laser" || st.kind === "rift" ? "laser" : "explode");
        if (st.kind === "fire") Hz.fire(st.x, st.w + 8, 4);
      }
      if (st.t >= st.warn && st.t < st.warn + st.dur && !st.hit && on) {
        var full = STRIKE[st.kind] ? STRIKE[st.kind].full : true;
        if (rectHit(p, st.x - st.w / 2, st.x + st.w / 2, full ? -40 : GROUND - 40, GROUND + 2)) { st.hit = true; A.hurtPlayer(st.dmg, st.x); }
      }
      if (st.t >= st.warn + st.dur) S.strikes.splice(i, 1);
    }

    // Strahlen
    for (i = S.beams.length - 1; i >= 0; i--) {
      var b = S.beams[i];
      b.t += dt; b.cd -= dt;
      if (b.dead || (b.owner && b.owner.dead)) { S.beams.splice(i, 1); continue; }
      if (b.src && !b.src.dead) { b.x = b.src.x + b.ox; b.y = b.src.y + b.oy; }
      if (b.trackUntil && b.t < b.trackUntil && p.alive) {
        var want = Math.atan2((p.y - p.h / 2) - b.y, p.x - b.x), dA = Math.atan2(Math.sin(want - b.ang), Math.cos(want - b.ang));
        b.ang += clamp(dA, -b.turn * dt, b.turn * dt);
      }
      if (b.t >= b.warn) {
        if (b.sweep) b.ang += b.sweep * dt;
        if (!b.fired) { b.fired = true; A.sfx("laser"); A.shake(2); }
        if (on && b.cd <= 0) {
          var ex = b.x + Math.cos(b.ang) * b.len, ey = b.y + Math.sin(b.ang) * b.len;
          if (segDist(p.x, p.y - p.h / 2, b.x, b.y, ex, ey) <= b.w / 2 + Math.min(p.w, p.h) / 2) { b.cd = b.sweep ? 0.6 : 99; A.hurtPlayer(b.dmg, b.x); }
        }
      }
      if (b.t >= b.warn + b.dur) S.beams.splice(i, 1);
    }

    // Meteorschauer (Sektor 09)
    if (S.meteors && live) {
      S.metT -= dt;
      if (S.metT <= 0) {
        S.metT = S.meteors * (0.7 + Math.random() * 0.7);
        var mx = clamp(p.x + (Math.random() - 0.5) * 320, 30, G.worldW - 30);
        Hz.strike(mx, 26, 1.0, Math.round(15 * dmgMul()), "meteor");
      }
    }
    // Schwebende Plattformen
    if (S.bob) {
      for (i = 0; i < G.platforms.length; i++) {
        var pl = G.platforms[i];
        if (pl.bamp) pl.y = pl.y0 + Math.sin(S.t * pl.bsp + pl.bph) * pl.bamp;
      }
    }
  };

  // ---------- Darstellung ----------
  var STRIKE = {
    laser:  { col: "#ff3b6b", full: true },
    rift:   { col: "#b86bff", full: true },
    shell:  { col: "#ffa23a", full: false },
    meteor: { col: "#ffd23f", full: false },
    fire:   { col: "#ff7a1f", full: false }
  };
  var CRATE = { station: ["#18305a", "#35f0ff"], reactor: ["#3a2418", "#ff8a1f"], lab: ["#1a3a3a", "#9dff4a"], dread: ["#2a2024", "#ff6a3d"], frontier: ["#1a1030", "#ffd23f"] };

  function R(ctx, col, x, y, w, h, a) {
    if (a !== undefined) ctx.globalAlpha = a;
    ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h);
    if (a !== undefined) ctx.globalAlpha = 1;
  }

  Hz.drawBack = function (ctx, camX, t, th) {
    var i, k;
    var pal = CRATE[th.kind] || CRATE.station;
    // Zonen
    for (i = 0; i < S.zones.length; i++) {
      var z = S.zones[i], x0 = z.x - camX;
      if (z.type === "well") { drawWell(ctx, z, x0, t, th); continue; }
      if (x0 > W || x0 + z.w < 0) continue;
      var xa = Math.max(0, x0), xb = Math.min(W, x0 + z.w);
      if (z.type === "lowg") {
        R(ctx, "#5aa8ff", xa, 0, xb - xa, GROUND, 0.06);
        for (k = 0; k < GROUND; k += 8) { R(ctx, "#8fe6ff", x0, k + ((t * 14) % 8), 1, 4, 0.35); R(ctx, "#8fe6ff", x0 + z.w - 1, k + ((t * 14) % 8), 1, 4, 0.35); }
        for (k = 0; k < 16; k++) {
          var mx = x0 + ((k * 37.3) % z.w), my = GROUND - ((t * (10 + (k % 4) * 6) + k * 23) % GROUND);
          R(ctx, "#ffffff", mx, my, 1, 1, 0.5);
        }
      } else if (z.type === "acid") {
        R(ctx, "#0e2a12", xa, GROUND, xb - xa, 14);
        R(ctx, "#7aff3a", xa, GROUND - 3, xb - xa, 5, 0.55);
        R(ctx, "#c6ff7a", xa, GROUND - 3, xb - xa, 1, 0.7);
        for (k = 0; k < z.w; k += 14) {
          var ph = (t * 0.8 + k * 0.37) % 1;
          R(ctx, "#d8ff9a", x0 + k + 4, GROUND - 3 - ph * 9, 2, 2, 1 - ph);
        }
        R(ctx, "#07031a", xa, GROUND - 4, 1, 4); R(ctx, "#07031a", xb - 1, GROUND - 4, 1, 4);
      } else if (z.type === "conv") {
        R(ctx, "#0a0a14", xa, GROUND, xb - xa, 6);
        var off = (t * z.vx * 0.5) % 12, dir = sgn(z.vx);
        for (k = -12; k < z.w; k += 12) {
          var cx = x0 + k + off;
          if (cx < xa || cx > xb - 3) continue;
          R(ctx, th.neon[0], cx, GROUND + (dir > 0 ? 1 : 3), 2, 1, 0.9);
          R(ctx, th.neon[0], cx + (dir > 0 ? 1 : -1) + 1, GROUND + 2, 2, 1, 0.9);
          R(ctx, th.neon[0], cx, GROUND + (dir > 0 ? 3 : 1), 2, 1, 0.9);
        }
        R(ctx, "#ffd23f", xa, GROUND - 1, xb - xa, 1, 0.5);
      } else if (z.type === "wind") {
        for (k = 0; k < 14; k++) {
          var wy = 24 + ((k * 37) % 200), wx = (((k * 91 + t * z.vx * 3.4) % z.w) + z.w) % z.w;
          R(ctx, "#ffffff", x0 + wx, wy, 10, 1, 0.22);
          R(ctx, "#ffffff", x0 + wx + 3, wy + 1, 4, 1, 0.12);
        }
        R(ctx, "#ff6a3d", xa, 0, xb - xa, GROUND, 0.04);
      }
    }
    // Feuerfelder
    for (i = 0; i < S.fires.length; i++) {
      var f = S.fires[i], fx = f.x - camX - f.w / 2, a = Math.min(1, f.life / 1.2);
      if (fx > W || fx + f.w < 0) continue;
      R(ctx, "#ff4a1f", fx, GROUND - 3, f.w, 3, 0.5 * a);
      for (k = 0; k < f.w; k += 4) {
        var h = 6 + ((Math.sin(t * 14 + k * 1.7 + f.x) + 1) * 4);
        R(ctx, k % 8 ? "#ff8a1f" : "#ffd23f", fx + k, GROUND - h, 3, h, a);
      }
    }
    // Daempfe
    for (i = 0; i < S.vents.length; i++) {
      var v = S.vents[i], vx = v.x - camX;
      if (vx < -20 || vx > W + 20) continue;
      var vs = cyc(v, S.t);
      R(ctx, "#07031a", vx - 9, GROUND - 2, 18, 3);
      for (k = 0; k < 4; k++) R(ctx, vs === "on" ? "#ff8a1f" : "#3a2a44", vx - 7 + k * 4, GROUND - 1, 2, 1);
      if (vs === "warn") {
        R(ctx, "#ff8a1f", vx - 9, GROUND - 1, 18, 1, 0.5 + 0.5 * Math.sin(t * 30));
        for (k = 0; k < 3; k++) { var q = (t * 1.5 + k / 3) % 1; R(ctx, "#dfe9ff", vx - 3 + k * 3, GROUND - 4 - q * 14, 3, 3, 0.55 * (1 - q)); }
      } else if (vs === "on") {
        for (k = 0; k < 9; k++) {
          var yy = GROUND - 6 - k * 9 - ((t * 70) % 9), ww = 8 + k;
          R(ctx, k % 2 ? "#ffffff" : "#bcd6ff", vx - ww / 2, yy, ww, 7, 0.5 - k * 0.035);
        }
        R(ctx, "#ffb23f", vx - 8, GROUND - 3, 16, 3, 0.8);
      }
    }
    // Portale
    for (i = 0; i < S.portals.length; i++) {
      var po = S.portals[i], px = po.x - camX;
      if (px < -20 || px > W + 20) continue;
      var pc = ["#b86bff", "#35f0ff", "#ff2bd6"][po.hue];
      var isExit = i % 2 === 1;
      R(ctx, "#07031a", px - 8, GROUND - 38, 16, 38, isExit ? 0.25 : 0.5);
      if (isExit) { R(ctx, pc, px - 6, GROUND - 36, 12, 1, 0.35); R(ctx, pc, px - 6, GROUND - 2, 12, 1, 0.35); R(ctx, pc, px - 1, GROUND - 20, 3, 1, 0.5); R(ctx, pc, px + 1, GROUND - 19, 1, 1, 0.5); continue; }
      for (k = 0; k < 8; k++) {
        var ang = t * 3 + k * 0.785;
        R(ctx, k % 2 ? "#ffffff" : pc, px + Math.cos(ang) * 7 - 1, GROUND - 19 + Math.sin(ang) * 17 - 1, 2, 2);
      }
      R(ctx, pc, px - 6, GROUND - 36, 12, 1, 0.8); R(ctx, pc, px - 6, GROUND - 2, 12, 1, 0.8);
      R(ctx, pc, px - 1, GROUND - 24 + Math.sin(t * 4 + i) * 4, 2, 10, 0.55);
    }
    // Deckung / Kisten / Behaelter
    for (i = 0; i < S.props.length; i++) {
      var pr = S.props[i], qx = pr.x - camX;
      if (qx < -40 || qx > W + 10) continue;
      if (pr.kind === "canister") {
        var pulse = 0.55 + 0.35 * Math.sin(t * 4 + pr.x), hurtF = pr.hp < 12;
        R(ctx, "#07031a", qx - 1, pr.y - 1, pr.w + 2, pr.h + 2);
        R(ctx, "#0f3a22", qx, pr.y + 2, pr.w, pr.h - 4);
        R(ctx, hurtF ? "#ffe14a" : "#7aff3a", qx + 1, pr.y + 3, pr.w - 2, pr.h - 6, pulse);
        R(ctx, "#ff8a1f", qx, pr.y, pr.w, 2); R(ctx, "#ff8a1f", qx, pr.y + pr.h - 2, pr.w, 2);
        R(ctx, "#07031a", qx + 4, pr.y + 5, 2, 4); R(ctx, "#07031a", qx + 4, pr.y + 10, 2, 1);
        R(ctx, "#ffffff", qx + 2, pr.y + 3, 1, 3, 0.7);
      } else {
        var cp = CRATE[th.kind] || CRATE.station, arm = pr.kind === "armor";
        R(ctx, "#07031a", qx - 1, pr.y - 1, pr.w + 2, pr.h + 2);
        R(ctx, cp[0], qx, pr.y, pr.w, pr.h);
        R(ctx, cp[1], qx, pr.y, pr.w, 1, 0.9);
        R(ctx, "#000000", qx, pr.y + pr.h - 2, pr.w, 2, 0.35);
        if (arm) {
          for (k = 3; k < pr.w - 3; k += 6) { R(ctx, "#07031a", qx + k, pr.y + 3, 1, pr.h - 6); }
          R(ctx, cp[1], qx + 2, pr.y + 3, 2, 2); R(ctx, cp[1], qx + pr.w - 4, pr.y + 3, 2, 2);
          R(ctx, cp[1], qx + 2, pr.y + pr.h - 5, 2, 2, 0.6); R(ctx, cp[1], qx + pr.w - 4, pr.y + pr.h - 5, 2, 2, 0.6);
        } else {
          R(ctx, "#07031a", qx + 3, pr.y + 3, 1, pr.h - 6); R(ctx, "#07031a", qx + pr.w - 4, pr.y + 3, 1, pr.h - 6);
          R(ctx, cp[1], qx + (pr.w >> 1) - 2, pr.y + 4, 4, 2, 0.8 + 0.2 * Math.sin(t * 3 + pr.x));
        }
      }
    }
    // Laser-Tore
    for (i = 0; i < S.gates.length; i++) {
      var gt = S.gates[i], gx = gt.x - camX;
      if (gx < -10 || gx > W + 10) continue;
      var gs = cyc(gt, S.t);
      R(ctx, "#07031a", gx - 4, GROUND - 32, 8, 5); R(ctx, "#07031a", gx - 4, GROUND - 3, 8, 3);
      R(ctx, "#4a5a8a", gx - 3, GROUND - 31, 6, 3); R(ctx, "#4a5a8a", gx - 3, GROUND - 2, 6, 2);
      var lamp = gs === "on" ? "#ff3b6b" : gs === "warn" ? ((Math.floor(t * 12) & 1) ? "#ffe14a" : "#503010") : "#2a3a5a";
      R(ctx, lamp, gx - 1, GROUND - 30, 2, 1); R(ctx, lamp, gx - 1, GROUND - 2, 2, 1);
      if (gs === "on") {
        R(ctx, "#ff3b6b", gx - 4, GROUND - 28, 8, 26, 0.28);
        R(ctx, "#ff3b6b", gx - 2, GROUND - 28, 4, 26);
        R(ctx, "#ffffff", gx - 1, GROUND - 28, 1, 26);
      } else if (gs === "warn") {
        for (k = 0; k < 26; k += 4) R(ctx, "#ff8a8a", gx - 1, GROUND - 28 + k, 2, 2, 0.5 + 0.5 * Math.sin(t * 40));
      }
    }
  };

  function drawWell(ctx, z, x0, t, th) {
    if (x0 < -z.r || x0 > W + z.r) return;
    for (var k = 0; k < 22; k++) {
      var u = (t * 0.35 + k / 22) % 1, rad = z.r * (1 - u), ang = t * 1.6 + k * 0.62 + u * 5;
      R(ctx, k % 3 ? "#b86bff" : "#ffffff", x0 + Math.cos(ang) * rad, z.y + Math.sin(ang) * rad * 0.55, 2, 1, 0.25 + u * 0.6);
    }
    R(ctx, "#2a0a4a", x0 - 14, z.y - 8, 28, 16, 0.5);
    R(ctx, "#07031a", x0 - 10, z.y - 6, 20, 12);
    R(ctx, "#b86bff", x0 - 12, z.y - 1, 24, 2, 0.6);
    R(ctx, "#000000", x0 - 6, z.y - 4, 12, 8);
  }

  Hz.drawFront = function (ctx, camX, t) {
    var i, k;
    for (i = 0; i < S.strikes.length; i++) {
      var st = S.strikes[i], sx = st.x - camX, def = STRIKE[st.kind] || STRIKE.laser;
      if (sx < -40 || sx > W + 40) continue;
      var half = st.w / 2;
      if (st.t < st.warn) {
        var bl = (Math.floor(t * 14) & 1) ? 0.85 : 0.35;
        R(ctx, def.col, sx - half, GROUND - 1, st.w, 2, bl);
        if (def.full) { for (k = 0; k < GROUND; k += 6) R(ctx, def.col, sx, k, 1, 3, 0.25 + 0.2 * (st.t / st.warn)); }
        else R(ctx, def.col, sx - half, GROUND - 4, 1, 3, bl), R(ctx, def.col, sx + half - 1, GROUND - 4, 1, 3, bl);
        if (!def.full && st.t > st.warn - 0.4) {
          var u = (st.t - (st.warn - 0.4)) / 0.4, yy = -10 + u * (GROUND + 8);
          R(ctx, def.col, sx - 2, yy - 14, 4, 14, 0.4);
          R(ctx, "#ffffff", sx - 2, yy - 3, 4, 4); R(ctx, def.col, sx - 3, yy - 6, 6, 4);
        }
      } else {
        var v = (st.t - st.warn) / st.dur, a = 1 - v;
        if (def.full) {
          R(ctx, def.col, sx - half - 2, 0, st.w + 4, GROUND, 0.3 * a);
          R(ctx, def.col, sx - half, 0, st.w, GROUND, 0.85 * a);
          R(ctx, "#ffffff", sx - 2, 0, 4, GROUND, a);
        } else {
          var rr = st.w * (0.7 + v * 0.8);
          R(ctx, def.col, sx - rr / 2, GROUND - 34 * (0.5 + v * 0.5), rr, 34 * (0.5 + v * 0.5), 0.7 * a);
          R(ctx, "#ffffff", sx - rr / 4, GROUND - 20 * (0.5 + v), rr / 2, 20 * (0.5 + v), a);
        }
      }
    }
    // Strahlen (unter dem Boden abgeschnitten)
    if (S.beams.length) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, GROUND + 1); ctx.clip();
      for (i = 0; i < S.beams.length; i++) {
        var b = S.beams[i], x0 = Math.round(b.x - camX), y0 = Math.round(b.y);
        var x1 = x0 + Math.cos(b.ang) * b.len, y1 = y0 + Math.sin(b.ang) * b.len;
        ctx.lineCap = "butt";
        if (b.t < b.warn) {
          var u2 = b.t / b.warn;
          ctx.globalAlpha = 0.3 + 0.5 * u2 * ((Math.floor(t * (8 + u2 * 20)) & 1) ? 1 : 0.5);
          ctx.strokeStyle = b.col; ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
        } else {
          var a2 = 1 - Math.max(0, (b.t - b.warn - b.dur * 0.6) / (b.dur * 0.4));
          ctx.globalAlpha = 0.35 * a2; ctx.strokeStyle = b.col; ctx.lineWidth = b.w + 4;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          ctx.globalAlpha = a2; ctx.lineWidth = b.w;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1, b.w / 3);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  };

  CB.Hazards = Hz;
})(window.CB);

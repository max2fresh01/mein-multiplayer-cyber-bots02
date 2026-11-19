/* CYBER BOTS - space-enemies3.js
   Sektor 08 DREADNOUGHT und Sektor 09 THE LAST FRONTIER: Gegner-KI und die beiden letzten Boss-Kaempfe. */
(function (CB) {
  "use strict";

  var E = CB.ENEMIES, W = CB.W, GROUND = CB.GROUND;
  function api() { return CB.Game.api; }
  function sgn(v) { return v < 0 ? -1 : 1; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function R(ctx, col, x, y, w, h, a) {
    if (a !== undefined) ctx.globalAlpha = a;
    ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h);
    if (a !== undefined) ctx.globalAlpha = 1;
  }
  function blink(t, f) { return (Math.floor(t * f) & 1) === 1; }
  function patrol(e, dt, A, mul) {
    e.patrolT -= dt;
    if (e.patrolT <= 0) { e.dir = -e.dir; e.patrolT = 1.5 + A.rand() * 2; }
    e.vx = e.dir * e.cfg.speed * (mul || 0.4); e.face = e.dir;
  }
  function lob(e, A, tx, T, opts, y0) {
    var g = 420, x0 = e.x + e.face * 8; y0 = y0 || (e.y - e.h + 2);
    var s = A.enemyShot(x0, y0, 0, 1, e.cfg.dmg * e.dmgMul, Object.assign({ g: g, r: 3, big: true, life: 3, quiet: true }, opts));
    s.vx = (tx - x0) / T; s.vy = (GROUND - y0 - 0.5 * g * T * T) / T;
    A.sfx("lob");
    return s;
  }
  function boom(r, col) { return function (b) { CB.Hazards.blast(b.x, GROUND - 2, r, b.dmg, col || "#ff6a3d"); }; }
  function shieldFx(ctx, e, x, t, tall) {
    var sx = x + e.face * (e.w / 2 + 3), top = e.y - e.h + 3, h = e.h - 6, down = e.turning;
    var col = down ? "#6a7090" : "#9aa6c8";
    R(ctx, col, sx - (e.face > 0 ? 0 : 1), top, 3, h, down ? 0.35 : 0.95);
    R(ctx, col, sx - 3, top, 8, h, down ? 0.05 : 0.16);
    if (!down) R(ctx, "#ffffff", sx - (e.face > 0 ? 0 : 1), top + 1, 1, h - 2, 0.7);
  }
  function ring(ctx, x, y, r, col, a) {
    ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), r, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1;
  }

  // =====================================================================================
  // 08 DREADNOUGHT
  // =====================================================================================

  // ---------- Elite-Soldat: Frontschild, Salven und Sturmangriff mit Ansage ----------
  E.elite.init = function (e) { e.chg = 0; e.chT = 0; e.cdCharge = 2 + Math.random() * 2; e.turnT = 0; };
  E.elite.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, want = sgn(dx);
    e.cdCharge -= dt;
    if (!e.aggro) { e.turning = false; patrol(e, dt, A, 0.4); A.groundPhysics(e, dt); return; }
    if (e.chg === 1) {
      e.vx = 0; e.chT -= dt;
      if (e.chT <= 0) { e.chg = 2; e.chT = 0.5; e.dashDir = e.face; A.sfx("slam"); }
    } else if (e.chg === 2) {
      e.vx = e.dashDir * 235; e.chT -= dt;
      if (e.chT <= 0) { e.chg = 0; e.vx = 0; e.cool = 1.0; }
    } else {
      e.turnT = Math.max(0, e.turnT - dt);
      if (want !== e.face) {
        if (!e.turning) { e.turning = true; e.turnT = 0.7; }
        if (e.turnT <= 0) { e.face = want; e.turning = false; }
        e.vx = 0;
      } else {
        e.turning = false;
        var d = Math.abs(dx);
        e.vx = d > 100 ? e.face * c.speed : d < 55 ? -e.face * c.speed * 0.5 : 0;
        if (e.burst > 0) {
          e.burstT -= dt;
          if (e.burstT <= 0) { e.burst--; e.burstT = 0.14; A.enemyShot(e.x + e.face * 10, e.y - 13, Math.atan2(py - (e.y - 13), px - e.x), 160, c.dmg * e.dmgMul, { col: "#ff8a1f" }); }
        } else if (e.cdCharge <= 0 && d > 90 && d < 220) { e.chg = 1; e.chT = 0.5; e.cdCharge = 4 + A.rand() * 2; A.sfx("warn"); }
        else if (e.cool <= 0 && dist < c.detect) { e.burst = 4; e.burstT = 0; e.cool = 1 / c.rate + A.rand() * 0.8; }
      }
    }
    A.groundPhysics(e, dt);
  };
  E.elite.fx = function (ctx, e, x, t) {
    shieldFx(ctx, e, x, t);
    if (e.chg === 1) R(ctx, "#ff3b3b", x - 10, e.y - e.h - 2, 20, e.h + 4, blink(t, 20) ? 0.5 : 0.15);
    if (e.chg === 2) for (var i = 1; i < 4; i++) R(ctx, "#ff8a1f", x - e.dashDir * i * 9 - 5, e.y - e.h + 4, 10, e.h - 8, 0.25 / i);
  };

  // ---------- Moerser-Trupp: Artillerie-Einschlaege mit Warnkreis ----------
  E.mortar.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, p = CB.Game.p;
    e.flash = Math.max(0, (e.flash || 0) - dt);
    if (e.aggro) {
      e.face = sgn(dx);
      var d = Math.abs(dx);
      e.vx = d < 200 ? -e.face * c.speed * 1.3 : d > 330 ? e.face * c.speed : 0;
      if (e.cool <= 0 && dist < c.detect) {
        e.cool = 1 / c.rate + A.rand() * 1.2; e.flash = 0.25;
        var tx = clamp(px + (p.vx || 0) * 0.45, 20, CB.Game.worldW - 20);
        CB.Hazards.strike(tx, 30, 1.3, Math.round(c.dmg * e.dmgMul), "shell");
        A.sfx("lob"); A.burst(e.x + e.face * 8, e.y - 14, 6, ["#ffffff", "#ffb23f"], 60, 0.25, -20, 1);
      }
    } else patrol(e, dt, A, 0.5);
    A.groundPhysics(e, dt);
  };
  E.mortar.fx = function (ctx, e, x, t) { if (e.flash > 0) R(ctx, "#ffe14a", x + e.face * 9 - 3, e.y - e.h - 3, 6, 6, 0.9); };

  // ---------- Angriffsschiff: ueberfliegt den Spieler und wirft Bomben ----------
  E.gunship.init = function (e) { e.side = Math.random() < 0.5 ? -1 : 1; e.bombT = 0; e.baseY = e.y; };
  E.gunship.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, G = CB.Game;
    if (e.aggro) {
      var tx = px + e.side * 250, ty = 66 + Math.sin(e.t * 1.2) * 12;
      e.vx += clamp(tx - e.x, -1, 1) * 300 * dt; e.vx = clamp(e.vx, -c.speed, c.speed);
      if (Math.abs(e.x - tx) < 24) e.side = -e.side;
      e.y += clamp((ty - e.y) * 2, -50, 50) * dt;
      e.face = sgn(e.vx || dx);
      e.bombT -= dt;
      if (Math.abs(dx) < 40 && e.bombT <= 0) {
        e.bombT = 0.4;
        var s = A.enemyShot(e.x, e.y + 4, 0, 0.001, c.dmg * e.dmgMul, { g: 280, r: 3, big: true, col: "#ff6a3d", quiet: true, life: 3, onLand: boom(18) });
        s.vx = e.vx * 0.4; s.vy = 30; A.sfx("lob");
      }
      if (e.cool <= 0 && dist < 330 && Math.abs(dx) > 70) {
        e.cool = 1 / c.rate * 1.8 + A.rand();
        var base = Math.atan2(py - e.y, px - e.x);
        for (var i = -1; i <= 1; i++) A.enemyShot(e.x, e.y + 3, base + i * 0.16, 140, c.dmg * 0.8 * e.dmgMul, { col: "#ff8a1f" });
      }
    } else { e.vx += e.dir * 22 * dt; e.vx = clamp(e.vx, -24, 24); e.y = e.baseY + Math.sin(e.t * 2) * 4; e.patrolT -= dt; if (e.patrolT <= 0) { e.dir = -e.dir; e.patrolT = 2 + A.rand() * 2; } }
    e.x = clamp(e.x + e.vx * dt, e.w / 2, G.worldW - e.w / 2);
    e.y = clamp(e.y, 24, GROUND - 60);
  };

  // ---------- Schwere Kanone (fest): grosse Bogengranaten ----------
  E.cannon.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg;
    e.vx = 0; e.vy = 0; e.face = sgn(dx); e.recoil = Math.max(0, (e.recoil || 0) - dt * 4);
    if (e.aggro && dist < c.detect && e.cool <= 0) {
      e.cool = 1 / c.rate + A.rand() * 0.8; e.recoil = 1;
      lob(e, A, px, 1.5, { r: 4, col: "#ff6a3d", onLand: boom(30) }, e.y - 12);
    }
  };
  E.cannon.fx = function (ctx, e, x, t) { if (e.recoil > 0.7) R(ctx, "#ffe14a", x + e.face * 12 - 3, e.y - 14, 6, 6, 0.9); };

  // ---------- Boss 08: IRON LEVIATHAN ----------
  // Schwenk-Laser (druebertspringen!), Granatensalven, Moerser-Teppich, Panzerungsphasen mit Elite-Verstaerkung.
  E.leviathan.init = function (e) { e.stage = 1; e.invT = 0; e.face = -1; e.shT = 0; };
  E.leviathan.onHurt = function (e, dmg) {
    if (e.invT > 0) { e.shT -= 1; if (e.shT <= 0) { e.shT = 6; api().text(e.x, e.y - e.h - 6, "ARMORED", "#9aa6c8"); api().sfx("block"); } return 0; }
    return dmg;
  };
  E.leviathan.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, G = CB.Game, Hz = CB.Hazards, ph = e.hp < e.maxHp * 0.33 ? 3 : e.hp < e.maxHp * 0.66 ? 2 : 1, i;
    e.aggro = true; e.phase = ph; e.invT = Math.max(0, e.invT - dt); e.face = sgn(dx);
    if (ph > e.stage) {                                   // Panzerungsphase: kurz unverwundbar, ruft Elite-Truppen
      e.stage = ph; e.invT = 3; e.vx = 0;
      for (i = 0; i < 2; i++) { var el = A.spawnEnemy("elite", e.x + (i ? 50 : -50), GROUND); el.aggro = true; }
      A.text(e.x, e.y - e.h - 10, "ARMOR PLATING!", "#9aa6c8"); A.sfx("boss"); A.shake(6);
      A.burst(e.x, e.y - 25, 24, ["#9aa6c8", "#ffffff", "#ff8a1f"], 120, 0.6, 0, 2);
    }
    e.vx = (Math.abs(dx) > 170 && e.invT <= 0) ? e.face * c.speed * (1 + 0.25 * (ph - 1)) : 0;
    if (e.cool <= 0 && e.invT <= 0) {
      var k = e.pat++ % 3, dm = e.dmgMul;
      if (k === 0) {
        var n = ph >= 2 ? 5 : 3, mid = (n - 1) / 2;
        for (i = 0; i < n; i++) {
          var s = lob(e, A, px + (i - mid) * 48, 1.1, { r: 4, col: "#ff6a3d", onLand: boom(28) }, e.y - 44);
          s.dmg = c.dmg * 1.2 * dm;
        }
      } else if (k === 1) {
        var b = Hz.beam(e.x, e.y - 40, e.face > 0 ? 1.15 : Math.PI - 1.15, 760, 1.0, 1.7, Math.round(c.dmg * 1.4 * dm), 8, "#ff3b3b");
        b.sweep = (e.face > 0 ? -1 : 1) * 0.85 * (1 + 0.2 * (ph - 1)); b.src = e; b.ox = e.face * 12; b.oy = -40; b.owner = e;
        A.sfx("charge");
      } else {
        var cnt = ph === 1 ? 3 : 5;
        for (i = 0; i < cnt; i++) Hz.strike(clamp(px + (i - (cnt - 1) / 2) * 62 + (A.rand() - 0.5) * 20, 20, G.worldW - 20), 30, 1.2, Math.round(c.dmg * 1.3 * dm), "shell");
        A.sfx("warn");
      }
      e.cool = [2.2, 1.8, 1.4][ph - 1];
    }
    A.groundPhysics(e, dt);
  };
  E.leviathan.fx = function (ctx, e, x, t) {
    if (e.invT > 0) { R(ctx, "#9aa6c8", x - 30, e.y - e.h - 2, 60, e.h + 4, 0.28 + 0.14 * Math.sin(t * 16)); }
    if (e.phase === 3 && blink(t, 5)) R(ctx, "#ff3b3b", x - 4, e.y - e.h + 12, 8, 3, 0.9);
    var beam = false;
    for (var i = 0; i < CB.Hazards.state().beams.length; i++) if (CB.Hazards.state().beams[i].owner === e) beam = true;
    if (beam) R(ctx, "#ff3b3b", x + e.face * 12 - 5, e.y - 45, 10, 10, 0.35 + 0.3 * Math.sin(t * 40));
  };

  // =====================================================================================
  // 09 THE LAST FRONTIER
  // =====================================================================================

  // ---------- Stern-Wraith: schwebt, kuendigt an, stuerzt im Sturzflug herab ----------
  E.wraith.init = function (e) { e.st = "hover"; e.stT = 1.2 + Math.random() * 0.8; e.baseY = e.y; };
  E.wraith.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, G = CB.Game;
    if (e.aggro) {
      if (e.st === "hover") {
        var tx = px + Math.sin(e.t * 1.1) * 90, ty = 70 + Math.cos(e.t * 1.7) * 14;
        e.vx = clamp((tx - e.x) * 2, -c.speed, c.speed); e.vy = clamp((ty - e.y) * 2.5, -80, 80);
        e.face = sgn(dx); e.stT -= dt;
        if (e.stT <= 0) { e.st = "tele"; e.stT = 0.45; A.sfx("warn"); }
      } else if (e.st === "tele") {
        e.vx *= 0.8; e.vy *= 0.8; e.stT -= dt; e.face = sgn(dx);
        if (e.stT <= 0) {
          var a = Math.atan2((py - 8) - e.y, px - e.x);
          e.vx = Math.cos(a) * 270; e.vy = Math.sin(a) * 270; e.st = "dive"; e.stT = 1.0; A.sfx("slam");
        }
      } else if (e.st === "dive") {
        e.stT -= dt;
        if (e.stT <= 0 || e.y >= GROUND - 12) { e.st = "rise"; e.stT = 1.2; }
      } else {
        e.vx *= 0.96; e.vy = clamp((66 - e.y) * 2, -130, 0) - 20; e.stT -= dt;
        if (e.y <= 76 || e.stT <= 0) { e.st = "hover"; e.stT = 1.7 + A.rand() * 1.2; }
      }
    } else { e.vx = Math.sin(e.t) * 14; e.vy = Math.cos(e.t * 1.3) * 8; }
    e.x = clamp(e.x + e.vx * dt, e.w / 2, G.worldW - e.w / 2);
    e.y = clamp(e.y + e.vy * dt, 24, GROUND - 10);
  };
  E.wraith.fx = function (ctx, e, x, t) {
    if (e.st === "tele") R(ctx, "#ffffff", x - 10, e.y - e.h - 2, 20, e.h + 4, blink(t, 24) ? 0.5 : 0.1);
    if (e.st === "dive") for (var i = 1; i < 5; i++) R(ctx, "#b86bff", x - e.vx * 0.02 * i - 5, e.y - e.vy * 0.02 * i - e.h + 3, 10, e.h - 6, 0.3 / i);
  };

  // ---------- Void-Ritter: schwerer Schild-Zyklus, 5er-Faecher ----------
  E.knight.init = function (e) { e.shT = 1.5 + Math.random() * 1.5; e.shUp = 0; e.shielded = false; };
  E.knight.onHurt = function (e, dmg) {
    if (e.shielded) { e.shT2 = (e.shT2 || 0) - 1; if (e.shT2 <= 0) { e.shT2 = 4; api().text(e.x, e.y - e.h - 4, "BLOCK", "#ffd23f"); api().sfx("block"); } return dmg * 0.08; }
    return dmg;
  };
  E.knight.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg;
    if (e.aggro) {
      e.face = sgn(dx);
      if (e.shUp > 0) { e.shUp -= dt; e.vx = 0; if (e.shUp <= 0) { e.shielded = false; e.shT = 3.2 + A.rand(); } }
      else {
        e.shT -= dt;
        if (e.shT <= 0) { e.shUp = 1.8; e.shielded = true; A.sfx("block"); }
        e.vx = Math.abs(dx) > 75 ? e.face * c.speed : 0;
        if (e.cool <= 0 && dist < c.detect) {
          e.cool = 1 / c.rate + A.rand() * 0.8;
          var base = Math.atan2(py - (e.y - 14), px - e.x);
          for (var i = -2; i <= 2; i++) A.enemyShot(e.x + e.face * 10, e.y - 14, base + i * 0.17, 130, c.dmg * e.dmgMul, { col: "#ffd23f" });
        }
      }
    } else patrol(e, dt, A, 0.4);
    A.groundPhysics(e, dt);
  };
  E.knight.fx = function (ctx, e, x, t) {
    if (e.shielded) { ring(ctx, x, e.y - e.h / 2, 19, "#ffd23f", 0.55 + 0.25 * Math.sin(t * 14)); ctx.globalAlpha = 0.1; ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(Math.round(x), Math.round(e.y - e.h / 2), 19, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
  };

  // ---------- Endboss 09: THE LAST SOVEREIGN (3 Phasen) ----------
  E.sovereign.init = function (e) { e.stage = 1; e.invT = 0; e.spin = 0; e.fireT = 1.5; e.metT = 2.5; e.ringT = 4; e.wellT = 3; e.beamT = 5; e.face = -1; e.shT = 0; };
  E.sovereign.onHurt = function (e, dmg) {
    if (e.invT > 0) { e.shT -= 1; if (e.shT <= 0) { e.shT = 6; api().text(e.x, e.y - e.h - 6, "INVULNERABLE", "#ffffff"); } return 0; }
    return dmg;
  };
  E.sovereign.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, G = CB.Game, Hz = CB.Hazards, dm = e.dmgMul, i;
    var ph = e.hp < e.maxHp * 0.33 ? 3 : e.hp < e.maxHp * 0.66 ? 2 : 1;
    e.aggro = true; e.phase = ph; e.face = sgn(dx); e.invT = Math.max(0, e.invT - dt);
    if (ph > e.stage) {                                   // Phasenwechsel
      e.stage = ph; e.invT = 2.4; A.shake(9); A.sfx("supernova");
      A.ring(e.x, e.y, 80, "#ffffff", 0.5); A.ring(e.x, e.y, 130, "#ffd23f", 0.7); A.ring(e.x, e.y, 190, "#b86bff", 0.9);
      A.burst(e.x, e.y, 40, ["#ffffff", "#ffd23f", "#b86bff"], 180, 0.9, 0, 2);
      A.text(e.x, e.y - e.h - 12, ph === 2 ? "PHASE II - GRAVITY" : "PHASE III - SUPERNOVA", "#ffd23f");
      if (ph === 2) for (i = 0; i < 2; i++) { var kn = A.spawnEnemy("knight", e.x + (i ? 60 : -60), GROUND); kn.aggro = true; }
      else for (i = 0; i < 2; i++) { var wr = A.spawnEnemy("wraith", e.x + (i ? 60 : -60), 80); wr.aggro = true; }
      for (i = G.eshots.length - 1; i >= 0; i--) G.eshots[i].life = 0;      // Bildschirm raeumen
    }
    var tx = clamp(px + Math.sin(e.t * 0.4) * 160, 70, G.worldW - 70), ty = 78 + Math.sin(e.t * 0.9) * 10;
    e.x = clamp(e.x + clamp((tx - e.x) * 1.1, -c.speed * (1 + 0.25 * ph), c.speed * (1 + 0.25 * ph)) * dt, 40, G.worldW - 40);
    e.y += clamp((ty - e.y) * 2, -50, 50) * dt;
    if (e.invT > 0) return;
    // Sternspirale
    e.fireT -= dt;
    if (e.fireT <= 0) {
      e.fireT = [0.34, 0.28, 0.2][ph - 1]; e.spin += ph === 3 ? -0.55 : 0.5;
      var arms = ph >= 2 ? 3 : 2;
      for (i = 0; i < arms; i++) A.enemyShot(e.x, e.y, e.spin + i * 6.283 / arms, 88, c.dmg * 0.8 * dm, { col: "#ffd23f", r: 2, quiet: true });
    }
    // gezielte Meteore
    e.metT -= dt;
    if (e.metT <= 0) { e.metT = [1.5, 1.2, 0.8][ph - 1]; Hz.strike(clamp(px + (A.rand() - 0.5) * 130, 20, G.worldW - 20), 26, 0.95, Math.round(c.dmg * 1.2 * dm), "meteor"); }
    // Ringwellen mit Luecke
    if (ph >= 2) {
      e.ringT -= dt;
      if (e.ringT <= 0) {
        e.ringT = ph === 3 ? 2.3 : 3.3; A.sfx("supernova");
        var n = 28, gapC = Math.floor(((Math.atan2(py - e.y, px - e.x) / 6.283 + 1) % 1) * n + (A.rand() - 0.5) * 6);
        for (i = 0; i < n; i++) {
          var dd = Math.min(Math.abs(i - gapC), n - Math.abs(i - gapC));
          if (dd <= 2) continue;
          A.enemyShot(e.x, e.y, i * 6.283 / n, 78, c.dmg * 0.9 * dm, { col: "#ffffff", r: 2.5, life: 5, quiet: true });
        }
      }
    }
    // Schwerkraft-Brunnen
    if (ph === 2) { e.wellT -= dt; if (e.wellT <= 0) { e.wellT = 9; Hz.addWell(e.x, 130, 160, 95, 6); A.text(e.x, e.y - e.h - 8, "GRAVITY WELL", "#b86bff"); A.sfx("gravity"); } }
    // rotierende Strahlen
    if (ph === 3) {
      e.beamT -= dt;
      if (e.beamT <= 0) {
        e.beamT = 7.5; var a0 = A.rand() * 6.283, dir = A.rand() < 0.5 ? -1 : 1;
        for (i = 0; i < 2; i++) { var b = Hz.beam(e.x, e.y, a0 + i * Math.PI, 760, 1.0, 2.5, Math.round(c.dmg * 1.3 * dm), 7, "#ffd23f"); b.sweep = dir * 0.55; b.src = e; b.owner = e; }
        A.sfx("charge");
      }
    }
  };
  E.sovereign.fx = function (ctx, e, x, t) {
    var y = e.y - e.h / 2, col = e.phase === 3 ? "#ff3b3b" : e.phase === 2 ? "#b86bff" : "#ffd23f";
    ring(ctx, x, y, 34 + Math.sin(t * 5) * 2, col, 0.5);
    ring(ctx, x, y, 42 + Math.sin(t * 3) * 3, col, 0.25);
    if (e.invT > 0) { ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 20); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), 30, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
  };
})(window.CB);

/* CYBER BOTS - space-enemies2.js
   Sektor 06 REACTOR CORE und Sektor 07 VOID LABORATORY: Gegner-KI und Boss-Kaempfe. */
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
  function lob(e, A, tx, T, opts) {
    var g = 420, x0 = e.x + e.face * 8, y0 = e.y - e.h + 2;
    var s = A.enemyShot(x0, y0, 0, 1, e.cfg.dmg * e.dmgMul, Object.assign({ g: g, r: 3, big: true, life: 2.6, quiet: true }, opts));
    s.vx = (tx - x0) / T; s.vy = (GROUND - y0 - 0.5 * g * T * T) / T;
    A.sfx("lob");
    return s;
  }

  // =====================================================================================
  // 06 REACTOR CORE
  // =====================================================================================

  // ---------- Meltdown-Drohne: stuerzt sich auf den Spieler, Zuendschnur, Kettenreaktion ----------
  E.kamidrone.init = function (e) { e.fuse = 0; e.vx = 0; e.vy = 0; };
  E.kamidrone.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg;
    if (e.aggro) {
      var ang = Math.atan2(py - 8 - e.y, px - e.x), sp = c.speed * (e.fuse > 0 ? 0.55 : 1);
      e.vx += Math.cos(ang) * 340 * dt; e.vy += Math.sin(ang) * 340 * dt;
      var m = Math.hypot(e.vx, e.vy);
      if (m > sp) { e.vx *= sp / m; e.vy *= sp / m; }
      if (e.fuse <= 0 && dist < 62) { e.fuse = 0.55; A.sfx("warn"); }
      if (e.fuse > 0) { e.fuse -= dt; if (e.fuse <= 0) { e.noReward = true; A.killEnemy(e); return; } }
      e.face = sgn(e.vx || dx);
    } else {
      e.vx += e.dir * 25 * dt; e.vx = clamp(e.vx, -26, 26); e.vy = Math.sin(e.t * 2) * 8;
      e.patrolT -= dt; if (e.patrolT <= 0) { e.dir = -e.dir; e.patrolT = 2 + A.rand() * 2; }
      e.face = e.dir;
    }
    e.x = clamp(e.x + e.vx * dt, e.w / 2, CB.Game.worldW - e.w / 2);
    e.y = clamp(e.y + e.vy * dt, 22, GROUND - 14);
  };
  E.kamidrone.onDeath = function (e) {
    var A = api(), G = CB.Game, cx = e.x, cy = e.y - e.h / 2;
    CB.Hazards.blast(cx, cy, 38, Math.round(22 * e.dmgMul), "#ffb23f");
    for (var i = 0; i < G.enemies.length; i++) {
      var o = G.enemies[i];
      if (o.dead || o === e) continue;
      if (Math.hypot(o.x - cx, (o.y - o.h / 2) - cy) - Math.max(o.w, o.h) / 2 < 38) A.hurtEnemy(o, 45, sgn(o.x - cx), "area");
    }
  };
  E.kamidrone.fx = function (ctx, e, x, t) {
    if (e.fuse > 0) { var f = blink(t, 22); R(ctx, f ? "#ffffff" : "#ff3b3b", x - 8, e.y - e.h - 2, 16, e.h + 4, f ? 0.5 : 0.35); }
    R(ctx, "#ffb23f", x - 1, e.y - e.h - 3, 2, 2, blink(t, 6) ? 1 : 0.3);
  };

  // ---------- Kuehlmittel-Werfer: Bogenbomben hinterlassen Feuerfelder ----------
  E.lobber.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, Hz = CB.Hazards;
    if (e.aggro) {
      e.face = sgn(dx);
      var d = Math.abs(dx);
      e.vx = d < 140 ? -e.face * c.speed : d > 230 ? e.face * c.speed : 0;
      if (e.cool <= 0 && dist < c.detect) {
        e.cool = 1 / c.rate + A.rand() * 0.9;
        var p = CB.Game.p;
        lob(e, A, px + (p.vx || 0) * 0.5, 1.1, { col: "#ffb23f", onLand: function (b) { Hz.blast(b.x, GROUND - 2, 20, b.dmg, "#ff8a1f"); Hz.fire(b.x, 38, 3.5); } });
      }
    } else patrol(e, dt, A, 0.4);
    A.groundPhysics(e, dt);
  };

  // ---------- Kern-Golem: Boden-Schockwellen (druebertspringen) ----------
  E.golem.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg;
    e.slam = e.slam || 0;
    if (e.aggro) {
      e.face = sgn(dx);
      if (e.slam > 0) {
        e.slam -= dt; e.vx = 0;
        if (e.slam <= 0) {
          for (var d = -1; d <= 1; d += 2) A.enemyShot(e.x + d * 14, e.y - 4, d > 0 ? 0 : Math.PI, 125, c.dmg * e.dmgMul, { r: 4, col: "#ff8a1f", life: 3.8, ground: true, quiet: true });
          A.sfx("slam"); A.shake(3.5); A.burst(e.x, e.y, 14, ["#ff8a1f", "#ffd23f", "#ffffff"], 90, 0.4, 20, 1); A.ring(e.x, e.y - 2, 40, "#ff8a1f", 0.3);
        }
      } else {
        e.vx = Math.abs(dx) > 40 ? e.face * c.speed : 0;
        if (e.cool <= 0 && dist < c.detect) { e.slam = 0.7; e.cool = 3.4 + A.rand(); A.sfx("warn"); }
      }
    } else patrol(e, dt, A, 0.35);
    A.groundPhysics(e, dt);
  };
  E.golem.fx = function (ctx, e, x, t) {
    if (e.slam > 0) R(ctx, "#ff3b3b", x - e.w / 2 - 2, e.y - e.h - 2, e.w + 4, e.h + 4, blink(t, 16) ? 0.45 : 0.15);
    R(ctx, "#ffd23f", x - 2, e.y - e.h + 9, 4, 4, 0.5 + 0.4 * Math.sin(t * 5 + e.x));
  };

  // ---------- Boss 06: MELTDOWN HEART ----------
  // Abwechselnd GELADEN (fast unverwundbar, Spiral-Beschuss + Feuersaeulen) und ENTLUEFTET (Kern offen, verwundbar).
  E.meltdown.init = function (e) { e.mode = "charged"; e.mt = 5; e.spin = 0; e.fireT = 1; e.sT = 1.5; e.shielded = true; e.shT = 0; e.face = -1; };
  E.meltdown.onHurt = function (e, dmg) {
    if (e.shielded) {
      e.shT -= 1;
      if (e.shT <= 0) { e.shT = 6; api().text(e.x, e.y - e.h - 6, "CHARGED!", "#ffd23f"); api().sfx("block"); }
      return dmg * 0.04;
    }
    return dmg;
  };
  E.meltdown.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, G = CB.Game, Hz = CB.Hazards, ph = e.hp < e.maxHp * 0.5 ? 2 : 1, i;
    e.aggro = true; e.phase = ph; e.mt -= dt; e.face = sgn(dx);
    var sp = c.speed * (ph === 2 ? 1.7 : 1.2);
    var tx = clamp(px + Math.sin(e.t * 0.5) * 140, 60, G.worldW - 60), ty = (e.mode === "vent" ? 118 : 72) + Math.sin(e.t * 1.1) * 8;
    e.vx = clamp((tx - e.x) * 1.2, -sp, sp);
    e.x = clamp(e.x + e.vx * dt, 40, G.worldW - 40);
    e.y += clamp((ty - e.y) * 2, -60, 60) * dt;
    if (e.mode === "charged") {
      e.fireT -= dt; e.sT -= dt;
      if (e.fireT <= 0) {
        e.fireT = ph === 2 ? 0.22 : 0.3; e.spin += 0.5;
        var arms = ph === 2 ? 4 : 3;
        for (i = 0; i < arms; i++) A.enemyShot(e.x, e.y - 8, e.spin + i * 6.283 / arms, 92, c.dmg * 0.85 * e.dmgMul, { col: "#ff8a1f", r: 2, quiet: true });
      }
      if (e.sT <= 0) {
        e.sT = ph === 2 ? 0.8 : 1.15;
        Hz.strike(clamp(px + (A.rand() - 0.5) * 170, 30, G.worldW - 30), 28, 0.9, Math.round(c.dmg * 1.4 * e.dmgMul), "fire");
      }
      if (e.mt <= 0) {
        e.mode = "vent"; e.mt = ph === 2 ? 5.5 : 7; e.shielded = false; e.cool = 0.8;
        A.sfx("vent"); A.shake(5); A.text(e.x, e.y - e.h - 8, "VENTING - SHOOT THE CORE!", "#9dff4a");
        A.burst(e.x, e.y, 24, ["#ffffff", "#bcd6ff"], 120, 0.6, -20, 2);
      }
    } else {
      if (e.cool <= 0) {
        e.cool = ph === 2 ? 1.0 : 1.4;
        var base = Math.atan2(py - (e.y - 6), px - e.x);
        for (i = -1; i <= 1; i++) A.enemyShot(e.x, e.y - 6, base + i * 0.2, 125, c.dmg * e.dmgMul, { col: "#ffe14a", r: 2.5 });
      }
      if (e.mt <= 0) {
        e.mode = "charged"; e.mt = ph === 2 ? 6.5 : 5; e.shielded = true; e.fireT = 0.6; e.sT = 0.8;
        var n = 0, j;
        for (j = 0; j < G.enemies.length; j++) if (G.enemies[j].type === "kamidrone") n++;
        if (n < 3) for (j = 0; j < 2; j++) { var d = A.spawnEnemy("kamidrone", e.x + (j ? 30 : -30), e.y); d.aggro = true; d.alert = 0.4; }
        A.sfx("boss"); A.shake(4);
        A.text(e.x, e.y - e.h - 8, "CORE CHARGING!", "#ff8a1f");
      }
    }
  };
  E.meltdown.fx = function (ctx, e, x, t) {
    var y = e.y - e.h / 2;
    if (e.mode === "charged") {
      ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 14); ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), 30, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 0.12; ctx.fillStyle = "#ffd23f"; ctx.fill(); ctx.globalAlpha = 1;
    } else {
      R(ctx, "#9dff4a", x - 7, y - 7, 14, 14, 0.5 + 0.35 * Math.sin(t * 10));        // offener Kern
      R(ctx, "#ffffff", x - 3, y - 3, 6, 6, 0.8);
      for (var k = 0; k < 4; k++) { var q = (t * 1.6 + k / 4) % 1; R(ctx, "#dfe9ff", x - 26 + k * 3, y + 12 - q * 28, 4, 4, 0.5 * (1 - q)); R(ctx, "#dfe9ff", x + 22 - k * 3, y + 12 - q * 28, 4, 4, 0.5 * (1 - q)); }
    }
  };

  // =====================================================================================
  // 07 VOID LABORATORY
  // =====================================================================================

  // ---------- Phasen-Jaeger: teleportiert sich hinter den Spieler ----------
  E.stalker.init = function (e) { e.blinkT = 2 + Math.random() * 2; e.tele = 0; e.slashT = 0; e.tx = e.x; };
  E.stalker.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, G = CB.Game, p = G.p;
    e.slashT = Math.max(0, e.slashT - dt);
    if (e.aggro) {
      e.face = sgn(dx);
      if (e.tele > 0) {
        e.tele -= dt; e.vx = 0;
        if (e.tele <= 0) {
          A.burst(e.x, e.y - 10, 10, ["#b86bff", "#ffffff"], 80, 0.4, 0, 1);
          e.x = clamp(e.tx, 10, G.worldW - 10); e.y = GROUND; e.vy = 0; e.slashT = 0.5; e.contactCd = Math.min(e.contactCd, 0);
          A.burst(e.x, e.y - 10, 14, ["#b86bff", "#ffffff", "#35f0ff"], 90, 0.4, 0, 1); A.sfx("teleport");
        }
      } else {
        e.vx = e.face * c.speed * (e.slashT > 0 ? 1.8 : 1);
        e.blinkT -= dt;
        if (e.blinkT <= 0 && dist > 70) {
          e.tele = 0.5; e.blinkT = 3.3 + A.rand() * 1.5;
          e.tx = px - sgn(p.face || 1) * 38; A.sfx("warn");
          A.ring(clamp(e.tx, 10, G.worldW - 10), GROUND - 8, 18, "#b86bff", 0.5);
        }
      }
    } else patrol(e, dt, A, 0.4);
    A.groundPhysics(e, dt);
  };
  E.stalker.alpha = function (e, t) { return e.tele > 0 ? 0.25 : (e.aggro && !blink(t, 9) ? 0.85 : 0.6); };
  E.stalker.fx = function (ctx, e, x, t) {
    if (e.tele > 0) {
      var tx = e.tx - (CB.Game.camX | 0);
      R(ctx, "#b86bff", tx - 7, GROUND - 22, 14, 22, 0.15 + 0.2 * Math.sin(t * 30));
      R(ctx, "#b86bff", tx - 7, GROUND - 1, 14, 1, 0.9);
    }
    if (e.slashT > 0) R(ctx, "#ffffff", x + e.face * 10 - 1, e.y - 18, 2, 16, 0.8);
  };

  // ---------- Void-Blob: huepft, teilt sich beim Tod ----------
  function hopper(e, dt) {
    var A = api(), c = e.cfg, big = e.type === "blob";
    e.hopCd = e.hopCd || 0;
    if (e.aggro) {
      e.face = sgn(CB.Game.p.x - e.x);
      if (e.onGround && e.hopCd <= 0) { e.vy = big ? -175 : -140; e.vx = e.face * c.speed * 2.2; e.hopCd = (big ? 1.0 : 0.7) + A.rand() * 0.5; }
      else if (e.onGround) e.vx *= 0.7;
    } else if (e.onGround) {
      e.vx *= 0.7;
      if (e.hopCd <= 0) { e.vy = -110; e.vx = e.dir * 36; e.hopCd = 1.6 + A.rand(); e.patrolT -= 1; if (e.patrolT <= 0) { e.dir = -e.dir; e.patrolT = 2; } }
    }
    A.groundPhysics(e, dt);
  }
  E.blob.ai = function (e, dt) { hopper(e, dt); };
  E.spawn.ai = function (e, dt) { e.aggro = true; hopper(e, dt); };
  E.blob.onDeath = function (e) {
    var A = api();
    A.burst(e.x, e.y - 6, 14, ["#9dff4a", "#b86bff", "#ffffff"], 90, 0.5, 40, 1);
    for (var i = 0; i < 2; i++) { var s = A.spawnEnemy("spawn", e.x + (i ? 8 : -8), e.y); s.aggro = true; s.vy = -120; s.vx = (i ? 1 : -1) * 70; s.hp = Math.round(s.hp * 0.8); s.maxHp = s.hp; }
  };
  E.blob.fx = function (ctx, e, x, t) { R(ctx, "#ffffff", x - 4 + Math.sin(t * 3 + e.x) * 1, e.y - e.h + 3, 2, 2, 0.7); };

  // ---------- Riss-Irrlicht: fliegt unruhig, feuert Lenkgeschosse ----------
  E.wisp.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg;
    if (e.aggro) {
      var tx = px + Math.sin(e.t * 0.9) * 130, ty = py - 66 + Math.cos(e.t * 1.3) * 30;
      e.vx += clamp(tx - e.x, -100, 100) * 1.6 * dt; e.vx = clamp(e.vx, -c.speed, c.speed);
      e.y += clamp(ty - e.y, -42, 42) * 2 * dt;
      e.face = sgn(dx);
      if (e.cool <= 0 && dist < 270) {
        e.cool = 1 / c.rate + A.rand() * 0.9;
        A.enemyShot(e.x, e.y, Math.atan2(py - e.y, px - e.x), 82, c.dmg * e.dmgMul, { r: 3, col: "#b86bff", life: 4.5, homing: 1.8 });
      }
    } else {
      e.vx += e.dir * 18 * dt; e.vx = clamp(e.vx, -20, 20); e.y = e.baseY + Math.sin(e.t * 2) * 8;
      e.patrolT -= dt; if (e.patrolT <= 0) { e.dir = -e.dir; e.patrolT = 2 + A.rand() * 2; }
    }
    e.x = clamp(e.x + e.vx * dt, e.w / 2, CB.Game.worldW - e.w / 2);
    e.y = clamp(e.y, 24, GROUND - 26);
  };
  E.wisp.fx = function (ctx, e, x, t) { R(ctx, "#b86bff", x - 9, e.y - e.h / 2 - 9, 18, 18, 0.1 + 0.08 * Math.sin(t * 9 + e.x)); };

  // ---------- Klon (vom Boss beschworen) ----------
  E.clone.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg;
    e.aggro = true; e.face = sgn(dx);
    var d = Math.abs(dx);
    e.vx = d > 70 ? e.face * c.speed : d < 40 ? -e.face * c.speed * 0.6 : 0;
    if (e.cool <= 0 && dist < 260) { e.cool = 1 / c.rate + A.rand() * 0.6; A.enemyShot(e.x + e.face * 6, e.y - 12, Math.atan2(py - (e.y - 12), px - e.x), 120, c.dmg * e.dmgMul, { col: "#b86bff" }); }
    A.groundPhysics(e, dt);
  };
  E.clone.alpha = function (e, t) { return 0.55 + 0.25 * Math.sin(t * 9 + e.x); };

  // ---------- Boss 07: SUBJECT ZERO ----------
  // Teleportiert, ruft Riss-Strahlen von oben und Klone. Solange Klone leben, nimmt er nur 40 % Schaden.
  function countType(type) { var n = 0, G = CB.Game; for (var i = 0; i < G.enemies.length; i++) if (G.enemies[i].type === type && !G.enemies[i].dead) n++; return n; }
  E.aberration.init = function (e) { e.tele = 0; e.tx = e.x; e.face = -1; e.shT = 0; };
  E.aberration.onHurt = function (e, dmg) {
    if (countType("clone") > 0) {
      e.shT -= 1;
      if (e.shT <= 0) { e.shT = 5; api().text(e.x, e.y - e.h - 6, "LINKED TO CLONES", "#b86bff"); }
      return dmg * 0.55;
    }
    return dmg;
  };
  E.aberration.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, G = CB.Game, Hz = CB.Hazards, ph = e.hp < e.maxHp * 0.5 ? 2 : 1, i;
    e.aggro = true; e.phase = ph; e.face = sgn(dx);
    if (e.tele > 0) {
      e.tele -= dt;
      if (e.tele <= 0) {
        A.burst(e.x, e.y - 20, 18, ["#b86bff", "#ffffff"], 110, 0.5, 0, 2);
        e.x = clamp(e.tx, 50, G.worldW - 50);
        A.burst(e.x, e.y - 20, 18, ["#b86bff", "#ffffff", "#9dff4a"], 110, 0.5, 0, 2); A.sfx("teleport"); A.shake(3);
        var base = Math.atan2(py - (e.y - 20), px - e.x);
        for (i = -1; i <= 1; i++) A.enemyShot(e.x, e.y - 20, base + i * 0.22, 130, c.dmg * e.dmgMul, { col: "#9dff4a" });
      }
    } else {
      var tx = clamp(px + Math.sin(e.t * 0.6) * 130, 60, G.worldW - 60), ty = 92 + Math.sin(e.t * 1.3) * 18;
      e.x = clamp(e.x + clamp((tx - e.x) * 1.0, -c.speed, c.speed) * dt, 40, G.worldW - 40);
      e.y += clamp((ty - e.y) * 2, -50, 50) * dt;
      if (e.cool <= 0) {
        var k = e.pat++ % 4, dmg = Math.round(c.dmg * 1.6 * e.dmgMul);
        if (k === 0) {
          var offs = ph === 2 ? [0, -62, 62, -124, 124] : [0, -66, 66];
          offs.forEach(function (o) { Hz.strike(clamp(px + o, 20, G.worldW - 20), 22, 0.95, dmg, "rift"); });
          A.sfx("warn");
        } else if (k === 1) {
          var n = ph === 2 ? 8 : 5, ro = A.rand() * 6.28;
          for (i = 0; i < n; i++) A.enemyShot(e.x, e.y - 20, ro + i * 6.283 / n, 78, c.dmg * e.dmgMul, { r: 3, col: "#b86bff", life: 4.2, homing: 1.3 });
        } else if (k === 2) {
          var want = ph === 2 ? 2 : 1, have = countType("clone");
          for (i = have; i < want; i++) { var cl = A.spawnEnemy("clone", e.x + (i ? 24 : -24), GROUND); cl.aggro = true; A.burst(cl.x, cl.y - 10, 12, ["#b86bff", "#ffffff"], 80, 0.4, 0, 1); }
          A.text(e.x, e.y - e.h - 8, "CLONES!", "#b86bff");
        } else {
          e.tele = 0.6; e.tx = px + (e.x > px ? -1 : 1) * (80 + A.rand() * 60);
          A.ring(clamp(e.tx, 50, G.worldW - 50), e.y - 20, 30, "#b86bff", 0.6); A.sfx("warn");
        }
        e.cool = ph === 2 ? 1.5 : 2.1;
      }
    }
  };
  E.aberration.alpha = function (e, t) { return e.tele > 0 ? 0.3 : 1; };
  E.aberration.fx = function (ctx, e, x, t) {
    if (e.tele > 0) { var tx = e.tx - (CB.Game.camX | 0); R(ctx, "#b86bff", tx - 14, e.y - 44, 28, 44, 0.12 + 0.12 * Math.sin(t * 28)); }
    if (countType("clone") > 0) { ctx.globalAlpha = 0.3 + 0.15 * Math.sin(t * 10); ctx.strokeStyle = "#b86bff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Math.round(x), Math.round(e.y - e.h / 2), 30, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; }
  };
})(window.CB);

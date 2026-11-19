/* CYBER BOTS - render.js
   Zeichnet die Spielwelt auf das 480x270 Canvas (nur Darstellung, keine Spiellogik). */
(function (CB) {
  "use strict";

  var W = CB.W, H = CB.H, GROUND = CB.GROUND;

  // ---------- 3x5 Pixel-Schrift fuer Schadenszahlen und Hinweise ----------
  var GLYPHS = {
    "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001",
    "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111",
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
    F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
    K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
    P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
    U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
    Z: "111001010100111", "+": "000010111010000", "-": "000000111000000", "!": "010010010000010", " ": "000000000000000"
  };

  function drawText(ctx, str, x, y, col, scale, center) {
    scale = scale || 1;
    var w = str.length * 4 * scale - scale;
    var px = Math.round(center ? x - w / 2 : x), py = Math.round(y);
    for (var pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass === 0 ? "#07031a" : col;
      var ox = pass === 0 ? scale : 0;
      for (var i = 0; i < str.length; i++) {
        var g = GLYPHS[str[i].toUpperCase()] || GLYPHS[" "];
        for (var k = 0; k < 15; k++) {
          if (g.charAt(k) === "1") {
            var gx = px + i * 4 * scale + (k % 3) * scale, gy = py + ((k / 3) | 0) * scale;
            ctx.fillRect(gx + ox, gy + ox, scale, scale);
          }
        }
      }
    }
  }

  function theme(G) { return CB.THEMES[G.sec ? G.sec.theme : 0]; }

  // ---------- Boden und Plattformen ----------
  function drawGround(ctx, th, camX, t) {
    if (th.kind && CB.SpaceBG.kinds[th.kind]) { CB.SpaceBG.kinds[th.kind].ground(ctx, th, camX, t); return; }
    ctx.fillStyle = th.ground;
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#07031a";
    ctx.fillRect(0, GROUND, W, 2);
    ctx.fillStyle = th.neon[0];
    ctx.fillRect(0, GROUND, W, 1);
    ctx.globalAlpha = 0.28; ctx.fillRect(0, GROUND + 1, W, 2); ctx.globalAlpha = 1;
    // Plattenfugen
    var off = -Math.floor(camX) % 32;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (var x = off; x < W; x += 32) ctx.fillRect(x, GROUND + 3, 1, H - GROUND);
    ctx.fillRect(0, GROUND + 14, W, 1);
    ctx.fillRect(0, GROUND + 25, W, 1);
    // Neon-Markierungen im Boden
    ctx.fillStyle = th.neon[1];
    var o2 = -Math.floor(camX) % 96;
    for (var y = o2; y < W; y += 96) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2 + y); ctx.fillRect(y + 8, GROUND + 8, 18, 1); }
    ctx.globalAlpha = 1;
  }

  function drawPlatforms(ctx, G, th, camX, t) {
    for (var i = 0; i < G.platforms.length; i++) {
      var p = G.platforms[i], x = Math.round(p.x - camX);
      if (p.hidden || x > W || x + p.w < 0) continue;
      if (th.kind && CB.SpaceBG.kinds[th.kind]) { CB.SpaceBG.kinds[th.kind].platform(ctx, p, x, th, t); continue; }
      ctx.fillStyle = "#07031a"; ctx.fillRect(x - 1, p.y - 1, p.w + 2, 9);
      ctx.fillStyle = "#1d0f45"; ctx.fillRect(x, p.y, p.w, 6);
      ctx.fillStyle = th.neon[1]; ctx.fillRect(x, p.y, p.w, 1);
      ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.5; ctx.fillRect(x + 2, p.y, 6, 1); ctx.globalAlpha = 1;
      ctx.fillStyle = th.neon[0];
      for (var k = 6; k < p.w - 4; k += 12) {
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + k + p.x);
        ctx.fillRect(x + k, p.y + 3, 2, 1);
      }
      ctx.globalAlpha = 0.18; ctx.fillStyle = th.neon[1]; ctx.fillRect(x + 2, p.y + 7, p.w - 4, 4); ctx.globalAlpha = 1;
    }
  }

  // ---------- Sprites ----------
  function sprite(ctx, img, x, bottom, flip) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(bottom) + 1);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -(img.width >> 1), -img.height);
    ctx.restore();
  }

  function drawPlayer(ctx, G, camX) {
    var p = G.p, s = G.stats;
    if (!p) return;
    var spr = CB.Sprites.robot[s.robot.id];
    var x = p.x - camX, moving = p.onGround && Math.abs(p.vx) > 8;
    var frame = moving ? (Math.floor(p.anim) & 1) : 0;
    var bob = moving && frame ? -1 : 0;
    var y = p.y + bob;
    if (!p.alive) return;

    // Aura bei Overcharge
    if (p.over > 0) {
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(G.t * 20); ctx.fillStyle = "#35f0ff";
      ctx.fillRect(Math.round(x - p.w / 2 - 2), Math.round(y - p.h - 2), p.w + 4, p.h + 3); ctx.globalAlpha = 1;
    }
    var blink = p.inv > 0 && p.hurt <= 0 && p.dash <= 0 && (Math.floor(G.t * 24) & 1) && G.state === "playing";
    if (!blink) {
      var img = (p.hurt > 0 ? spr.flash : spr.frames)[p.onGround ? frame : 0];
      sprite(ctx, img, x, y, p.face < 0);
    }
    // Waffe
    var w = G.stats.weapon, wimg = CB.Sprites.weapon[w.id];
    var px = Math.round(x), py = Math.round(p.y - p.h * 0.55 + bob);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(p.aim);
    if (Math.cos(p.aim) < 0) ctx.scale(1, -1);
    ctx.drawImage(wimg, Math.round(1 - p.recoil), -3);
    ctx.restore();
    // Faehigkeits-Effekte der Charaktere
    var col = s.robot.color.b, cyy = p.y - p.h / 2;
    if (p.analysis > 0) {                                                       // Dr. Lira: Hologramme + Analyse
      var an = Math.min(1, p.analysis / 1.5);
      ctx.globalAlpha = 0.55 * an;
      for (var h = 0; h < 3; h++) {
        var ha = G.t * 1.8 + h * 2.094, hx = Math.round(x + Math.cos(ha) * 18), hy = Math.round(cyy - 6 + Math.sin(ha * 1.3) * 6);
        ctx.fillStyle = "#a06bff"; ctx.fillRect(hx - 4, hy - 3, 8, 6); ctx.fillStyle = "#0b0a1c"; ctx.fillRect(hx - 3, hy - 2, 6, 4);
        ctx.fillStyle = "#d8c4ff"; ctx.fillRect(hx - 2, hy - 1, 4, 1); ctx.fillRect(hx - 2, hy + 1, 2, 1);
      }
      ctx.fillStyle = "#a06bff"; ctx.globalAlpha = 0.5 * an; ctx.fillRect(Math.round(x - 9), Math.round(p.y + 1), 18, 1);
      ctx.globalAlpha = 1;
    }
    if (p.repair > 0) {                                                         // Zane: Reparaturfeld
      var rp = 0.5 + 0.3 * Math.sin(G.t * 10);
      ctx.globalAlpha = 0.22 * rp; ctx.fillStyle = "#6bff8a"; ctx.beginPath(); ctx.ellipse(x, p.y - 1, 26, 7, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.7; ctx.strokeStyle = "#6bff8a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, p.y - 1, 26 - (G.t * 20 % 10), 7 - (G.t * 20 % 10) * 0.27, 0, 0, 6.283); ctx.stroke();
      ctx.fillStyle = "#d8ffd8"; var cr = Math.round(p.y - 12 - (G.t * 24 % 14)); ctx.fillRect(Math.round(x) - 1, cr, 3, 1); ctx.fillRect(Math.round(x), cr - 1, 1, 3);
      ctx.globalAlpha = 1;
    }
    if (p.hackFx > 0) {                                                         // Nova: Hacking-Animation
      ctx.globalAlpha = Math.min(1, p.hackFx * 2); ctx.fillStyle = "#35f0ff";
      for (var q = 0; q < 8; q++) { var qa = G.t * 6 + q * 0.8; ctx.fillRect(Math.round(x + Math.cos(qa) * (10 + q)), Math.round(cyy + Math.sin(qa * 1.4) * 12 - q), 2, 1); }
      ctx.fillRect(Math.round(x + 12), Math.round(cyy - 10), 9, 7); ctx.fillStyle = "#0b0a1c"; ctx.fillRect(Math.round(x + 13), Math.round(cyy - 9), 7, 5);
      ctx.fillStyle = "#35f0ff"; ctx.fillRect(Math.round(x + 14), Math.round(cyy - 8), 3 + Math.floor(G.t * 20 % 4), 1); ctx.fillRect(Math.round(x + 14), Math.round(cyy - 6), 5, 1);
      ctx.globalAlpha = 1;
    }
    // Schutzschild
    if (p.shield > 0) {
      var a = Math.min(1, p.shield) * (0.55 + 0.25 * Math.sin(G.t * 12));
      ctx.globalAlpha = a; ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, p.y - p.h / 2, Math.max(p.w, p.h) * 0.75 + 3, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = a * 0.25; ctx.fillStyle = "#ffd23f"; ctx.fill(); ctx.globalAlpha = 1;
    }
  }

  // Kampf-Drohnen von Rox
  function drawDrones(ctx, G, camX) {
    var t = G.t;
    for (var i = 0; i < G.drones.length; i++) {
      var d = G.drones[i], x = Math.round(d.x - camX), y = Math.round(d.y), s = d.spawn > 0 ? 1 - d.spawn / 0.6 : 1;
      if (x < -20 || x > W + 20) continue;
      if (d.life < 3 && (Math.floor(t * 10) & 1)) ctx.globalAlpha = 0.5;
      ctx.globalAlpha *= Math.max(0.3, s);
      var rot = (Math.floor(t * 20) & 1);
      ctx.fillStyle = "#07031a"; ctx.fillRect(x - 5, y - 2, 10, 6);
      ctx.fillStyle = "#e8ecff"; ctx.fillRect(x - 4, y - 1, 8, 4);
      ctx.fillStyle = "#ff2bd6"; ctx.fillRect(x - 1, y, 3, 2); ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, 1, 1);
      ctx.fillStyle = "#ffb0f0"; ctx.fillRect(x - 8, y - 3 + rot, 4, 1); ctx.fillRect(x + 4, y - 3 + (1 - rot), 4, 1);
      ctx.fillStyle = "#a31e8a"; ctx.fillRect(x - 5, y - 2, 1, 2); ctx.fillRect(x + 4, y - 2, 1, 2);
      ctx.globalAlpha = 0.4; ctx.fillStyle = "#ff2bd6"; ctx.fillRect(x - 2, y + 4, 4, 1 + rot); ctx.globalAlpha = 1;
    }
  }

  function drawEnemy(ctx, e, camX, t) {
    var x = e.x - camX;
    if (x < -60 || x > W + 60) return;
    var spr = CB.Sprites.enemy[e.type], fr = Math.floor(e.t * (e.type === "drone" ? 14 : e.cfg.isBoss ? 10 : 7)) & 1;
    var set = e.hit > 0 ? spr.flash : spr.frames;
    var moving = Math.abs(e.vx) > 4;
    var img = set[(e.type === "turret" || e.cfg.isBoss || e.cfg.fly || e.cfg.animated || moving) ? fr : 0];
    var bobY = e.cfg.isBoss && e.cfg.fly !== false ? Math.sin(t * 3) * 1.5 : 0;
    if (e.cfg.alpha) ctx.globalAlpha = e.cfg.alpha(e, t);
    sprite(ctx, img, x, e.y + bobY, e.face < 0);
    ctx.globalAlpha = 1;
    if (e.type === "turret") {
      ctx.save();
      ctx.translate(Math.round(x), Math.round(e.y - 8));
      ctx.rotate(e.aim);
      if (Math.cos(e.aim) < 0) ctx.scale(1, -1);
      ctx.drawImage(CB.Sprites.turretBarrel, 1, -2);
      ctx.restore();
    }
    if (e.cfg.fx) e.cfg.fx(ctx, e, x, t);
    if (e.hacked > 0) {                                                       // Nova: uebernommener Bot
      var fl = 0.25 + 0.2 * Math.sin(t * 18);
      ctx.globalAlpha = fl; sprite(ctx, spr.flash[0], x, e.y, e.face < 0); ctx.globalAlpha = 1;
      ctx.fillStyle = "#35f0ff";
      for (var hq = 0; hq < 5; hq++) { var hy = (t * 40 + hq * 13) % e.h; ctx.globalAlpha = 0.7; ctx.fillRect(Math.round(x - e.w / 2 + ((hq * 7 + Math.floor(t * 9)) % e.w)), Math.round(e.y - hy), 1, 2); }
      ctx.globalAlpha = 1; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
      ctx.fillStyle = "#07031a"; ctx.fillText("HACK " + Math.ceil(e.hacked), x + 1, e.y - e.h - 3); ctx.fillStyle = "#35f0ff"; ctx.fillText("HACK " + Math.ceil(e.hacked), x, e.y - e.h - 4);
    }
    // Lebensanzeige
    if (!e.cfg.isBoss && e.hp < e.maxHp) {
      var bw = Math.max(12, e.w), bx = Math.round(x - bw / 2), by = Math.round(e.y - e.h - 6);
      ctx.fillStyle = "#07031a"; ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
      ctx.fillStyle = "#4a1030"; ctx.fillRect(bx, by, bw, 2);
      var f = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = f > 0.5 ? "#6bffcf" : f > 0.25 ? "#ffd23f" : "#ff4a6e";
      ctx.fillRect(bx, by, Math.max(1, Math.round(bw * f)), 2);
    }
    // Erkennungs-Ausrufezeichen
    if (e.alert > 0) {
      var ay = Math.round(e.y - e.h - 16 - (e.cfg.isBoss ? 10 : 0));
      ctx.fillStyle = "#07031a"; ctx.fillRect(Math.round(x) - 2, ay - 1, 4, 9);
      ctx.fillStyle = "#ffe14a"; ctx.fillRect(Math.round(x) - 1, ay, 2, 5); ctx.fillRect(Math.round(x) - 1, ay + 6, 2, 1);
    }
  }

  function drawShots(ctx, G, camX, t) {
    var i, s;
    for (i = 0; i < G.shots.length; i++) {
      s = G.shots[i];
      var x = s.x - camX;
      if (x < -20 || x > W + 20) continue;
      ctx.save();
      ctx.translate(Math.round(x), Math.round(s.y));
      ctx.rotate(Math.atan2(s.vy, s.vx));
      if (s.type === "bolt") {
        ctx.globalAlpha = 0.35; ctx.fillStyle = s.col; ctx.fillRect(-9, -1, 8, 2);
        ctx.globalAlpha = 1; ctx.fillRect(-4, -1, 6, 2);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, -1, 3, 2);
      } else if (s.type === "rocket") {
        ctx.fillStyle = "#ffb23f"; ctx.fillRect(-8, -1, 3 + (Math.floor(t * 30) & 1), 2);
        ctx.fillStyle = "#c6d0f2"; ctx.fillRect(-5, -2, 8, 4);
        ctx.fillStyle = "#ff4a1f"; ctx.fillRect(3, -2, 3, 4);
        ctx.fillStyle = "#07031a"; ctx.fillRect(-5, 1, 8, 1);
      } else if (s.type === "plasma") {
        var pu = 1 + (Math.floor(t * 16) & 1);
        ctx.globalAlpha = 0.3; ctx.fillStyle = s.col; ctx.fillRect(-14, -2, 12, 4);
        ctx.globalAlpha = 1; ctx.fillStyle = s.col; ctx.fillRect(-5 - pu, -5 - pu, 10 + pu * 2, 10 + pu * 2);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(-3, -3, 6, 6);
        ctx.fillStyle = s.col; ctx.fillRect(-1, -1, 2, 2);
      }
      ctx.restore();
    }
    for (i = 0; i < G.eshots.length; i++) {
      s = G.eshots[i];
      var ex = Math.round(s.x - camX), ey = Math.round(s.y), r = Math.round(s.r);
      if (ex < -10 || ex > W + 10) continue;
      ctx.fillStyle = "#07031a"; ctx.fillRect(ex - r - 1, ey - r - 1, r * 2 + 2, r * 2 + 2);
      ctx.fillStyle = s.col; ctx.fillRect(ex - r, ey - r, r * 2, r * 2);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(ex - 1, ey - 1, 2, 2);
    }
  }

  function drawEffects(ctx, G, camX) {
    var i, j;
    for (i = 0; i < G.beams.length; i++) {
      var b = G.beams[i], a = b.life / b.max;
      ctx.lineJoin = "miter";
      ctx.globalAlpha = a * 0.45; ctx.strokeStyle = b.col; ctx.lineWidth = 3;
      ctx.beginPath();
      for (j = 0; j < b.pts.length; j++) { var q = b.pts[j]; if (j) ctx.lineTo(Math.round(q.x - camX), Math.round(q.y)); else ctx.moveTo(Math.round(q.x - camX), Math.round(q.y)); }
      ctx.stroke();
      ctx.globalAlpha = a; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < G.parts.length; i++) {
      var p = G.parts[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < G.rings.length; i++) {
      var r = G.rings[i];
      ctx.globalAlpha = Math.max(0, r.t / r.life); ctx.strokeStyle = r.col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(Math.round(r.x - camX), Math.round(r.y), Math.max(1, r.r), 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawPickups(ctx, G, camX, t) {
    for (var i = 0; i < G.pickups.length; i++) {
      var k = G.pickups[i], x = Math.round(k.x - camX), y = Math.round(k.y + Math.sin(t * 5 + i) * 1.5);
      if (k.life < 3 && (Math.floor(t * 8) & 1)) continue;
      ctx.fillStyle = "#07031a"; ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.fillStyle = (CB.PICKUPS && CB.PICKUPS[k.kind] ? CB.PICKUPS[k.kind].col : "#6bffcf"); ctx.fillRect(x - 4, y - 4, 8, 8);
      ctx.fillStyle = "#07031a"; ctx.fillRect(x - 1, y - 3, 2, 6); ctx.fillRect(x - 3, y - 1, 6, 2);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 4, y - 4, 8, 1);
    }
  }

  function drawTexts(ctx, G, camX) {
    for (var i = 0; i < G.texts.length; i++) {
      var t = G.texts[i];
      ctx.globalAlpha = Math.min(1, t.life / t.max * 2);
      drawText(ctx, t.str, t.x - camX, t.y, t.col, t.big ? 2 : 1, true);
    }
    ctx.globalAlpha = 1;
  }

  function drawRadar(ctx, G) {
    var rw = 150, rx = Math.round((W - rw) / 2), ry = 4, k = rw / G.worldW;
    ctx.globalAlpha = 0.6; ctx.fillStyle = "#07031a"; ctx.fillRect(rx - 1, ry - 1, rw + 2, 7); ctx.globalAlpha = 1;
    ctx.fillStyle = "#2a1560"; ctx.fillRect(rx, ry, rw, 5);
    ctx.fillStyle = "#4a3a8a"; ctx.fillRect(rx + Math.round(G.camX * k), ry, Math.max(2, Math.round(W * k)), 5);
    var i;
    for (i = 0; i < G.enemies.length; i++) {
      var e = G.enemies[i];
      ctx.fillStyle = e.cfg.isBoss ? "#ffe14a" : e.cfg.fixed ? "#ff9a3d" : "#ff2b8a";
      var s = e.cfg.isBoss ? 3 : 2;
      ctx.fillRect(rx + Math.round(e.x * k) - 1, ry + 2 - (s >> 1) + 1, s, s);
    }
    ctx.fillStyle = "#35f0ff";
    ctx.fillRect(rx + Math.round(G.p.x * k) - 1, ry, 3, 5);
  }

  function drawCrosshair(ctx, mx, my, t) {
    var x = Math.round(mx), y = Math.round(my), g = 3 + (Math.floor(t * 4) & 1);
    ctx.fillStyle = "#07031a";
    ctx.fillRect(x - g - 3, y - 1, 5, 3); ctx.fillRect(x + g - 1, y - 1, 5, 3); ctx.fillRect(x - 1, y - g - 3, 3, 5); ctx.fillRect(x - 1, y + g - 1, 3, 5);
    ctx.fillStyle = "#35f0ff";
    ctx.fillRect(x - g - 2, y, 4, 1); ctx.fillRect(x + g - 1, y, 4, 1); ctx.fillRect(x, y - g - 2, 1, 4); ctx.fillRect(x, y + g - 1, 1, 4);
    ctx.fillStyle = "#ff2bd6"; ctx.fillRect(x, y, 1, 1);
  }

  // ---------- Hauptmenue-Szene (Hintergrund hinter dem Menue) ----------
  function drawMenuScene(ctx, G) {
    var t = G.t, th = CB.THEMES[0], camX = t * 22;
    CB.Background.draw(ctx, 0, camX, t, CB.Save.data.settings.particles);
    drawGround(ctx, th, camX, t);
    var d = CB.Save.data, r = CB.byId(CB.ROBOTS, d.selRobot), spr = CB.Sprites.robot[r.id];
    var bx = 350, by = GROUND;
    for (var i = 0; i < 3; i++) {       // vorbeifliegende Drohnen
      var dx = ((t * (30 + i * 12) + i * 170) % (W + 80)) - 40, dy = 70 + i * 28 + Math.sin(t * 2 + i) * 6;
      var ds = CB.Sprites.enemy.drone;
      sprite(ctx, ds.frames[Math.floor(t * 14) & 1], dx, dy, false);
    }
    sprite(ctx, spr.frames[0], bx, by + (Math.sin(t * 2.5) > 0.6 ? -1 : 0), false);
    var wimg = CB.Sprites.weapon[d.selWeapon];
    ctx.save(); ctx.translate(bx, Math.round(by - r.h * 0.55)); ctx.rotate(-0.1 + Math.sin(t) * 0.05);
    ctx.drawImage(wimg, 1, -3); ctx.restore();
    // gelegentlicher Schuss in den Himmel
    var ph = (t * 1.3) % 1;
    if (ph < 0.5) { ctx.fillStyle = CB.byId(CB.WEAPONS, d.selWeapon).color; ctx.fillRect(Math.round(bx + 12 + ph * 300), Math.round(by - r.h * 0.55 - ph * 30), 5, 2); }
    CB.Background.drawAtmosphere(ctx, 0, t, d.settings.particles);
  }

  function draw(ctx, G) {
    ctx.imageSmoothingEnabled = false;
    if (G.state === "menu" || !G.p) { drawMenuScene(ctx, G); return; }
    var th = theme(G), t = G.t;
    var sx = 0, sy = 0;
    if (G.shake > 0) { sx = Math.round((Math.random() - 0.5) * G.shake * 2); sy = Math.round((Math.random() - 0.5) * G.shake * 2); }
    ctx.save();
    ctx.translate(sx, sy);
    var camX = Math.round(G.camX);
    CB.Background.draw(ctx, G.sec.theme, camX, t, CB.Save.data.settings.particles);
    drawGround(ctx, th, camX, t);
    drawPlatforms(ctx, G, th, camX, t);
    if (CB.Hazards) CB.Hazards.drawBack(ctx, camX, t, th);
    drawPickups(ctx, G, camX, t);
    for (var i = 0; i < G.enemies.length; i++) drawEnemy(ctx, G.enemies[i], camX, t);
    if (CB.Net && CB.Net.active) CB.Net.draw(ctx, camX, t);
    drawPlayer(ctx, G, camX);
    drawDrones(ctx, G, camX);
    drawShots(ctx, G, camX, t);
    if (CB.Hazards) CB.Hazards.drawFront(ctx, camX, t);
    drawEffects(ctx, G, camX);
    drawTexts(ctx, G, camX);
    CB.Background.drawAtmosphere(ctx, G.sec.theme, t, CB.Save.data.settings.particles);
    ctx.restore();

    if (G.flash > 0) { ctx.globalAlpha = Math.min(0.8, G.flash); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    // Rote Warnkante bei wenig Leben
    var p = G.p;
    if (p.alive && p.hp / p.maxHp < 0.3) {
      ctx.globalAlpha = 0.15 + 0.12 * Math.sin(t * 8); ctx.fillStyle = "#ff2b4d";
      ctx.fillRect(0, 0, W, 4); ctx.fillRect(0, H - 4, W, 4); ctx.fillRect(0, 0, 4, H); ctx.fillRect(W - 4, 0, 4, H);
      ctx.globalAlpha = 1;
    }
    drawRadar(ctx, G);
    var I = CB.Input;
    if (G.state === "playing" && CB.Save.data.settings.crosshair) {
      if (I.padMode) {
        // Zielpunkt des rechten Sticks: Fadenkreuz in Blickrichtung vor dem Roboter
        if (I.padAim.mag > 0.3) drawCrosshair(ctx, p.x - Math.round(G.camX) + I.padAim.x * 48, p.y - p.h * 0.55 + I.padAim.y * 48, t);
      } else if (I.mouse.active && !I.touchMode) drawCrosshair(ctx, I.mouse.x, I.mouse.y, t);
    }
  }

  CB.Render = { draw: draw, drawText: drawText };
})(window.CB);

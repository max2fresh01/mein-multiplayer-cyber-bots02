/* CYBER BOTS - space-bg.js
   Eigene Pixel-Art-Hintergruende, Boeden und Plattformen der Weltraum-Sektoren.
   Jeder Sektor ("kind") hat Himmel, drei Parallax-Ebenen, animierte Details und Atmosphaere. */
(function (CB) {
  "use strict";

  var W = CB.W, H = CB.H, GROUND = CB.GROUND, TW = 960;
  var K = {};
  function mk(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function pick(a, r) { return a[Math.floor(r() * a.length)]; }
  function wrapX(x) { return ((x % TW) + TW) % TW; }
  function R(ctx, col, x, y, w, h, a) {
    if (a !== undefined) ctx.globalAlpha = a;
    ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h);
    if (a !== undefined) ctx.globalAlpha = 1;
  }
  function tile(ctx, img, camX, f) {
    var off = -Math.floor(camX * f) % TW;
    if (off > 0) off -= TW;
    ctx.drawImage(img, off, 0);
    if (off + TW < W) ctx.drawImage(img, off + TW, 0);
  }
  function each(x, camX, f, w, fn) {
    var sx = wrapX(x - camX * f);
    if (sx < W + w) fn(sx);
    if (sx - TW > -w && sx - TW < W) fn(sx - TW);
  }
  function stars(sx, rnd, n, maxY, cols) {
    for (var i = 0; i < n; i++) {
      sx.globalAlpha = 0.25 + rnd() * 0.65; sx.fillStyle = cols ? pick(cols, rnd) : "#ffffff";
      var s = rnd() < 0.08 ? 2 : 1;
      sx.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * maxY), s, s);
    }
    sx.globalAlpha = 1;
  }
  // Planetenscheibe mit Pixel-Kanten, Land, Wolken und Terminator
  function planet(sx, rnd, cx, cy, r, pal) {
    var c = mk(r * 2, r * 2), x = c.getContext("2d");
    for (var yy = 0; yy < r * 2; yy++) {
      var dy = yy - r, half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      x.fillStyle = pal.sea; x.fillRect(r - half, yy, half * 2, 1);
    }
    x.globalCompositeOperation = "source-atop";
    for (var i = 0; i < pal.land.n; i++) {
      x.fillStyle = pick(pal.land.cols, rnd);
      var bx = rnd() * r * 2, by = rnd() * r * 2, bw = 14 + rnd() * 50, bh = 6 + rnd() * 20;
      for (var k = 0; k < 4; k++) x.fillRect(bx + (rnd() - 0.5) * bw * 0.6, by + (rnd() - 0.5) * bh, bw * (0.4 + rnd() * 0.6), bh * (0.5 + rnd() * 0.5));
    }
    x.fillStyle = pal.cloud;
    for (var j = 0; j < pal.clouds; j++) { x.globalAlpha = 0.25 + rnd() * 0.3; x.fillRect(rnd() * r * 2, rnd() * r * 2, 20 + rnd() * 60, 2 + rnd() * 3); }
    x.globalAlpha = 1;
    var g = x.createLinearGradient(0, 0, r * 2, r * 0.8);
    g.addColorStop(0, "rgba(0,0,10,0)"); g.addColorStop(0.55, "rgba(0,0,10,0.15)"); g.addColorStop(1, "rgba(0,0,10," + pal.shade + ")");
    x.fillStyle = g; x.fillRect(0, 0, r * 2, r * 2);
    x.globalCompositeOperation = "source-over";
    // Atmosphaerenrand
    x.globalAlpha = 0.5; x.fillStyle = pal.rim;
    for (var q = 0; q < r * 2; q++) {
      var d2 = q - r, hf = Math.floor(Math.sqrt(Math.max(0, r * r - d2 * d2)));
      x.fillRect(r - hf, q, 2, 1);
    }
    x.globalAlpha = 1;
    sx.drawImage(c, Math.round(cx - r), Math.round(cy - r));
  }

  // =====================================================================================
  // 05 ORBITAL STATION
  // =====================================================================================
  K.station = {
    build: function (th, rnd) {
      var o = {};
      var sky = mk(W, H), sx = sky.getContext("2d");
      var g = sx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, th.sky[0]); g.addColorStop(0.6, th.sky[1]); g.addColorStop(1, th.sky[2]);
      sx.fillStyle = g; sx.fillRect(0, 0, W, H);
      stars(sx, rnd, 170, 220, ["#ffffff", "#bfe4ff", "#ffe9bf"]);
      // Lichtreflex (ferne Sonne)
      sx.fillStyle = "#ffffff"; sx.globalAlpha = 0.9; sx.fillRect(56, 38, 3, 3); sx.globalAlpha = 0.35;
      sx.fillRect(48, 39, 19, 1); sx.fillRect(57, 30, 1, 19); sx.globalAlpha = 0.12; sx.fillRect(40, 39, 35, 1); sx.globalAlpha = 1;
      // grosser Planet unten rechts, kleiner Mond
      planet(sx, rnd, 380, 330, 190, { sea: "#0c4a9a", land: { n: 14, cols: ["#2f8a4a", "#7aa04a", "#a88a5a", "#1f6a3a"] }, cloud: "#ffffff", clouds: 26, shade: 0.7, rim: "#8fe0ff" });
      planet(sx, rnd, 90, 70, 16, { sea: "#8a7a9a", land: { n: 5, cols: ["#6a5a7a", "#a898b8"] }, cloud: "#ffffff", clouds: 0, shade: 0.6, rim: "#d8c8f0" });
      o.sky = sky;

      // Ferne Ebene: Fachwerk-Traeger und Solarsegel
      var far = mk(TW, H), fx = far.getContext("2d"), px = 0;
      while (px < TW) {
        var kind = rnd();
        if (kind < 0.5) {                                   // Solarsegel
          var pw = 30 + Math.floor(rnd() * 30), ph = 40 + Math.floor(rnd() * 60), top = 20 + Math.floor(rnd() * 80);
          fx.fillStyle = th.far; fx.fillRect(px, top, pw, ph);
          fx.fillStyle = "#1a3f7a"; fx.globalAlpha = 0.6;
          for (var gx = 2; gx < pw - 1; gx += 5) fx.fillRect(px + gx, top + 2, 1, ph - 4);
          for (var gy = 3; gy < ph - 1; gy += 6) fx.fillRect(px + 2, top + gy, pw - 4, 1);
          fx.globalAlpha = 1; fx.fillStyle = th.far; fx.fillRect(px + (pw >> 1) - 1, top + ph, 3, H - top - ph);
          px += pw + 6 + Math.floor(rnd() * 14);
        } else {                                            // Traegerturm
          var tw = 10 + Math.floor(rnd() * 8), tt = 60 + Math.floor(rnd() * 90);
          fx.fillStyle = th.far; fx.fillRect(px, H - tt, tw, tt);
          for (var s = 0; s < tt; s += 8) { fx.fillRect(px - 3, H - tt + s, tw + 6, 1); }
          fx.fillRect(px + (tw >> 1), H - tt - 12, 1, 12);
          fx.fillStyle = "#35f0ff"; fx.globalAlpha = 0.4; fx.fillRect(px, H - tt, tw, 1); fx.globalAlpha = 1;
          px += tw + 10 + Math.floor(rnd() * 24);
        }
      }
      o.far = far;

      // Mittlere Ebene: Moduele, Andockstutzen, Radarschuesseln, Fenster
      var mid = mk(TW, H), mx = mid.getContext("2d"); px = 0; o.beacons = []; o.dishes = [];
      while (px < TW) {
        var bw = 36 + Math.floor(rnd() * 50), bh = 50 + Math.floor(rnd() * 70), tp = H - bh;
        mx.fillStyle = th.mid; mx.fillRect(px, tp, bw, bh);
        mx.fillStyle = "#1b4a86"; mx.globalAlpha = 0.7; mx.fillRect(px, tp, bw, 1); mx.globalAlpha = 1;
        mx.fillStyle = "#07122a"; mx.fillRect(px + 2, tp + 4, 1, bh - 4);      // Fugen
        mx.fillRect(px + bw - 3, tp + 4, 1, bh - 4);
        for (var wy = tp + 8; wy < H - 14; wy += 9) {                          // Fensterbaender
          if (rnd() < 0.7) {
            var ww = bw - 12;
            mx.fillStyle = "#07122a"; mx.fillRect(px + 6, wy, ww, 4);
            for (var wx = px + 7; wx < px + 6 + ww - 2; wx += 4) {
              mx.fillStyle = rnd() < 0.7 ? pick(["#8fe6ff", "#ffe9a8", "#ffffff"], rnd) : "#10305a";
              mx.globalAlpha = 0.85; mx.fillRect(wx, wy + 1, 3, 2);
            }
            mx.globalAlpha = 1;
          }
        }
        var roof = rnd();
        if (roof < 0.35) {                                                      // Antenne + Blinklicht
          mx.fillStyle = th.mid; mx.fillRect(px + (bw >> 1), tp - 16, 1, 16);
          o.beacons.push({ x: px + (bw >> 1) - 1, y: tp - 18, col: rnd() < 0.5 ? "#ff3b6b" : "#35f0ff", ph: rnd() * 6, sp: 2 + rnd() * 2 });
        } else if (roof < 0.6) {                                                // Radarschuessel (animiert)
          mx.fillStyle = th.mid; mx.fillRect(px + (bw >> 1) - 1, tp - 8, 2, 8);
          o.dishes.push({ x: px + (bw >> 1), y: tp - 9, ph: rnd() * 6 });
        } else if (roof < 0.8) {                                                // Andockrohr
          mx.fillStyle = th.mid; mx.fillRect(px + bw, tp + 14, 10, 6);
          mx.fillStyle = "#35f0ff"; mx.globalAlpha = 0.6; mx.fillRect(px + bw + 8, tp + 14, 2, 6); mx.globalAlpha = 1;
        }
        px += bw + 2 + Math.floor(rnd() * 8);
      }
      o.mid = mid;

      // Vordere Ebene: Schottwaende, Rohre, Konsolen mit LEDs, Gefahrenstreifen
      var near = mk(TW, H), nx = near.getContext("2d"); px = 0; o.leds = []; o.alarms = [];
      while (px < TW) {
        var nw = 30 + Math.floor(rnd() * 46), nh = 28 + Math.floor(rnd() * 56), nt = H - nh;
        nx.fillStyle = th.near; nx.fillRect(px, nt, nw, nh);
        nx.fillStyle = "#35f0ff"; nx.globalAlpha = 0.5; nx.fillRect(px, nt, nw, 1); nx.globalAlpha = 1;
        nx.fillStyle = "#0b1f40"; nx.fillRect(px + 3, nt + 4, 2, nh - 4); nx.fillRect(px + nw - 5, nt + 4, 2, nh - 4);
        nx.fillStyle = "#35f0ff"; nx.globalAlpha = 0.35; nx.fillRect(px + 3, nt + 6, 1, nh - 10); nx.fillRect(px + nw - 4, nt + 6, 1, nh - 10); nx.globalAlpha = 1;
        // Gefahrenstreifen
        if (rnd() < 0.55) { for (var hz = 0; hz < nw - 12; hz += 4) { nx.fillStyle = (hz / 4) % 2 ? "#ffd23f" : "#07122a"; nx.globalAlpha = 0.45; nx.fillRect(px + 7 + hz, nt + 10, 3, 3); } nx.globalAlpha = 1; }
        // Konsole
        if (rnd() < 0.6 && nw > 28) {
          var cw = 14 + Math.floor(rnd() * 10), cxp = px + 8;
          nx.fillStyle = "#0b1f40"; nx.fillRect(cxp, nt + nh - 16, cw, 10);
          nx.fillStyle = "#07122a"; nx.fillRect(cxp + 1, nt + nh - 15, cw - 2, 4);
          for (var l = 0; l < 4; l++) o.leds.push({ x: cxp + 2 + l * 3, y: nt + nh - 9, col: pick(["#35f0ff", "#ff3b6b", "#9dff4a", "#ffd23f"], rnd), ph: rnd() * 6, sp: 1 + rnd() * 5 });
        }
        if (rnd() < 0.3) o.alarms.push({ x: px + (nw >> 1), y: nt - 3, ph: rnd() * 6 });
        px += nw + Math.floor(rnd() * 5);
      }
      o.near = near;
      // fliegende Raumschiffe
      o.ships = [];
      for (var c = 0; c < 5; c++) o.ships.push({ x: rnd() * TW, y: 24 + rnd() * 120, v: (c % 2 ? 1 : -1) * (10 + rnd() * 22), col: pick(th.neon, rnd), f: 0.15 + rnd() * 0.15, big: rnd() < 0.3 });
      return o;
    },
    draw: function (ctx, b, camX, t, q) {
      ctx.drawImage(b.sky, 0, 0);
      // Funkelnde Sterne und Sternschnuppe
      ctx.fillStyle = "#fff";
      for (var s = 0; s < 10; s++) if (Math.sin(t * 2 + s * 7.3) > 0.7) ctx.fillRect((s * 61 + 13) % W, (s * 37 + 9) % 160, 1, 1);
      var sh = (t * 0.35) % 1;
      if (sh < 0.12) { var u = sh / 0.12; R(ctx, "#ffffff", 70 + u * 180, 20 + u * 60, 6, 1, 1 - u); R(ctx, "#8fe6ff", 64 + u * 180, 19 + u * 60, 6, 1, (1 - u) * 0.5); }
      tile(ctx, b.far, camX, 0.1);
      for (var i = 0; i < b.ships.length; i++) {
        var sp = b.ships[i], x = sp.x + t * sp.v;
        each(x, camX, sp.f, 40, function (px) {
          var dir = sp.v > 0 ? 1 : -1, y = Math.round(sp.y);
          R(ctx, sp.col, px - dir * 18, y, 14, 1, 0.35);
          R(ctx, "#cfe0ff", px - (sp.big ? 6 : 3), y - 1, sp.big ? 12 : 6, sp.big ? 4 : 3);
          R(ctx, "#4a5a8a", px - (sp.big ? 6 : 3), y + (sp.big ? 2 : 1), sp.big ? 12 : 6, 1);
          R(ctx, sp.col, px + dir * (sp.big ? 6 : 3), y, 2, 2);
        });
      }
      tile(ctx, b.mid, camX, 0.28);
      for (var k = 0; k < b.beacons.length; k++) {
        var bc = b.beacons[k], on = Math.sin(t * bc.sp + bc.ph) > 0.2;
        each(bc.x, camX, 0.28, 6, function (px) { if (on) { R(ctx, bc.col, px, bc.y, 2, 2); R(ctx, bc.col, px - 1, bc.y - 1, 4, 4, 0.25); } });
      }
      for (var d = 0; d < b.dishes.length; d++) {
        var ds = b.dishes[d], sw = Math.sin(t * 0.8 + ds.ph) * 5;
        each(ds.x, camX, 0.28, 12, function (px) { R(ctx, "#4a6aa0", px - 5 + sw, ds.y, 10 - Math.abs(sw) * 0.6, 2); R(ctx, "#8fe6ff", px + sw * 0.5, ds.y - 3, 1, 3, 0.8); });
      }
      var fog = ctx.createLinearGradient(0, H - 130, 0, H - 40);
      fog.addColorStop(0, "rgba(53,240,255,0)"); fog.addColorStop(1, "rgba(53,240,255,0.12)");
      ctx.fillStyle = fog; ctx.fillRect(0, H - 130, W, 90);
      tile(ctx, b.near, camX, 0.5);
      for (var l = 0; l < b.leds.length; l++) {
        var ld = b.leds[l];
        each(ld.x, camX, 0.5, 4, function (px) { R(ctx, ld.col, px, ld.y, 2, 2, 0.4 + 0.6 * (Math.sin(t * ld.sp + ld.ph) > 0 ? 1 : 0)); });
      }
      for (var a = 0; a < b.alarms.length; a++) {
        var al = b.alarms[a], on2 = Math.sin(t * 5 + al.ph) > 0;
        each(al.x, camX, 0.5, 8, function (px) { R(ctx, "#07122a", px - 2, al.y, 5, 3); R(ctx, on2 ? "#ff3b6b" : "#4a1a2a", px - 1, al.y, 3, 2); if (on2) R(ctx, "#ff3b6b", px - 6, al.y - 3, 13, 8, 0.12); });
      }
    },
    atmo: function (ctx, b, t, q) {
      var n = q === "low" ? 10 : 26;
      ctx.fillStyle = "#cfe0ff";
      for (var i = 0; i < n; i++) {                                         // treibende Staubkoerner / Truemmer
        var x = ((i * 83 + t * (8 + (i % 5) * 4)) % (W + 20)), y = (i * 47 + Math.sin(t * 0.6 + i) * 10 + t * (3 + i % 3)) % H;
        ctx.globalAlpha = 0.18 + 0.3 * (i % 4) / 4;
        ctx.fillRect(Math.round(W - x), Math.round(y), i % 7 === 0 ? 2 : 1, 1);
      }
      ctx.globalAlpha = 1;
    },
    ground: function (ctx, th, camX, t) {
      R(ctx, th.ground, 0, GROUND, W, H - GROUND);
      R(ctx, "#07031a", 0, GROUND, W, 2);
      R(ctx, "#35f0ff", 0, GROUND, W, 1); R(ctx, "#35f0ff", 0, GROUND + 1, W, 2, 0.25);
      var off = -Math.floor(camX) % 48, x;
      for (x = off; x < W; x += 48) { R(ctx, "#ffffff", x, GROUND + 3, 1, H - GROUND, 0.07); R(ctx, "#35f0ff", x + 2, GROUND + 5, 1, 1, 0.5); R(ctx, "#35f0ff", x + 2, GROUND + 28, 1, 1, 0.5); }
      R(ctx, "#ffffff", 0, GROUND + 14, W, 1, 0.06);
      // laufendes Lichtband
      var o2 = -Math.floor(camX) % 8;
      for (x = o2; x < W; x += 8) { var lit = (Math.floor(x / 8 + t * 6 + camX / 8) % 5) === 0; R(ctx, lit ? "#8fe6ff" : "#16305a", x, GROUND + 9, 4, 1, lit ? 0.9 : 0.6); }
      // Gefahrenstreifen
      var o3 = -Math.floor(camX) % 64;
      for (x = o3; x < W; x += 64) for (var s = 0; s < 24; s += 6) { R(ctx, "#ffd23f", x + s, GROUND + 18, 3, 3, 0.3); }
    },
    platform: function (ctx, p, x, th, t) {
      R(ctx, "#07031a", x - 1, p.y - 1, p.w + 2, 9);
      R(ctx, "#12294d", x, p.y, p.w, 6);
      R(ctx, "#35f0ff", x, p.y, p.w, 1);
      for (var k = 2; k < p.w - 1; k += 4) R(ctx, "#07122a", x + k, p.y + 2, 1, 3);       // Gitterrost
      R(ctx, "#ffffff", x + 2, p.y, 6, 1, 0.5);
      R(ctx, "#35f0ff", x + 1, p.y + 6, 1, 3, 0.5); R(ctx, "#35f0ff", x + p.w - 2, p.y + 6, 1, 3, 0.5);
      R(ctx, "#35f0ff", x + 2, p.y + 7, p.w - 4, 4, 0.14 + 0.06 * Math.sin(t * 3 + p.x));
    }
  };


  // =====================================================================================
  // 06 REACTOR CORE: Kuehltuerme, Reaktorhallen mit pulsierenden Kernen, Rohre, Glut
  // =====================================================================================
  K.reactor = {
    build: function (th, rnd) {
      var o = {};
      var sky = mk(W, H), sx = sky.getContext("2d");
      var g = sx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, th.sky[0]); g.addColorStop(0.6, th.sky[1]); g.addColorStop(1, th.sky[2]);
      sx.fillStyle = g; sx.fillRect(0, 0, W, H);
      var rg = sx.createRadialGradient(W * 0.62, H + 20, 10, W * 0.62, H + 20, 260);
      rg.addColorStop(0, "rgba(255,170,40,0.55)"); rg.addColorStop(0.5, "rgba(255,90,20,0.22)"); rg.addColorStop(1, "rgba(255,60,10,0)");
      sx.fillStyle = rg; sx.fillRect(0, 0, W, H);
      stars(sx, rnd, 40, 120, ["#ffd9a0", "#ffffff"]);
      o.sky = sky;
      // Kuehltuerme (fern) + Dampffahnen
      var far = mk(TW, H), fx = far.getContext("2d"), px = 10; o.stacks = [];
      while (px < TW - 60) {
        var tw = 50 + Math.floor(rnd() * 26), th2 = 100 + Math.floor(rnd() * 60), top = H - th2;
        fx.fillStyle = th.far;
        for (var y = 0; y < th2; y++) {                                   // Hyperboloid: schmale Taille
          var k = Math.abs(y - th2 * 0.45) / (th2 * 0.55), w = Math.floor(tw * (0.62 + 0.38 * k * k));
          fx.fillRect(px + (tw - w) / 2, top + y, w, 1);
        }
        fx.fillStyle = "#ff8a1f"; fx.globalAlpha = 0.3; fx.fillRect(px + tw / 2 - 12, top, 24, 1); fx.globalAlpha = 1;
        o.stacks.push({ x: px + tw / 2, y: top, ph: rnd() * 6 });
        px += tw + 24 + Math.floor(rnd() * 40);
      }
      o.far = far;
      // Reaktorhallen (mittig) mit Kernfenstern
      var mid = mk(TW, H), mx = mid.getContext("2d"); px = 0; o.cores = []; o.beacons = [];
      while (px < TW) {
        var bw = 40 + Math.floor(rnd() * 54), bh = 48 + Math.floor(rnd() * 66), tp = H - bh;
        mx.fillStyle = th.mid; mx.fillRect(px, tp, bw, bh);
        mx.fillStyle = "#ff8a1f"; mx.globalAlpha = 0.5; mx.fillRect(px, tp, bw, 1); mx.globalAlpha = 1;
        mx.fillStyle = "#1a0805"; mx.fillRect(px + 3, tp + 4, 1, bh - 4); mx.fillRect(px + bw - 4, tp + 4, 1, bh - 4);
        if (rnd() < 0.55 && bw > 50) {                                   // Kernfenster
          var cw = 18 + Math.floor(rnd() * 10), cx2 = px + ((bw - cw) >> 1), cy2 = tp + 12;
          mx.fillStyle = "#07031a"; mx.fillRect(cx2 - 1, cy2 - 1, cw + 2, cw + 2);
          o.cores.push({ x: cx2, y: cy2, w: cw, col: rnd() < 0.5 ? "#9dff4a" : "#ffb23f", ph: rnd() * 6 });
        } else {
          for (var wy = tp + 8; wy < H - 10; wy += 8) { mx.fillStyle = "#07031a"; mx.fillRect(px + 6, wy, bw - 12, 3); mx.fillStyle = "#ffb23f"; mx.globalAlpha = 0.5; for (var wx = px + 7; wx < px + bw - 8; wx += 5) if (rnd() < 0.6) mx.fillRect(wx, wy + 1, 2, 1); mx.globalAlpha = 1; }
        }
        if (rnd() < 0.5) { mx.fillStyle = th.mid; mx.fillRect(px + bw - 10, tp - 14, 6, 14); o.beacons.push({ x: px + bw - 8, y: tp - 16, ph: rnd() * 6 }); }
        px += bw + Math.floor(rnd() * 6);
      }
      o.mid = mid;
      // Vordergrund: Rohrleitungen, Tanks, Manometer
      var near = mk(TW, H), nx = near.getContext("2d"); px = 0; o.gauges = [];
      while (px < TW) {
        var nw = 34 + Math.floor(rnd() * 44), nh = 24 + Math.floor(rnd() * 50), nt = H - nh;
        nx.fillStyle = th.near; nx.fillRect(px, nt, nw, nh);
        nx.fillStyle = "#ff8a1f"; nx.globalAlpha = 0.4; nx.fillRect(px, nt, nw, 1); nx.globalAlpha = 1;
        for (var p2 = 0; p2 < 2; p2++) { var py2 = nt + 8 + p2 * 14; if (py2 < H - 6) { nx.fillStyle = "#2a100a"; nx.fillRect(px - 6, py2, nw + 12, 4); nx.fillStyle = "#ff8a1f"; nx.globalAlpha = 0.3; nx.fillRect(px - 6, py2, nw + 12, 1); nx.globalAlpha = 1; } }
        if (rnd() < 0.5) {
          var gx = px + 6 + Math.floor(rnd() * (nw - 18)), gy = nt + 12;
          nx.fillStyle = "#07031a"; nx.fillRect(gx, gy, 10, 10); nx.fillStyle = "#3a1a10"; nx.fillRect(gx + 1, gy + 1, 8, 8);
          o.gauges.push({ x: gx + 5, y: gy + 5, ph: rnd() * 6 });
        }
        if (rnd() < 0.4) { for (var hz = 0; hz < nw - 8; hz += 4) { nx.fillStyle = (hz / 4) % 2 ? "#ffd23f" : "#1a0805"; nx.globalAlpha = 0.5; nx.fillRect(px + 4 + hz, H - 8, 3, 3); } nx.globalAlpha = 1; }
        px += nw + Math.floor(rnd() * 5);
      }
      o.near = near;
      return o;
    },
    draw: function (ctx, b, camX, t, q) {
      ctx.drawImage(b.sky, 0, 0);
      var pulse = 0.5 + 0.5 * Math.sin(t * 1.8);
      R(ctx, "#ff6a1f", 0, H - 120, W, 120, 0.06 + 0.04 * pulse);
      tile(ctx, b.far, camX, 0.1);
      for (var i = 0; i < b.stacks.length; i++) {                      // Dampf aus den Tuermen
        var st = b.stacks[i];
        each(st.x, camX, 0.1, 40, function (px) {
          for (var j = 0; j < 5; j++) {
            var ph = (t * 0.18 + j / 5 + st.ph) % 1;
            R(ctx, "#8a6a5a", px - 6 + Math.sin(ph * 5 + st.ph) * 5, st.y - 4 - ph * 46, 8 + ph * 12, 5 + ph * 6, (1 - ph) * 0.22);
          }
        });
      }
      tile(ctx, b.mid, camX, 0.28);
      for (var k = 0; k < b.cores.length; k++) {
        var c = b.cores[k], pu = 0.45 + 0.4 * Math.sin(t * 2.2 + c.ph);
        each(c.x, camX, 0.28, c.w, function (px) {
          R(ctx, c.col, px, c.y, c.w, c.w, 0.55 + pu * 0.4);
          R(ctx, "#ffffff", px + c.w / 2 - 2, c.y + c.w / 2 - 2, 4, 4, 0.5 + pu * 0.4);
          R(ctx, c.col, px - 5, c.y - 5, c.w + 10, c.w + 10, 0.07 + pu * 0.06);
          R(ctx, "#07031a", px + (c.w >> 1), c.y, 1, c.w, 0.5);
        });
      }
      for (var m = 0; m < b.beacons.length; m++) {
        var bc = b.beacons[m], on = Math.sin(t * 3 + bc.ph) > 0;
        each(bc.x, camX, 0.28, 6, function (px) { if (on) R(ctx, "#ff3b3b", px, bc.y, 2, 2); });
      }
      var fog = ctx.createLinearGradient(0, H - 120, 0, H - 30);
      fog.addColorStop(0, "rgba(255,120,30,0)"); fog.addColorStop(1, "rgba(255,120,30,0.15)");
      ctx.fillStyle = fog; ctx.fillRect(0, H - 120, W, 90);
      tile(ctx, b.near, camX, 0.5);
      for (var g = 0; g < b.gauges.length; g++) {
        var ga = b.gauges[g], ang = -2.2 + (0.5 + 0.5 * Math.sin(t * 0.9 + ga.ph)) * 2.6;
        each(ga.x, camX, 0.5, 8, function (px) { R(ctx, "#ff3b3b", px + Math.cos(ang) * 3, ga.y + Math.sin(ang) * 3, 1, 1); R(ctx, "#ffd23f", px + Math.cos(ang) * 1.5, ga.y + Math.sin(ang) * 1.5, 1, 1); R(ctx, "#ffffff", px, ga.y, 1, 1); });
      }
      // gelegentlicher Lichtbogen zwischen den Tuermen
      var arc = Math.floor(t * 0.6);
      if ((t * 0.6) % 1 < 0.12 && arc % 2 === 0) {
        var ax = (arc * 97) % 380 + 20;
        for (var z = 0; z < 8; z++) R(ctx, "#ffe14a", ax + z * 6 + (z % 2) * 2, 60 + Math.sin(arc * 3 + z * 2) * 14 + z * 4, 5, 1, 0.7);
      }
    },
    atmo: function (ctx, b, t, q) {
      var n = q === "low" ? 14 : 36;
      for (var i = 0; i < n; i++) {                                         // aufsteigende Glut
        var y = H - ((i * 37.7 + t * (14 + (i % 5) * 7)) % (H + 10)), x = (i * 61 + Math.sin(t * 1.4 + i) * 12 + W) % W;
        ctx.globalAlpha = 0.3 + 0.5 * (i % 3) / 3;
        ctx.fillStyle = i % 4 === 0 ? "#ffe14a" : "#ff8a1f";
        ctx.fillRect(Math.round(x), Math.round(y), 1, i % 5 === 0 ? 2 : 1);
      }
      ctx.globalAlpha = 1;
      var hz = 0.05 + 0.03 * Math.sin(t * 2);                               // Hitzeflimmern
      for (var l = 0; l < 6; l++) R(ctx, "#ffb23f", 0, 150 + l * 15 + Math.sin(t * 3 + l) * 2, W, 1, hz);
    },
    ground: function (ctx, th, camX, t) {
      R(ctx, th.ground, 0, GROUND, W, H - GROUND);
      R(ctx, "#07031a", 0, GROUND, W, 2);
      R(ctx, "#ff8a1f", 0, GROUND, W, 1); R(ctx, "#ff8a1f", 0, GROUND + 1, W, 2, 0.3);
      var off = -Math.floor(camX) % 40, x;
      for (x = off; x < W; x += 40) { R(ctx, "#000000", x, GROUND + 3, 1, H - GROUND, 0.4); R(ctx, "#ff8a1f", x + 1, GROUND + 3, 1, H - GROUND, 0.07); }
      var o2 = -Math.floor(camX) % 72;
      for (x = o2; x < W; x += 72) {                                          // glimmende Risse
        var a = 0.35 + 0.35 * Math.sin(t * 2 + x * 0.1 + camX * 0.05);
        R(ctx, "#ff6a1f", x + 6, GROUND + 6, 2, 1, a); R(ctx, "#ff6a1f", x + 8, GROUND + 7, 2, 1, a); R(ctx, "#ffd23f", x + 10, GROUND + 8, 3, 1, a);
        R(ctx, "#ff6a1f", x + 30, GROUND + 20, 4, 1, a); R(ctx, "#ffd23f", x + 33, GROUND + 21, 2, 1, a);
      }
      var o3 = -Math.floor(camX) % 80;
      for (x = o3; x < W; x += 80) for (var s = 0; s < 40; s += 8) { R(ctx, "#ffd23f", x + s, GROUND + 12, 4, 3, 0.28); R(ctx, "#000000", x + s + 4, GROUND + 12, 4, 3, 0.28); }
    },
    platform: function (ctx, p, x, th, t) {
      R(ctx, "#07031a", x - 1, p.y - 1, p.w + 2, 9);
      R(ctx, "#2a1208", x, p.y, p.w, 6);
      R(ctx, "#ff8a1f", x, p.y, p.w, 1);
      for (var k = 1; k < p.w - 1; k += 3) R(ctx, "#07031a", x + k, p.y + 2, 1, 3);
      for (var q = 4; q < p.w - 4; q += 10) R(ctx, (Math.floor(q / 10) % 2) ? "#ffd23f" : "#1a0805", x + q, p.y + 1, 4, 1);
      R(ctx, "#ff6a1f", x + 2, p.y + 7, p.w - 4, 4, 0.16 + 0.08 * Math.sin(t * 4 + p.x));
    }
  };

  // =====================================================================================
  // 07 VOID LABORATORY: Nebel, Riss im Himmel, Glasroehren mit Proben, Hologramme
  // =====================================================================================
  K.lab = {
    build: function (th, rnd) {
      var o = {};
      var sky = mk(W, H), sx = sky.getContext("2d");
      var g = sx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, th.sky[0]); g.addColorStop(0.55, th.sky[1]); g.addColorStop(1, th.sky[2]);
      sx.fillStyle = g; sx.fillRect(0, 0, W, H);
      for (var n = 0; n < 5; n++) {                                         // Nebelwolken
        var nx = rnd() * W, ny = 20 + rnd() * 140, nr = 70 + rnd() * 80, col = n % 2 ? "184,107,255" : "157,255,74";
        var rg = sx.createRadialGradient(nx, ny, 5, nx, ny, nr);
        rg.addColorStop(0, "rgba(" + col + ",0.22)"); rg.addColorStop(1, "rgba(" + col + ",0)");
        sx.fillStyle = rg; sx.fillRect(0, 0, W, H);
      }
      stars(sx, rnd, 110, 200, ["#ffffff", "#d8c8ff", "#c8ffd0"]);
      o.sky = sky;
      // Ferne Ebene: Kontrolltuerme und Antennenmasten
      var far = mk(TW, H), fx = far.getContext("2d"), px = 0;
      while (px < TW) {
        var w = 14 + Math.floor(rnd() * 24), h = 60 + Math.floor(rnd() * 100);
        fx.fillStyle = th.far; fx.fillRect(px, H - h, w, h);
        fx.fillRect(px + (w >> 1) - 1, H - h - 14, 2, 14);
        fx.fillStyle = "#b86bff"; fx.globalAlpha = 0.45; fx.fillRect(px, H - h, w, 1);
        for (var y = H - h + 6; y < H - 6; y += 7) if (rnd() < 0.5) fx.fillRect(px + 3, y, w - 6, 1);
        fx.globalAlpha = 1;
        px += w + 4 + Math.floor(rnd() * 12);
      }
      o.far = far;
      // Mittlere Ebene: Labormodule mit Glasroehren
      var mid = mk(TW, H), mx = mid.getContext("2d"); px = 0; o.tubes = [];
      while (px < TW) {
        var bw = 44 + Math.floor(rnd() * 50), bh = 56 + Math.floor(rnd() * 60), tp = H - bh;
        mx.fillStyle = th.mid; mx.fillRect(px, tp, bw, bh);
        mx.fillStyle = "#9dff4a"; mx.globalAlpha = 0.35; mx.fillRect(px, tp, bw, 1); mx.globalAlpha = 1;
        var tubes = 1 + Math.floor(rnd() * 3);
        for (var tb = 0; tb < tubes; tb++) {
          var tw = 10, tx = px + 6 + tb * 16, ty = tp + 10, th3 = Math.min(bh - 24, 44);
          if (tx + tw > px + bw - 4) break;
          mx.fillStyle = "#07031a"; mx.fillRect(tx - 1, ty - 1, tw + 2, th3 + 2);
          mx.fillStyle = "#0e3a2a"; mx.fillRect(tx, ty, tw, th3);
          o.tubes.push({ x: tx, y: ty, w: tw, h: th3, col: rnd() < 0.5 ? "#9dff4a" : "#b86bff", ph: rnd() * 6, shape: rnd() < 0.5 ? 0 : 1 });
        }
        if (rnd() < 0.4) { mx.fillStyle = th.mid; mx.fillRect(px + bw - 8, tp - 12, 2, 12); }
        px += bw + 2 + Math.floor(rnd() * 8);
      }
      o.mid = mid;
      // Vordergrund: Labortische, Konsolen, Hologramme
      var near = mk(TW, H), nx2 = near.getContext("2d"); px = 0; o.screens = [];
      while (px < TW) {
        var nw = 30 + Math.floor(rnd() * 40), nh = 24 + Math.floor(rnd() * 40), nt = H - nh;
        nx2.fillStyle = th.near; nx2.fillRect(px, nt, nw, nh);
        nx2.fillStyle = "#b86bff"; nx2.globalAlpha = 0.45; nx2.fillRect(px, nt, nw, 1); nx2.globalAlpha = 1;
        nx2.fillStyle = "#1b1352"; nx2.fillRect(px + 3, nt + 4, nw - 6, 2);
        if (rnd() < 0.65) o.screens.push({ x: px + 5 + Math.floor(rnd() * (nw - 20)), y: nt + 9, w: 12 + Math.floor(rnd() * 4), col: rnd() < 0.5 ? "#35f0ff" : "#9dff4a", ph: rnd() * 6 });
        px += nw + Math.floor(rnd() * 6);
      }
      o.near = near;
      return o;
    },
    draw: function (ctx, b, camX, t, q) {
      ctx.drawImage(b.sky, 0, 0);
      // Riss im Himmel: pulsierender Void-Ring
      var rx = 360, ry = 100, pu = 0.5 + 0.5 * Math.sin(t * 1.5);
      for (var k = 0; k < 40; k++) {
        var a = t * 0.8 + k * 0.157, rr = 40 + (k % 5) * 3;
        R(ctx, k % 3 ? "#b86bff" : "#9dff4a", rx + Math.cos(a) * rr, ry + Math.sin(a) * rr * 0.45, 2, 2, 0.4 + 0.4 * pu);
      }
      R(ctx, "#000000", rx - 26, ry - 10, 52, 20, 0.8); R(ctx, "#b86bff", rx - 28, ry - 1, 56, 2, 0.35 + 0.3 * pu);
      var fl = (t * 0.25) % 1;                                              // Blitz im Nebel
      if (fl < 0.05) R(ctx, "#c8a8ff", 0, 0, W, 150, 0.08);
      tile(ctx, b.far, camX, 0.1);
      tile(ctx, b.mid, camX, 0.28);
      for (var i = 0; i < b.tubes.length; i++) {
        var tb = b.tubes[i];
        each(tb.x, camX, 0.28, tb.w, function (px) {
          R(ctx, tb.col, px, tb.y, tb.w, tb.h, 0.22 + 0.08 * Math.sin(t * 2 + tb.ph));
          for (var j = 0; j < 4; j++) {                                    // Blasen
            var ph = (t * 0.35 + j / 4 + tb.ph) % 1;
            R(ctx, "#ffffff", px + 2 + ((j * 3 + Math.floor(tb.ph * 3)) % 6), tb.y + tb.h - ph * tb.h, 1, 1, 0.6 * (1 - ph));
          }
          var sy = tb.y + tb.h * 0.5 + Math.sin(t * 1.2 + tb.ph) * 5;       // Probe schwebt in der Roehre
          R(ctx, tb.col, px + 3, sy, 4, 6, 0.85); R(ctx, "#07031a", px + 4, sy + 1, 1, 1); R(ctx, "#07031a", px + 6, sy + 1, 1, 1);
          if (tb.shape) { R(ctx, tb.col, px + 1, sy + 2, 2, 1, 0.8); R(ctx, tb.col, px + 7, sy + 3, 2, 1, 0.8); }
          R(ctx, "#ffffff", px + 1, tb.y + 1, 1, tb.h - 2, 0.2);
        });
      }
      var fog = ctx.createLinearGradient(0, H - 120, 0, H - 30);
      fog.addColorStop(0, "rgba(184,107,255,0)"); fog.addColorStop(1, "rgba(184,107,255,0.13)");
      ctx.fillStyle = fog; ctx.fillRect(0, H - 120, W, 90);
      tile(ctx, b.near, camX, 0.5);
      for (var s = 0; s < b.screens.length; s++) {
        var sc = b.screens[s], on = (Math.sin(t * 3 + sc.ph) > -0.7);
        each(sc.x, camX, 0.5, sc.w, function (px) {
          if (!on) return;
          R(ctx, sc.col, px, sc.y, sc.w, 7, 0.14);
          for (var l = 0; l < 3; l++) R(ctx, sc.col, px + 1, sc.y + 1 + l * 2, 2 + ((t * 8 + l * 3 + sc.ph * 5) % (sc.w - 4)), 1, 0.8);
        });
      }
    },
    atmo: function (ctx, b, t, q) {
      var n = q === "low" ? 12 : 30;
      for (var i = 0; i < n; i++) {                                         // schwebende Sporen
        var y = (i * 53 + Math.sin(t * 0.7 + i) * 14 + t * (4 + i % 4 * 2)) % H, x = (i * 71 + Math.sin(t * 0.5 + i * 2) * 22 + W) % W;
        ctx.globalAlpha = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2 + i));
        ctx.fillStyle = i % 2 ? "#9dff4a" : "#c8a8ff";
        ctx.fillRect(Math.round(x), Math.round(H - y), i % 6 === 0 ? 2 : 1, i % 6 === 0 ? 2 : 1);
      }
      ctx.globalAlpha = 1;
    },
    ground: function (ctx, th, camX, t) {
      R(ctx, th.ground, 0, GROUND, W, H - GROUND);
      R(ctx, "#07031a", 0, GROUND, W, 2);
      R(ctx, "#9dff4a", 0, GROUND, W, 1); R(ctx, "#9dff4a", 0, GROUND + 1, W, 2, 0.25);
      var off = -Math.floor(camX) % 32, x;
      for (x = off; x < W; x += 32) { R(ctx, "#9dff4a", x, GROUND + 3, 1, H - GROUND, 0.16); R(ctx, "#ffffff", x + 1, GROUND + 4, 6, 1, 0.07); }
      R(ctx, "#9dff4a", 0, GROUND + 15, W, 1, 0.12); R(ctx, "#9dff4a", 0, GROUND + 26, W, 1, 0.12);
      R(ctx, "#ffffff", 0, GROUND + 3, W, 3, 0.04);                          // Hochglanz
      var o2 = -Math.floor(camX) % 128;
      for (x = o2; x < W; x += 128) { var a = 0.4 + 0.4 * Math.sin(t * 1.6 + x); R(ctx, "#b86bff", x + 20, GROUND + 9, 24, 1, a); R(ctx, "#b86bff", x + 20, GROUND + 20, 10, 1, a); }
    },
    platform: function (ctx, p, x, th, t) {
      R(ctx, "#07031a", x - 1, p.y - 1, p.w + 2, 9);
      R(ctx, "#143a3a", x, p.y, p.w, 6);
      R(ctx, "#9dff4a", x, p.y, p.w, 1);
      R(ctx, "#35f0ff", x + 2, p.y + 2, p.w - 4, 2, 0.25);
      for (var k = 5; k < p.w - 3; k += 9) R(ctx, "#9dff4a", x + k, p.y + 4, 2, 1, 0.5 + 0.5 * Math.sin(t * 3 + k));
      R(ctx, "#9dff4a", x + 2, p.y + 7, p.w - 4, 4, 0.14 + 0.07 * Math.sin(t * 3 + p.x));
    }
  };


  // =====================================================================================
  // 08 DREADNOUGHT: Kriegsflotte, Rumpfwaende, Hangars, Geschuetztuerme, Alarmlichter
  // =====================================================================================
  K.dread = {
    build: function (th, rnd) {
      var o = {};
      var sky = mk(W, H), sx = sky.getContext("2d");
      var g = sx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, th.sky[0]); g.addColorStop(0.6, th.sky[1]); g.addColorStop(1, th.sky[2]);
      sx.fillStyle = g; sx.fillRect(0, 0, W, H);
      stars(sx, rnd, 90, 150, ["#ffffff", "#ffd0c0"]);
      for (var i = 0; i < 4; i++) {                                         // ferne Kriegsschiffe
        var sw = 70 + Math.floor(rnd() * 90), shh = 12 + Math.floor(rnd() * 14), sxp = 20 + rnd() * (W - sw - 20), syp = 24 + rnd() * 90;
        sx.fillStyle = "#1a0c12"; sx.fillRect(sxp, syp, sw, shh);
        sx.fillRect(sxp + sw * 0.3, syp - 6, sw * 0.3, 6); sx.fillRect(sxp + sw * 0.72, syp - 10, 8, 10);
        sx.fillStyle = "#ff8a1f"; sx.globalAlpha = 0.8; sx.fillRect(sxp - 2, syp + 2, 3, shh - 4); sx.globalAlpha = 0.25; sx.fillRect(sxp - 12, syp + 3, 12, shh - 6);
        sx.globalAlpha = 0.5; for (var w = 8; w < sw - 8; w += 6) if (rnd() < 0.5) sx.fillRect(sxp + w, syp + shh * 0.5, 2, 1);
        sx.globalAlpha = 1;
      }
      o.sky = sky;
      var far = mk(TW, H), fx = far.getContext("2d"), px = 0;
      while (px < TW) {                                                     // Rumpf-Tuerme
        var w2 = 18 + Math.floor(rnd() * 30), h2 = 70 + Math.floor(rnd() * 90);
        fx.fillStyle = th.far; fx.fillRect(px, H - h2, w2, h2); fx.fillRect(px - 3, H - h2, w2 + 6, 4);
        fx.fillStyle = "#ff3b3b"; fx.globalAlpha = 0.4; fx.fillRect(px - 3, H - h2, w2 + 6, 1); fx.globalAlpha = 1;
        for (var y = H - h2 + 10; y < H - 6; y += 9) { fx.fillStyle = "#07031a"; fx.fillRect(px + 3, y, w2 - 6, 1); }
        px += w2 + 4 + Math.floor(rnd() * 18);
      }
      o.far = far;
      var mid = mk(TW, H), mx = mid.getContext("2d"); px = 0; o.turrets = []; o.alarms = [];
      while (px < TW) {
        var bw = 46 + Math.floor(rnd() * 54), bh = 52 + Math.floor(rnd() * 56), tp = H - bh;
        mx.fillStyle = th.mid; mx.fillRect(px, tp, bw, bh);
        mx.fillStyle = "#ff3b3b"; mx.globalAlpha = 0.4; mx.fillRect(px, tp, bw, 1); mx.globalAlpha = 1;
        mx.fillStyle = "#07031a"; for (var sy = tp + 8; sy < H - 4; sy += 12) mx.fillRect(px, sy, bw, 1);
        if (rnd() < 0.55) {                                                 // Hangar-Oeffnung
          var hw = bw - 20, hy = H - 40;
          mx.fillStyle = "#07031a"; mx.fillRect(px + 10, hy, hw, 26);
          mx.fillStyle = "#ff8a1f"; mx.globalAlpha = 0.5; mx.fillRect(px + 12, hy + 2, hw - 4, 22); mx.globalAlpha = 0.9; mx.fillRect(px + 12, hy + 22, hw - 4, 2); mx.globalAlpha = 1;
          mx.fillStyle = "#07031a"; mx.fillRect(px + 10 + (hw >> 1), hy + 6, 6, 18);
        }
        if (rnd() < 0.5) o.turrets.push({ x: px + (bw >> 1), y: tp - 3, ph: rnd() * 6 });
        px += bw + Math.floor(rnd() * 6);
      }
      o.mid = mid;
      var near = mk(TW, H), nx = near.getContext("2d"); px = 0;
      while (px < TW) {
        var nw = 34 + Math.floor(rnd() * 40), nh = 24 + Math.floor(rnd() * 50), nt = H - nh;
        nx.fillStyle = th.near; nx.fillRect(px, nt, nw, nh);
        nx.fillStyle = "#9aa6c8"; nx.globalAlpha = 0.3; nx.fillRect(px, nt, nw, 1); nx.globalAlpha = 1;
        for (var rx = 4; rx < nw - 3; rx += 8) { nx.fillStyle = "#2a1a1e"; nx.fillRect(px + rx, nt + 4, 2, 2); nx.fillRect(px + rx, nt + nh - 8, 2, 2); }
        if (rnd() < 0.5) for (var hz = 0; hz < nw - 8; hz += 4) { nx.fillStyle = (hz / 4) % 2 ? "#ff8a1f" : "#120608"; nx.globalAlpha = 0.5; nx.fillRect(px + 4 + hz, nt + 10, 3, 3); }
        nx.globalAlpha = 1;
        if (rnd() < 0.35) o.alarms.push({ x: px + (nw >> 1), y: nt - 3, ph: rnd() * 6 });
        px += nw + Math.floor(rnd() * 5);
      }
      o.near = near;
      return o;
    },
    draw: function (ctx, b, camX, t, q) {
      ctx.drawImage(b.sky, 0, 0);
      for (var s = 0; s < 4; s++) {                                         // Laser-Gefecht am Himmel
        var u = (t * 0.7 + s * 0.31) % 1, x0 = (s * 97) % 400 + 30, y0 = 30 + (s * 41) % 100;
        if (u < 0.35) { R(ctx, s % 2 ? "#ff3b3b" : "#ffb23f", x0 + u * 380, y0 + u * 60, 8, 1, 1 - u * 2); }
        var ex = (Math.floor(t * 0.8 + s * 2.3) * 71 + s * 120) % 440 + 20, eu = (t * 0.8 + s * 2.3) % 1;
        if (eu < 0.3 && s < 3) { var er = 4 + eu * 40; R(ctx, "#ffb23f", ex - er / 2, 60 + s * 25 - er / 2, er, er, 0.5 * (1 - eu / 0.3)); R(ctx, "#ffffff", ex - 2, 60 + s * 25 - 2, 4, 4, 1 - eu / 0.3); }
      }
      tile(ctx, b.far, camX, 0.1);
      tile(ctx, b.mid, camX, 0.28);
      for (var i = 0; i < b.turrets.length; i++) {
        var tr = b.turrets[i], a = Math.sin(t * 0.7 + tr.ph) * 0.5;
        each(tr.x, camX, 0.28, 20, function (px) { R(ctx, "#4a5a7a", px - 4, tr.y - 2, 8, 4); R(ctx, "#6a7a9a", px + Math.cos(a - 0.4) * 4, tr.y - 2 + Math.sin(a - 0.4) * 5, 9, 2); });
      }
      var fog = ctx.createLinearGradient(0, H - 120, 0, H - 30);
      fog.addColorStop(0, "rgba(255,59,59,0)"); fog.addColorStop(1, "rgba(255,59,59,0.12)");
      ctx.fillStyle = fog; ctx.fillRect(0, H - 120, W, 90);
      tile(ctx, b.near, camX, 0.5);
      for (var a2 = 0; a2 < b.alarms.length; a2++) {
        var al = b.alarms[a2], on = Math.sin(t * 6 + al.ph) > 0;
        each(al.x, camX, 0.5, 14, function (px) { R(ctx, "#120608", px - 3, al.y, 6, 4); R(ctx, on ? "#ff3b3b" : "#4a1a1a", px - 2, al.y, 4, 3); if (on) R(ctx, "#ff3b3b", px - 9, al.y - 5, 18, 12, 0.13); });
      }
    },
    atmo: function (ctx, b, t, q) {
      var n = q === "low" ? 10 : 26;
      for (var i = 0; i < n; i++) {                                         // Funken und Asche
        var x = ((i * 79 + t * (18 + i % 5 * 9)) % (W + 20)), y = (i * 43 + Math.sin(t + i) * 8 + t * (6 + i % 4 * 3)) % H;
        ctx.globalAlpha = 0.25 + 0.5 * (i % 3) / 3; ctx.fillStyle = i % 3 === 0 ? "#ffb23f" : "#9a8a8a";
        ctx.fillRect(Math.round(W - x), Math.round(y), 1, 1);
      }
      ctx.globalAlpha = 1;
    },
    ground: function (ctx, th, camX, t) {
      R(ctx, th.ground, 0, GROUND, W, H - GROUND);
      R(ctx, "#07031a", 0, GROUND, W, 2);
      R(ctx, "#9aa6c8", 0, GROUND, W, 1); R(ctx, "#ff3b3b", 0, GROUND + 1, W, 2, 0.22);
      var off = -Math.floor(camX) % 56, x;
      for (x = off; x < W; x += 56) {
        R(ctx, "#000000", x, GROUND + 3, 1, H - GROUND, 0.5); R(ctx, "#9aa6c8", x + 1, GROUND + 3, 1, H - GROUND, 0.07);
        R(ctx, "#3a3a46", x + 4, GROUND + 6, 2, 2); R(ctx, "#3a3a46", x + 50, GROUND + 6, 2, 2); R(ctx, "#3a3a46", x + 4, GROUND + 30, 2, 2); R(ctx, "#3a3a46", x + 50, GROUND + 30, 2, 2);
      }
      var o2 = -Math.floor(camX) % 112;
      for (x = o2; x < W; x += 112) { var a = 0.35 + 0.35 * Math.sin(t * 3 + x); R(ctx, "#ff3b3b", x + 20, GROUND + 16, 16, 1, a); R(ctx, "#ff3b3b", x + 62, GROUND + 22, 16, 1, a); }
      R(ctx, "#000000", 0, GROUND + 14, W, 1, 0.3);
    },
    platform: function (ctx, p, x, th, t) {
      R(ctx, "#07031a", x - 1, p.y - 1, p.w + 2, 9);
      R(ctx, "#3a3a4a", x, p.y, p.w, 6);
      R(ctx, "#9aa6c8", x, p.y, p.w, 1);
      R(ctx, "#ff8a1f", x, p.y + 1, 6, 4); R(ctx, "#ff8a1f", x + p.w - 6, p.y + 1, 6, 4);
      for (var k = 8; k < p.w - 8; k += 8) { R(ctx, "#1a1a24", x + k, p.y + 2, 4, 3); }
      R(ctx, "#ff3b3b", x + 2, p.y + 7, p.w - 4, 3, 0.14 + 0.07 * Math.sin(t * 5 + p.x));
    }
  };

  // =====================================================================================
  // 09 THE LAST FRONTIER: Galaxie, Schwarzes Loch, Polarlicht, Monolithen, schwebender Fels
  // =====================================================================================
  K.frontier = {
    build: function (th, rnd) {
      var o = {};
      var sky = mk(W, H), sx = sky.getContext("2d");
      var g = sx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, th.sky[0]); g.addColorStop(0.6, th.sky[1]); g.addColorStop(1, th.sky[2]);
      sx.fillStyle = g; sx.fillRect(0, 0, W, H);
      for (var gx = 0; gx < 520; gx++) {                                    // Milchstrasse als diagonales Band
        var u = rnd(), px2 = u * W, py2 = H * 0.15 + u * H * 0.5 + (rnd() - 0.5) * 70 * (0.4 + rnd());
        sx.globalAlpha = 0.1 + rnd() * 0.45; sx.fillStyle = rnd() < 0.5 ? "#b8a0ff" : rnd() < 0.5 ? "#ffd9a0" : "#a0d0ff";
        sx.fillRect(Math.floor(px2), Math.floor(py2), 1, 1);
      }
      sx.globalAlpha = 1;
      stars(sx, rnd, 220, 230, ["#ffffff", "#ffe9bf", "#d0c8ff"]);
      o.sky = sky;
      var far = mk(TW, H), fx = far.getContext("2d"), px = 0;
      while (px < TW) {                                                     // schwebende Felsinseln
        var rw = 40 + Math.floor(rnd() * 70), ry = 50 + Math.floor(rnd() * 130), rh = 10 + Math.floor(rnd() * 18);
        for (var yy = 0; yy < rh; yy++) { var hw = Math.floor(rw / 2 * (1 - yy / rh * 0.9)); fx.fillStyle = th.far; fx.fillRect(px + rw / 2 - hw, ry + yy, hw * 2, 1); }
        fx.fillStyle = "#ffd23f"; fx.globalAlpha = 0.4; fx.fillRect(px + 2, ry, rw - 4, 1); fx.globalAlpha = 1;
        px += rw + 20 + Math.floor(rnd() * 50);
      }
      o.far = far;
      var mid = mk(TW, H), mx = mid.getContext("2d"); px = 0; o.runes = [];
      while (px < TW) {                                                     // Monolithen und Torbogen
        var mw = 22 + Math.floor(rnd() * 34), mh = 70 + Math.floor(rnd() * 90), mt = H - mh;
        mx.fillStyle = th.mid; mx.fillRect(px, mt, mw, mh);
        mx.fillStyle = "#ffd23f"; mx.globalAlpha = 0.4; mx.fillRect(px, mt, mw, 1); mx.globalAlpha = 1;
        if (rnd() < 0.4) { mx.fillStyle = th.mid; mx.fillRect(px + mw, mt, 26, 8); mx.fillRect(px + mw + 26, mt, mw * 0.6, mh * 0.6); }
        for (var r = mt + 12; r < H - 12; r += 14) if (rnd() < 0.7) o.runes.push({ x: px + (mw >> 1) - 2, y: r, ph: rnd() * 6, w: 4 + Math.floor(rnd() * 3) });
        px += mw + 12 + Math.floor(rnd() * 40);
      }
      o.mid = mid;
      var near = mk(TW, H), nx = near.getContext("2d"); px = 0;
      while (px < TW) {                                                     // Kristallspitzen
        var cw = 14 + Math.floor(rnd() * 24), ch = 20 + Math.floor(rnd() * 56);
        for (var yy2 = 0; yy2 < ch; yy2++) { var hw2 = Math.floor(cw / 2 * (1 - yy2 / ch)); nx.fillStyle = th.near; nx.fillRect(px + cw / 2 - hw2, H - ch + yy2, hw2 * 2 + 1, 1); }
        nx.fillStyle = "#ffd23f"; nx.globalAlpha = 0.5; nx.fillRect(px + (cw >> 1), H - ch, 1, ch); nx.globalAlpha = 1;
        px += cw + Math.floor(rnd() * 12);
      }
      o.near = near;
      return o;
    },
    draw: function (ctx, b, camX, t, q) {
      ctx.drawImage(b.sky, 0, 0);
      // Schwarzes Loch mit Akkretionsscheibe
      var cx = 330, cy = 90;
      for (var k = 0; k < 60; k++) {
        var a = t * (0.5 + (k % 4) * 0.12) + k * 0.4, rr = 34 + (k % 6) * 5;
        R(ctx, k % 3 ? "#ffd23f" : "#ffffff", cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.22, 2, 1, 0.35 + 0.4 * (Math.sin(a) > 0 ? 1 : 0.4));
      }
      R(ctx, "#ffd23f", cx - 30, cy - 1, 60, 2, 0.2);
      for (var yy = -14; yy <= 14; yy++) { var hw = Math.floor(Math.sqrt(196 - yy * yy)); R(ctx, "#000000", cx - hw, cy + yy, hw * 2, 1); }
      for (var yy2 = -16; yy2 <= 16; yy2 += 1) { var h2 = Math.floor(Math.sqrt(256 - yy2 * yy2)); R(ctx, "#ffd23f", cx - h2, cy + yy2, 1, 1, 0.5); R(ctx, "#ffd23f", cx + h2, cy + yy2, 1, 1, 0.5); }
      // Polarlicht-Baender
      for (var s = 0; s < 2; s++) for (var x = 0; x < W; x += 3) {
        var y = 40 + s * 34 + Math.sin(x * 0.03 + t * 0.6 + s * 2) * 14 + Math.sin(x * 0.011 - t * 0.3) * 8;
        R(ctx, s ? "#b86bff" : "#9dff4a", x, y, 3, 14, 0.05 + 0.03 * Math.sin(t + x * 0.05));
      }
      tile(ctx, b.far, camX, 0.1);
      tile(ctx, b.mid, camX, 0.28);
      for (var i = 0; i < b.runes.length; i++) {
        var ru = b.runes[i], on = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.5 + ru.ph));
        each(ru.x, camX, 0.28, 10, function (px) { R(ctx, "#ffd23f", px, ru.y, ru.w, 1, on); R(ctx, "#ffd23f", px + 1, ru.y + 2, 1, 3, on); R(ctx, "#ffffff", px + ru.w - 1, ru.y - 1, 1, 1, on); });
      }
      var fog = ctx.createLinearGradient(0, H - 120, 0, H - 30);
      fog.addColorStop(0, "rgba(184,107,255,0)"); fog.addColorStop(1, "rgba(184,107,255,0.14)");
      ctx.fillStyle = fog; ctx.fillRect(0, H - 120, W, 90);
      tile(ctx, b.near, camX, 0.5);
    },
    atmo: function (ctx, b, t, q) {
      var n = q === "low" ? 14 : 36;
      for (var i = 0; i < n; i++) {                                         // Sternenstaub
        var x = ((i * 73 + t * (6 + i % 6 * 3)) % (W + 10)), y = (i * 47 + Math.sin(t * 0.5 + i) * 18) % H;
        ctx.globalAlpha = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + i)); ctx.fillStyle = i % 3 ? "#ffd23f" : "#ffffff";
        ctx.fillRect(Math.round(W - x), Math.round(y), 1, 1);
      }
      ctx.globalAlpha = 1;
      var cu = (t * 0.12) % 1;                                              // Komet
      if (cu < 0.2) { var k = cu / 0.2; for (var j = 0; j < 12; j++) R(ctx, "#ffffff", 40 + k * 400 - j * 4, 20 + k * 100 - j * 1.5, 3, 1, (1 - j / 12) * 0.7); }
    },
    ground: function (ctx, th, camX, t) {
      R(ctx, th.ground, 0, GROUND, W, H - GROUND);
      R(ctx, "#07031a", 0, GROUND, W, 2);
      R(ctx, "#ffd23f", 0, GROUND, W, 1); R(ctx, "#ffd23f", 0, GROUND + 1, W, 2, 0.22);
      var off = -Math.floor(camX) % 64, x;
      for (x = off; x < W; x += 64) {
        R(ctx, "#000000", x + 10, GROUND + 4, 1, 22, 0.4); R(ctx, "#1a1030", x + 28, GROUND + 6, 14, 3); R(ctx, "#1a1030", x + 40, GROUND + 18, 10, 3);
        var a = 0.4 + 0.4 * Math.sin(t * 1.3 + x * 0.05 + camX * 0.02);                // goldene Adern
        R(ctx, "#ffd23f", x + 14, GROUND + 10, 5, 1, a); R(ctx, "#ffd23f", x + 18, GROUND + 11, 4, 1, a); R(ctx, "#ffd23f", x + 22, GROUND + 12, 8, 1, a); R(ctx, "#ffd23f", x + 4, GROUND + 26, 6, 1, a * 0.7);
      }
      R(ctx, "#b86bff", 0, GROUND + 38, W, 1, 0.08);
    },
    platform: function (ctx, p, x, th, t) {
      R(ctx, "#07031a", x - 1, p.y - 1, p.w + 2, 10);
      R(ctx, "#2a1a4a", x, p.y, p.w, 7);
      R(ctx, "#ffd23f", x, p.y, p.w, 1);
      for (var k = 3; k < p.w - 3; k += 11) R(ctx, "#1a0c3a", x + k, p.y + 2, 5, 3);
      R(ctx, "#1a0c3a", x + 3, p.y + 7, p.w - 6, 2);
      for (var q = 5; q < p.w - 5; q += 12) { R(ctx, "#ffd23f", x + q, p.y + 8, 2, 3, 0.55 + 0.4 * Math.sin(t * 2 + q + p.x)); }
      R(ctx, "#ffd23f", x + 2, p.y + 9, p.w - 4, 5, 0.1 + 0.06 * Math.sin(t * 3 + p.x));
    }
  };

  CB.SpaceBG = { kinds: K, build: function (th, rnd) { return K[th.kind].build(th, rnd); } };
})(window.CB);

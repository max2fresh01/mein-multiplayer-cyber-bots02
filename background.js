/* CYBER BOTS - background.js
   NEON CITY Hintergrund: Parallax-Schichten, blinkende Neonschilder, fliegende Fahrzeuge,
   Fabrik-Schornsteine mit Rauch, Regen und Schwebepartikel. Alles wird einmal vorgerendert. */
(function (CB) {
  "use strict";

  var W = CB.W, H = CB.H, TW = 960;
  var cache = {};

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function mk(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function pick(arr, r) { return arr[Math.floor(r() * arr.length)]; }

  // Gebaeude-Reihe zeichnen. Gibt Liste der Schilder-Positionen zurueck.
  function skyline(opts, rnd, th) {
    var c = mk(TW, H), x = c.getContext("2d"), px = 0, signs = [];
    while (px < TW) {
      var bw = Math.min(opts.minW + Math.floor(rnd() * (opts.maxW - opts.minW)), TW - px);
      var bh = opts.minH + Math.floor(rnd() * (opts.maxH - opts.minH));
      var top = H - bh;
      x.globalAlpha = 1;
      x.fillStyle = opts.col; x.fillRect(px, top, bw, bh);
      // Dachaufbau
      var roof = rnd();
      if (roof < 0.3) { x.fillRect(px + (bw >> 1), top - 8 - Math.floor(rnd() * 10), 1, 14); }
      else if (roof < 0.55 && bw > 14) { x.fillRect(px + 3, top - 4, bw - 6, 4); }
      // Fenster
      for (var wy = top + 5; wy < H - 6; wy += 5) {
        for (var wx = px + 3; wx < px + bw - 3; wx += 4) {
          if (rnd() < opts.dens) {
            x.fillStyle = pick(th.neon, rnd);
            x.globalAlpha = opts.winA * (0.4 + rnd() * 0.6);
            x.fillRect(wx, wy, 2, 2);
          }
        }
      }
      x.globalAlpha = opts.edgeA;
      x.fillStyle = pick(th.neon, rnd);
      x.fillRect(px, top, bw, 1);
      x.globalAlpha = 1;
      if (opts.signs && bw >= 22 && rnd() < 0.45) {
        var sw = Math.min(bw - 6, 14 + Math.floor(rnd() * 12)), sh = 7 + Math.floor(rnd() * 4);
        var sy = top + 8 + Math.floor(rnd() * Math.max(4, bh * 0.4));
        x.fillStyle = "#07031a"; x.fillRect(px + 3, sy, sw, sh);
        signs.push({ x: px + 3, y: sy, w: sw, h: sh, col: pick(th.neon, rnd), ph: rnd() * 6.28, sp: 1 + rnd() * 2.5, fl: rnd() * 9 });
      }
      px += bw + (rnd() < 0.35 ? 1 + Math.floor(rnd() * 3) : 0);
    }
    x.globalAlpha = 1;
    return { img: c, signs: signs };
  }

  // Fabrik-Schicht (vorne): Bloecke, Schornsteine, Rohre, Tanks, Kraene
  function factory(rnd, th) {
    var c = mk(TW, H), x = c.getContext("2d"), px = 0, chimneys = [];
    while (px < TW) {
      var bw = 40 + Math.floor(rnd() * 60), bh = 34 + Math.floor(rnd() * 46);
      bw = Math.min(bw, TW - px);
      var top = H - bh;
      x.fillStyle = th.near; x.fillRect(px, top, bw, bh);
      x.fillStyle = pick(th.neon, rnd); x.globalAlpha = 0.55; x.fillRect(px, top, bw, 1); x.globalAlpha = 1;
      // Lichtstreifen
      for (var s = 0; s < 3; s++) {
        x.globalAlpha = 0.5; x.fillStyle = pick(th.neon, rnd);
        x.fillRect(px + 4 + Math.floor(rnd() * (bw - 12)), top + 6 + s * 9, 6 + Math.floor(rnd() * 8), 1);
      }
      x.globalAlpha = 1;
      var kind = rnd();
      if (kind < 0.4 && bw > 24) {              // Schornstein
        var cx = px + 6 + Math.floor(rnd() * (bw - 18)), ch = 22 + Math.floor(rnd() * 22);
        x.fillStyle = th.near; x.fillRect(cx, top - ch, 7, ch);
        x.fillStyle = "#2a1550"; x.fillRect(cx, top - ch, 7, 2);
        x.fillStyle = pick(th.neon, rnd); x.globalAlpha = 0.5; x.fillRect(cx, top - ch + 6, 7, 1); x.globalAlpha = 1;
        chimneys.push({ x: cx + 3, y: top - ch });
      } else if (kind < 0.7) {                  // Tank
        var tx = px + 4, tw = Math.min(bw - 8, 26), th2 = 12;
        x.fillStyle = th.near;
        x.fillRect(tx, top - th2, tw, th2);
        x.fillRect(tx + 2, top - th2 - 2, tw - 4, 2);
        x.fillRect(tx + 4, top - th2 - 3, tw - 8, 1);
        x.globalAlpha = 0.45; x.fillStyle = pick(th.neon, rnd); x.fillRect(tx, top - 6, tw, 1); x.globalAlpha = 1;
      } else {                                  // Kran
        var kx = px + 8, kh = 30;
        x.fillStyle = th.near;
        x.fillRect(kx, top - kh, 3, kh);
        x.fillRect(kx - 6, top - kh, 30, 2);
        for (var q = 0; q < 8; q++) x.fillRect(kx + q * 3 - 5, top - kh + 2, 1, 4 + (q & 1));
        x.fillStyle = "#ff2b4d"; x.fillRect(kx + 22, top - kh - 1, 2, 2);
      }
      // Rohr zwischen Bloecken
      if (rnd() < 0.5) {
        x.fillStyle = th.near; x.fillRect(px + bw - 4, top + 14, 10, 3);
      }
      px += bw + Math.floor(rnd() * 6);
    }
    return { img: c, chimneys: chimneys };
  }

  function build(idx) {
    var th = CB.THEMES[idx] || CB.THEMES[0];
    var rnd = mulberry(1234 + idx * 77);
    var out = { th: th, idx: idx };
    if (th.kind && CB.SpaceBG && CB.SpaceBG.kinds[th.kind]) {      // Weltraum-Sektoren: eigene Ebenen (space-bg.js)
      out = CB.SpaceBG.kinds[th.kind].build(th, rnd);
      out.th = th; out.idx = idx; out.custom = CB.SpaceBG.kinds[th.kind];
      return out;
    }

    // Himmel mit Neon-Sonne und Sternen
    var sky = mk(W, H), sx = sky.getContext("2d");
    var g = sx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.sky[0]); g.addColorStop(0.55, th.sky[1]); g.addColorStop(1, th.sky[2]);
    sx.fillStyle = g; sx.fillRect(0, 0, W, H);
    for (var i = 0; i < 70; i++) {
      sx.globalAlpha = 0.25 + rnd() * 0.6; sx.fillStyle = "#ffffff";
      sx.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * 150), 1, 1);
    }
    sx.globalAlpha = 1;
    var sunX = 330, sunY = 132, sr = 52;
    var sg = sx.createLinearGradient(0, sunY - sr, 0, sunY + sr);
    sg.addColorStop(0, th.sun[1]); sg.addColorStop(1, th.sun[0]);
    sx.fillStyle = sg;
    for (var yy = -sr; yy <= sr; yy++) {                       // Pixel-Kreis mit Streifen
      var half = Math.floor(Math.sqrt(sr * sr - yy * yy));
      var stripe = yy > 6 && ((yy - 6) % 9) < 3 + Math.floor((yy - 6) / 14);
      if (stripe) continue;
      sx.fillRect(sunX - half, sunY + yy, half * 2, 1);
    }
    out.sky = sky;

    out.far = skyline({ minW: 18, maxW: 46, minH: 70, maxH: 175, col: th.far, dens: 0.13, winA: 0.45, edgeA: 0.35, signs: false }, rnd, th);
    out.mid = skyline({ minW: 24, maxW: 58, minH: 60, maxH: 150, col: th.mid, dens: 0.22, winA: 0.8, edgeA: 0.6, signs: true }, rnd, th);
    out.near = factory(rnd, th);

    // Nebel am Horizont
    var fog = mk(W, 90), fx = fog.getContext("2d");
    var fg = fx.createLinearGradient(0, 0, 0, 90);
    fg.addColorStop(0, "rgba(0,0,0,0)"); fg.addColorStop(1, th.fog);
    fx.globalAlpha = 0.22; fx.fillStyle = fg; fx.fillRect(0, 0, W, 90);
    out.fog = fog;

    // Fahrzeuge (Luftverkehr)
    out.cars = [];
    for (var c = 0; c < 6; c++) {
      out.cars.push({ x: rnd() * TW, y: 30 + rnd() * 120, v: (c % 2 ? 1 : -1) * (14 + rnd() * 26), col: pick(th.neon, rnd), f: 0.2 + rnd() * 0.2 });
    }
    return out;
  }

  function get(idx) { if (!cache[idx]) cache[idx] = build(idx); return cache[idx]; }

  function wrapX(x) { return ((x % TW) + TW) % TW; }

  function drawTile(ctx, img, camX, f) {
    var off = -Math.floor(camX * f) % TW;
    if (off > 0) off -= TW;
    ctx.drawImage(img, off, 0);
    if (off + TW < W) ctx.drawImage(img, off + TW, 0);
  }

  // Dynamische Elemente in der Schicht mit Faktor f
  function eachWrapped(x, camX, f, w, fn) {
    var sx = wrapX(x - camX * f);
    if (sx < W + w) fn(sx);
    if (sx - TW > -w && sx - TW < W) fn(sx - TW);
  }

  function draw(ctx, idx, camX, t, quality) {
    var b = get(idx);
    if (b.custom) { b.custom.draw(ctx, b, camX, t, quality); return; }
    ctx.drawImage(b.sky, 0, 0);

    // Sterne funkeln
    ctx.fillStyle = "#fff";
    for (var s = 0; s < 8; s++) {
      if (Math.sin(t * 2 + s * 7.3) > 0.7) ctx.fillRect((s * 61 + 13) % W, (s * 37 + 9) % 130, 1, 1);
    }

    drawTile(ctx, b.far.img, camX, 0.12);

    // Fahrzeuge zwischen den Ebenen
    for (var i = 0; i < b.cars.length; i++) {
      var car = b.cars[i];
      var cx = car.x + t * car.v;
      eachWrapped(cx, camX, car.f, 20, function (px) {
        ctx.globalAlpha = 0.35; ctx.fillStyle = car.col;
        ctx.fillRect(Math.round(px - (car.v > 0 ? 14 : -4)), Math.round(car.y), 14, 1);
        ctx.globalAlpha = 1; ctx.fillStyle = "#ffffff";
        ctx.fillRect(Math.round(px), Math.round(car.y - 1), 4, 2);
        ctx.fillStyle = car.col; ctx.fillRect(Math.round(px + (car.v > 0 ? 4 : -2)), Math.round(car.y - 1), 2, 2);
      });
    }

    drawTile(ctx, b.mid.img, camX, 0.28);
    // blinkende Neonschilder
    for (var k = 0; k < b.mid.signs.length; k++) {
      var sg = b.mid.signs[k];
      var on = Math.sin(t * sg.sp + sg.ph) * 0.5 + 0.55;
      if (((t * 0.7 + sg.fl) % 9) < 0.18) on = 0.08;       // Flackern
      eachWrapped(sg.x, camX, 0.28, sg.w, function (px) {
        ctx.globalAlpha = Math.max(0.05, Math.min(1, on)) * 0.9;
        ctx.fillStyle = sg.col;
        ctx.fillRect(Math.round(px), sg.y, sg.w, 1); ctx.fillRect(Math.round(px), sg.y + sg.h - 1, sg.w, 1);
        ctx.fillRect(Math.round(px), sg.y, 1, sg.h); ctx.fillRect(Math.round(px) + sg.w - 1, sg.y, 1, sg.h);
        ctx.globalAlpha *= 0.55;
        ctx.fillRect(Math.round(px) + 2, sg.y + 2, Math.max(2, sg.w - 4 - (sg.fl | 0) % 5), 1);
        ctx.fillRect(Math.round(px) + 2, sg.y + 4, Math.max(2, (sg.w >> 1)), 1);
      });
    }
    ctx.globalAlpha = 1;

    ctx.drawImage(b.fog, 0, H - 110 - 0, W, 90);
    drawTile(ctx, b.near.img, camX, 0.5);

    // Schornsteine: Rauch + Warnlicht
    var ch = b.near.chimneys;
    for (var c = 0; c < ch.length; c++) {
      var chim = ch[c];
      eachWrapped(chim.x, camX, 0.5, 20, function (px) {
        if (px < -20 || px > W + 20) return;
        if (Math.sin(t * 3 + c) > 0) { ctx.fillStyle = "#ff2b4d"; ctx.fillRect(Math.round(px) - 1, chim.y - 2, 2, 2); }
        var puffs = quality === "low" ? 2 : 4;
        for (var j = 0; j < puffs; j++) {
          var ph = (t * 0.22 + j / puffs + c * 0.37) % 1;
          ctx.globalAlpha = (1 - ph) * 0.32;
          ctx.fillStyle = "#6b4a98";
          var sz = 2 + Math.floor(ph * 5);
          ctx.fillRect(Math.round(px + Math.sin(ph * 6 + c) * 3 + ph * 8), Math.round(chim.y - 3 - ph * 30), sz, sz);
        }
        ctx.globalAlpha = 1;
      });
    }
  }

  // Regen und leuchtende Schwebepartikel vor allem anderen
  function drawAtmosphere(ctx, idx, t, quality) {
    var bg = get(idx), th = bg.th;
    if (bg.custom) { bg.custom.atmo(ctx, bg, t, quality); return; }
    var drops = quality === "low" ? 28 : 60;
    ctx.fillStyle = "#b9a8ff";
    ctx.globalAlpha = 0.28;
    for (var i = 0; i < drops; i++) {
      var sp = 150 + (i % 5) * 25;
      var y = (i * 53.3 + t * sp) % (H + 12) - 6;
      var x = ((i * 97.7 - y * 0.22 + t * -10) % (W + 20) + W + 20) % (W + 20) - 10;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 4);
    }
    var motes = quality === "low" ? 8 : 20;
    for (var m = 0; m < motes; m++) {
      var my = (H - ((m * 41 + t * (6 + (m % 4) * 3)) % H));
      var mx = (m * 83 + Math.sin(t * 0.8 + m) * 14 + W) % W;
      ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + m * 3));
      ctx.fillStyle = th.neon[m % 3];
      ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  CB.Background = { draw: draw, drawAtmosphere: drawAtmosphere, get: get };
})(window.CB);

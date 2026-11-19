/* CYBER BOTS - sprites.js
   Alle Pixel-Art-Grafiken werden hier per Code gezeichnet (keine Bilddateien noetig).
   Jedes Sprite bekommt automatisch einen 1-Pixel-Umriss, damit der Stil einheitlich bleibt. */
(function (CB) {
  "use strict";

  var OUT = "#07031a";
  var DARK = "#0b0620";

  function mk(w, h) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }

  // Zeichnet 1px Umriss um alle sichtbaren Pixel
  function outline(c) {
    var x = c.getContext("2d"), w = c.width, h = c.height;
    var img = x.getImageData(0, 0, w, h), d = img.data;
    var src = new Uint8ClampedArray(d);
    function solid(px, py) { return px >= 0 && py >= 0 && px < w && py < h && src[(py * w + px) * 4 + 3] > 200; }
    for (var py = 0; py < h; py++) {
      for (var px = 0; px < w; px++) {
        var i = (py * w + px) * 4;
        if (src[i + 3] > 200) continue;
        if (solid(px - 1, py) || solid(px + 1, py) || solid(px, py - 1) || solid(px, py + 1)) {
          d[i] = 7; d[i + 1] = 3; d[i + 2] = 26; d[i + 3] = 255;
        }
      }
    }
    x.putImageData(img, 0, 0);
  }

  // Sprite bauen: Zeichenflaeche ist (w-2) x (h-2), der Umriss kommt drumherum
  function build(w, h, fn) {
    var c = mk(w, h), x = c.getContext("2d");
    x.translate(1, 1);
    fn(function (col, rx, ry, rw, rh) { x.fillStyle = col; x.fillRect(rx, ry, rw, rh); });
    x.setTransform(1, 0, 0, 1, 0, 0);
    outline(c);
    return c;
  }

  // Weisse Silhouette fuer den Treffer-Blitz
  function flashOf(c) {
    var f = mk(c.width, c.height), x = f.getContext("2d");
    x.drawImage(c, 0, 0);
    x.globalCompositeOperation = "source-atop";
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, f.width, f.height);
    return f;
  }

  function pack(fn, w, h) {
    var frames = [build(w, h, function (f) { fn(f, 0); }), build(w, h, function (f) { fn(f, 1); })];
    return { frames: frames, flash: frames.map(flashOf), w: w, h: h };
  }

  // Die spielbaren Charaktere werden in char-sprites.js gezeichnet (CB.CHAR_DRAW).

  // ---------- Gegner ----------
  var EN = {
    drone:    { b: "#ff6a3d", l: "#ffb592", d: "#a3301a", e: "#ffe14a" },
    walker:   { b: "#ff3d7a", l: "#ffa0c2", d: "#9a1a48", e: "#fff04a" },
    sprinter: { b: "#ff3b3b", l: "#ff9a8a", d: "#92181f", e: "#ffe14a" },
    turret:   { b: "#c94d86", l: "#f09cc4", d: "#6e2050", e: "#ffe14a" },
    tank:     { b: "#d4472c", l: "#ff9a70", d: "#7d2214", e: "#ffe14a" },
    boss:     { b: "#ff2b8a", l: "#ff9ccc", d: "#8a0f4e", e: "#35f0ff" }
  };

  var ENEMY_DRAW = {
    drone: function (c, f, fr) {
      c(f.l, fr ? 1 : 3, 0, fr ? 12 : 8, 1); c(f.d, 6, 1, 2, 1);
      c(f.b, 2, 2, 10, 6); c(f.l, 2, 2, 10, 1); c(f.d, 2, 7, 10, 1);
      c(f.d, 0, 3, 2, 4); c(f.d, 12, 3, 2, 4);
      c(DARK, 4, 3, 6, 4); c(f.e, 5, 4, 4, 2); c("#ffffff", 7, 4, 1, 1);
      c(f.d, 6, 8, 2, 2);
    },
    walker: function (c, f, fr) {
      c(f.d, 2, 10, 3, fr ? 6 : 5); c(f.d, 7, 10, 3, fr ? 5 : 6);
      c(f.b, 1, 5, 10, 6); c(f.l, 1, 5, 10, 1); c(f.d, 1, 10, 10, 1);
      c(f.d, 0, 6, 1, 4); c(f.l, 10, 6, 2, 3); c(f.d, 11, 8, 1, 2);
      c(f.b, 2, 0, 8, 6); c(f.l, 2, 0, 8, 1); c(DARK, 5, 1, 5, 3); c(f.e, 7, 2, 2, 2);
      c(f.d, 2, 5, 8, 1);
    },
    sprinter: function (c, f, fr) {
      c(f.d, 4, 7, 1, fr ? 3 : 2); c(f.d, 7, 7, 1, fr ? 2 : 3); c(f.d, 10, 7, 1, fr ? 3 : 2); c(f.d, 13, 7, 1, fr ? 2 : 3);
      c(f.d, 0, 4, 3, 2);
      c(f.b, 3, 3, 12, 4); c(f.l, 3, 3, 12, 1);
      c(f.b, 13, 1, 5, 5); c(DARK, 15, 2, 3, 2); c(f.e, 16, 2, 2, 2);
      c(f.l, 17, 6, 1, 2);
    },
    turret: function (c, f, fr) {
      c(f.d, 0, 8, 16, 4); c(f.b, 2, 6, 12, 3); c(f.l, 2, 6, 12, 1);
      c(f.b, 3, 1, 10, 6); c(f.l, 3, 1, 10, 1); c(DARK, 5, 3, 6, 3); c(f.e, 6, 4, fr ? 4 : 3, 1);
    },
    tank: function (c, f, fr) {
      c(f.d, 0, 10, 28, 6); c(DARK, 1, 11, 26, 1);
      for (var i = 0; i < 5; i++) { c(f.l, 2 + i * 5 + (fr ? 1 : 0), 13, 3, 2); }
      c(f.b, 2, 4, 24, 7); c(f.l, 2, 4, 24, 1); c(f.d, 2, 10, 24, 1);
      c(f.b, 8, 0, 12, 5); c(f.l, 8, 0, 12, 1); c(DARK, 14, 1, 4, 3); c(f.e, 15, 2, 2, 1);
      c(f.d, 20, 2, 8, 2); c(f.e, 26, 2, 2, 2);
    },
    boss: function (c, f, fr) {
      c(f.d, 0, 14, 10, 14); c(f.d, 40, 14, 10, 14); c(f.l, 0, 14, 10, 1); c(f.l, 40, 14, 10, 1);
      c(f.e, 1, 26, 8, 2); c(f.e, 41, 26, 8, 2);
      c(f.d, 12, 0, 4, 9); c(f.d, 34, 0, 4, 9); c(f.d, 22, 2, 6, 7); c(f.e, 12, 0, 4, 2); c(f.e, 34, 0, 4, 2);
      c(f.b, 10, 8, 30, 22); c(f.l, 10, 8, 30, 2); c(f.d, 10, 28, 30, 2);
      c(DARK, 16, 12, 18, 11); c(f.e, 18, 14, 14, 7); c(DARK, 23, 14, 4, 7); c("#ffffff", 24, 16, 2, 3);
      c(f.d, 12, 26, 26, 2); c(DARK, 14, 25, 2, 3); c(DARK, 20, 25, 2, 3); c(DARK, 28, 25, 2, 3); c(DARK, 34, 25, 2, 3);
      c(f.d, 14, 30, 6, 5); c(f.d, 30, 30, 6, 5);
      c("#ffb23f", 15, 35, 4, fr ? 6 : 4); c("#ffe14a", 16, 35, 2, fr ? 4 : 2);
      c("#ffb23f", 31, 35, 4, fr ? 4 : 6); c("#ffe14a", 32, 35, 2, fr ? 2 : 4);
    }
  };

  // ---------- Waffen (zeigen nach rechts, werden gedreht) ----------
  var WEAPON_DRAW = {
    blaster: function (c, col) {
      c("#7a86ad", 0, 0, 7, 3); c("#3a4160", 1, 3, 2, 2); c("#c6d0f2", 7, 1, 5, 1); c(col, 3, 1, 2, 1); c("#c6d0f2", 0, 0, 7, 1);
    },
    double: function (c, col) {
      c("#7a86ad", 0, 0, 6, 4); c("#c6d0f2", 6, 0, 6, 1); c("#c6d0f2", 6, 3, 6, 1); c(col, 2, 1, 2, 2); c("#c6d0f2", 0, 0, 6, 1);
    },
    electro: function (c, col) {
      c("#6a5aa0", 0, 1, 5, 3); c("#c6d0f2", 5, 2, 7, 1);
      c(col, 5, 0, 1, 5); c(col, 7, 0, 1, 5); c(col, 9, 0, 1, 5); c("#fff", 11, 2, 1, 1);
    },
    rocket: function (c, col) {
      c("#6a7390", 0, 0, 11, 4); c("#3a4160", 0, 0, 2, 4); c(col, 4, 0, 2, 4); c("#ffa23a", 10, 1, 2, 2); c("#a9b4d8", 0, 0, 11, 1);
    },
    plasma: function (c, col) {
      c("#59627f", 0, 0, 6, 5); c("#9aa6d0", 6, 0, 4, 5); c(col, 9, 1, 3, 3); c("#ffffff", 10, 2, 1, 1); c("#c6d0f2", 0, 0, 6, 1);
    }
  };

  var Sprites = { robot: {}, enemy: {}, weapon: {}, turretBarrel: null, ready: false };

  function buildAll() {
    CB.ROBOTS.forEach(function (r) {
      var draw = CB.CHAR_DRAW[r.id], col = r.color;
      Sprites.robot[r.id] = pack(function (c, fr) { draw(c, col, fr); }, r.sw, r.sh);
    });
    Object.keys(CB.ENEMIES).forEach(function (k) {
      var e = CB.ENEMIES[k], col = EN[k], draw = ENEMY_DRAW[k];
      if (!draw) return;                       // Weltraum-Gegner kommen aus space-sprites.js
      Sprites.enemy[k] = pack(function (c, fr) { draw(c, col, fr); }, e.w + 2, e.h + 2);
    });
    CB.WEAPONS.forEach(function (w) {
      Sprites.weapon[w.id] = build(14, 7, function (c) { WEAPON_DRAW[w.id](c, w.color); });
    });
    Sprites.turretBarrel = build(12, 5, function (c) {
      c(EN.turret.l, 0, 0, 10, 3); c(EN.turret.d, 0, 2, 10, 1); c(EN.turret.e, 9, 0, 1, 3);
    });
  }

  // Sprite vergroessert auf eine Menue-Flaeche zeichnen (ohne Weichzeichnen)
  Sprites.drawTo = function (canvas, img, scale) {
    var s = scale || 1;
    canvas.width = img.width * s; canvas.height = img.height * s;
    var x = canvas.getContext("2d");
    x.imageSmoothingEnabled = false;
    x.clearRect(0, 0, canvas.width, canvas.height);
    x.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  // Erweiterung: weitere Gegner-Sprites registrieren (space-sprites.js)
  Sprites.addEnemy = function (key, col, draw) {
    var e = CB.ENEMIES[key];
    Sprites.enemy[key] = pack(function (c, fr) { draw(c, col, fr); }, e.w + 2, e.h + 2);
  };
  Sprites.OUT = OUT; Sprites.DARK = DARK;

  buildAll();
  Sprites.ready = true;
  CB.Sprites = Sprites;
})(window.CB);

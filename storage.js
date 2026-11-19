/* CYBER BOTS - storage.js
   Speichersystem (LocalStorage): Credits, Charakter, Waffen, Upgrades, Fortschritt, Einstellungen. */
(function (CB) {
  "use strict";

  var KEY = "cyberbots-save-v1";

  function defaults() {
    return {
      v: 1,
      credits: 0,
      robots: { nova: true, rox: true, kai: true, lira: true, zane: true },
      weapons: { blaster: true },
      upgrades: { damage: 0, rate: 0, health: 0, speed: 0, range: 0 },
      selRobot: "nova",
      selWeapon: "blaster",
      progress: { unlocked: 1, cleared: {}, best: {}, endlessBest: 0, trophies: {} },
      stats: { kills: 0, runs: 0, credits: 0 },
      settings: { volume: 0.7, sfx: true, music: true, shake: true, particles: "high", crosshair: true, autoFire: false, touch: "auto", rumble: true }
    };
  }

  function num(v, lo, hi, dflt) {
    return (typeof v === "number" && isFinite(v)) ? Math.max(lo, Math.min(hi, v)) : dflt;
  }

  // Gespeicherte Daten pruefen und mit Standardwerten auffuellen (kaputte Werte werden ignoriert)
  function sanitize(raw) {
    var d = defaults();
    if (!raw || typeof raw !== "object") return d;
    d.credits = Math.floor(num(raw.credits, 0, 1e12, 0));
    // Alle fuenf Charaktere stehen frei zur Verfuegung (alte Roboter-Eintraege werden verworfen)
    CB.WEAPONS.forEach(function (w) { if (raw.weapons && raw.weapons[w.id] === true) d.weapons[w.id] = true; });
    d.weapons.blaster = true;
    CB.UPGRADES.forEach(function (u) {
      d.upgrades[u.id] = Math.floor(num(raw.upgrades && raw.upgrades[u.id], 0, CB.MAX_LEVEL, 0));
    });
    if (d.robots[raw.selRobot]) d.selRobot = raw.selRobot;           // alte Roboter-IDs (z.B. 'standard') -> NOVA
    if (d.weapons[raw.selWeapon]) d.selWeapon = raw.selWeapon;
    var p = raw.progress || {};
    d.progress.unlocked = Math.floor(num(p.unlocked, 1, 4, 1));
    CB.SECTORS.forEach(function (s) {
      if (p.cleared && p.cleared[s.id] === true) d.progress.cleared[s.id] = true;
      var b = p.best && p.best[s.id];
      if (typeof b === "number" && isFinite(b) && b > 0) d.progress.best[s.id] = Math.floor(b);
    });
    d.progress.endlessBest = Math.floor(num(p.endlessBest, 0, 1e9, 0));
    CB.SECTORS.forEach(function (s2) { if (p.trophies && p.trophies[s2.id] === true) d.progress.trophies[s2.id] = true; });
    var st = raw.stats || {};
    d.stats.kills = Math.floor(num(st.kills, 0, 1e9, 0));
    d.stats.runs = Math.floor(num(st.runs, 0, 1e9, 0));
    d.stats.credits = Math.floor(num(st.credits, 0, 1e12, 0));
    var s = raw.settings || {};
    d.settings.volume = num(s.volume, 0, 1, d.settings.volume);
    ["sfx", "music", "shake", "crosshair", "autoFire", "rumble"].forEach(function (k) {
      if (typeof s[k] === "boolean") d.settings[k] = s[k];
    });
    if (s.particles === "low" || s.particles === "high") d.settings.particles = s.particles;
    if (s.touch === "auto" || s.touch === "on" || s.touch === "off") d.settings.touch = s.touch;
    return d;
  }

  var Save = {
    data: defaults(),
    ok: true,
    fresh: true,           // true, wenn noch nie gespeichert wurde

    load: function () {
      try {
        var txt = localStorage.getItem(KEY);
        this.fresh = !txt;
        this.data = sanitize(txt ? JSON.parse(txt) : null);
      } catch (e) {
        this.data = defaults();
        this.ok = false;
      }
      return this.data;
    },

    save: function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
        this.ok = true;
      } catch (e) { this.ok = false; }
      return this.ok;
    },

    reset: function () {
      var keepSettings = this.data.settings;
      this.data = defaults();
      this.data.settings = keepSettings;
      this.save();
    },

    // Sektor 1-4: ueber 'unlocked' (wie bisher), Sektor 5-9: Vorgaenger muss besiegt sein
    isUnlocked: function (id) {
      var sec = CB.byId(CB.SECTORS, id), p = this.data.progress;
      if (!sec) return false;
      if (sec.requires) return p.cleared[sec.requires] === true;
      return id <= p.unlocked;
    },

    // --- Kaufen und Ausruesten ---
    buyWeapon: function (id) {
      var w = CB.byId(CB.WEAPONS, id), d = this.data;
      if (!w || d.weapons[id] || d.credits < w.price) return false;
      d.credits -= w.price; d.weapons[id] = true; d.selWeapon = id;
      this.save(); return true;
    },
    buyUpgrade: function (id) {
      var u = CB.byId(CB.UPGRADES, id), d = this.data;
      if (!u) return false;
      var lvl = d.upgrades[id];
      if (lvl >= CB.MAX_LEVEL) return false;
      var cost = CB.upgradeCost(u, lvl);
      if (d.credits < cost) return false;
      d.credits -= cost; d.upgrades[id] = lvl + 1;
      this.save(); return true;
    },
    selectRobot: function (id) { if (this.data.robots[id]) { this.data.selRobot = id; this.save(); return true; } return false; },
    selectWeapon: function (id) { if (this.data.weapons[id]) { this.data.selWeapon = id; this.save(); return true; } return false; }
  };

  CB.Save = Save;
})(window.CB);

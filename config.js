/* CYBER BOTS - config.js
   Alle Spielwerte an einer Stelle: Roboter, Waffen, Gegner, Sektoren, Upgrades. */
window.CB = window.CB || {};
(function (CB) {
  "use strict";

  CB.W = 480;            // interne Aufloesung (Pixel-Art, wird per CSS skaliert)
  CB.H = 270;
  CB.GROUND = 240;       // y-Position des Bodens
  CB.GRAVITY = 620;
  CB.MAX_LEVEL = 10;
  CB.STEP = 1 / 60;      // fester Zeitschritt der Spiellogik

  // ---------- Spielbare Charaktere ----------
  // hp = Lebensenergie, speed = px/s, dmg = Schadensfaktor, jump = Sprunggeschwindigkeit, w/h = Hitbox, sw/sh = Sprite-Groesse
  // Jeder Charakter wird allein gespielt und hat genau eine eigene Spezialfaehigkeit (kein Team, keine Abhaengigkeiten).
  CB.CHARACTERS = [
    { id: "nova", name: "NOVA", role: "HACKER", hp: 90, speed: 104, dmg: 0.95, jump: 256, w: 12, h: 24, sw: 20, sh: 28,
      color: { b: "#35f0ff", l: "#c4fcff", d: "#168ba6", e: "#ffffff" },
      ability: { id: "neuron", name: "NEURON-BOOST", cd: 45, dur: 10, desc: "Übernimmt einen feindlichen Bot für 10 Sekunden. Er kämpft währenddessen unter Novas Kontrolle (nicht gegen Bosse)." },
      desc: "Dunkle Kapuzenjacke, Hacker-Ausrüstung. Schnell und wendig." },
    { id: "rox", name: "ROX", role: "TECHNIKERIN", hp: 85, speed: 110, dmg: 0.9, jump: 262, w: 12, h: 24, sw: 20, sh: 28,
      color: { b: "#ff2bd6", l: "#ffb0f0", d: "#a31e8a", e: "#ffffff" },
      ability: { id: "drones", name: "DROHNEN-SCHWARM", cd: 50, dur: 22, desc: "Ruft 3 Kampf-Drohnen, die selbstständig Gegner angreifen und gegnerische Schüsse ablenken." },
      desc: "Rote Haare, Schutzbrille. Die flinkste der Fünf." },
    { id: "kai", name: "KAI", role: "SOLDAT", hp: 130, speed: 92, dmg: 1.15, jump: 246, w: 12, h: 24, sw: 20, sh: 28,
      color: { b: "#ff3b3b", l: "#ffb0b0", d: "#8a1420", e: "#ffffff" },
      ability: { id: "overload", name: "OVERLOAD-SCHUSS", cd: 40, desc: "Feuert einen zerstörerischen Energieschuss, der mehrere Gegner durchdringt." },
      desc: "Dunkle Kampfrüstung, roter Schal. Robust und hart im Austeilen." },
    { id: "lira", name: "DR. LIRA", role: "STRATEGIN", hp: 80, speed: 98, dmg: 1.0, jump: 252, w: 12, h: 24, sw: 20, sh: 28,
      color: { b: "#a06bff", l: "#d8c4ff", d: "#5b2fb0", e: "#ffffff" },
      ability: { id: "analyse", name: "TAKTISCHE ANALYSE", cd: 60, dur: 15, desc: "Erhöht den eigenen Angriffsschaden für 15 Sekunden um 50 %." },
      desc: "Laborkittel und Brille. Plant jeden Schuss." },
    { id: "zane", name: "ZANE", role: "SUPPORTER", hp: 110, speed: 100, dmg: 1.0, jump: 254, w: 12, h: 24, sw: 20, sh: 28,
      color: { b: "#6bff8a", l: "#d8ffd8", d: "#1f8a3c", e: "#ffffff" },
      ability: { id: "repair", name: "REPARATUR-FIELD", cd: 50, dur: 3, desc: "Repariert Zanes eigenen Bot und stellt Lebenspunkte wieder her." },
      desc: "Blonde Haare, Headset, grüne Jacke. Hält länger durch." }
  ];
  CB.ROBOTS = CB.CHARACTERS;      // Alias fuer bestehenden Code (Speicherstand-Schluessel 'robots'/'selRobot' bleiben kompatibel)
  CB.DEFAULT_CHAR = "nova";

  // ---------- Waffen ----------
  CB.WEAPONS = [
    { id: "blaster", name: "PLASMA BLASTER", price: 0, type: "bolt",
      dmg: 10, rate: 4.0, range: 220, speed: 330, color: "#35f0ff",
      desc: "Reliable rapid-fire plasma bolts." },
    { id: "double", name: "DOUBLE BLASTER", price: 500, type: "double",
      dmg: 8, rate: 3.2, range: 200, speed: 330, color: "#6bffcf",
      desc: "Twin barrels fire two bolts per shot." },
    { id: "electro", name: "ELECTRO CANNON", price: 1500, type: "arc",
      dmg: 16, rate: 2.3, range: 150, speed: 0, color: "#b890ff",
      desc: "Instant lightning that chains to nearby enemies." },
    { id: "rocket", name: "ROCKET LAUNCHER", price: 3000, type: "rocket",
      dmg: 42, rate: 0.9, range: 320, speed: 210, color: "#ffa23a",
      desc: "Explosive rockets with area damage." },
    { id: "plasma", name: "PLASMA CANNON", price: 5000, type: "plasma",
      dmg: 75, rate: 0.6, range: 380, speed: 250, color: "#ff2bd6",
      desc: "Heavy plasma orbs that pierce enemies." }
  ];

  // ---------- Gegner ----------
  CB.ENEMIES = {
    drone:    { name: "SCOUT DRONE", hp: 24,  speed: 62, dmg: 8,  contact: 6,  credits: 8,  w: 14, h: 10, fly: true,  detect: 210, rate: 1.7 },
    walker:   { name: "CRAWLER",     hp: 42,  speed: 46, dmg: 0,  contact: 12, credits: 10, w: 12, h: 16, fly: false, detect: 170, rate: 0 },
    sprinter: { name: "BLADE RUNNER", hp: 30, speed: 92, dmg: 0,  contact: 10, credits: 12, w: 18, h: 10, fly: false, detect: 215, rate: 0 },
    turret:   { name: "GUN TURRET",  hp: 55,  speed: 0,  dmg: 9,  contact: 0,  credits: 14, w: 16, h: 12, fly: false, detect: 235, rate: 0.45 },
    tank:     { name: "SIEGE TANK",  hp: 170, speed: 24, dmg: 16, contact: 20, credits: 32, w: 28, h: 16, fly: false, detect: 290, rate: 0.45 },
    boss:     { name: "NEON WARDEN", hp: 1700, speed: 50, dmg: 12, contact: 18, credits: 400, w: 50, h: 42, fly: true, detect: 9999, rate: 1 }
  };

  // ---------- Sektoren (alle in NEON CITY) ----------
  CB.SECTORS = [
    { id: 1, area: "NEON CITY", name: "DOWNTOWN", width: 2400, quota: 18, maxAlive: 4,
      weights: { drone: 3, walker: 4, sprinter: 1 }, hpMul: 1.0, dmgMul: 1.0, turrets: 2, reward: 100, theme: 0 },
    { id: 2, area: "NEON CITY", name: "FACTORY ROW", width: 2800, quota: 26, maxAlive: 6,
      weights: { drone: 3, walker: 3, sprinter: 3, tank: 1 }, hpMul: 1.35, dmgMul: 1.2, turrets: 3, reward: 200, theme: 1 },
    { id: 3, area: "NEON CITY", name: "CORE TOWER", width: 2600, quota: 22, maxAlive: 6, boss: true,
      weights: { drone: 3, walker: 2, sprinter: 3, tank: 2 }, hpMul: 1.7, dmgMul: 1.4, turrets: 4, reward: 400, theme: 2 },
    { id: 4, area: "NEON CITY", name: "OVERDRIVE (ENDLESS)", width: 3000, quota: Infinity, maxAlive: 5, endless: true,
      weights: { drone: 3, walker: 3, sprinter: 3, tank: 1 }, hpMul: 1.5, dmgMul: 1.3, turrets: 3, reward: 0, theme: 3 }
  ];

  // ---------- Upgrades (gelten fuer alle Roboter) ----------
  CB.UPGRADES = [
    { id: "damage", name: "WEAPON DAMAGE", icon: "DMG", per: 0.08, base: 100, desc: "+8% weapon damage per level" },
    { id: "rate",   name: "FIRE RATE",     icon: "ROF", per: 0.05, base: 100, desc: "+5% fire rate per level" },
    { id: "health", name: "HIT POINTS",    icon: "HP",  per: 0.10, base: 80,  desc: "+10% max health per level" },
    { id: "speed",  name: "MOVE SPEED",    icon: "SPD", per: 0.04, base: 60,  desc: "+4% movement speed per level" },
    { id: "range",  name: "WEAPON RANGE",  icon: "RNG", per: 0.05, base: 60,  desc: "+5% weapon range per level" }
  ];
  CB.upgradeCost = function (u, level) {
    return Math.round(u.base * Math.pow(1.5, level) / 5) * 5;
  };

  CB.byId = function (list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };

  // Farbthemen der Hintergruende
  CB.THEMES = [
    { name: "downtown", sky: ["#08021c", "#1c0742", "#52105e"], far: "#1a0a3c", mid: "#2a1058", near: "#10062a",
      neon: ["#ff2bd6", "#35f0ff", "#8a5cff"], sun: ["#ff2bd6", "#ffb23f"], ground: "#150a33", fog: "#ff2bd6" },
    { name: "factory", sky: ["#0a0218", "#2a0838", "#6a1a40"], far: "#220a38", mid: "#35103f", near: "#12061f",
      neon: ["#ff8a1f", "#ff2bd6", "#6f5cff"], sun: ["#ff6a2b", "#ffd23f"], ground: "#1a0b24", fog: "#ff8a1f" },
    { name: "tower", sky: ["#020a1e", "#06214a", "#0d4a6e"], far: "#082244", mid: "#0c3560", near: "#04132c",
      neon: ["#2bffd5", "#3a7bff", "#ff2bd6"], sun: ["#2bffd5", "#7a8cff"], ground: "#06182f", fog: "#2bffd5" },
    { name: "overdrive", sky: ["#14020e", "#3a0828", "#7a0f3a"], far: "#2c0a28", mid: "#44103a", near: "#1a0516",
      neon: ["#ff2b4d", "#ff2bd6", "#35f0ff"], sun: ["#ff2b4d", "#ff9b3f"], ground: "#240818", fog: "#ff2b4d" }
  ];
})(window.CB);

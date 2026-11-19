/* CYBER BOTS - space-config.js
   Sektoren 05-09 (DEEP SPACE): Farbthemen, Gegnerwerte, Sektordaten, Belohnungen.
   Die vier Sektoren von NEON CITY bleiben unveraendert (config.js). */
(function (CB) {
  "use strict";

  // ---------- Farbthemen 4-8 ----------
  CB.THEMES.push(
    { name: "station", kind: "station", sky: ["#02041a", "#071a3a", "#0f3a5e"], far: "#0a1c3a", mid: "#10305a", near: "#06122a",
      neon: ["#35f0ff", "#8fe6ff", "#ff2bd6"], sun: ["#6ab8ff", "#d8f4ff"], ground: "#0b1830", fog: "#35f0ff" },
    { name: "reactor", kind: "reactor", sky: ["#1a0404", "#3a0c06", "#6a2208"], far: "#2a0c08", mid: "#3e1409", near: "#1a0805",
      neon: ["#ff8a1f", "#9dff4a", "#ffd23f"], sun: ["#ff6a1f", "#ffe14a"], ground: "#1c0c08", fog: "#ff8a1f" },
    { name: "lab", kind: "lab", sky: ["#04021a", "#0c0838", "#1a1260"], far: "#120c3a", mid: "#1b1352", near: "#0a0720",
      neon: ["#9dff4a", "#b86bff", "#35f0ff"], sun: ["#9dff4a", "#e8ffcf"], ground: "#0e0c26", fog: "#b86bff" },
    { name: "dread", kind: "dread", sky: ["#0c0608", "#2a0c10", "#4e1a1a"], far: "#1c0c10", mid: "#2c1216", near: "#120608",
      neon: ["#ff3b3b", "#ff8a1f", "#9aa6c8"], sun: ["#ff3b3b", "#ffb23f"], ground: "#1a1014", fog: "#ff3b3b" },
    { name: "frontier", kind: "frontier", sky: ["#010008", "#0a0420", "#1c0a3a"], far: "#10062a", mid: "#1a0c3e", near: "#0a0418",
      neon: ["#ffd23f", "#ffffff", "#b86bff"], sun: ["#ffd23f", "#fff4c0"], ground: "#0e0820", fog: "#b86bff" }
  );

  // ---------- Gegner (Werte; KI steht in space-enemies.js) ----------
  CB.ENEMIES.guard = { name: "SECURITY BOT", hp: 80, speed: 50, dmg: 9, contact: 14, credits: 18, w: 14, h: 20, fly: false, detect: 240, rate: 0.7,
    shield: true, shieldMul: 0.2 };
  CB.ENEMIES.lasertower = { name: "LASER TOWER", hp: 110, speed: 0, dmg: 16, contact: 0, credits: 26, w: 14, h: 30, fly: false, detect: 300, rate: 0.33,
    fixed: true };
  CB.ENEMIES.sentinel = { name: "STATION SENTINEL", hp: 3000, speed: 38, dmg: 12, contact: 20, credits: 700, w: 40, h: 46, fly: false, detect: 9999, rate: 1,
    isBoss: true, noMul: true, shield: true, shieldMul: 0.15, heavy: true };

  // 06 REACTOR CORE
  CB.ENEMIES.kamidrone = { name: "MELTDOWN DRONE", hp: 22, speed: 118, dmg: 0, contact: 0, credits: 14, w: 12, h: 12, fly: true, detect: 280, rate: 0, big: false };
  CB.ENEMIES.lobber = { name: "COOLANT LOBBER", hp: 62, speed: 36, dmg: 10, contact: 10, credits: 18, w: 14, h: 18, fly: false, detect: 300, rate: 0.5 };
  CB.ENEMIES.golem = { name: "CORE GOLEM", hp: 250, speed: 24, dmg: 13, contact: 22, credits: 42, w: 26, h: 28, fly: false, detect: 300, rate: 0.3, big: true, heavy: true };
  CB.ENEMIES.meltdown = { name: "MELTDOWN HEART", hp: 3600, speed: 44, dmg: 12, contact: 20, credits: 900, w: 46, h: 46, fly: true, detect: 9999, rate: 1,
    isBoss: true, noMul: true };
  // 07 VOID LABORATORY
  CB.ENEMIES.stalker = { name: "PHASE STALKER", hp: 72, speed: 74, dmg: 0, contact: 18, credits: 20, w: 12, h: 20, fly: false, detect: 280, rate: 0 };
  CB.ENEMIES.blob = { name: "VOID BLOB", hp: 74, speed: 34, dmg: 0, contact: 14, credits: 16, w: 16, h: 12, fly: false, detect: 230, rate: 0, animated: true };
  CB.ENEMIES.spawn = { name: "VOID SPAWN", hp: 22, speed: 80, dmg: 0, contact: 9, credits: 4, w: 8, h: 7, fly: false, detect: 400, rate: 0, animated: true, noDrop: true };
  CB.ENEMIES.wisp = { name: "RIFT WISP", hp: 42, speed: 58, dmg: 11, contact: 8, credits: 22, w: 12, h: 12, fly: true, detect: 300, rate: 0.4 };
  CB.ENEMIES.clone = { name: "SUBJECT CLONE", hp: 95, speed: 80, dmg: 8, contact: 14, credits: 0, w: 12, h: 20, fly: false, detect: 9999, rate: 0.9, noDrop: true, noCredit: true };
  CB.ENEMIES.aberration = { name: "SUBJECT ZERO", hp: 4200, speed: 50, dmg: 13, contact: 22, credits: 1100, w: 34, h: 48, fly: true, detect: 9999, rate: 1,
    isBoss: true, noMul: true };

  // 08 DREADNOUGHT
  CB.ENEMIES.elite = { name: "ELITE TROOPER", hp: 130, speed: 62, dmg: 10, contact: 16, credits: 34, w: 16, h: 22, fly: false, detect: 290, rate: 0.8,
    shield: true, shieldMul: 0.25 };
  CB.ENEMIES.mortar = { name: "MORTAR CREW", hp: 95, speed: 22, dmg: 15, contact: 8, credits: 30, w: 22, h: 16, fly: false, detect: 400, rate: 0.33 };
  CB.ENEMIES.gunship = { name: "ATTACK CRAFT", hp: 90, speed: 100, dmg: 10, contact: 12, credits: 32, w: 30, h: 14, fly: true, detect: 420, rate: 2.2 };
  CB.ENEMIES.cannon = { name: "HEAVY CANNON", hp: 170, speed: 0, dmg: 18, contact: 0, credits: 36, w: 20, h: 16, fly: false, detect: 400, rate: 0.28, fixed: true };
  CB.ENEMIES.leviathan = { name: "IRON LEVIATHAN", hp: 5000, speed: 30, dmg: 13, contact: 24, credits: 1400, w: 58, h: 50, fly: false, detect: 9999, rate: 1,
    isBoss: true, noMul: true, heavy: true };
  // 09 THE LAST FRONTIER
  CB.ENEMIES.wraith = { name: "STAR WRAITH", hp: 120, speed: 120, dmg: 12, contact: 20, credits: 45, w: 16, h: 18, fly: true, detect: 430, rate: 0 };
  CB.ENEMIES.knight = { name: "VOID KNIGHT", hp: 230, speed: 54, dmg: 11, contact: 24, credits: 55, w: 18, h: 26, fly: false, detect: 330, rate: 0.5, heavy: true };
  CB.ENEMIES.sovereign = { name: "THE LAST SOVEREIGN", hp: 6500, speed: 48, dmg: 14, contact: 26, credits: 2500, w: 52, h: 52, fly: true, detect: 9999, rate: 1,
    isBoss: true, noMul: true };

  // ---------- Sektor-Pickups (jeder Sektor hat sein eigenes) ----------
  CB.PICKUPS = {
    heal:   { heal: 0.25, col: "#6bffcf", name: "REPAIR" },
    repair: { heal: 0.25, shield: 2.5, col: "#8fe6ff", name: "REPAIR KIT", msg: "SHIELD" },
    cell:   { heal: 0.15, over: 6, col: "#ffd23f", name: "ENERGY CELL", msg: "OVERCLOCK" },
    shard:  { heal: 0.12, inv: 2.5, col: "#b86bff", name: "VOID SHARD", msg: "PHASE" },
    core:   { heal: 0.15, boost: 8, col: "#ff6a3d", name: "AMMO CORE", msg: "OVERDRIVE" },
    star:   { heal: 0.40, shield: 3, col: "#ffd23f", name: "STAR FRAGMENT", msg: "STARLIGHT" }
  };

  // ---------- Sektoren ----------
  CB.SECTORS.push(
    { id: 5, area: "DEEP SPACE", name: "ORBITAL STATION", width: 3000, quota: 28, maxAlive: 6, boss: true, bossType: "sentinel",
      weights: { drone: 3, guard: 3, sprinter: 2, tank: 1 }, fixed: { turret: 2, lasertower: 3 },
      hpMul: 1.9, dmgMul: 1.3, reward: 700, firstBonus: 400, drop: 0.14, pickup: "repair", trophy: "STATION KEYCARD",
      theme: 4, music: "station", requires: 3, hz: { gates: 8, lowg: 3, crates: 9 },
      info: "Laser gates, shielded guards, laser towers and low-gravity decks. Boss: STATION SENTINEL." }
  );
  CB.SECTORS.push(
    { id: 6, area: "DEEP SPACE", name: "REACTOR CORE", width: 3100, quota: 30, maxAlive: 7, boss: true, bossType: "meltdown",
      weights: { drone: 2, kamidrone: 3, lobber: 2, walker: 2, golem: 1 }, fixed: { turret: 2 },
      hpMul: 2.2, dmgMul: 1.7, reward: 900, firstBonus: 600, drop: 0.14, pickup: "cell", trophy: "REACTOR ROD",
      theme: 5, music: "reactor", requires: 5, hz: { vents: 8, canisters: 11 },
      info: "Steam vents, explosive energy cores, fire bombs and kamikaze drones. Boss: MELTDOWN HEART." },
    { id: 7, area: "DEEP SPACE", name: "VOID LABORATORY", width: 3200, quota: 32, maxAlive: 7, boss: true, bossType: "aberration",
      weights: { stalker: 3, blob: 3, wisp: 3, kamidrone: 1 }, fixed: { turret: 2, lasertower: 1 },
      hpMul: 2.6, dmgMul: 1.8, reward: 1100, firstBonus: 800, drop: 0.14, pickup: "shard", trophy: "VOID SAMPLE",
      theme: 6, music: "lab", requires: 6, hz: { acid: 5, portals: 2, crates: 5 },
      info: "Acid pools, rift portals, teleporting stalkers and splitting blobs. Boss: SUBJECT ZERO." }
  );
  CB.SECTORS.push(
    { id: 8, area: "DEEP SPACE", name: "DREADNOUGHT", width: 3300, quota: 34, maxAlive: 8, boss: true, bossType: "leviathan",
      weights: { elite: 3, mortar: 2, gunship: 2, tank: 1, sprinter: 1 }, fixed: { turret: 2, cannon: 3 },
      hpMul: 3.0, dmgMul: 1.9, reward: 1300, firstBonus: 1000, drop: 0.15, pickup: "core", trophy: "WAR ENGINE CORE",
      theme: 7, music: "dread", requires: 7, hz: { conv: 5, wind: 3, armor: 8 },
      info: "Conveyor belts, hull-breach winds, elite troopers, mortar barrages and gunships. Boss: IRON LEVIATHAN." },
    { id: 9, area: "DEEP SPACE", name: "THE LAST FRONTIER", width: 3500, quota: 36, maxAlive: 9, boss: true, bossType: "sovereign",
      weights: { wraith: 3, knight: 3, elite: 1, stalker: 2, kamidrone: 1, golem: 1 }, fixed: { lasertower: 2, cannon: 2 },
      hpMul: 3.6, dmgMul: 2.1, reward: 2000, firstBonus: 2500, drop: 0.16, pickup: "star", trophy: "FRONTIER CROWN",
      theme: 8, music: "frontier", requires: 8, hz: { wells: 3, meteors: 2.4, bob: 12 },
      info: "Meteor showers, gravity wells and drifting rock. The strongest enemies. Boss: THE LAST SOVEREIGN." }
  );

  // Freischaltung: Sektor 1-4 wie bisher, 5-9 erst nach dem Sieg im Vorgaenger
  CB.sectorById = function (id) { return CB.byId(CB.SECTORS, id); };
  CB.nextSector = function (id) {
    if (id === 3) return 5;                     // Kampagne geht in den Weltraum weiter (Endlos-Sektor 4 bleibt waehlbar)
    if (id === 4 || id >= CB.SECTORS[CB.SECTORS.length - 1].id) return 0;
    return id + 1;
  };
})(window.CB);

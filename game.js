/* CYBER BOTS - game.js
   Spiellogik (ohne Zeichnen): Spieler, Waffen, Gegner, Projektile, Sektoren, Fortschritt.
   Alles laeuft mit festem Zeitschritt (CB.STEP), also unabhaengig von der Bildrate. */
(function (CB) {
  "use strict";

  var W = CB.W, H = CB.H, GROUND = CB.GROUND, GRAV = CB.GRAVITY;
  var rand = Math.random;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sgn(v) { return v < 0 ? -1 : 1; }
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var G = {
    state: "menu",         // menu | playing | paused | dying | won | result
    t: 0,                  // Spielzeit (fuer Animationen)
    sec: null, p: null,
    enemies: [], shots: [], eshots: [], parts: [], rings: [], texts: [], beams: [], pickups: [],
    platforms: [], worldW: 2400, camX: 0, shake: 0, flash: 0, gravMul: 1, extVx: 0,
    run: { kills: 0, credits: 0, score: 0, time: 0 },
    stats: null, boss: null, bossSpawned: false, spawnT: 0, endT: 0, banner: null, saveT: 0
  };

  function settings() { return CB.Save.data.settings; }
  function quality() { return settings().particles === "low" ? 0.45 : 1; }
  function sfx(n) { if (CB.Audio) CB.Audio.play(n); }
  function rumble(strong, weak, ms) { if (CB.Input && CB.Input.rumble) CB.Input.rumble(strong, weak, ms); }

  // ---------- Werte des Spielers (Roboter + Waffe + Upgrades) ----------
  CB.computeStats = function () {
    var d = CB.Save.data, r = CB.byId(CB.ROBOTS, d.selRobot), w = CB.byId(CB.WEAPONS, d.selWeapon), U = {};
    CB.UPGRADES.forEach(function (u) { U[u.id] = 1 + u.per * d.upgrades[u.id]; });
    return {
      robot: r, weapon: w,
      maxHp: Math.round(r.hp * U.health), speed: r.speed * U.speed,
      dmg: w.dmg * r.dmg * U.damage, rate: w.rate * U.rate, range: w.range * U.range,
      abilityDmg: 45 * r.dmg * U.damage
    };
  };

  // ---------- Effekte ----------
  function burst(x, y, n, cols, speed, life, grav, size) {
    n = Math.ceil(n * quality());
    for (var i = 0; i < n; i++) {
      if (G.parts.length > 600) G.parts.shift();
      var a = rand() * 6.283, s = speed * (0.3 + rand() * 0.7);
      G.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + rand() * 0.6), max: life,
        col: cols[(rand() * cols.length) | 0], size: size || 1, grav: grav || 0 });
    }
  }
  function ring(x, y, r, col, life) { G.rings.push({ x: x, y: y, r: 2, max: r, life: life || 0.3, t: life || 0.3, col: col }); }
  function text(x, y, str, col, big) { G.texts.push({ x: x, y: y, vy: -34, life: 0.8, max: 0.8, str: String(str), col: col || "#fff", big: !!big }); }
  function addShake(v) { if (settings().shake) G.shake = Math.max(G.shake, v); }

  // ---------- Welt ----------
  function genPlatforms(sec) {
    var r = mulberry(sec.id * 7919 + 13), plats = [], x = 150;
    while (x < sec.width - 200) {
      var w = 64 + Math.floor(r() * 5) * 8;
      plats.push({ x: x, y: GROUND - 34, w: w });
      if (r() < 0.55) plats.push({ x: x + Math.floor(w * 0.45) + 24, y: GROUND - 68, w: 56 + Math.floor(r() * 3) * 8 });
      x += w + 80 + Math.floor(r() * 130);
    }
    return plats;
  }

  // ---------- Start / Ende ----------
  G.start = function (sectorId) {
    var sec = CB.byId(CB.SECTORS, sectorId) || CB.SECTORS[0];
    G.sec = sec; G.worldW = sec.width;
    G.stats = CB.computeStats();
    G.platforms = genPlatforms(sec);
    G.gravMul = 1; G.extVx = 0;
    if (CB.Hazards) CB.Hazards.build(sec, G);
    G.enemies = []; G.shots = []; G.eshots = []; G.parts = []; G.rings = []; G.texts = []; G.beams = []; G.pickups = []; G.drones = [];
    G.run = { kills: 0, credits: 0, score: 0, time: 0 };
    G.boss = null; G.bossSpawned = false; G.spawnT = 1.2; G.endT = 0; G.shake = 0; G.flash = 0; G.saveT = 0;
    G.banner = { text: "SECTOR " + sec.id + " - " + sec.name, t: 2.4 };
    var s = G.stats;
    G.p = {
      x: 90, y: GROUND, vx: 0, vy: 0, w: s.robot.w, h: s.robot.h, onGround: true, face: 1,
      hp: s.maxHp, maxHp: s.maxHp, fireT: 0.2, aim: 0, alive: true, inv: 0.8, hurt: 0,
      abCd: 0, dash: 0, dashDir: 1, over: 0, shield: 0, analysis: 0, repair: 0, hackFx: 0, coyote: 0, dropT: 0, anim: 0, recoil: 0, landed: true
    };
    if (CB.Input.abilityQueued) CB.Input.abilityQueued = false;
    CB.Input.jumpBuffer = 0;
    G.camX = 0;
    // Geschuetztuerme fest verteilt
    var r = mulberry(sec.id * 31 + 7), i;
    var fixedList = [];
    if (sec.fixed) { for (var fk in sec.fixed) for (var fn = 0; fn < sec.fixed[fk]; fn++) fixedList.push(fk); }
    else for (i = 0; i < sec.turrets; i++) fixedList.push("turret");
    var n = fixedList.length;
    for (i = 0; i < n; i++) {
      var tx = 520 + (sec.width - 760) * ((i + 0.5) / n) + (r() - 0.5) * 120;
      var onPlat = null;
      for (var k = 0; k < G.platforms.length; k++) {
        var pl = G.platforms[k];
        if (tx > pl.x + 12 && tx < pl.x + pl.w - 12) { onPlat = pl; if (r() < 0.8) break; }
      }
      spawnEnemy(fixedList[i], tx, onPlat ? onPlat.y : GROUND);
    }
    // Startwelle ausserhalb des Bildes
    spawnEnemy("drone", 520, 110);
    spawnEnemy("walker", 640, GROUND);
    G.state = "playing";
    CB.Audio.play("ready");
    if (CB.Audio.track) CB.Audio.track(sec.music || "menu");
  };

  G.setPaused = function (on) {
    if (on && G.state === "playing") { G.state = "paused"; CB.Input.reset(); save(); }
    else if (!on && G.state === "paused") { G.state = "playing"; }
  };

  G.toMenu = function () { if (CB.Audio.track) CB.Audio.track("menu"); G.gravMul = 1; G.extVx = 0; if (CB.Hazards) CB.Hazards.clear(); save(); G.state = "menu"; G.enemies = []; G.eshots = []; G.shots = []; G.parts = []; G.beams = []; CB.Input.reset(); };

  function save() { CB.Save.save(); }

  function finish(win) {
    var sec = G.sec, d = CB.Save.data, bonus = 0, firstClear = false;
    if (win) {
      bonus = sec.reward;
      if (sec.firstBonus && !d.progress.cleared[sec.id]) { bonus += sec.firstBonus; firstClear = true; }
      d.credits += bonus; G.run.credits += bonus;
      G.run.score += bonus * 5;
      d.progress.cleared[sec.id] = true;
      if (sec.trophy) { if (!d.progress.trophies) d.progress.trophies = {}; d.progress.trophies[sec.id] = true; }
      if (sec.id <= 3) d.progress.unlocked = Math.max(d.progress.unlocked, sec.id + 1);
    }
    d.stats.kills += G.run.kills; d.stats.runs += 1; d.stats.credits += G.run.credits;
    var score = Math.floor(G.run.score);
    if (!d.progress.best[sec.id] || score > d.progress.best[sec.id]) d.progress.best[sec.id] = score;
    var newBest = false;
    if (sec.endless && G.run.kills > d.progress.endlessBest) { d.progress.endlessBest = G.run.kills; newBest = true; }
    save();
    G.state = "result"; G.win = win;
    sfx(win ? "win" : "lose");
    if (CB.UI) CB.UI.showResult({ win: win, sector: sec, kills: G.run.kills, credits: G.run.credits, bonus: bonus, score: score,
      time: G.run.time, newBest: newBest, unlockedNext: win && !!CB.nextSector(sec.id), firstClear: firstClear, trophy: win && sec.trophy ? sec.trophy : null, nextId: CB.nextSector(sec.id) });
  }

  // ---------- Gegner ----------
  function spawnEnemy(type, x, y) {
    var c = CB.ENEMIES[type], sec = G.sec;
    var diff = sec.endless ? 1 + G.run.time / 90 : 1;
    var hp = Math.round(c.hp * (c.noMul ? 1 : sec.hpMul * diff));
    var e = { type: type, cfg: c, x: x, y: y, w: c.w, h: c.h, vx: 0, vy: 0, hp: hp, maxHp: hp, face: -1, onGround: !c.fly && !c.isBoss,
      aggro: false, alert: 0, t: rand() * 6, cool: 0.8 + rand(), hit: 0, contactCd: 0, burst: 0, aim: 0, leapCd: 0, hopCd: 0, dead: false,
      dmgMul: sec.dmgMul * (sec.endless ? 1 + G.run.time / 240 : 1), baseY: y, patrolT: rand() * 2, dir: rand() < 0.5 ? -1 : 1,
      pat: 0, droneT: 6 };
    if (c.isBoss) { e.cool = 2; e.y = c.fly === false ? GROUND : 60; e.pat = 0; }
    if (c.init) c.init(e);
    G.enemies.push(e);
    return e;
  }
  G.spawnEnemy = spawnEnemy;

  function pickType(sec) {
    var tot = 0, k;
    for (k in sec.weights) tot += sec.weights[k];
    var r = rand() * tot;
    for (k in sec.weights) { r -= sec.weights[k]; if (r <= 0) return k; }
    return "drone";
  }

  function updateSpawner(dt) {
    var sec = G.sec, p = G.p, alive = 0, all = 0, i;
    for (i = 0; i < G.enemies.length; i++) {
      var e = G.enemies[i];
      if (e.cfg.isBoss) continue;
      all++;
      if (!e.cfg.fixed) alive++;
    }
    if (sec.boss && !G.bossSpawned && G.run.kills >= sec.quota && all === 0) {
      G.bossSpawned = true;
      var bt = sec.bossType || "boss", bc = CB.ENEMIES[bt];
      G.boss = spawnEnemy(bt, clamp(p.x + (p.x > G.worldW / 2 ? -240 : 240), 80, G.worldW - 80), bc.fly === false ? GROUND : 60);
      G.banner = { text: "WARNING - " + bc.name, t: 3, boss: true };
      sfx("boss"); addShake(6);
      if (CB.Audio.boss) CB.Audio.boss(true);
      return;
    }
    if (G.bossSpawned) return;
    var maxAlive = sec.endless ? Math.min(11, sec.maxAlive + Math.floor(G.run.time / 40)) : sec.maxAlive;
    var remaining = sec.endless ? 1 : sec.quota - G.run.kills - all;
    G.spawnT -= dt;
    if (G.spawnT <= 0 && alive < maxAlive && remaining > 0) {
      G.spawnT = (sec.endless ? Math.max(0.5, 1.6 - G.run.time / 120) : 1.1) + rand() * 1.1;
      var type = pickType(sec), c = CB.ENEMIES[type];
      if (c.fixed) type = "drone", c = CB.ENEMIES.drone;
      var left = G.camX - 28, right = G.camX + W + 28, x;
      var canL = left > 20, canR = right < G.worldW - 20;
      if (canL && canR) x = rand() < 0.5 ? left : right; else if (canL) x = left; else x = right;
      x = clamp(x, 20, G.worldW - 20);
      if (Math.abs(x - p.x) < 120) x = clamp(p.x + (p.x < G.worldW / 2 ? 1 : -1) * 260, 20, G.worldW - 20);
      spawnEnemy(type, x, c.fly ? 50 + rand() * 90 : GROUND);
    }
  }

  function enemyShot(x, y, ang, speed, dmg, opts) {
    opts = opts || {};
    G.eshots.push({ x: x, y: y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg: dmg, r: opts.r || 2,
      life: opts.life || 3, col: opts.col || "#ff4a8a", big: !!opts.big, g: opts.g || 0, homing: opts.homing || 0, onLand: opts.onLand || null, ground: !!opts.ground });
    if (!opts.quiet) sfx("eshot");
    return G.eshots[G.eshots.length - 1];
  }

  function groundPhysics(e, dt) {
    e.vy += GRAV * dt;
    var prev = e.y;
    e.y += e.vy * dt;
    e.onGround = false;
    if (e.y >= GROUND) { e.y = GROUND; e.vy = 0; e.onGround = true; }
    else if (e.vy >= 0) {
      for (var i = 0; i < G.platforms.length; i++) {
        var pl = G.platforms[i];
        if (prev <= pl.y + 2 && e.y >= pl.y && e.x + e.w / 2 > pl.x && e.x - e.w / 2 < pl.x + pl.w) {
          e.y = pl.y; e.vy = 0; e.onGround = true; break;
        }
      }
    }
    var px0 = e.x;
    e.x += e.vx * dt;
    e.x = clamp(e.x, e.w / 2, G.worldW - e.w / 2);
    if (CB.Hazards) CB.Hazards.blockX(e, px0);
  }

  function overlap(a, b) {
    return Math.abs(a.x - b.x) * 2 < a.w + b.w && (a.y - a.h) < b.y && a.y > (b.y - b.h);
  }

  function updateEnemy(e, dt) {
    if (e.hacked > 0) { updateHacked(e, dt); return; }
    var p = G.p, c = e.cfg, cx = e.x, cy = e.y - e.h / 2;
    e.t += dt; e.hit = Math.max(0, e.hit - dt); e.alert = Math.max(0, e.alert - dt);
    e.contactCd -= dt; e.cool -= dt; e.leapCd -= dt; e.hopCd -= dt;
    var px = p.x, py = p.y - p.h / 2, dx = px - cx, dy = py - cy, dist = Math.hypot(dx, dy);

    // Erkennen: Spieler im Radius oder nach einem Treffer
    if (p.alive) {
      if (!e.aggro && dist < c.detect) { e.aggro = true; e.alert = 0.7; sfx("alert"); }
      else if (e.aggro && dist > c.detect * 2 && !c.isBoss) e.aggro = false;
    } else e.aggro = false;

    var dirToP = sgn(dx);

    switch (e.type) {
      case "walker":
        if (e.aggro) {
          if (Math.abs(dx) > 6) { e.vx = dirToP * c.speed; e.face = dirToP; } else e.vx = 0;
          if (e.onGround && e.hopCd <= 0 && py < e.y - e.h - 20 && Math.abs(dx) < 70) { e.vy = -250; e.hopCd = 1.4; }
        } else {
          e.patrolT -= dt;
          if (e.patrolT <= 0) { e.dir = -e.dir; e.patrolT = 1.5 + rand() * 2; }
          e.vx = e.dir * c.speed * 0.4; e.face = e.dir;
        }
        groundPhysics(e, dt);
        break;
      case "sprinter":
        if (e.aggro) {
          e.face = dirToP;
          if (e.onGround) {
            e.vx = dirToP * c.speed;
            if (e.leapCd <= 0 && Math.abs(dx) < 120 && Math.abs(dx) > 30) { e.vy = -190; e.vx = dirToP * c.speed * 2; e.leapCd = 1.6; }
          }
        } else {
          e.patrolT -= dt;
          if (e.patrolT <= 0) { e.dir = -e.dir; e.patrolT = 1.5 + rand() * 2; }
          e.vx = e.dir * c.speed * 0.35; e.face = e.dir;
        }
        groundPhysics(e, dt);
        break;
      case "tank":
        if (e.aggro) {
          e.face = dirToP;
          e.vx = Math.abs(dx) > 150 ? dirToP * c.speed : 0;
          if (e.cool <= 0 && dist < c.detect) {
            e.cool = 1 / c.rate + rand() * 0.6;
            var a = Math.atan2(py - (e.y - e.h + 4), px - (e.x + e.face * 14));
            enemyShot(e.x + e.face * 14, e.y - e.h + 4, a, 125, c.dmg * e.dmgMul, { r: 4, big: true, col: "#ff7a3d", life: 4 });
          }
        } else {
          e.patrolT -= dt;
          if (e.patrolT <= 0) { e.dir = -e.dir; e.patrolT = 2 + rand() * 2; }
          e.vx = e.dir * c.speed * 0.4; e.face = e.dir;
        }
        groundPhysics(e, dt);
        break;
      case "turret":
        e.vx = 0; e.vy = 0;
        if (e.aggro) {
          var want = Math.atan2(py - (e.y - 8), px - e.x);
          var diff = Math.atan2(Math.sin(want - e.aim), Math.cos(want - e.aim));
          e.aim += clamp(diff, -3 * dt, 3 * dt);
          e.face = Math.cos(e.aim) >= 0 ? 1 : -1;
          if (e.burst > 0) {
            e.burstT -= dt;
            if (e.burstT <= 0) {
              e.burst--; e.burstT = 0.14;
              enemyShot(e.x + Math.cos(e.aim) * 9, e.y - 8 + Math.sin(e.aim) * 9, e.aim, 150, c.dmg * e.dmgMul, { col: "#ff4a8a" });
            }
          } else if (e.cool <= 0 && dist < c.detect) { e.burst = 3; e.burstT = 0; e.cool = 1 / c.rate + 0.3; }
        } else e.aim += (e.face > 0 ? -1 : 1) * 0.0;
        break;
      case "drone":
        e.vy = 0;
        if (e.aggro) {
          var tx = px + Math.sin(e.t * 1.2) * 70, ty = py - 62 + Math.cos(e.t * 1.7) * 14;
          e.vx += clamp(tx - e.x, -120, 120) * 2 * dt; e.vx = clamp(e.vx, -c.speed, c.speed);
          e.y += clamp(ty - e.y, -50, 50) * 2.2 * dt;
          e.face = dirToP;
          if (e.cool <= 0 && dist < 200) {
            e.cool = 1 / c.rate + rand() * 0.5;
            enemyShot(e.x, e.y, Math.atan2(py - e.y, px - e.x), 140, c.dmg * e.dmgMul);
          }
        } else {
          e.vx += e.dir * 20 * dt; e.vx = clamp(e.vx, -22, 22);
          e.y = e.baseY + Math.sin(e.t * 2) * 6;
          e.patrolT -= dt; if (e.patrolT <= 0) { e.dir = -e.dir; e.patrolT = 2 + rand() * 2; }
          e.face = e.dir;
        }
        e.x = clamp(e.x + e.vx * dt, e.w / 2, G.worldW - e.w / 2);
        e.y = clamp(e.y, 20, GROUND - 24);
        break;
      case "boss":
        updateBoss(e, dt, px, py, dx);
        break;
      default:
        if (c.ai) c.ai(e, dt, px, py, dx, dist);
    }

    // Kontaktschaden
    if (c.contact > 0 && e.contactCd <= 0 && p.alive && overlap(e, p)) {
      e.contactCd = 0.9;
      hurtPlayer(c.contact * e.dmgMul, e.x);
    }
  }

  function updateBoss(e, dt, px, py, dx) {
    var c = e.cfg, phase = e.hp < e.maxHp * 0.5 ? 2 : 1;
    e.aggro = true; e.phase = phase;
    var tx = clamp(px + Math.sin(e.t * 0.55) * 150, 60, G.worldW - 60), ty = 78 + Math.sin(e.t * 1.1) * 16;
    var sp = c.speed * (phase === 2 ? 1.9 : 1.3);
    e.vx = clamp((tx - e.x) * 1.4, -sp, sp);
    e.x = clamp(e.x + e.vx * dt, 40, G.worldW - 40);
    e.y += clamp((ty - e.y) * 2, -60, 60) * dt;
    e.face = sgn(dx);
    if (e.burst > 0) {
      e.burstT -= dt;
      if (e.burstT <= 0) {
        e.burst--; e.burstT = 0.11;
        enemyShot(e.x, e.y - 12, Math.atan2(py - (e.y - 12), px - e.x), 190, c.dmg * e.dmgMul, { col: "#ffe14a", r: 2.5 });
      }
    }
    if (e.cool <= 0) {
      var k = e.pat++ % 3, base = Math.atan2(py - (e.y - 12), px - e.x), i;
      if (k === 0) {
        var n = phase === 2 ? 7 : 5;
        for (i = 0; i < n; i++) enemyShot(e.x, e.y - 12, base + (i - (n - 1) / 2) * 0.24, 130, c.dmg * e.dmgMul);
      } else if (k === 1) {
        var m = phase === 2 ? 20 : 14, off = e.t;
        for (i = 0; i < m; i++) enemyShot(e.x, e.y - 12, off + i / m * 6.283, 95, c.dmg * e.dmgMul * 0.9, { col: "#35f0ff", r: 2 });
      } else { e.burst = phase === 2 ? 5 : 3; e.burstT = 0; }
      e.cool = phase === 2 ? 1.15 : 1.7;
      addShake(1.5);
    }
    if (phase === 2) {
      e.droneT -= dt;
      var drones = 0;
      for (var j = 0; j < G.enemies.length; j++) if (G.enemies[j].type === "drone") drones++;
      if (e.droneT <= 0 && drones < 3) {
        e.droneT = 7;
        for (var q = 0; q < 2; q++) { var d = spawnEnemy("drone", e.x + (q ? 30 : -30), e.y); d.aggro = true; d.alert = 0.5; }
        text(e.x, e.y - 30, "REINFORCEMENTS!", "#ff2bd6");
      }
    }
  }

  // ---------- Schaden ----------
  function hurtEnemy(e, dmg, knockDir, src) {
    if (e.dead) return;
    var c0 = e.cfg;
    if (c0.shield && src !== "area" && knockDir && !e.turning) {
      if ((knockDir > 0 ? 1 : -1) === -e.face) {          // Schuss trifft den Schild von vorne
        dmg *= c0.shieldMul || 0.2;
        text(e.x, e.y - e.h - 2, "BLOCK", "#8fe6ff");
        burst(e.x + e.face * (e.w / 2 + 2), e.y - e.h / 2, 3, ["#8fe6ff", "#ffffff"], 60, 0.2, 0, 1);
        sfx("block");
      }
    }
    if (c0.onHurt) dmg = c0.onHurt(e, dmg, knockDir, src);
    if (dmg <= 0) return;
    var crit = rand() < 0.08;
    if (crit) dmg *= 2;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg; e.hit = 0.12; e.aggro = true;
    text(e.x + (rand() - 0.5) * 8, e.y - e.h - 2, dmg, crit ? "#ffe14a" : "#ffffff", crit);
    burst(e.x, e.y - e.h / 2, 3, ["#ffffff", "#ffe14a", "#ff9ccc"], 70, 0.25, 0, 1);
    if (knockDir && !e.cfg.fixed && !e.cfg.isBoss && !e.cfg.heavy) { e.vx += knockDir * 40; if (e.type === "drone") e.x += knockDir * 2; }
    sfx("hit");
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    e.dead = true;
    var c = e.cfg, sec = G.sec, cx = e.x, cy = e.y - e.h / 2;
    var big = c.isBoss || e.type === "tank" || !!c.big;
    if (c.onDeath) c.onDeath(e);
    burst(cx, cy, big ? 50 : 18, ["#ffffff", "#ffe14a", "#ff8a1f", "#ff2b8a"], big ? 140 : 100, 0.6, 60, big ? 2 : 1);
    ring(cx, cy, big ? 46 : 22, "#ffb23f", 0.35);
    sfx(big ? "bigboom" : "explode");
    addShake(big ? 6 : 2);
    if (big) rumble(0.6, 0.8, 300);
    var mul = sec.endless ? 1 + G.run.time / 150 : 1 + (sec.id - 1) * 0.25;
    if (c.noCredit || e.noReward) mul = 0;
    var cr = Math.round(c.credits * mul);
    G.run.credits += cr; CB.Save.data.credits += cr;
    G.run.kills++; G.run.score += c.credits * 10;
    text(cx, e.y - e.h - 8, "+" + cr, "#ffd23f");
    var dropRate = c.isBoss ? 1 : big ? 0.5 : (sec.drop || 0.12);
    if (!c.noDrop && !e.noReward && rand() < dropRate) G.pickups.push({ x: cx, y: cy, vy: -60, t: 0, life: 14, kind: sec.pickup || "heal" });
    if (c.isBoss) {
      if (CB.Audio.boss) CB.Audio.boss(false);
      G.flash = 1; addShake(10);
      for (var i = 0; i < 6; i++) burst(cx + (rand() - 0.5) * 40, cy + (rand() - 0.5) * 30, 18, ["#ffffff", "#ffb23f", "#ff2b8a", "#35f0ff"], 160, 0.9, 40, 2);
      G.eshots.length = 0;
    }
    save_soon();
  }
  function save_soon() { G.saveT = G.saveT > 0 ? G.saveT : 2.5; }

  function hurtPlayer(dmg, fromX) {
    var p = G.p;
    if (!p.alive || p.inv > 0) return;
    if (p.shield > 0) dmg *= 0.15;
    dmg = Math.max(1, Math.round(dmg));
    p.hp -= dmg;
    p.inv = p.shield > 0 ? 0.25 : 0.6; p.hurt = 0.2;
    p.vx += sgn(p.x - fromX) * 90;
    text(p.x, p.y - p.h - 4, "-" + dmg, "#ff4a6e", true);
    burst(p.x, p.y - p.h / 2, 8, ["#ff4a6e", "#ffffff"], 90, 0.35, 40, 1);
    addShake(4); sfx("hurt"); rumble(0.7, 0.5, 200);
    if (p.hp <= 0) {
      p.hp = 0; p.alive = false;
      burst(p.x, p.y - p.h / 2, 60, ["#ffffff", p.alive ? "#fff" : G.stats.robot.color.b, G.stats.robot.color.l, "#ffb23f"], 150, 0.9, 80, 2);
      ring(p.x, p.y - p.h / 2, 60, "#ffffff", 0.5);
      sfx("bigboom"); addShake(9); rumble(1, 1, 600);
      G.state = "dying"; G.endT = 1.6;
    }
  }

  function explosion(x, y, r, dmg) {
    burst(x, y, 26, ["#ffffff", "#ffe14a", "#ff8a1f", "#ff4a1f"], 130, 0.5, 50, 2);
    ring(x, y, r, "#ffb23f", 0.3);
    sfx("explode"); addShake(2.5); rumble(0.3, 0.6, 140);
    for (var i = 0; i < G.enemies.length; i++) {
      var e = G.enemies[i];
      if (e.dead) continue;
      var d = Math.hypot(e.x - x, (e.y - e.h / 2) - y) - Math.max(e.w, e.h) / 2;
      if (d < r) hurtEnemy(e, dmg * (1 - 0.6 * clamp(d / r, 0, 1)), sgn(e.x - x), "area");
    }
  }

  // ---------- Waffen ----------
  function playerShot(x, y, ang, s, w, dmg, extra) {
    var sh = { x: x, y: y, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed, dmg: dmg, type: w.type === "double" ? "bolt" : w.type,
      life: s.range / w.speed, r: 3, col: w.color, hits: null, ang: ang };
    if (sh.type === "plasma") { sh.r = 5; sh.hits = []; }
    if (sh.type === "rocket") sh.r = 3;
    if (extra) for (var k in extra) sh[k] = extra[k];
    G.shots.push(sh);
    return sh;
  }

  function jag(a, b) {
    var pts = [a], n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 9));
    var nx = -(b.y - a.y), ny = (b.x - a.x), l = Math.hypot(nx, ny) || 1;
    nx /= l; ny /= l;
    for (var i = 1; i < n; i++) {
      var t = i / n, o = (rand() - 0.5) * 8;
      pts.push({ x: a.x + (b.x - a.x) * t + nx * o, y: a.y + (b.y - a.y) * t + ny * o });
    }
    pts.push(b);
    return pts;
  }

  function fireArc(ox, oy, ang, dmg, range, col) {
    var dx = Math.cos(ang), dy = Math.sin(ang), cand = [], i;
    for (i = 0; i < G.enemies.length; i++) {
      var e = G.enemies[i];
      if (e.dead) continue;
      var ex = e.x - ox, ey = (e.y - e.h / 2) - oy;
      var along = ex * dx + ey * dy;
      if (along < 0 || along > range + e.w / 2) continue;
      var perp = Math.abs(ex * dy - ey * dx);
      if (perp <= e.h / 2 + e.w * 0.2 + 7) cand.push({ e: e, along: along });
    }
    cand.sort(function (a, b) { return a.along - b.along; });
    var start = { x: ox, y: oy }, segs = [];
    if (!cand.length) {
      segs = segs.concat(jag(start, { x: ox + dx * range * 0.8, y: oy + dy * range * 0.8 }));
      G.beams.push({ pts: segs, life: 0.1, max: 0.1, col: col });
      return;
    }
    var cur = cand[0].e, used = [cur];
    var path = [start, { x: cur.x, y: cur.y - cur.h / 2 }];
    hurtEnemy(cur, dmg, dx);
    for (var n = 0; n < 2; n++) {
      var best = null, bd = 80;
      for (i = 0; i < G.enemies.length; i++) {
        var o = G.enemies[i];
        if (o.dead || used.indexOf(o) >= 0) continue;
        var dd = Math.hypot(o.x - cur.x, o.y - cur.y);
        if (dd < bd) { bd = dd; best = o; }
      }
      if (!best) break;
      used.push(best);
      path.push({ x: best.x, y: best.y - best.h / 2 });
      hurtEnemy(best, dmg * 0.6, 0);
      cur = best;
    }
    var all = [];
    for (i = 0; i < path.length - 1; i++) all = all.concat(jag(path[i], path[i + 1]));
    G.beams.push({ pts: all, life: 0.12, max: 0.12, col: col });
    burst(path[1].x, path[1].y, 6, [col, "#ffffff"], 80, 0.25, 0, 1);
  }

  function fireWeapon() {
    var p = G.p, s = G.stats, w = s.weapon, a = p.aim;
    var ox = p.x, oy = p.y - p.h * 0.55;
    var mx = ox + Math.cos(a) * 12, my = oy + Math.sin(a) * 12;
    var dmg = s.dmg * (p.boost > 0 ? 1.5 : 1) * (p.analysis > 0 ? 1.5 : 1);
    switch (w.type) {
      case "bolt": playerShot(mx, my, a, s, w, dmg); sfx("bolt"); break;
      case "double":
        var px = -Math.sin(a) * 2.6, py = Math.cos(a) * 2.6;
        playerShot(mx + px, my + py, a, s, w, dmg); playerShot(mx - px, my - py, a, s, w, dmg); sfx("double"); break;
      case "arc": fireArc(mx, my, a, dmg, s.range, w.color); sfx("arc"); break;
      case "rocket": playerShot(mx, my, a, s, w, dmg); sfx("rocket"); break;
      case "plasma": playerShot(mx, my, a, s, w, dmg); sfx("plasma"); addShake(1); break;
    }
    p.recoil = w.type === "plasma" ? 4 : w.type === "rocket" ? 3 : 1.5;
    if (w.type === "plasma") rumble(0.5, 0.2, 90); else if (w.type === "rocket") rumble(0.3, 0.2, 70);
    burst(mx, my, 2, [w.color, "#ffffff"], 60, 0.15, 0, 1);
  }

  function nearestEnemy(x, y, maxD) {
    var best = null, bd = maxD;
    for (var i = 0; i < G.enemies.length; i++) {
      var e = G.enemies[i];
      if (e.dead) continue;
      var d = Math.hypot(e.x - x, (e.y - e.h / 2) - y) - Math.min(e.w, e.h) / 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ---------- Spezialfaehigkeiten (je Charakter genau eine, voellig unabhaengig voneinander) ----------
  function useAbility() {
    var p = G.p, s = G.stats, ab = s.robot.ability;
    if (!p.alive || p.abCd > 0) return;
    var cx = p.x, cy = p.y - p.h / 2, col = s.robot.color.b, i;
    switch (ab.id) {
      case "neuron": {                                      // NOVA: gegnerischen Bot fuer 10 s uebernehmen
        var best = null, bd = 300;
        for (i = 0; i < G.enemies.length; i++) {
          var e = G.enemies[i];
          if (e.dead || e.hacked > 0 || e.cfg.isBoss || e.type === "boss" || e === G.boss) continue;
          var d = Math.hypot(e.x - cx, (e.y - e.h / 2) - cy);
          if (d < bd) { bd = d; best = e; }
        }
        if (!best) { text(cx, p.y - p.h - 6, "NO TARGET", "#8fe6ff"); sfx("deny"); return; }   // kein Ziel: Faehigkeit bleibt bereit
        p.abCd = ab.cd; p.hackFx = 0.9;
        best.hacked = ab.dur; best.hackCd = 0.3; best.aggro = false;
        G.beams.push({ pts: [{ x: cx, y: cy }, { x: (cx + best.x) / 2 + 8, y: (cy + best.y - best.h / 2) / 2 - 10 }, { x: best.x, y: best.y - best.h / 2 }], col: col, life: 0.5, max: 0.5 });
        ring(best.x, best.y - best.h / 2, 28, col, 0.5); ring(cx, cy, 20, col, 0.4);
        burst(best.x, best.y - best.h / 2, 26, [col, "#ffffff", "#8fe6ff"], 120, 0.6, -20, 1);
        text(best.x, best.y - best.h - 8, "HACKED", col, true);
        sfx("overcharge"); sfx("alert"); addShake(2);
        return;
      }
      case "drones": {                                      // ROX: 3 Kampf-Drohnen
        p.abCd = ab.cd;
        for (i = 0; i < 3; i++) {
          G.drones.push({ x: cx, y: cy - 6, vx: 0, vy: 0, ang: i / 3 * 6.283, life: ab.dur, hp: 40, cd: 0.3 + i * 0.15, spawn: 0.6, t: 0 });
          burst(cx, cy - 6, 14, [col, "#ffffff", "#ffb0f0"], 110, 0.5, 0, 1);
        }
        ring(cx, cy, 36, col, 0.5); ring(cx, cy, 20, "#ffffff", 0.3);
        text(cx, p.y - p.h - 6, "SWARM x3", col, true); sfx("nova"); addShake(2);
        return;
      }
      case "overload": {                                    // KAI: durchdringender Energieschuss
        p.abCd = ab.cd;
        var ang = p.aim, ox = cx + Math.cos(ang) * 10, oy = cy + Math.sin(ang) * 10, len = 420;
        var ex = ox + Math.cos(ang) * len, ey = oy + Math.sin(ang) * len, dx = ex - ox, dy = ey - oy, l2 = dx * dx + dy * dy, hits = 0;
        for (i = 0; i < G.enemies.length; i++) {
          var en = G.enemies[i];
          if (en.dead) continue;
          var qx = en.x, qy = en.y - en.h / 2, tt = clamp(((qx - ox) * dx + (qy - oy) * dy) / l2, 0, 1);
          if (Math.hypot(qx - (ox + dx * tt), qy - (oy + dy * tt)) < Math.max(en.w, en.h) / 2 + 7) {
            hurtEnemy(en, s.abilityDmg * 3.2, sgn(dx) || 1, "area"); hits++;
            ring(qx, qy, 26, "#ff3b3b", 0.35); burst(qx, qy, 18, ["#ff3b3b", "#ffb23f", "#ffffff"], 150, 0.5, 40, 2);
          }
        }
        for (var j = G.eshots.length - 1; j >= 0; j--) {      // Gegnerschuesse auf der Linie loeschen
          var sh = G.eshots[j], t2 = clamp(((sh.x - ox) * dx + (sh.y - oy) * dy) / l2, 0, 1);
          if (Math.hypot(sh.x - (ox + dx * t2), sh.y - (oy + dy * t2)) < 10) G.eshots.splice(j, 1);
        }
        G.beams.push({ pts: [{ x: ox, y: oy }, { x: ex, y: ey }], col: "#ff3b3b", life: 0.45, max: 0.45 });
        G.beams.push({ pts: [{ x: ox, y: oy + 1 }, { x: ex, y: ey + 1 }], col: "#ffb23f", life: 0.3, max: 0.3 });
        for (var k = 0; k < 22; k++) { var f = k / 22; burst(ox + dx * f, oy + dy * f, 2, ["#ff3b3b", "#ffe14a", "#ffffff"], 60, 0.4, 0, 2); }
        ring(ox, oy, 24, "#ffffff", 0.25); ring(ex, ey, 34, "#ff3b3b", 0.4); burst(ex, ey, 24, ["#ff3b3b", "#ffb23f"], 140, 0.5, 40, 2);
        p.vx -= Math.cos(ang) * 120; G.flash = 0.35; addShake(9); rumble(1, 1, 300); sfx("bigboom");
        if (hits) text(cx, p.y - p.h - 6, "x" + hits, "#ffe14a", true);
        return;
      }
      case "analyse":                                       // DR. LIRA: +50 % Schaden fuer 15 s
        p.abCd = ab.cd; p.analysis = ab.dur;
        ring(cx, cy, 44, col, 0.6); ring(cx, cy, 26, "#ffffff", 0.35);
        for (i = 0; i < 18; i++) { var aa = i / 18 * 6.283; G.parts.push({ x: cx + Math.cos(aa) * 20, y: cy + Math.sin(aa) * 20, vx: Math.cos(aa) * 40, vy: Math.sin(aa) * 40 - 20, life: 0.7, max: 0.7, col: i % 2 ? col : "#d8c4ff", size: 2, grav: 0 }); }
        text(cx, p.y - p.h - 6, "DMG +50%", col, true); sfx("shield"); sfx("ready");
        return;
      case "repair":                                        // ZANE: Reparaturfeld, heilt den eigenen Bot
        p.abCd = ab.cd; p.repair = ab.dur;
        ring(cx, p.y - 2, 40, col, 0.6); ring(cx, p.y - 2, 24, "#ffffff", 0.4);
        burst(cx, cy, 20, [col, "#ffffff", "#d8ffd8"], 90, 0.7, -30, 2);
        text(cx, p.y - p.h - 6, "REPAIR", col, true); sfx("shield");
        return;
    }
  }

  // Drohnen von Rox: fliegen selbststaendig, greifen Gegner an, fangen gegnerische Schuesse ab
  function updateDrones(dt) {
    var p = G.p, s = G.stats, i, j;
    for (i = G.drones.length - 1; i >= 0; i--) {
      var d = G.drones[i];
      d.t += dt; d.life -= dt; d.spawn = Math.max(0, d.spawn - dt); d.cd -= dt; d.ang += dt * 2.2;
      var tgt = null, bd = 300;
      for (j = 0; j < G.enemies.length; j++) {
        var e = G.enemies[j];
        if (e.dead || e.hacked > 0) continue;
        var dd = Math.hypot(e.x - p.x, (e.y - e.h / 2) - (p.y - p.h / 2));
        if (dd < bd) { bd = dd; tgt = e; }
      }
      var hx, hy;
      if (tgt) { hx = tgt.x + Math.cos(d.ang) * 46; hy = tgt.y - tgt.h / 2 - 22 + Math.sin(d.ang * 1.7) * 8; }
      else { hx = p.x + Math.cos(d.ang) * 28; hy = p.y - p.h - 8 + Math.sin(d.ang) * 8; }
      d.vx += (hx - d.x) * 6 * dt; d.vy += (hy - d.y) * 6 * dt; d.vx *= 0.9; d.vy *= 0.9;
      d.x += d.vx * dt * 5; d.y += d.vy * dt * 5;
      if (tgt && d.cd <= 0 && Math.abs(tgt.x - d.x) < 220) {
        var a = Math.atan2((tgt.y - tgt.h / 2) - d.y, tgt.x - d.x);
        G.shots.push({ x: d.x, y: d.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, dmg: s.abilityDmg * 0.3, type: "bolt", life: 0.9, r: 2, col: "#ff2bd6", hits: null, ang: a });
        d.cd = 0.5; sfx("eshot");
      }
      for (j = G.eshots.length - 1; j >= 0; j--) {          // abfangen
        var sh = G.eshots[j];
        if (Math.hypot(sh.x - d.x, sh.y - d.y) < 8) { d.hp -= (sh.dmg || 10) * 0.5; G.eshots.splice(j, 1); burst(d.x, d.y, 6, ["#ff2bd6", "#ffffff"], 70, 0.25, 0, 1); }
      }
      if (G.t % 0.2 < dt) burst(d.x, d.y + 2, 1, ["#ff2bd6"], 14, 0.3, 0, 1);
      if (d.life <= 0 || d.hp <= 0) { burst(d.x, d.y, 16, ["#ff2bd6", "#ffffff", "#ffb23f"], 110, 0.5, 40, 1); ring(d.x, d.y, 16, "#ff2bd6", 0.3); sfx("hit"); G.drones.splice(i, 1); }
    }
  }

  // Gehackter Gegner (Nova): kaempft fuer den Spieler gegen die uebrigen Gegner
  function updateHacked(e, dt) {
    var p = G.p, c = e.cfg, i, o, tgt = null, bd = 420;
    e.t += dt; e.hit = Math.max(0, e.hit - dt); e.hacked -= dt; e.hackCd -= dt; e.contactCd = 1;
    for (i = 0; i < G.enemies.length; i++) {
      o = G.enemies[i];
      if (o === e || o.dead || o.hacked > 0) continue;
      var d = Math.hypot(o.x - e.x, (o.y - o.h / 2) - (e.y - e.h / 2));
      if (d < bd) { bd = d; tgt = o; }
    }
    var gx = tgt ? tgt.x : p.x, dir = sgn(gx - e.x) || 1, reach = tgt ? (e.w + tgt.w) / 2 + 10 : 70;
    if (!c.fixed) {
      var stop = tgt ? Math.abs(gx - e.x) < reach : Math.abs(gx - e.x) < 70;
      if (c.fly) {
        var wantY = tgt ? tgt.y - tgt.h / 2 : p.y - p.h - 14;
        e.vx = stop ? 0 : dir * c.speed * 1.1; e.vy = clamp((wantY - e.y) * 3, -90, 90);
        e.x += e.vx * dt; e.y = Math.min(e.y + e.vy * dt, GROUND); e.face = dir;
      } else { e.vx = stop ? 0 : dir * c.speed * 1.1; e.face = dir; groundPhysics(e, dt); }
    }
    if (tgt && e.hackCd <= 0 && bd < (c.fixed ? 260 : reach + 90)) {
      e.hackCd = 0.55;
      hurtEnemy(tgt, Math.max(22, c.dmg * e.dmgMul * 2.2), dir, "area");
      G.beams.push({ pts: [{ x: e.x, y: e.y - e.h / 2 }, { x: tgt.x, y: tgt.y - tgt.h / 2 }], col: G.stats.robot.color.b, life: 0.18, max: 0.18 });
      burst(tgt.x, tgt.y - tgt.h / 2, 5, [G.stats.robot.color.b, "#ffffff"], 80, 0.25, 0, 1);
    }
    if (G.t % 0.15 < dt) G.parts.push({ x: e.x + (rand() - 0.5) * e.w, y: e.y - e.h * rand(), vx: 0, vy: -30, life: 0.5, max: 0.5, col: rand() < 0.5 ? "#35f0ff" : "#ffffff", size: 1, grav: 0 });
    if (e.hacked <= 0) { e.hacked = 0; e.aggro = true; ring(e.x, e.y - e.h / 2, 22, "#ff3b3b", 0.35); text(e.x, e.y - e.h - 6, "LINK LOST", "#ff6b6b"); }
  }

  // ---------- Spieler ----------
  function updatePlayer(dt) {
    var p = G.p, I = CB.Input, s = G.stats, set = settings();
    p.inv -= dt; p.hurt -= dt; p.abCd -= dt; p.fireT -= dt; p.recoil = Math.max(0, p.recoil - 22 * dt);
    p.over = Math.max(0, p.over - dt); p.shield = Math.max(0, p.shield - dt); p.analysis = Math.max(0, p.analysis - dt); p.hackFx = Math.max(0, p.hackFx - dt); p.dropT -= dt; p.boost = Math.max(0, (p.boost || 0) - dt);

    var dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    if (dir === 0 && I.padMode) dir = I.padMove;          // analoger Stick: 0..1 der Geschwindigkeit

    if (p.repair > 0 && p.alive) {                      // Zane: Reparaturfeld heilt ueber 3 Sekunden ~48 % der Lebenspunkte
      p.repair = Math.max(0, p.repair - dt);
      var heal = p.maxHp * 0.16 * dt; p.hp = Math.min(p.maxHp, p.hp + heal);
      p.hurt = Math.min(p.hurt, 0); p.slow = 0; p.burn = 0;                                     // negative Effekte entfernen
      if (G.t % 0.12 < dt) G.parts.push({ x: p.x + (rand() - 0.5) * 22, y: p.y - rand() * p.h, vx: 0, vy: -36, life: 0.6, max: 0.6, col: rand() < 0.5 ? "#6bff8a" : "#ffffff", size: 2, grav: 0 });
      if (G.t % 0.5 < dt) text(p.x, p.y - p.h - 4, "+" + Math.round(p.maxHp * 0.08), "#6bff8a");
    }
    if (I.abilityQueued) { I.abilityQueued = false; useAbility(); }

    if (p.dash > 0) {
      p.dash -= dt; p.vx = p.dashDir * 430; p.vy = Math.min(p.vy, 0) * 0.2;
      burst(p.x, p.y - p.h / 2, 1, [s.robot.color.b, "#ffffff"], 20, 0.25, 0, 2);
    } else {
      var target = dir * s.speed, accel = p.onGround ? 1100 : 600;
      p.vx += clamp(target - p.vx, -accel * dt, accel * dt);
    }

    // Springen (mit kurzem Puffer und Koyote-Zeit)
    if (p.onGround) p.coyote = 0.1; else p.coyote -= dt;
    if (I.jumpBuffer > 0) {
      I.jumpBuffer -= dt;
      if (p.coyote > 0) { p.vy = -s.robot.jump; p.coyote = 0; I.jumpBuffer = 0; p.onGround = false; sfx("jump"); }
    }
    if (!(I.jump || I.padJump) && p.vy < -140) p.vy = -140;
    if ((I.drop || I.padDrop) && p.onGround && p.y < GROUND - 1) { p.dropT = 0.25; p.onGround = false; p.y += 2; }

    // Bewegung
    var ppx = p.x;
    p.x = clamp(p.x + (p.vx + (G.extVx || 0)) * dt, p.w / 2, G.worldW - p.w / 2);
    if (CB.Hazards) CB.Hazards.blockX(p, ppx);
    if (p.dash <= 0) p.vy += GRAV * (G.gravMul || 1) * dt;
    var prev = p.y, wasAir = !p.onGround, fallV = p.vy;
    p.y += p.vy * dt;
    p.onGround = false;
    if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
    else if (p.vy >= 0 && p.dropT <= 0) {
      for (var i = 0; i < G.platforms.length; i++) {
        var pl = G.platforms[i];
        if (prev <= pl.y + 2 && p.y >= pl.y && p.x + p.w / 2 > pl.x && p.x - p.w / 2 < pl.x + pl.w) {
          p.y = pl.y; p.vy = 0; p.onGround = true; break;
        }
      }
    }
    if (p.onGround && wasAir && fallV > 220) { sfx("land"); burst(p.x, p.y, 4, ["#b9a8ff", "#ffffff"], 40, 0.25, 0, 1); }
    p.anim += Math.abs(p.vx) * dt * 0.09;

    // Zielen und Schiessen
    var pivX = p.x, pivY = p.y - p.h * 0.55, want = false, ax = null, ay = null;
    var padOn = I.padMode, stickAim = padOn && I.padAim.mag > 0.35;
    var hasPointer = !padOn && I.pointerAim && I.mouse.active;
    var mxw = I.mouse.x + G.camX, myw = I.mouse.y;
    var rng = s.range + 8, fireHeld = I.fire || I.padFire;
    if (fireHeld) {
      want = true;
      if (stickAim) { ax = pivX + I.padAim.x * 100; ay = pivY + I.padAim.y * 100; }
      else if (hasPointer) { ax = mxw; ay = myw; }
      else {
        var tgt = nearestEnemy(pivX, pivY, rng);
        if (tgt) { ax = tgt.x; ay = tgt.y - tgt.h / 2; }
      }
    } else if (set.autoFire) {
      var t2 = nearestEnemy(pivX, pivY, rng);
      if (t2) {
        want = true;
        if (stickAim) { ax = pivX + I.padAim.x * 100; ay = pivY + I.padAim.y * 100; }   // Stick hat Vorrang beim Zielen
        else { ax = t2.x; ay = t2.y - t2.h / 2; }
      }
    }
    if (ax === null) {
      if (stickAim) { ax = pivX + I.padAim.x * 100; ay = pivY + I.padAim.y * 100; }
      else if (hasPointer && !I.touchMode) { ax = mxw; ay = myw; }
      else { ax = pivX + (dir ? sgn(dir) : p.face) * 50; ay = pivY; }
    }
    p.aim = Math.atan2(ay - pivY, ax - pivX);
    if (Math.abs(ax - pivX) > 3) p.face = sgn(ax - pivX);
    else if (dir) p.face = sgn(dir);

    if (want && p.fireT <= 0) {
      var rate = s.rate * (p.over > 0 ? 1.8 : 1);
      p.fireT = 1 / rate;
      fireWeapon();
    }
  }

  // ---------- Projektile ----------
  function hitsRect(sx, sy, r, e) {
    var l = e.x - e.w / 2, rr = e.x + e.w / 2, t = e.y - e.h, b = e.y;
    var nx = clamp(sx, l, rr), ny = clamp(sy, t, b);
    return (sx - nx) * (sx - nx) + (sy - ny) * (sy - ny) <= r * r;
  }

  function updateShots(dt) {
    var i, j;
    for (i = G.shots.length - 1; i >= 0; i--) {
      var s = G.shots[i], dead = false;
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.type === "rocket" && rand() < 0.9) burst(s.x - s.vx * 0.01, s.y, 1, ["#ffb23f", "#ff8a1f", "#9a8aa8"], 18, 0.35, 0, 1);
      if (s.type === "plasma" && rand() < 0.6) burst(s.x, s.y, 1, ["#ff2bd6", "#ffffff"], 20, 0.25, 0, 1);
      for (j = 0; j < G.enemies.length && !dead; j++) {
        var e = G.enemies[j];
        if (e.dead) continue;
        if (s.hits && s.hits.indexOf(e) >= 0) continue;
        if (hitsRect(s.x, s.y, s.r, e)) {
          if (s.type === "rocket") { explosion(s.x, s.y, 38, s.dmg); dead = true; }
          else if (s.type === "plasma") { s.hits.push(e); hurtEnemy(e, s.dmg, sgn(s.vx)); burst(s.x, s.y, 8, ["#ff2bd6", "#ffffff"], 90, 0.3, 0, 1); addShake(1.5); }
          else { hurtEnemy(e, s.dmg, sgn(s.vx)); dead = true; }
        }
      }
      if (!dead && CB.Hazards && CB.Hazards.shotHit(s)) {
        if (s.type === "rocket") explosion(s.x, s.y, 38, s.dmg); else burst(s.x, s.y, 3, [s.col, "#ffffff"], 50, 0.2, 0, 1);
        dead = true;
      }
      if (!dead && (s.life <= 0 || s.y > GROUND + 1 || s.x < -10 || s.x > G.worldW + 10 || s.y < -30)) {
        if (s.type === "rocket") explosion(s.x, Math.min(s.y, GROUND), 38, s.dmg);
        else burst(s.x, Math.min(s.y, GROUND), 3, [s.col, "#ffffff"], 50, 0.2, 0, 1);
        dead = true;
      }
      if (dead) G.shots.splice(i, 1);
    }

    var p = G.p;
    for (i = G.eshots.length - 1; i >= 0; i--) {
      var b = G.eshots[i];
      if (b.homing > 0 && p.alive) {
        var ha = Math.atan2(b.vx, -b.vy) , want = Math.atan2(p.x - b.x, -((p.y - p.h / 2) - b.y));
        var dA = Math.atan2(Math.sin(want - ha), Math.cos(want - ha)), sp = Math.hypot(b.vx, b.vy);
        ha += clamp(dA, -b.homing * dt, b.homing * dt);
        b.vx = Math.sin(ha) * sp; b.vy = -Math.cos(ha) * sp;
      }
      if (b.g) b.vy += b.g * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.g && b.y >= GROUND) { if (b.onLand) b.onLand(b); b.life = 0; }
      var hit = p.alive && hitsRect(b.x, b.y, b.r, { x: p.x, y: p.y, w: p.w, h: p.h });
      if (hit) { hurtPlayer(b.dmg, b.x); burst(b.x, b.y, 5, [b.col, "#ffffff"], 60, 0.2, 0, 1); if (b.onLand && b.g) b.onLand(b); }
      else if (CB.Hazards && CB.Hazards.eshotHit(b)) { burst(b.x, b.y, 4, [b.col, "#ffffff"], 50, 0.2, 0, 1); b.life = 0; }
      if (hit || b.life <= 0 || b.y > GROUND + 2 || b.x < -10 || b.x > G.worldW + 10 || b.y < -30) {
        if (!hit && b.y > GROUND) burst(b.x, GROUND, 3, [b.col], 40, 0.2, 0, 1);
        G.eshots.splice(i, 1);
      }
    }
  }

  function updateEffects(dt) {
    var i;
    for (i = G.parts.length - 1; i >= 0; i--) {
      var q = G.parts[i];
      q.life -= dt;
      if (q.life <= 0) { G.parts.splice(i, 1); continue; }
      q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    }
    for (i = G.rings.length - 1; i >= 0; i--) {
      var r = G.rings[i];
      r.t -= dt; r.r = r.max * (1 - r.t / r.life);
      if (r.t <= 0) G.rings.splice(i, 1);
    }
    for (i = G.texts.length - 1; i >= 0; i--) {
      var tx = G.texts[i];
      tx.life -= dt; tx.y += tx.vy * dt; tx.vy *= 0.94;
      if (tx.life <= 0) G.texts.splice(i, 1);
    }
    for (i = G.beams.length - 1; i >= 0; i--) {
      G.beams[i].life -= dt;
      if (G.beams[i].life <= 0) G.beams.splice(i, 1);
    }
    for (i = G.pickups.length - 1; i >= 0; i--) {
      var k = G.pickups[i];
      k.t += dt; k.life -= dt;
      k.vy += GRAV * 0.6 * dt; var prev = k.y; k.y += k.vy * dt;
      if (k.y >= GROUND - 5) { k.y = GROUND - 5; k.vy = 0; }
      else if (k.vy >= 0) {
        for (var j = 0; j < G.platforms.length; j++) {
          var pl = G.platforms[j];
          if (prev <= pl.y - 5 + 2 && k.y >= pl.y - 5 && k.x > pl.x && k.x < pl.x + pl.w) { k.y = pl.y - 5; k.vy = 0; break; }
        }
      }
      var p = G.p;
      if (p.alive && Math.abs(k.x - p.x) < p.w / 2 + 6 && Math.abs((k.y) - (p.y - p.h / 2)) < p.h / 2 + 8) {
        var pk = (CB.PICKUPS && CB.PICKUPS[k.kind]) || { heal: 0.25 };
        var heal = Math.round(p.maxHp * pk.heal);
        p.hp = Math.min(p.maxHp, p.hp + heal);
        if (pk.shield) p.shield = Math.max(p.shield, pk.shield);
        if (pk.over) p.over = Math.max(p.over, pk.over);
        if (pk.boost) p.boost = Math.max(p.boost, pk.boost);
        if (pk.inv) p.inv = Math.max(p.inv, pk.inv);
        if (pk.msg) text(p.x, p.y - p.h - 16, pk.msg, pk.col, false);
        text(p.x, p.y - p.h - 6, "+" + heal, "#6bffcf", true);
        burst(k.x, k.y, 10, ["#6bffcf", "#ffffff"], 70, 0.4, -20, 1);
        sfx("pickup");
        G.pickups.splice(i, 1);
      } else if (k.life <= 0) G.pickups.splice(i, 1);
    }
    G.shake = Math.max(0, G.shake - dt * 22);
    G.flash = Math.max(0, G.flash - dt * 1.6);
    if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  }

  // ---------- Hauptupdate ----------
  G.update = function (dt) {
    G.t += dt;
    if (G.state === "menu" || G.state === "paused" || G.state === "result") return;

    G.run.time += (G.state === "playing" ? dt : 0);
    var i;
    if (G.state === "playing") {
      updatePlayer(dt);
      updateSpawner(dt);
    }
    if (CB.Hazards) CB.Hazards.update(dt, G.state === "playing");
    for (i = G.enemies.length - 1; i >= 0; i--) {
      var e = G.enemies[i];
      if (e.dead) { G.enemies.splice(i, 1); continue; }
      if (G.state === "playing" || G.state === "won") updateEnemy(e, dt);
    }
    updateDrones(dt);
    updateShots(dt);
    updateEffects(dt);

    // Kamera folgt dem Spieler
    var p = G.p, target = clamp(p.x - W / 2 + p.face * 24, 0, G.worldW - W);
    G.camX += (target - G.camX) * Math.min(1, dt * 6);

    if (G.saveT > 0) { G.saveT -= dt; if (G.saveT <= 0) save(); }

    if (G.state === "playing") {
      var sec = G.sec;
      var done = sec.boss ? (G.bossSpawned && G.enemies.every(function (en) { return !en.cfg.isBoss || en.dead; }) && G.boss && G.boss.dead)
                          : (!sec.endless && G.run.kills >= sec.quota);
      if (done) {
        G.state = "won"; G.endT = 2.2;
        G.eshots.length = 0;
        G.banner = { text: "SECTOR CLEARED!", t: 2.2, good: true };
        for (i = 0; i < G.enemies.length; i++) {
          var en = G.enemies[i];
          if (!en.dead) { en.dead = true; burst(en.x, en.y - en.h / 2, 12, ["#ffffff", "#ff8a1f"], 90, 0.5, 40, 1); }
        }
      }
    } else if (G.state === "won" || G.state === "dying") {
      G.endT -= dt;
      if (G.state === "dying" && rand() < 0.3) burst(G.p.x + (rand() - 0.5) * 10, G.p.y - rand() * G.p.h, 3, ["#ffb23f", "#ffffff"], 60, 0.4, 40, 1);
      if (G.endT <= 0) { finish(G.state === "won"); }
    }
  };

  G.api = { groundPhysics: groundPhysics, enemyShot: enemyShot, spawnEnemy: spawnEnemy, hurtPlayer: hurtPlayer, hurtEnemy: hurtEnemy,
    killEnemy: killEnemy, burst: burst, ring: ring, text: text, shake: addShake, sfx: sfx, explosion: explosion, overlap: overlap,
    rumble: rumble, clamp: clamp, sgn: sgn, rand: rand, nearestEnemy: nearestEnemy };
  CB.Game = G;
})(window.CB);

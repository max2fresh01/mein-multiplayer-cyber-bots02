/* CYBER BOTS - ui.js
   Menues (PLAY, ROBOTS, WEAPONS, UPGRADES, SETTINGS), Pause, Ergebnis, HUD und Touch-Anzeige. */
(function (CB) {
  "use strict";

  var Save = CB.Save, G = CB.Game;
  function $(id) { return document.getElementById(id); }

  var SCREENS = ["main", "play", "robots", "weapons", "upgrades", "settings", "online", "pause", "result"];
  var current = "main", selSector = 1, toastTimer = 0, resetArmed = false;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(n) { return Math.floor(n).toLocaleString("en-US"); }

  function toast(msg, kind) {
    var t = $("toast");
    t.textContent = msg; t.className = "show " + (kind || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ""; }, 1800);
  }

  // ---------- Bildschirme ----------
  function show(name) {
    SCREENS.forEach(function (n) { $("scr-" + n).classList.toggle("open", n === name); });
    current = name;
    document.body.classList.toggle("show-result", name === "result");
    document.body.classList.add("screen-open");
    if (name === "main") renderMain();
    else if (name === "play") renderPlay();
    else if (name === "robots") renderRobots();
    else if (name === "weapons") renderWeapons();
    else if (name === "upgrades") renderUpgrades();
    else if (name === "settings") renderSettings();
    else if (name === "online" && CB.Online) CB.Online.render();
    refreshCredits();
    if (CB.Input.padMode) focusDefault();
  }
  function hideAll() {
    SCREENS.forEach(function (n) { $("scr-" + n).classList.remove("open"); });
    current = null;
    clearPadFocus();
    document.body.classList.remove("screen-open");
    document.body.classList.remove("show-result");
  }
  function setMode(mode) {
    document.body.classList.toggle("in-game", mode === "game");
    document.body.classList.toggle("in-menu", mode !== "game");
    $("hud").hidden = mode !== "game";
  }

  function refreshCredits() { $("chipCredits").textContent = fmt(Save.data.credits); }

  function stat(label, frac, text) {
    return '<div class="stat"><span>' + label + '</span><div class="tr"><i style="width:' + Math.round(Math.max(0.04, Math.min(1, frac)) * 100) + '%"></i></div><span>' + text + '</span></div>';
  }

  // ---------- Hauptmenue ----------
  function renderMain() {
    var d = Save.data, owned = Object.keys(d.robots).length;
    $("mainStats").textContent = "CHARACTER " + CB.byId(CB.CHARACTERS, d.selRobot).name + "  |  KILLS " + fmt(d.stats.kills) + "  |  RUNS " + d.stats.runs;
  }

  // ---------- PLAY ----------
  function sectorInfo(s) {
    if (s.info) return s.info;
    if (s.endless) return "Survive endless waves. Enemies get stronger every minute.";
    if (s.boss) return "Destroy " + s.quota + " enemies, then face the NEON WARDEN.";
    return "Destroy " + s.quota + " enemies to clear the sector.";
  }

  function renderPlay() {
    var d = Save.data, list = $("sectorList");
    if (!Save.isUnlocked(selSector)) selSector = 1;
    list.innerHTML = "";
    CB.SECTORS.forEach(function (s) {
      var locked = !Save.isUnlocked(s.id);
      var b = document.createElement("button");
      b.className = "sector" + (locked ? " locked" : "") + (s.id === selSector ? " sel" : "");
      b.setAttribute("data-id", s.id);
      var best = d.progress.best[s.id];
      var right = locked ? "LOCKED" : (d.progress.cleared[s.id] ? '<span class="tag">CLEARED</span><br>' : "") + (d.progress.trophies && d.progress.trophies[s.id] ? "&#9733; " + esc(s.trophy) + "<br>" : "") +
        (s.endless && d.progress.endlessBest ? "BEST " + d.progress.endlessBest + " KILLS<br>" : "") +
        (best ? "HI-SCORE " + fmt(best) : "");
      b.innerHTML = '<span class="num">' + (s.endless ? "&infin;" : s.id) + '</span><span><b>' + esc(s.area) + " - " + esc(s.name) + '</b><small>' +
        (locked ? "Defeat the boss of the previous sector to unlock." : sectorInfo(s)) + '</small></span><span class="best">' + right + "</span>";
      b.onclick = function () {
        if (locked) { CB.Audio.play("deny"); toast("DEFEAT THE PREVIOUS SECTOR FIRST", "bad"); return; }
        selSector = s.id;
        Array.prototype.forEach.call(list.children, function (c) { c.classList.toggle("sel", +c.getAttribute("data-id") === selSector); });
      };
      list.appendChild(b);
    });
    var st = CB.computeStats();
    CB.Sprites.drawTo($("loRobot"), CB.Sprites.robot[st.robot.id].frames[0], 2);
    CB.Sprites.drawTo($("loWeapon"), CB.Sprites.weapon[st.weapon.id], 3);
    $("loRobotName").textContent = st.robot.name;
    $("loRobotAb").textContent = "Q: " + st.robot.ability.name;
    $("loWeaponName").textContent = st.weapon.name;
    $("loWeaponInfo").textContent = st.weapon.desc;
    $("loStats").innerHTML =
      "<div>HEALTH <b>" + st.maxHp + "</b></div><div>SPEED <b>" + Math.round(st.speed) + "</b></div>" +
      "<div>DAMAGE <b>" + st.dmg.toFixed(1) + "</b></div><div>FIRE RATE <b>" + st.rate.toFixed(1) + "/s</b></div>" +
      "<div>RANGE <b>" + Math.round(st.range) + "</b></div><div>DPS <b>" + (st.dmg * st.rate * (st.weapon.type === "double" ? 2 : 1)).toFixed(0) + "</b></div>";
  }

  // ---------- ROBOTS ----------
  // ---------- CHARACTER SELECT ----------
  var viewChar = null, charAnim = null;
  function cdText(r) { return "COOLDOWN: " + r.ability.cd + " SEK."; }
  function renderRobots() {
    var d = Save.data, box = $("charCards"), det = $("charDetail");
    if (!viewChar || !CB.byId(CB.CHARACTERS, viewChar)) viewChar = d.selRobot;
    box.innerHTML = "";
    CB.CHARACTERS.forEach(function (r) {
      var sel = d.selRobot === r.id, view = viewChar === r.id;
      var c = document.createElement("button");
      c.className = "char-card" + (sel ? " sel" : "") + (view ? " view" : "");
      c.style.setProperty("--cc", r.color.b);
      c.setAttribute("aria-pressed", sel ? "true" : "false");
      c.innerHTML = '<span class="cc-badge">' + (sel ? "SELECTED" : "") + '</span>' +
        '<span class="cc-head"><b>' + esc(r.name) + "</b><small>" + esc(r.role) + "</small></span>" +
        '<span class="cc-stage"><canvas class="cc-spr"></canvas></span>' +
        '<span class="cc-ab"><canvas class="cc-ico"></canvas><b>' + esc(r.ability.name) + "</b></span>" +
        '<span class="cc-cd">' + cdText(r) + "</span>";
      CB.Sprites.drawTo(c.querySelector(".cc-spr"), CB.Sprites.robot[r.id].frames[0], 5);
      CB.CHAR_ICONS.draw(c.querySelector(".cc-ico"), r.ability.id, 2);
      c.onclick = function () { CB.Audio.play("click"); viewChar = r.id; renderRobots(); var cc = $("charCards").children[CB.CHARACTERS.indexOf(r)]; if (cc) { cc.classList.add("pop"); } };
      box.appendChild(c);
    });
    var r = CB.byId(CB.CHARACTERS, viewChar), isSel = d.selRobot === r.id;
    det.style.setProperty("--cc", r.color.b);
    det.innerHTML =
      '<div class="cd-stage"><canvas id="cdSpr"></canvas></div>' +
      '<div class="cd-info"><h3 class="cd-name">' + esc(r.name) + "<small>" + esc(r.role) + "</small></h3><p class='cd-desc'>" + esc(r.desc) + "</p>" +
      stat("HP", r.hp / 140, r.hp) + stat("SPD", r.speed / 120, r.speed) + stat("DMG", r.dmg / 1.3, "x" + r.dmg.toFixed(2)) +
      '<div class="cd-ab"><canvas id="cdIco"></canvas><div><b>' + esc(r.ability.name) + "</b><p>" + esc(r.ability.desc) + "</p><span class='cc-cd'>" + cdText(r) + "</span></div></div>" +
      '<div class="cd-btns"></div></div>';
    CB.CHAR_ICONS.draw($("cdIco"), r.ability.id, 4);
    var btns = det.querySelector(".cd-btns"), sb = document.createElement("button");
    if (isSel) { sb.className = "btn big equipped"; sb.textContent = "SELECTED"; sb.disabled = true; }
    else {
      sb.className = "btn big primary"; sb.textContent = "SELECT " + r.name;
      sb.onclick = function () {
        Save.selectRobot(r.id); CB.Audio.play("buy"); CB.Audio.play("ready"); toast(r.name + " SELECTED", "good");
        renderRobots(); var dd = $("charDetail"); dd.classList.remove("confirm"); void dd.offsetWidth; dd.classList.add("confirm");
        var cc = $("charCards").children[CB.CHARACTERS.indexOf(r)]; if (cc) cc.classList.add("confirm");
        if (CB.Input.padMode) focusDefault();
      };
    }
    btns.appendChild(sb);
    var pb = document.createElement("button"); pb.className = "btn big" + (isSel ? " primary" : ""); pb.textContent = "PLAY";
    pb.onclick = function () { CB.Audio.play("click"); show("play"); }; btns.appendChild(pb);
    // Leerlauf-Animation der grossen Darstellung
    if (charAnim) clearInterval(charAnim);
    var fr = 0, cv = $("cdSpr"); CB.Sprites.drawTo(cv, CB.Sprites.robot[r.id].frames[0], 8);
    charAnim = setInterval(function () {
      if (current !== "robots" || !document.body.contains(cv)) { clearInterval(charAnim); charAnim = null; return; }
      fr ^= 1; CB.Sprites.drawTo(cv, CB.Sprites.robot[r.id].frames[0], 8); cv.style.transform = fr ? "translateY(-4px)" : "translateY(0)";
    }, 450);
  }

  function deny(btn, price) {
    CB.Audio.play("deny");
    toast("NOT ENOUGH CREDITS (" + fmt(price - Save.data.credits) + " MORE NEEDED)", "bad");
    btn.classList.remove("deny"); void btn.offsetWidth; btn.classList.add("deny");
  }

  // ---------- WEAPONS ----------
  function renderWeapons() {
    var d = Save.data, box = $("weaponCards");
    box.innerHTML = "";
    CB.WEAPONS.forEach(function (w) {
      var owned = !!d.weapons[w.id], sel = d.selWeapon === w.id;
      var dps = w.dmg * w.rate * (w.type === "double" ? 2 : 1);
      var c = document.createElement("div");
      c.className = "card" + (sel ? " sel" : "") + (owned ? "" : " locked");
      c.innerHTML =
        '<div class="stage-prev"><canvas class="prev"></canvas></div>' +
        "<h3>" + esc(w.name) + "<small>" + esc(w.type.toUpperCase()) + "</small></h3>" +
        stat("DMG", w.dmg / 75, w.dmg + (w.type === "double" ? "x2" : "")) + stat("RATE", w.rate / 4, w.rate.toFixed(1) + "/s") +
        stat("RNG", w.range / 380, w.range) + stat("VEL", w.speed ? w.speed / 330 : 1, w.speed ? w.speed : "INST") +
        "<p><b>DPS " + dps.toFixed(0) + "</b> " + esc(w.desc) + "</p>";
      CB.Sprites.drawTo(c.querySelector("canvas"), CB.Sprites.weapon[w.id], 6);
      var b = document.createElement("button");
      if (sel) { b.className = "btn small equipped"; b.textContent = "EQUIPPED"; }
      else if (owned) { b.className = "btn small"; b.textContent = "SELECT"; b.onclick = function () { Save.selectWeapon(w.id); CB.Audio.play("buy"); renderWeapons(); }; }
      else {
        b.className = "btn small buy"; b.textContent = "BUY  " + fmt(w.price) + " CR";
        b.onclick = function () {
          if (Save.buyWeapon(w.id)) { CB.Audio.play("buy"); toast(w.name + " PURCHASED!", "good"); renderWeapons(); refreshCredits(); }
          else deny(b, w.price);
        };
      }
      c.appendChild(b);
      box.appendChild(c);
    });
  }

  // ---------- UPGRADES ----------
  function renderUpgrades() {
    var d = Save.data, box = $("upgradeRows");
    box.innerHTML = "";
    CB.UPGRADES.forEach(function (u) {
      var lvl = d.upgrades[u.id], max = lvl >= CB.MAX_LEVEL, cost = CB.upgradeCost(u, lvl);
      var row = document.createElement("div");
      row.className = "up-row";
      var pips = "";
      for (var i = 0; i < CB.MAX_LEVEL; i++) pips += '<i class="' + (i < lvl ? "on" : "") + '"></i>';
      row.innerHTML = '<div class="ic">' + u.icon + "</div><div><b>" + esc(u.name) + " &nbsp;<span style='color:var(--green)'>LV " + lvl + "/" + CB.MAX_LEVEL +
        "</span></b><small>" + esc(u.desc) + " (now +" + Math.round(u.per * lvl * 100) + "%)</small><div class='pips'>" + pips + "</div></div>";
      var b = document.createElement("button");
      if (max) { b.className = "btn equipped"; b.textContent = "MAX LEVEL"; }
      else {
        b.className = "btn buy"; b.textContent = "UPGRADE  " + fmt(cost) + " CR";
        b.onclick = function () {
          if (Save.buyUpgrade(u.id)) { CB.Audio.play("buy"); renderUpgrades(); refreshCredits(); }
          else deny(b, cost);
        };
      }
      row.appendChild(b);
      box.appendChild(row);
    });
  }

  // ---------- SETTINGS ----------
  function segRow(title, desc, opts, get, set) {
    var row = document.createElement("div");
    row.className = "set-row";
    row.innerHTML = "<div>" + esc(title) + "<small>" + esc(desc) + "</small></div>";
    var seg = document.createElement("div");
    seg.className = "seg";
    opts.forEach(function (o) {
      var b = document.createElement("button");
      b.textContent = o.label;
      b.className = get() === o.value ? "on" : "";
      b.onclick = function () {
        set(o.value); Save.save(); CB.Audio.apply();
        Array.prototype.forEach.call(seg.children, function (c, i) { c.className = opts[i].value === o.value ? "on" : ""; });
        applyTouch();
      };
      seg.appendChild(b);
    });
    row.appendChild(seg);
    return row;
  }

  function renderSettings() {
    var s = Save.data.settings, box = $("settingsRows");
    resetArmed = false;
    box.innerHTML = "";
    var onoff = [{ label: "ON", value: true }, { label: "OFF", value: false }];

    var vol = document.createElement("div");
    vol.className = "set-row";
    vol.innerHTML = "<div>MASTER VOLUME<small>Sound effects and music</small></div>";
    var r = document.createElement("input");
    r.type = "range"; r.min = 0; r.max = 100; r.value = Math.round(s.volume * 100);
    r.setAttribute("aria-label", "Master volume");
    r.oninput = function () { s.volume = r.value / 100; CB.Audio.apply(); };
    r.onchange = function () { Save.save(); CB.Audio.play("click"); };
    vol.appendChild(r);
    box.appendChild(vol);

    box.appendChild(segRow("SOUND EFFECTS", "Shots, explosions and menu sounds", onoff, function () { return s.sfx; }, function (v) { s.sfx = v; }));
    box.appendChild(segRow("MUSIC", "Synthwave loop", onoff, function () { return s.music; }, function (v) { s.music = v; }));
    box.appendChild(segRow("SCREEN SHAKE", "Camera shake on explosions", onoff, function () { return s.shake; }, function (v) { s.shake = v; }));
    box.appendChild(segRow("PARTICLES", "Lower this on slow devices", [{ label: "LOW", value: "low" }, { label: "HIGH", value: "high" }], function () { return s.particles; }, function (v) { s.particles = v; }));
    box.appendChild(segRow("CROSSHAIR", "Show the aiming crosshair", onoff, function () { return s.crosshair; }, function (v) { s.crosshair = v; }));
    box.appendChild(segRow("AUTO-FIRE", "Shoots the nearest enemy automatically (F in game)", onoff, function () { return s.autoFire; }, function (v) { s.autoFire = v; }));
    box.appendChild(segRow("CONTROLLER VIBRATION", "Rumble on hits and explosions (Xbox controller)", onoff, function () { return s.rumble; }, function (v) { s.rumble = v; if (v) CB.Input.rumble(0.5, 0.5, 150); }));
    box.appendChild(segRow("TOUCH CONTROLS", "On-screen buttons for phones and tablets", [{ label: "AUTO", value: "auto" }, { label: "ON", value: "on" }, { label: "OFF", value: "off" }], function () { return s.touch; }, function (v) { s.touch = v; }));

    var fsRow = document.createElement("div");
    fsRow.className = "set-row";
    fsRow.innerHTML = "<div>FULLSCREEN<small>Toggle fullscreen mode</small></div>";
    var fs = document.createElement("button");
    fs.className = "btn small"; fs.textContent = "TOGGLE";
    fs.onclick = function () {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
        else toast("FULLSCREEN NOT SUPPORTED", "bad");
      } catch (e) { toast("FULLSCREEN NOT SUPPORTED", "bad"); }
    };
    fsRow.appendChild(fs);
    box.appendChild(fsRow);

    var rs = document.createElement("div");
    rs.className = "set-row";
    rs.innerHTML = "<div>RESET PROGRESS<small>Deletes credits, weapons, upgrades and sectors</small></div>";
    var rb = document.createElement("button");
    rb.className = "btn small danger"; rb.textContent = "RESET";
    rb.onclick = function () {
      if (!resetArmed) { resetArmed = true; rb.textContent = "SURE? CLICK AGAIN"; setTimeout(function () { resetArmed = false; rb.textContent = "RESET"; }, 3000); return; }
      Save.reset(); selSector = 1; resetArmed = false; rb.textContent = "RESET";
      refreshCredits(); toast("PROGRESS RESET", "bad");
    };
    rs.appendChild(rb);
    box.appendChild(rs);
  }

  // ---------- Touch ----------
  function isTouchDevice() { return ("ontouchstart" in window) || (navigator.maxTouchPoints > 0); }
  function applyTouch() {
    var m = Save.data.settings.touch;
    document.body.classList.toggle("touch-on", m === "on" || (m === "auto" && isTouchDevice()));
  }

  // ---------- Spielstart und Pause ----------
  function launch(id) {
    CB.Audio.init();
    hideAll();
    setMode("game");
    G.start(id || selSector);
    applyTouch();
    lastHud = {};
  }

  function pause() {
    if (G.state !== "playing") return;
    G.setPaused(true);
    show("pause");
  }
  function resume() {
    if (G.state !== "paused") return;
    hideAll();
    G.setPaused(false);
  }
  function toMenu() {
    if (CB.Net) CB.Net.leaveGame();
    G.toMenu();
    setMode("menu");
    show(CB.Net && CB.Net.room ? "online" : "main");
  }

  function escape() {
    if (G.state === "playing") pause();
    else if (G.state === "paused") resume();
    else if (G.state === "menu" && current && current !== "main") { CB.Audio.play("click"); show("main"); }
  }

  function toggleAuto() {
    var s = Save.data.settings;
    s.autoFire = !s.autoFire; Save.save();
    toast("AUTO-FIRE " + (s.autoFire ? "ON" : "OFF"), s.autoFire ? "good" : "");
    if (current === "settings") renderSettings();
  }

  // ---------- Ergebnis ----------
  function showResult(r) {
    CB.Input.reset();
    var win = r.win, t = $("resTitle");
    t.textContent = win ? (r.sector.endless ? "RUN COMPLETE" : "SECTOR CLEARED") : "ROBOT DESTROYED";
    t.className = win ? "" : "lose";
    $("resSub").textContent = esc(r.sector.area) + " - " + r.sector.name;
    var m = Math.floor(r.time / 60), s = Math.floor(r.time % 60);
    var rows = '<div>ENEMIES DESTROYED<b>' + r.kills + '</b></div><div>CREDITS EARNED<b>+' + fmt(r.credits) + '</b></div>';
    if (r.bonus) rows += '<div>SECTOR BONUS<b>+' + fmt(r.bonus) + '</b></div>';
    rows += '<div>SCORE<b>' + fmt(r.score) + '</b></div><div>TIME<b>' + m + ":" + (s < 10 ? "0" : "") + s + '</b></div>';
    if (r.newBest) rows += '<div class="newbest">NEW ENDLESS RECORD!</div>';
    if (r.firstClear) rows += '<div class="newbest">FIRST CLEAR BONUS INCLUDED</div>';
    if (r.trophy) rows += '<div class="newbest">&#9733; TROPHY: ' + esc(r.trophy) + '</div>';
    if (r.unlockedNext) rows += '<div class="newbest">NEXT SECTOR UNLOCKED</div>';
    $("resRows").innerHTML = rows;
    var next = $("rNext");
    next.style.display = (win && r.nextId) ? "" : "none";
    show("result");
  }

  // ---------- HUD ----------
  var lastHud = {};
  function setText(id, v) { if (lastHud[id] !== v) { lastHud[id] = v; $(id).textContent = v; } }

  function updateHud() {
    var p = G.p;
    if (!p || document.body.classList.contains("in-menu")) return;
    setText("hpText", Math.ceil(p.hp) + " / " + p.maxHp);
    var frac = Math.max(0, p.hp / p.maxHp), w = Math.round(frac * 100) + "%";
    if (lastHud.hpW !== w) { lastHud.hpW = w; $("hpFill").style.width = w; }
    var cls = "bar hp" + (frac < 0.3 ? " low" : frac < 0.6 ? " mid" : "");
    if (lastHud.hpC !== cls) { lastHud.hpC = cls; $("hpFill").parentNode.className = cls; }
    setText("hudCredits", fmt(Save.data.credits));
    setText("hudRun", fmt(G.run.credits));
    setText("hudWeapon", G.stats.weapon.name);
    var auto = Save.data.settings.autoFire;
    var autoKey = document.body.classList.contains("touch-on") ? "" : (CB.Input.padMode ? "[Y] " : "[F] ");
    setText("hudAuto", "AUTO-FIRE " + autoKey + (auto ? "ON" : "OFF"));
    setText("abKey", CB.Input.padMode ? "B" : "Q");
    if (lastHud.autoOn !== auto) { lastHud.autoOn = auto; $("hudAuto").classList.toggle("on", auto); }

    var sec = G.sec, prog;
    if (sec.endless) { var tt = Math.floor(G.run.time); prog = "KILLS " + G.run.kills + "  TIME " + Math.floor(tt / 60) + ":" + (tt % 60 < 10 ? "0" : "") + (tt % 60); }
    else if (G.bossSpawned) prog = "DEFEAT THE " + (CB.ENEMIES[sec.bossType || "boss"].name);
    else prog = "KILLS " + G.run.kills + " / " + sec.quota;
    setText("hudProg", prog);

    var ab = G.stats.robot.ability, cdFrac = Math.max(0, p.abCd / ab.cd);
    if (lastHud.abIcon !== ab.id) { lastHud.abIcon = ab.id; CB.CHAR_ICONS.draw($("abIcon"), ab.id, 1); }
    setText("abName", ab.name + (p.abCd > 0 ? "  " + p.abCd.toFixed(1) + "S" : "  READY"));
    var cdW = Math.round(cdFrac * 100) + "%";
    if (lastHud.cdW !== cdW) { lastHud.cdW = cdW; $("abCd").style.width = cdW; }
    var active = p.over > 0 || p.shield > 0 || p.dash > 0 || p.analysis > 0 || p.repair > 0 || p.hackFx > 0 || G.drones.length > 0;
    var abCls = "hud-ab" + (active ? " active" : p.abCd <= 0 ? " ready" : "");
    if (lastHud.abC !== abCls) { lastHud.abC = abCls; $("hudAb").className = abCls; }

    var bossOn = G.boss && !G.boss.dead;
    if (lastHud.bossOn !== !!bossOn) { lastHud.bossOn = !!bossOn; $("bossBar").hidden = !bossOn; if (bossOn) $("bossName").textContent = G.boss.cfg.name; }
    if (bossOn) { var bw = Math.max(0, G.boss.hp / G.boss.maxHp * 100).toFixed(1) + "%"; if (lastHud.bw !== bw) { lastHud.bw = bw; $("bossFill").style.width = bw; } }

    var b = $("banner"), bt = G.banner ? G.banner.text : "";
    if (lastHud.banner !== bt) {
      lastHud.banner = bt; b.textContent = bt;
      b.className = bt ? "show" + (G.banner.boss ? " boss" : G.banner.good ? " good" : "") : "";
    }
  }

  // ---------- Controller-Navigation in den Menues ----------
  var padFocusEl = null;

  function clearPadFocus() {
    if (padFocusEl) padFocusEl.classList.remove("pf");
    padFocusEl = null;
  }
  function setPadFocus(el) {
    if (!el) return;
    clearPadFocus();
    padFocusEl = el;
    el.classList.add("pf");
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    if (el.scrollIntoView) el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  function focusables() {
    if (!current) return [];
    var root = $("scr-" + current);
    return Array.prototype.filter.call(root.querySelectorAll("button, input[type=range]"), function (el) {
      return !el.disabled && el.offsetParent !== null && el.getClientRects().length > 0;
    });
  }
  function focusDefault() {
    if (!current) return;
    var pick = { main: "#scr-main [data-go=play]", play: "#btnLaunch", pause: "#pResume", result: "#rNext" }[current];
    var el = pick ? document.querySelector(pick) : null;
    if (!el || el.offsetParent === null) {
      if (current === "result") el = $("rRetry");
      else {
        var list = focusables().filter(function (b) { return !b.classList.contains("back"); });
        el = list[0] || focusables()[0];
      }
    }
    setPadFocus(el);
  }

  function padNav(dir) {
    if (!current) return;
    var list = focusables(), cur = padFocusEl && list.indexOf(padFocusEl) >= 0 ? padFocusEl : null;
    if (!cur) { focusDefault(); CB.Audio.play("hover"); return; }
    // Regler: links/rechts aendert den Wert
    if (cur.type === "range" && (dir === "left" || dir === "right")) {
      var v = +cur.value + (dir === "right" ? 5 : -5);
      cur.value = Math.max(0, Math.min(100, v));
      cur.dispatchEvent(new Event("input", { bubbles: true }));
      cur.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    var r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var best = null, bestScore = Infinity;
    list.forEach(function (el) {
      if (el === cur) return;
      var b = el.getBoundingClientRect(), ex = b.left + b.width / 2, ey = b.top + b.height / 2;
      var dx = ex - cx, dy = ey - cy, along, across;
      if (dir === "down") { along = dy; across = Math.abs(dx); }
      else if (dir === "up") { along = -dy; across = Math.abs(dx); }
      else if (dir === "right") { along = dx; across = Math.abs(dy); }
      else { along = -dx; across = Math.abs(dy); }
      if (along < 4) return;
      var score = along + across * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) { setPadFocus(best); CB.Audio.play("hover"); }
  }
  function padConfirm() {
    if (!current) return;
    var list = focusables();
    if (!padFocusEl || list.indexOf(padFocusEl) < 0) { focusDefault(); return; }
    if (padFocusEl.type === "range") return;
    padLastIndex = list.indexOf(padFocusEl);
    padFocusEl.click();
    // nach einem Neuaufbau des Bildschirms (z. B. Kauf) Fokus am gleichen Platz halten
    setTimeout(function () {
      if (!current) return;
      var l = focusables();
      if (!padFocusEl || !document.body.contains(padFocusEl) || l.indexOf(padFocusEl) < 0) {
        var idx = padLastIndex < l.length ? padLastIndex : 0;
        if (l.length) setPadFocus(l[Math.max(0, idx)]);
      }
    }, 0);
  }
  var padLastIndex = 0;
  function padBack() {
    if (!current) return;
    CB.Audio.play("click");
    if (current === "pause") resume();
    else if (current === "result") return;
    else if (current !== "main") show("main");
  }
  function padWake() {
    if (current) focusDefault();
    syncMode();
  }
  // Zeigt Hinweise passend zum aktiven Eingabegeraet
  function syncMode() {
    var pad = CB.Input.padMode;
    if (lastHud.pad !== pad) {
      lastHud.pad = pad;
      document.body.classList.toggle("pad-mode", pad);
      if (!pad) clearPadFocus();
      lastHud.hudAuto = null;
    }
  }

  // ---------- Start ----------
  function init() {
    // Navigation ueber data-go
    document.addEventListener("click", function (e) {
      var go = e.target.closest && e.target.closest("[data-go]");
      if (go) { CB.Audio.play("click"); show(go.getAttribute("data-go")); }
    });
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(".btn:not(:disabled)")) CB.Audio.play("hover");
    });
    $("btnLaunch").onclick = function () { CB.Audio.play("buy"); launch(selSector); };
    $("pResume").onclick = function () { CB.Audio.play("click"); resume(); };
    $("pRestart").onclick = function () { CB.Audio.play("click"); hideAll(); launch(G.sec.id); };
    $("pMenu").onclick = function () { CB.Audio.play("click"); toMenu(); };
    $("rNext").onclick = function () { CB.Audio.play("click"); selSector = CB.nextSector(G.sec.id) || G.sec.id; launch(selSector); };
    $("rRetry").onclick = function () { CB.Audio.play("click"); launch(G.sec.id); };
    $("rMenu").onclick = function () { CB.Audio.play("click"); toMenu(); };
    document.addEventListener("mousemove", function (e) { if (padFocusEl && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) clearPadFocus(); });
    CB.Input.onNav = padNav; CB.Input.onConfirm = padConfirm; CB.Input.onBack = padBack; CB.Input.onPadWake = padWake;
    CB.Input.onPause = escape;
    CB.Input.onAuto = toggleAuto;
    selSector = Math.min(Save.data.progress.unlocked, 3);
    applyTouch();
    show("main");
  }

  CB.UI = { init: init, show: show, showResult: showResult, updateHud: updateHud, refreshCredits: refreshCredits, toast: toast,
            applyTouch: applyTouch, syncMode: syncMode, pause: pause, launch: launch, toMenu: toMenu };
})(window.CB);

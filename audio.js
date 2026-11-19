/* CYBER BOTS - audio.js
   Alle Sounds werden live mit der Web Audio API erzeugt (keine Dateien noetig). */
(function (CB) {
  "use strict";

  var ctx = null, master = null, sfxBus = null, musicBus = null;
  var lastPlayed = {};
  var musicTimer = null, nextNote = 0, step = 0;

  function settings() { return CB.Save.data.settings; }

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.35; musicBus.connect(master);
      apply();
    } catch (e) { ctx = null; }
  }

  function apply() {
    if (!ctx) return;
    var s = settings();
    master.gain.value = s.volume;
    sfxBus.gain.value = s.sfx ? 1 : 0;
    if (s.music) startMusic(); else stopMusic();
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ctx) return;
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  var noiseBuf = null;
  function noise(dur, vol, freq, delay) {
    if (!ctx) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var t = ctx.currentTime + (delay || 0);
    var src = ctx.createBufferSource(); src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(freq || 1800, t);
    f.frequency.exponentialRampToValueAtTime(120, t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t); src.stop(t + dur + 0.02);
  }

  var SFX = {
    bolt:     function () { tone(880, 0.09, "square", 0.08, 330); },
    double:   function () { tone(760, 0.08, "square", 0.07, 300); tone(980, 0.08, "square", 0.05, 380); },
    arc:      function () { tone(180, 0.16, "sawtooth", 0.09, 900); noise(0.12, 0.06, 5000); },
    rocket:   function () { tone(140, 0.25, "sawtooth", 0.1, 50); noise(0.2, 0.08, 1200); },
    plasma:   function () { tone(300, 0.3, "sine", 0.16, 70); tone(600, 0.2, "triangle", 0.06, 150); },
    hit:      function () { tone(220, 0.05, "square", 0.05, 120); },
    explode:  function () { noise(0.45, 0.22, 2400); tone(110, 0.3, "sine", 0.14, 35); },
    bigboom:  function () { noise(0.9, 0.3, 3000); tone(80, 0.7, "sine", 0.2, 25); },
    hurt:     function () { tone(160, 0.2, "sawtooth", 0.12, 60); noise(0.15, 0.08, 900); },
    jump:     function () { tone(300, 0.14, "square", 0.05, 620); },
    land:     function () { noise(0.06, 0.04, 700); },
    pickup:   function () { tone(660, 0.07, "square", 0.06); tone(990, 0.1, "square", 0.06, null, 0.06); },
    coin:     function () { tone(1200, 0.05, "square", 0.04); },
    eshot:    function () { tone(420, 0.1, "sawtooth", 0.04, 200); },
    alert:    function () { tone(520, 0.06, "square", 0.03); tone(780, 0.07, "square", 0.03, null, 0.06); },
    dash:     function () { noise(0.2, 0.08, 4000); tone(200, 0.18, "sawtooth", 0.06, 900); },
    shield:   function () { tone(300, 0.4, "sine", 0.12, 800); tone(450, 0.4, "triangle", 0.06, 1200); },
    shock:    function () { noise(0.5, 0.2, 1500); tone(90, 0.5, "sawtooth", 0.14, 30); },
    nova:     function () { tone(200, 0.6, "sawtooth", 0.12, 1400); noise(0.5, 0.12, 5000); },
    overcharge: function () { tone(400, 0.3, "square", 0.07, 1200); tone(600, 0.3, "square", 0.05, 1800, 0.1); },
    ready:    function () { tone(1000, 0.05, "square", 0.04); tone(1500, 0.08, "square", 0.04, null, 0.05); },
    click:    function () { tone(700, 0.04, "square", 0.05); },
    hover:    function () { tone(1100, 0.025, "square", 0.02); },
    buy:      function () { tone(500, 0.08, "square", 0.07); tone(750, 0.08, "square", 0.07, null, 0.08); tone(1000, 0.14, "square", 0.07, null, 0.16); },
    deny:     function () { tone(150, 0.16, "square", 0.07, 90); },
    win:      function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, "square", 0.08, null, i * 0.12); }); },
    lose:     function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.3, "sawtooth", 0.08, null, i * 0.16); }); },
    boss:     function () { tone(70, 0.9, "sawtooth", 0.16, 55); tone(105, 0.9, "square", 0.08, 80); }
  };

  function play(name) {
    if (!ctx || !SFX[name] || !settings().sfx) return;
    var now = performance.now();
    if (lastPlayed[name] && now - lastPlayed[name] < 35) return;   // nicht zu viele gleiche Sounds
    lastPlayed[name] = now;
    SFX[name]();
  }

  // ---------- kleine Synth-Musik: mehrere Tracks (Menue/NEON CITY + ein eigener Track je Weltraum-Sektor) ----------
  var BASS = [55, 55, 82.4, 55, 65.4, 65.4, 98, 65.4];
  var ARP = [440, 523.3, 659.3, 523.3, 392, 493.9, 587.3, 493.9];
  var TRACKS = {
    menu: { step: 0.16, bass: BASS, arp: ARP, bw: "sawtooth", aw: "square", bv: 0.22, av: 0.05, kick: 4 }
  };
  var cur = TRACKS.menu, curName = "menu", bossOn = false;

  function scheduleMusic() {
    if (!ctx || !musicTimer) return;
    while (nextNote < ctx.currentTime + 0.25) {
      var tr = cur, i = step % 16, t = nextNote, b = tr.bass, a = tr.arp;
      if (tr.play) tr.play(i, step, t, bossOn, helpers);
      else {
        if (i % 2 === 0) note(b[(i >> 1) % b.length], t, 0.2, tr.bw, tr.bv);
        var f = a[(i + (step >> 4)) % a.length] * ((step >> 5) % 2 ? 0.75 : 1);
        note(f, t, 0.1, tr.aw, tr.av);
        if (tr.kick && i % tr.kick === 0) kick(t);
      }
      step++; nextNote += tr.step * (bossOn ? (tr.bossStep || 0.82) : 1);
    }
  }
  var helpers = { note: function (f, t, d, type, v) { note(f, t, d, type, v); }, kick: function (t) { kick(t); }, noise: function (t, d, v, f) { musicNoise(t, d, v, f); } };
  function musicNoise(t, dur, vol, freq) {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); var dd = noiseBuf.getChannelData(0); for (var i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1; }
    var src = ctx.createBufferSource(); src.buffer = noiseBuf;
    var fl = ctx.createBiquadFilter(); fl.type = "highpass"; fl.frequency.value = freq || 6000;
    var g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(musicBus); src.start(t); src.stop(t + dur + 0.02);
  }
  function note(f, t, d, type, v) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + d + 0.02);
  }
  function kick(t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.16);
  }
  function startMusic() {
    if (!ctx || musicTimer) return;
    nextNote = ctx.currentTime + 0.05; step = 0;
    musicTimer = setInterval(scheduleMusic, 50);
  }
  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  // Track wechseln (Menue, Sektoren) und Boss-Modus (schneller, haerter)
  function track(name) {
    if (!TRACKS[name]) name = "menu";
    if (name === curName) return;
    curName = name; cur = TRACKS[name]; step = 0;
    if (ctx) nextNote = ctx.currentTime + 0.05;
    bossOn = false;
  }
  function boss(on) { bossOn = !!on; }

  CB.Audio = { init: init, apply: apply, play: play, track: track, boss: boss, TRACKS: TRACKS, SFX: SFX, tone: tone, noise: noise };
})(window.CB);

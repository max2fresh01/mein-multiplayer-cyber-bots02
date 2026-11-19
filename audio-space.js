/* CYBER BOTS - audio-space.js
   Musik-Tracks und Soundeffekte fuer die Weltraum-Sektoren 05-09 (alles live synthetisiert). */
(function (CB) {
  "use strict";
  var A = CB.Audio, T = A.TRACKS, S = A.SFX, tone = A.tone, noise = A.noise;

  // ---------- Soundeffekte ----------
  S.charge  = function () { tone(180, 1.0, "sine", 0.09, 1500); tone(90, 1.0, "triangle", 0.05, 700); };
  S.laser   = function () { tone(1400, 0.45, "sawtooth", 0.1, 220); noise(0.3, 0.08, 6000); };
  S.block   = function () { tone(1700, 0.07, "square", 0.05, 900); tone(2400, 0.05, "triangle", 0.03); };
  S.gate    = function () { tone(260, 0.12, "sawtooth", 0.05, 1200); };
  S.warn    = function () { tone(880, 0.08, "square", 0.04); };
  S.lob     = function () { tone(120, 0.3, "triangle", 0.1, 260); noise(0.15, 0.05, 900); };
  S.slam    = function () { noise(0.4, 0.2, 900); tone(70, 0.4, "sine", 0.18, 30); };

  // ---------- 05 ORBITAL STATION: langsam, kuehl, Hall-Arpeggio ----------
  var STB = [73.4, 73.4, 58.3, 58.3, 87.3, 87.3, 65.4, 65.4];
  var STS = [293.7, 349.2, 440, 523.3, 587.3, 698.5];
  T.station = { step: 0.21, bass: STB, arp: STS, bossStep: 0.8,
    play: function (i, step, t, boss, h) {
      var bar = (step >> 4) % 4;
      if (i % 4 === 0) h.note(STB[bar * 2 + ((i >> 3) & 1)], t, 0.8, "triangle", 0.24);
      var n = STS[(i * 3 + bar * 2) % 6];
      h.note(n, t, 0.12, "sine", 0.075); h.note(n, t + 0.42, 0.12, "sine", 0.026);
      if (i % 2 === 1) h.noise(t, 0.03, 0.025, 7000);
      if (i % 8 === 0) h.kick(t);
      if (boss) { if (i % 4 === 2) h.noise(t, 0.08, 0.05, 3000); h.note(STB[bar * 2] * 2, t, 0.1, "sawtooth", 0.06); if (i % 4 === 0) h.kick(t); }
    } };

  S.vent     = function () { noise(0.7, 0.16, 4200); tone(220, 0.5, "sawtooth", 0.06, 60); };
  S.portal   = function () { tone(300, 0.3, "sine", 0.1, 1200); tone(900, 0.3, "triangle", 0.06, 200, 0.05); };
  S.teleport = function () { tone(1600, 0.15, "square", 0.05, 200); noise(0.15, 0.06, 6000); tone(500, 0.2, "sine", 0.07, 1500, 0.05); };

  // ---------- 06 REACTOR CORE: schnell, industriell, Klirren ----------
  var RB = [41.2, 41.2, 0, 41.2, 49, 0, 41.2, 55, 41.2, 41.2, 0, 61.7, 49, 0, 55, 46.2];
  var RA = [329.6, 392, 440, 392, 329.6, 493.9, 440, 392];
  T.reactor = { step: 0.13, bass: RB, arp: RA, bossStep: 0.84,
    play: function (i, step, t, boss, h) {
      var bn = RB[i];
      if (bn) h.note(bn, t, 0.14, "sawtooth", 0.2);
      if (i % 4 === 0) h.kick(t);
      if (i % 4 === 2) h.noise(t, 0.09, 0.07, 2200);
      if (i % 2 === 1) h.noise(t, 0.025, 0.03, 7500);
      if (i % 2 === 0) h.note(RA[((i >> 1) + (step >> 4)) % 8] * ((step >> 5) % 2 ? 0.5 : 1), t, 0.07, "square", 0.04);
      if (boss) { if (i % 8 === 6) h.noise(t, 0.2, 0.1, 1200); if (bn) h.note(bn * 2, t, 0.1, "square", 0.07); }
    } };

  // ---------- 07 VOID LABORATORY: unheimlich, schwebend, Dissonanzen ----------
  var LB = [55, 0, 0, 0, 0, 0, 0, 0, 51.9, 0, 0, 0, 0, 0, 58.3, 0];
  var LA = [622.3, 659.3, 740, 554.4, 587.3, 698.5, 831.6, 523.3];
  T.lab = { step: 0.19, bass: LB, arp: LA, bossStep: 0.8,
    play: function (i, step, t, boss, h) {
      if (LB[i]) h.note(LB[i], t, 1.1, "triangle", 0.26);
      var n = LA[(i * 5 + (step >> 4) * 3) % 8];
      if (i % 2 === 0 || boss) { h.note(n, t, 0.2, "sine", 0.06); h.note(n * 1.0095, t, 0.2, "sine", 0.045); }
      if (i % 16 === 8) h.noise(t, 0.6, 0.04, 3000);
      if ((i * 7 + (step >> 4)) % 11 === 0) h.note(n * 2, t, 0.05, "square", 0.03);
      if (i % 8 === 0) h.kick(t);
      if (boss) { if (i % 4 === 2) h.noise(t, 0.05, 0.05, 5000); if (i % 4 === 0) h.note(LB[i % 16 < 8 ? 0 : 8] * 2 || 110, t, 0.15, "sawtooth", 0.06); }
    } };

  S.alarm     = function () { tone(700, 0.12, "square", 0.05); tone(520, 0.12, "square", 0.05, 520, 0.12); };
  S.supernova = function () { noise(0.8, 0.22, 700); tone(70, 0.9, "sawtooth", 0.16, 280); tone(900, 0.6, "sine", 0.07, 100); };
  S.gravity   = function () { tone(80, 1.0, "sine", 0.16, 30); tone(160, 1.0, "triangle", 0.07, 50); };

  // ---------- 08 DREADNOUGHT: Marschrhythmus, Blechblaeser-Quinten ----------
  var DB = [49, 49, 49, 55, 49, 49, 61.7, 55, 41.2, 41.2, 41.2, 46.2, 41.2, 41.2, 55, 49];
  T.dread = { step: 0.15, bass: DB, arp: [220], bossStep: 0.82,
    play: function (i, step, t, boss, h) {
      var b = DB[i];
      if (i % 2 === 0) { h.note(b, t, 0.2, "sawtooth", 0.22); h.note(b * 1.5, t, 0.2, "square", 0.06); }
      if (i % 4 === 0) h.kick(t);
      if (i % 8 === 4) h.noise(t, 0.12, 0.12, 1800);                       // Snare auf 2 und 4
      if (i % 8 === 0 && (step >> 4) % 2) h.note(b * 4, t, 0.5, "square", 0.05);
      if (i % 2 === 1) h.noise(t, 0.02, 0.025, 8000);
      if (boss) { if (i % 2 === 1) h.note(b * 2, t, 0.1, "sawtooth", 0.09); if (i % 4 === 2) h.kick(t); }
    } };

  // ---------- 09 THE LAST FRONTIER: grosse Akkorde, schnelles Arpeggio ----------
  var FB = [55, 55, 55, 55, 43.7, 43.7, 43.7, 43.7, 65.4, 65.4, 65.4, 65.4, 49, 49, 49, 49];
  var FA = [440, 523.3, 659.3, 880, 659.3, 523.3, 392, 523.3, 349.2, 440, 523.3, 698.5, 587.3, 740, 880, 1175];
  T.frontier = { step: 0.17, bass: FB, arp: FA, bossStep: 0.78,
    play: function (i, step, t, boss, h) {
      var chord = (step >> 3) % 4;
      if (i % 4 === 0) { h.note(FB[i], t, 0.7, "sawtooth", 0.17); h.note(FB[i] * 2.01, t, 0.7, "triangle", 0.09); }
      h.note(FA[(i + chord * 4) % 16], t, 0.1, "square", 0.045);
      if (i % 2 === 0) h.note(FA[(i + chord * 4 + 5) % 16] * 0.5, t, 0.2, "sine", 0.06);
      if (i % 4 === 0) h.kick(t);
      if (i % 8 === 6) h.noise(t, 0.15, 0.08, 2500);
      if (boss) { h.note(FB[i] * 4, t, 0.08, "sawtooth", 0.05); if (i % 2 === 1) h.kick(t); }
    } };
})(window.CB);

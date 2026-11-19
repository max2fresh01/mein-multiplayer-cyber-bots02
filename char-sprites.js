/* CYBER BOTS - char-sprites.js
   Pixel-Art der fuenf spielbaren Charaktere (20x28 Pixel, schauen nach rechts, 2 Lauf-Frames)
   und die Faehigkeits-Symbole (16x16) fuer Menue und HUD. */
(function (CB) {
  "use strict";
  var OUT = "#0b0a1c", SKIN = "#f4c29b", SKIN_D = "#cf8f68", WHITE = "#ffffff";

  // gemeinsame Beine: pant, pantD = Hosenfarben, boot/bootL = Stiefel, trim = Streifen (oder null)
  function legs(c, fr, pant, pantD, boot, bootL, trim) {
    var a = fr ? 1 : 0;
    // hinteres Bein
    c(pantD, fr ? 7 : 6, 19, 4, 6 - a); c(boot, fr ? 6 : 5, 25 - a, 5, 3 + a); c(bootL, fr ? 6 : 5, 25 - a, 5, 1);
    // vorderes Bein
    c(pant, fr ? 10 : 11, 19, 4, 6); c(boot, fr ? 10 : 11, 25, 6, 3); c(bootL, fr ? 10 : 11, 25, 6, 1);
    if (trim) { c(trim, fr ? 10 : 11, 20, 1, 5); c(trim, fr ? 7 : 6, 20, 1, 5 - a); }
  }

  var DRAW = {
    // ---------- NOVA: Hacker, Kapuzenjacke, Maske, Kopfhoerer ----------
    nova: function (c, f, fr) {
      var jk = "#161a30", jkL = "#26305a", hair = "#6e4527", hairL = "#97602f", cy = "#35f0ff";
      legs(c, fr, "#10131f", "#0a0d16", "#1b2036", cy, cy);
      c(jk, 3, 12, 3, 8); c(jkL, 3, 12, 1, 8); c(cy, 3, 18, 3, 1); c(SKIN_D, 3, 19, 3, 1);       // hinterer Arm
      c(jk, 4, 11, 12, 8); c(jkL, 4, 11, 12, 1); c(cy, 4, 12, 1, 7); c(cy, 15, 15, 1, 4);          // Jacke
      c("#0b0e1a", 7, 11, 6, 7); c(cy, 9, 11, 1, 7); c("#1c2440", 5, 17, 10, 2); c(cy, 9, 17, 2, 2); // Shirt + Guertel
      c(jk, 15, 12, 3, 7); c(jkL, 15, 12, 3, 1); c(cy, 15, 18, 3, 1); c("#0b0e1a", 15, 19, 3, 2);   // vorderer Arm + Handschuh
      c(jk, 5, 9, 10, 3); c(jkL, 5, 9, 10, 1);                                                        // Kapuze/Kragen
      c(SKIN, 6, 3, 8, 6); c(hair, 5, 2, 10, 3); c(hair, 5, 5, 2, 4); c(hairL, 6, 2, 8, 1);           // Kopf + Haare
      c(hair, 6, 0, 2, 3); c(hair, 9, 0, 2, 2); c(hair, 12, 1, 3, 2); c(hairL, 9, 0, 1, 1); c(hairL, 6, 0, 1, 1);
      c("#0d1020", 8, 7, 7, 3); c("#1c2440", 8, 7, 7, 1);                                              // Gesichtsmaske
      c(OUT, 10, 5, 4, 1); c(cy, 11, 6, 2, 1); c(WHITE, 12, 6, 1, 1);                                  // Augenbraue + leuchtendes Auge
      c(cy, 4, 5, 3, 4); c("#168ba6", 4, 8, 3, 1); c(cy, 5, 4, 1, 1); c(OUT, 4, 4, 1, 1);             // Kopfhoerer
    },

    // ---------- ROX: Technikerin, rote Haare, Schutzbrille ----------
    rox: function (c, f, fr) {
      var hair = "#ff5f7e", hairD = "#c93a5c", hairL = "#ff9bb0", gold = "#f2b21f", top = "#15101f";
      legs(c, fr, "#1b1630", "#120e22", "#241a38", gold, gold);
      c(hairD, 1, 3, 4, 3); c(hair, 0, 5, 4, 5); c(hair, 1, 9, 3, 4); c(hairD, 2, 12, 2, 2); c(hairL, 1, 5, 1, 3);   // Pferdeschwanz
      c(SKIN, 3, 12, 3, 6); c(gold, 3, 14, 3, 2); c(OUT, 3, 17, 3, 2);                                            // hinterer Arm
      c(top, 5, 11, 10, 4); c("#ff2bd6", 5, 11, 10, 1); c("#ff2bd6", 9, 12, 2, 1);                               // Top
      c(SKIN, 6, 15, 8, 3); c(SKIN_D, 6, 17, 8, 1); c("#241a38", 5, 18, 10, 2); c(gold, 9, 18, 2, 2);            // Bauch + Guertel
      c(SKIN, 15, 12, 3, 4); c(gold, 15, 15, 3, 2); c(OUT, 15, 17, 3, 2); c("#ff2bd6", 15, 17, 3, 1);               // vorderer Arm
      c(SKIN, 6, 3, 8, 7); c(SKIN_D, 7, 9, 6, 1);                                                                   // Kopf
      c(hair, 5, 1, 10, 4); c(hair, 5, 4, 2, 5); c(hairL, 6, 1, 7, 1); c(hair, 13, 3, 2, 2); c(hairD, 5, 7, 1, 2);   // Haare + Pony
      c("#3a2a50", 5, 3, 10, 1); c("#35f0ff", 8, 2, 3, 2); c("#c9d0e8", 7, 2, 1, 2); c("#c9d0e8", 11, 2, 1, 2); c(WHITE, 8, 2, 1, 1); // Brille
      c(OUT, 11, 5, 2, 1); c("#2a8fff", 11, 6, 2, 1); c(WHITE, 12, 6, 1, 1); c("#e0607a", 11, 8, 2, 1);              // Auge + Mund
      c("#ff2bd6", 12, 10, 3, 1);                                                                                     // Halsband
    },

    // ---------- KAI: Soldat, Ruestung, roter Schal, Umhang ----------
    kai: function (c, f, fr) {
      var arm = "#2b2f40", armL = "#4a5068", red = "#c4202c", redD = "#8a1420", hair = "#2a1c1a";
      c(redD, 1, 12, 4, 13); c(red, 2, 12, 2, 12); c(redD, 0, 22, 4, 4); c(red, 1, 12, 1, 10);                    // Umhang
      legs(c, fr, "#232634", "#181a26", "#14151f", red, null);
      c(armL, 11, 20, 4, 2); c(armL, fr ? 7 : 6, 20, 4, 2);                                                          // Knieschuetzer
      c(arm, 3, 12, 3, 7); c(armL, 2, 11, 5, 3); c("#14151f", 3, 18, 3, 3);                                          // hinterer Arm + Schulter
      c(arm, 5, 11, 10, 8); c(armL, 5, 11, 10, 1); c(red, 8, 13, 4, 3); c(WHITE, 9, 14, 2, 1);                      // Brustpanzer
      c("#14151f", 5, 18, 10, 2); c(red, 9, 18, 2, 2);                                                                // Guertel
      c(arm, 15, 12, 3, 7); c(armL, 14, 11, 5, 3); c(red, 15, 15, 3, 1); c("#14151f", 15, 18, 3, 3);               // vorderer Arm + Schulter
      c(SKIN, 7, 4, 7, 6); c(hair, 6, 1, 9, 4); c(hair, 6, 4, 2, 4); c(hair, 7, 0, 2, 2); c(hair, 11, 0, 2, 2); c("#4a3028", 8, 1, 5, 1); // Kopf + Haare
      c(OUT, 10, 5, 4, 1); c("#7a3a2a", 11, 6, 2, 1); c(OUT, 12, 6, 1, 1); c(SKIN_D, 8, 9, 5, 1);                   // Brauen + Auge
      c(red, 5, 9, 10, 3); c(redD, 5, 11, 10, 1); c("#e8404c", 6, 9, 6, 1); c(red, 4, 11, 3, 5); c(redD, 3, 14, 2, 3); // Schal
    },

    // ---------- DR. LIRA: Strategin, Laborkittel, Brille, Haarknoten ----------
    lira: function (c, f, fr) {
      var coat = "#ece8ff", coatD = "#b9a8ee", pur = "#8a5bff", hair = "#1d1a33", hairL = "#3a3560";
      legs(c, fr, "#1c1a2e", "#12101e", "#1c1a2e", pur, null);
      c(coatD, 4, 19, 11, 4); c(coat, 5, 19, 9, 3);                                                                  // Kittelsaum
      c(coatD, 3, 12, 3, 8); c(coat, 3, 12, 2, 7); c(pur, 3, 19, 3, 1);                                              // hinterer Aermel
      c(coat, 4, 11, 12, 9); c(coatD, 4, 11, 12, 1); c(coatD, 4, 12, 2, 8); c(pur, 4, 11, 1, 9); c(pur, 15, 12, 1, 8); // Kittel
      c("#16142a", 8, 11, 5, 8); c(pur, 9, 12, 3, 1); c("#2a2450", 9, 14, 3, 1);                                      // Oberteil darunter
      c(pur, 6, 18, 8, 2); c(WHITE, 9, 18, 2, 2);                                                                      // Guertel
      c(coat, 15, 12, 3, 7); c(coatD, 15, 17, 3, 2); c(pur, 15, 18, 3, 1); c("#16142a", 15, 19, 3, 2);               // vorderer Aermel + Handschuh
      c(SKIN, 6, 3, 8, 7); c(SKIN_D, 7, 9, 6, 1);                                                                      // Kopf
      c(hair, 5, 2, 10, 3); c(hair, 5, 4, 3, 6); c(hairL, 6, 2, 8, 1); c(hair, 8, 0, 4, 3); c(hairL, 9, 0, 2, 1);      // Haare + Knoten
      c("#2a8fff", 8, 5, 3, 2); c("#2a8fff", 11, 5, 3, 2); c("#bfe6ff", 9, 5, 1, 1); c("#bfe6ff", 12, 5, 1, 1); c(OUT, 10, 5, 1, 1); // Brille
      c(OUT, 12, 6, 1, 1); c("#c0607a", 11, 8, 2, 1);
    },

    // ---------- ZANE: Supporter, blonde Haare, Headset, gruene Jacke ----------
    zane: function (c, f, fr) {
      var jk = "#17301f", jkL = "#1f8a3c", lime = "#9dff3a", hair = "#f1cd62", hairL = "#ffe9a0";
      legs(c, fr, "#14161e", "#0d0f15", "#d8dce8", lime, "#1f8a3c");
      c(jk, 3, 12, 3, 7); c(jkL, 3, 12, 1, 7); c(lime, 3, 18, 3, 1); c(SKIN_D, 3, 19, 3, 1);                          // hinterer Arm
      c(jk, 4, 11, 12, 8); c(jkL, 4, 11, 12, 1); c(jkL, 4, 12, 2, 7); c(lime, 4, 18, 12, 1);                          // Jacke
      c("#f2f4ff", 7, 11, 6, 7); c("#2a8a4a", 7, 13, 6, 1); c("#2a8a4a", 7, 15, 6, 1); c(lime, 6, 11, 1, 8); c(lime, 13, 11, 1, 8); // Shirt + Reissverschluss
      c(jk, 15, 12, 3, 7); c(jkL, 15, 12, 3, 1); c(lime, 15, 17, 3, 1); c("#14161e", 15, 19, 3, 2);                    // vorderer Arm + Handschuh
      c(lime, 5, 9, 10, 3); c(jkL, 6, 10, 8, 1);                                                                       // Kapuzenkragen
      c(SKIN, 6, 3, 8, 6); c(hair, 5, 2, 10, 3); c(hair, 5, 4, 2, 4); c(hairL, 6, 2, 8, 1); c(hair, 6, 0, 2, 2); c(hair, 9, 0, 2, 2); c(hair, 12, 1, 2, 2); c(hairL, 9, 0, 1, 1); // Haare
      c("#2b3040", 4, 3, 3, 5); c("#9dff3a", 5, 5, 1, 2); c("#2b3040", 6, 1, 8, 1); c("#2b3040", 5, 8, 6, 1); c("#9dff3a", 10, 8, 2, 1); // Headset + Mikro
      c(OUT, 10, 5, 4, 1); c("#2a8fff", 11, 6, 2, 1); c(WHITE, 12, 6, 1, 1); c("#d0806a", 11, 8, 1, 1);               // Auge
    }
  };

  CB.CHAR_DRAW = DRAW;

  // ---------- Faehigkeits-Symbole (16x16 Pixel-Art) ----------
  function ico(canvas, scale, fn) {
    var s = scale || 1; canvas.width = 16 * s; canvas.height = 16 * s;
    var x = canvas.getContext("2d"); x.imageSmoothingEnabled = false; x.clearRect(0, 0, canvas.width, canvas.height);
    fn(function (col, px, py, w, h) { x.fillStyle = col; x.fillRect(px * s, py * s, w * s, h * s); });
  }
  var ICONS = {
    neuron: function (r) {                                  // Gehirn mit Schaltkreisen
      var b = "#35f0ff", l = "#c4fcff", d = "#168ba6";
      r(d, 4, 3, 8, 9); r(b, 3, 4, 10, 7); r(b, 5, 2, 6, 11); r(l, 5, 3, 3, 1); r(l, 9, 5, 2, 1); r("#0b0a1c", 8, 3, 1, 9); r("#0b0a1c", 4, 7, 3, 1); r("#0b0a1c", 9, 8, 3, 1);
      r(b, 1, 5, 2, 1); r(b, 0, 5, 1, 2); r(b, 13, 9, 2, 1); r(b, 15, 8, 1, 2); r(b, 7, 13, 2, 2); r(l, 7, 14, 2, 1); r(b, 1, 11, 3, 1); r(l, 0, 11, 1, 1);
    },
    drones: function (r) {                                  // grosse Drohne + 2 kleine
      var b = "#ff2bd6", l = "#ffb0f0", d = "#a31e8a";
      r(d, 5, 6, 6, 4); r("#e8ecff", 6, 7, 4, 2); r(b, 7, 7, 2, 2); r(WHITE, 7, 7, 1, 1); r(l, 2, 5, 3, 1); r(l, 11, 5, 3, 1); r(d, 4, 5, 1, 2); r(d, 11, 5, 1, 2);
      r(b, 0, 10, 4, 3); r(l, 0, 10, 4, 1); r(WHITE, 1, 11, 1, 1); r(b, 12, 10, 4, 3); r(l, 12, 10, 4, 1); r(WHITE, 14, 11, 1, 1);
      r(b, 7, 11, 2, 3); r(l, 7, 14, 2, 1);
    },
    overload: function (r) {                                // Fadenkreuz + Energieschuss
      var b = "#ff3b3b", o = "#ffb23f", y = "#ffe14a";
      r(b, 1, 3, 1, 10); r(b, 6, 3, 1, 10); r(b, 1, 3, 6, 1); r(b, 1, 12, 6, 1); r(b, 0, 7, 8, 1); r(b, 3, 1, 1, 14);
      r(WHITE, 3, 7, 1, 1); r(b, 3, 6, 1, 3);
      r(o, 6, 6, 8, 4); r(y, 7, 7, 8, 2); r(WHITE, 9, 7, 6, 1); r(b, 11, 5, 4, 1); r(b, 11, 10, 4, 1); r(o, 14, 6, 2, 4);
    },
    analyse: function (r) {                                 // Hologramm-Karte mit Pfeilen
      var b = "#8a5bff", l = "#cdb8ff", d = "#4a2fb0";
      r(d, 3, 5, 10, 7); r(b, 2, 6, 12, 5); r("#0b0a1c", 4, 7, 8, 3); r(l, 5, 8, 6, 1); r(l, 7, 7, 2, 3); r(b, 4, 7, 1, 3); r(b, 11, 7, 1, 3);
      r(l, 1, 1, 1, 4); r(l, 0, 2, 3, 1); r(l, 14, 1, 1, 4); r(l, 13, 2, 3, 1); r(b, 3, 12, 10, 1); r(d, 2, 13, 12, 1); r(l, 6, 14, 4, 1);
    },
    repair: function (r) {                                  // Kreuz im Feld
      var g = "#6bff8a", d = "#1f8a3c", l = "#d8ffd8";
      r(g, 6, 2, 4, 10); r(g, 3, 5, 10, 4); r(l, 7, 3, 2, 1); r(l, 4, 6, 1, 2); r(WHITE, 7, 5, 2, 2);
      r(d, 1, 12, 14, 1); r(g, 2, 13, 12, 1); r(d, 4, 14, 8, 1); r(g, 0, 1, 1, 3); r(g, 15, 1, 1, 3); r(l, 14, 2, 3, 1); r(l, -0, 2, 3, 1);
    }
  };
  CB.CHAR_ICONS = { draw: function (canvas, id, scale) { ico(canvas, scale, ICONS[id] || function () {}); } };
})(window.CB);

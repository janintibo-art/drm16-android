/* ================= télécommande des vraies machines =================
   Quand un bouton bouge dans l'application, le message correspondant part vers
   la machine branchée. Tables : ES-1 d'après sa notice d'implémentation officielle,
   EMX-1 et ER-1 d'après midi.guide (licence CC BY-SA 4.0). */

function nrpnEnvoyer(canal, msb, lsb, val){
  var v = Math.max(0, Math.min(127, Math.round(val)));
  midiBrut(0xB0|canal, 99, msb & 0x7F);
  midiBrut(0xB0|canal, 98, lsb & 0x7F);
  midiBrut(0xB0|canal, 6, v);
}
function ccEnvoyer(canal, num, val){
  midiBrut(0xB0|canal, num & 0x7F, Math.max(0, Math.min(127, Math.round(val))));
}
/* un doigt produit soixante mouvements par seconde : on en garde vingt-cinq,
   la dernière valeur étant toujours transmise */
function teleLimiter(cle, fn){
  var now = performance.now();
  if(now - (TELE.dernier[cle] || 0) >= 40){ TELE.dernier[cle] = now; fn(); return; }
  clearTimeout(TELE.tmr[cle]);
  TELE.tmr[cle] = setTimeout(function(){ TELE.dernier[cle] = performance.now(); fn(); }, 45);
}
function telePret(){ return TELE.actif && MIDI.out && midiPret(); }
function sept01(v){ return v*127; }
function septCentre(v){ return (v+1)/2*127; }
function septBool(b){ return b ? 127 : 0; }

/* ---------- ES-1 : NRPN de poids fort 5, sept paramètres par partie ---------- */
var TELE_ES1_PART = {pitch:0, lvl:1, filt:2, pan:3, fx:4, roll:5, rev:6};
var TELE_ES1_GLOB = {dDep:96, dTime:97, fxType:98, e1:99, e2:100, bpmSync:101, accent:104};
function teleEs1(k, champ, v){
  if(!telePret()) return;
  var c = MIDI.canal;
  if(k >= 0 && TELE_ES1_PART[champ] !== undefined && k < 10){
    var lsb = k*8 + TELE_ES1_PART[champ];
    var val = (champ === "pan" || champ === "pitch") ? septCentre(v)
            : (champ === "fx" || champ === "roll" || champ === "rev") ? septBool(v)
            : sept01(v);
    teleLimiter("es"+lsb, function(){ nrpnEnvoyer(c, 5, lsb, val); });
    return;
  }
  var g = TELE_ES1_GLOB[champ];
  if(g === undefined) return;
  var val2 = (champ === "fxType") ? v : (champ === "bpmSync") ? septBool(v) : sept01(v);
  teleLimiter("esg"+g, function(){ nrpnEnvoyer(c, 5, g, val2); });
}

/* ---------- EMX-1 : percussions en NRPN, synthés en CC sur leur canal ---------- */
var TELE_MX_DRUM = {tim:0, pitch:1, lvl:7, pan:8, eg:9, amp:10, roll:11,
                    send:13, slot:14, mwave:15, mdepth:16, mspeed:17, mdest:18, msync:19};
var TELE_MX_SYN = {lvl:7, pan:10, eg:75, cut:74, res:71, egi:79, drv:84,
                   o1:14, o2:15, osc:70, mspeed:89, mdepth:90, mwave:87, mdest:88,
                   msync:82, ftype:83, amp:86, roll:85, send:91, slot:81};
function teleMx(k, champ, v){
  if(!telePret()) return;
  if(k < 9){                                   /* percussion */
    var off = TELE_MX_DRUM[champ];
    if(off === undefined) return;
    var plat = 1184 + 32*k + off;
    var val = (champ === "pitch" || champ === "pan" || champ === "mdepth") ? septCentre(v)
            : (champ === "amp" || champ === "roll" || champ === "send" || champ === "msync") ? septBool(v)
            : (champ === "slot") ? [0,64,127][v] || 0
            : (champ === "mwave") ? [8,24,40,56,96][v] || 0
            : (champ === "mdest") ? [8,48,100][Math.min(2,v)] || 0
            : (champ === "tim") ? v
            : sept01(v);
    teleLimiter("mx"+plat, function(){ nrpnEnvoyer(MIDI.canal, plat>>7, plat&127, val); });
    return;
  }
  if(k >= 10 && k !== 15){                     /* synthé */
    var num = TELE_MX_SYN[champ];
    if(num === undefined) return;
    var canal = Math.min(15, MIDI.canalSy + (k-10));
    var val2 = (champ === "pan" || champ === "egi" || champ === "mdepth") ? septCentre(v)
             : (champ === "amp" || champ === "roll" || champ === "send" || champ === "msync") ? septBool(v)
             : (champ === "slot") ? [0,64,127][v] || 0
             : (champ === "ftype") ? [0,40,80,110][v] || 0
             : (champ === "mwave") ? [8,24,40,56,96][v] || 0
             : (champ === "mdest") ? [8,24,40,56,72,100][v] || 0
             : (champ === "osc") ? Math.min(127, v*8+4)
             : sept01(v);
    teleLimiter("mxs"+canal+"_"+num, function(){ ccEnvoyer(canal, num, val2); });
  }
}
var TELE_MX_FX = [[12,92,93],[13,94,95],[24,25,26]];
function teleMxFx(slot, quoi, v){
  if(!telePret() || slot < 0 || slot > 2) return;
  var num = TELE_MX_FX[slot][quoi];
  var val = (quoi === 0) ? Math.min(127, v*8+4) : sept01(v);
  teleLimiter("mxfx"+num, function(){ ccEnvoyer(MIDI.canal, num, val); });
}

/* ---------- ER-1 : NRPN de poids fort 2, appliqué à la partie choisie sur la machine ---------- */
var TELE_ER = {pitch:2, modD:6, modS:5, modT:4, wave:3, dec:8, lvl:7, pan:1, boost:0,
               dDep:100, dTime:101};
function teleEr(champ, v){
  if(!telePret()) return;
  var lsb = TELE_ER[champ];
  if(lsb === undefined) return;
  var val = (champ === "pan" || champ === "modD") ? septCentre(v)
          : (champ === "modT") ? Math.min(127, v*21)
          : (champ === "wave") ? septBool(v)
          : sept01(v);
  teleLimiter("er"+lsb, function(){ nrpnEnvoyer(MIDI.canal, 2, lsb, val); });
}


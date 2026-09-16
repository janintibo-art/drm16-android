/* ===================== BEHRINGER TD-3 =====================
   La 303 remise en circuit. Tout son caractère tient à trois choses : un
   filtre résonant à quatre pôles balayé par une enveloppe, un accent qui
   pousse à la fois le volume et le filtre, et un glissando qui enchaîne deux
   notes sans réattaquer. Ce dernier point impose une voix permanente : on ne
   peut pas glisser d'un oscillateur à un autre. */
var TD3_NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B","C"];
function pasTd3(){ return {on:false, note:0, oct:0, acc:false, slide:false, tie:false}; }
function motifTd3(n){
  var m = {pas:[], last:16};
  for(var i=0;i<16;i++) m.pas.push(pasTd3());
  if(n === 0){
    [0,3,6,8,10,14].forEach(function(i, k){
      m.pas[i].on = true;
      m.pas[i].note = [0,0,7,0,10,3][k];
      m.pas[i].acc = (k === 0 || k === 3);
      m.pas[i].slide = (k === 2);
    });
  } else if(n === 1){
    for(var j=0;j<16;j+=2){
      m.pas[j].on = true;
      m.pas[j].note = [0,0,12,10,7,5,3,0][j / 2];
      m.pas[j].acc = (j % 8 === 0);
      m.pas[j].slide = (j === 4 || j === 10);
    }
  }
  return m;
}
var TD3 = {motifs:[], cur:0, groupe:0, sel:0, pos:-1, couleur:0,
           onde:0, dist:false, drive:0.4,
           p:{tune:0.5, cut:0.35, res:0.6, env:0.55, dec:0.4, acc:0.5, tone:0.6},
           noeuds:null, precSlide:false, precFreq:0};
for(var t3z=0; t3z<32; t3z++) TD3.motifs.push(motifTd3(t3z < 2 ? t3z : 9));
function motifTd3Cur(){ return TD3.motifs[TD3.groupe * 8 + TD3.cur]; }
function pasTd3Sel(){ return motifTd3Cur().pas[TD3.sel]; }

/* ---------- la voix, construite une fois et gardée ---------- */
function batirTd3(){
  if(TD3.noeuds) return TD3.noeuds;
  var o = ctx.createOscillator();
  o.type = (TD3.onde ? "square" : "sawtooth");
  o.frequency.value = 110;
  /* deux filtres en série : quatre pôles, comme le circuit d'origine */
  var f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter();
  f1.type = "lowpass"; f2.type = "lowpass";
  f1.frequency.value = 500; f2.frequency.value = 500;
  var vca = ctx.createGain(); vca.gain.value = 0.0001;
  var sat = ctx.createWaveShaper();
  var n = 1025, c = new Float32Array(n);
  for(var i=0;i<n;i++){ var x = i * 2 / (n - 1) - 1; c[i] = Math.tanh(x * 3.4); }
  sat.curve = c; sat.oversample = "2x";
  var sec = ctx.createGain(), hum = ctx.createGain();
  var lp = ctx.createBiquadFilter(); lp.type = "lowpass";
  o.connect(f1); f1.connect(f2); f2.connect(vca);
  vca.connect(sec); sec.connect(lp);
  vca.connect(sat); sat.connect(hum); hum.connect(lp);
  lp.connect(busSet("td3") || master);
  o.start();
  TD3.noeuds = {o:o, f1:f1, f2:f2, vca:vca, sec:sec, hum:hum, lp:lp};
  majTonTd3();
  return TD3.noeuds;
}
function majTonTd3(){
  var n = TD3.noeuds;
  if(!n) return;
  n.f1.Q.value = TD3.p.res * 14;               /* la résonance siffle jusqu'à l'auto-oscillation */
  n.f2.Q.value = 0.6;
  n.lp.frequency.value = 700 * Math.pow(26, TD3.p.tone);
  var d = TD3.dist ? TD3.drive : 0;
  n.sec.gain.value = 1 - d * 0.8;
  n.hum.gain.value = d * 0.9;
  n.o.type = TD3.onde ? "square" : "sawtooth";
}
function freqTd3(p){
  /* do médian décalé de l'accord général, sur deux octaves autour */
  var demi = p.note + p.oct * 12 + (TD3.p.tune - 0.5) * 2;
  return 55 * Math.pow(2, (demi + 12) / 12);
}
function jouerTd3(t, p, duree){
  var n = batirTd3();
  var f = freqTd3(p);
  var glisse = TD3.precSlide && TD3.precFreq > 0;
  if(glisse){
    n.o.frequency.cancelScheduledValues(t);
    n.o.frequency.setValueAtTime(TD3.precFreq, t);
    n.o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.09, duree * 0.7));
  } else {
    n.o.frequency.setValueAtTime(f, t);
  }
  var acc = p.acc;
  /* plus le filtre résonne, plus il amplifie sa bande : on rend ce gain, sans
     quoi la machine dépasse la pleine échelle dès qu'on ouvre la résonance */
  var niv = 0.42 / (1 + TD3.p.res * 1.5) * (acc ? (1 + TD3.p.acc * 0.7) : 1);
  /* le glissando n'attaque pas : le volume reste ouvert d'une note à l'autre */
  if(!glisse){
    n.vca.gain.cancelScheduledValues(t);
    n.vca.gain.setValueAtTime(Math.max(0.0001, n.vca.gain.value), t);
    n.vca.gain.linearRampToValueAtTime(niv, t + 0.004);
  } else {
    n.vca.gain.cancelScheduledValues(t);
    n.vca.gain.linearRampToValueAtTime(niv, t + 0.02);
  }
  if(!p.tie && !p.slide){
    n.vca.gain.setValueAtTime(niv, t + duree * 0.72);
    n.vca.gain.exponentialRampToValueAtTime(0.0001, t + duree * 0.95);
  }
  /* enveloppe du filtre : c'est elle qui fait le miaulement */
  var base = 90 * Math.pow(120, TD3.p.cut);
  var mont = base + (TD3.p.env * (acc ? 1.5 : 1)) * 6500;
  var chute = 0.06 + TD3.p.dec * (acc ? 0.5 : 1.4);
  [n.f1, n.f2].forEach(function(f2n){
    f2n.frequency.cancelScheduledValues(t);
    f2n.frequency.setValueAtTime(Math.min(17000, mont), t);
    f2n.frequency.exponentialRampToValueAtTime(Math.max(60, base), t + chute);
  });
  TD3.precSlide = p.slide;
  TD3.precFreq = f;
  midiNoteA(36 + p.note + p.oct * 12, t, acc ? 1 : 0.75, MIDI.canalSy, duree * 0.9);
}
function scheduleTd3(i, t){
  var m = motifTd3Cur();
  if(i >= m.last) return;
  var p = m.pas[i];
  if(p.on) jouerTd3(t, p, stepDur());
  else {
    if(!TD3.precSlide && TD3.noeuds){
      TD3.noeuds.vca.gain.cancelScheduledValues(t);
      TD3.noeuds.vca.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
    }
    TD3.precSlide = false;
  }
  if(!cache) queue.push({i:i, t:t});
}
var td3Pas = [];
function beatTd3(i){
  TD3.pos = i;
  for(var j=0;j<16;j++) td3Pas[j].classList.toggle("cur", j === i);
}
function arretTd3(){
  TD3.pos = -1;
  TD3.precSlide = false;
  for(var j=0;j<16;j++) td3Pas[j].classList.remove("cur");
  if(TD3.noeuds){
    try{
      TD3.noeuds.vca.gain.cancelScheduledValues(maintenantAudio());
      TD3.noeuds.vca.gain.setTargetAtTime(0.0001, maintenantAudio(), 0.01);
    }catch(e){}
  }
  var b = document.getElementById("td3-play");
  if(b) b.classList.remove("on");
}
function boucleTd3(){ }
var MACHINE_TD3 = {schedule:scheduleTd3, beat:beatTd3, arret:arretTd3, boucle:boucleTd3,
                   longueur:function(){ return motifTd3Cur().last; }};

/* ---------- interface ---------- */
var TD3_KNOBS = [];
(function construireTd3(){
  var kns = document.getElementById("td3-kns");
  [["tune","TUNE"],["cut","CUTOFF"],["res","RESONANCE"],["env","ENV MOD"],["dec","DECAY"],
   ["acc","ACCENT"],["tone","TONE"]].forEach(function(x){
    var d = document.createElement("div");
    d.className = "td3-kn";
    d.id = "td3-k-" + x[0];
    d.innerHTML = '<div class="bt"><i></i></div><em>' + x[1] + '</em>';
    kns.appendChild(d);
  });
  [["drive","DRIVE"],["tempo","TEMPO"],["vol","VOLUME"]].forEach(function(x){
    var d = document.createElement("div");
    d.className = "td3-kn";
    d.id = "td3-k-" + x[0];
    d.innerHTML = '<div class="bt"><i></i></div><em>' + x[1] + '</em>';
    kns.appendChild(d);
  });

  var clav = document.getElementById("td3-clav");
  TD3_NOTES.forEach(function(n, i){
    var b = document.createElement("button");
    b.textContent = n;
    b.dataset.n = i;
    if(n.length > 1) b.className = "noire";
    clav.appendChild(b);
  });
  clav.addEventListener("click", function(e){
    var b2 = e.target.closest("button");
    if(!b2) return;
    var p = pasTd3Sel();
    p.note = +b2.dataset.n;
    p.on = true;
    audioInit();
    if(!S.run){
      TD3.precSlide = false;
      jouerTd3(maintenantAudio() + 0.01, p, 0.35);
    }
    majTd3(); memTd3(); H.cran();
  });

  var pas = document.getElementById("td3-pas");
  for(var i=0;i<16;i++){
    var b3 = document.createElement("button");
    b3.dataset.i = i;
    b3.innerHTML = "1<i></i>";
    pas.appendChild(b3);
    td3Pas.push(b3);
  }
  pas.addEventListener("click", function(e){
    var b4 = e.target.closest("button");
    if(!b4) return;
    var i2 = +b4.dataset.i;
    if(TD3.sel === i2){                        /* un second appui allume ou éteint le pas */
      var p = motifTd3Cur().pas[i2];
      p.on = !p.on;
    }
    TD3.sel = i2;
    majTd3(); memTd3(); H.cran();
  });
})();

function knobTd3(nom, etiq){
  return knobEm("td3-k-" + nom, {min:0, max:1,
    get:function(){ return TD3.p[nom]; },
    set:function(v){ TD3.p[nom] = v; majTonTd3(); lcdTd3(String(Math.round(v*100)), etiq, true); memTd3(); }});
}
[["tune","TUNE"],["cut","CUTOFF"],["res","RESONANCE"],["env","ENV MOD"],["dec","DECAY"],
 ["acc","ACCENT"],["tone","TONE"]].forEach(function(x){ TD3_KNOBS.push(knobTd3(x[0], x[1])); });
var kTd3Drive = knobEm("td3-k-drive", {min:0, max:1, get:function(){ return TD3.drive; },
  set:function(v){ TD3.drive = v; majTonTd3(); lcdTd3(String(Math.round(v*100)), "DRIVE", true); memTd3(); }});
var kTd3Vol = knobEm("td3-k-vol", {min:0, max:1, get:function(){ return S.vol; },
  set:function(v){ S.vol = v; if(master && ctx) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
    lcdTd3(String(Math.round(v*100)), "VOLUME", true); saveSoon(); }});
var kTd3Tempo = knobEm("td3-k-tempo", {min:0, max:1, get:function(){ return (S.bpm - 40) / 220; },
  set:function(v){ S.bpm = Math.round(40 + v*220); lcdTd3(String(S.bpm), "TEMPO", true); saveSoon(); }});
function majKnobsTd3(){
  TD3_KNOBS.forEach(function(k){ k.maj(); });
  kTd3Drive.maj(); kTd3Vol.maj(); kTd3Tempo.maj();
}
var td3Tmr = null;
function lcdTd3(v, l, fugace){
  var a = document.getElementById("td3-val"), b = document.getElementById("td3-lab");
  if(!a) return;
  a.textContent = v; b.textContent = l;
  clearTimeout(td3Tmr);
  if(fugace) td3Tmr = setTimeout(majLcdTd3, 1300);
}
function majLcdTd3(){
  var p = pasTd3Sel();
  var nom = p.on ? (TD3_NOTES[p.note] + (p.oct > 0 ? "+" : p.oct < 0 ? "−" : "")) : "—";
  lcdTd3("PAS " + (TD3.sel + 1) + " · " + nom,
         "PTN " + ["I","II","III","IV"][TD3.groupe] + "-" + (TD3.cur + 1) +
         (p.acc ? " ACC" : "") + (p.slide ? " SLIDE" : "") + (p.tie ? " TIE" : ""));
}
function majTd3(){
  var m = motifTd3Cur(), i;
  for(i=0;i<16;i++){
    var p = m.pas[i];
    var b = td3Pas[i];
    b.firstChild.nodeValue = p.on ? (TD3_NOTES[p.note] + (p.oct ? (p.oct > 0 ? "+" : "−") : "")) : "·";
    b.querySelector("i").textContent = (p.acc ? "A" : "") + (p.slide ? "S" : "") + (p.tie ? "T" : "");
    b.classList.toggle("act", p.on);
    b.classList.toggle("sel", i === TD3.sel);
    b.classList.toggle("hors", i >= m.last);
  }
  var p2 = pasTd3Sel();
  document.getElementById("td3-accent").classList.toggle("on", p2.acc);
  document.getElementById("td3-slide").classList.toggle("on", p2.slide);
  document.getElementById("td3-tie").classList.toggle("on", p2.tie);
  document.getElementById("td3-rest").classList.toggle("on", !p2.on);
  document.getElementById("td3-onde").textContent = TD3.onde ? "SQUARE" : "SAW";
  document.getElementById("td3-dist").textContent = TD3.dist ? "DIST ON" : "DIST OFF";
  document.getElementById("td3-dist").classList.toggle("on", TD3.dist);
  document.getElementById("td3-last").textContent = "LAST " + m.last;
  document.getElementById("td3-ptn").textContent =
    "PTN " + ["I","II","III","IV"][TD3.groupe] + "-" + (TD3.cur + 1);
  majLcdTd3();
}
function memTd3(){
  memoire.td3 = {cur:TD3.cur, groupe:TD3.groupe, sel:TD3.sel, onde:TD3.onde, dist:TD3.dist,
    drive:TD3.drive, couleur:TD3.couleur, p:TD3.p,
    motifs:TD3.motifs.map(function(m){
      return {last:m.last, pas:m.pas.map(function(p){
        return [p.on ? 1 : 0, p.note, p.oct, p.acc ? 1 : 0, p.slide ? 1 : 0, p.tie ? 1 : 0];
      })};
    })};
  sauverMachine("td3");
}
function chargerTd3(){
  TD3.motifs = [];
  for(var i=0;i<32;i++) TD3.motifs.push(motifTd3(i < 2 ? i : 9));
  TD3.cur = 0; TD3.groupe = 0; TD3.sel = 0;
  var m = memLire("td3");
  if(m){
    if(m.motifs && m.motifs.length === 32){
      TD3.motifs = m.motifs.map(function(o){
        var r = motifTd3(9);
        r.last = o.last || 16;
        (o.pas || []).forEach(function(v, k){
          if(k >= 16) return;
          r.pas[k] = {on:!!v[0], note:v[1] || 0, oct:v[2] || 0,
                      acc:!!v[3], slide:!!v[4], tie:!!v[5]};
        });
        return r;
      });
    }
    ["cur","groupe","sel","onde","drive","couleur"].forEach(function(c){
      if(typeof m[c] === "number") TD3[c] = m[c];
    });
    TD3.dist = !!m.dist;
    if(m.p) for(var q in TD3.p) if(typeof m.p[q] === "number") TD3.p[q] = m.p[q];
  }
}
function appliquerCouleurTd3(){
  document.body.classList.remove("t1","t2","t3","t4");
  if(S.modele === "td3" && TD3.couleur > 0) document.body.classList.add("t" + TD3.couleur);
}

document.getElementById("td3-play").addEventListener("click", function(){
  audioInit(); batirTd3();
  if(S.run){ stop(); H.stop(); } else { step = 0; TD3.precSlide = false; start(); H.start(); }
  this.classList.toggle("on", S.run);
});
[["td3-accent","acc"],["td3-slide","slide"],["td3-tie","tie"]].forEach(function(x){
  document.getElementById(x[0]).addEventListener("click", function(){
    var p = pasTd3Sel();
    p[x[1]] = !p[x[1]];
    if(p[x[1]]) p.on = true;
    majTd3(); memTd3(); H.cran();
  });
});
document.getElementById("td3-rest").addEventListener("click", function(){
  var p = pasTd3Sel();
  p.on = !p.on;
  majTd3(); memTd3(); H.cran();
});
document.getElementById("td3-bas").addEventListener("click", function(){
  var p = pasTd3Sel();
  p.oct = Math.max(-1, p.oct - 1);
  majTd3(); memTd3(); H.cran();
});
document.getElementById("td3-haut").addEventListener("click", function(){
  var p = pasTd3Sel();
  p.oct = Math.min(1, p.oct + 1);
  majTd3(); memTd3(); H.cran();
});
document.getElementById("td3-onde").addEventListener("click", function(){
  TD3.onde = TD3.onde ? 0 : 1;
  majTonTd3(); majTd3(); memTd3(); H.inter();
});
document.getElementById("td3-dist").addEventListener("click", function(){
  TD3.dist = !TD3.dist;
  majTonTd3(); majTd3(); memTd3(); H.inter();
});
document.getElementById("td3-last").addEventListener("click", function(){
  var m = motifTd3Cur(), v = [16, 12, 8, 4];
  m.last = v[(v.indexOf(m.last) + 1) % v.length];
  majTd3(); memTd3(); H.cran();
});
document.getElementById("td3-ptn").addEventListener("click", function(){
  memTd3();
  TD3.cur = (TD3.cur + 1) % 8;
  if(TD3.cur === 0) TD3.groupe = (TD3.groupe + 1) % 4;
  majTd3(); H.inter();
});
document.getElementById("td3-clear").addEventListener("click", function(){
  var m = motifTd3Cur();
  for(var i=0;i<16;i++) m.pas[i] = pasTd3();
  majTd3(); memTd3(); H.inter();
});
document.getElementById("td3-rand").addEventListener("click", function(){
  /* une ligne de basse au hasard : gamme mineure, quelques accents et glissandos */
  var gamme = [0, 3, 5, 7, 10, 12];
  var m = motifTd3Cur();
  for(var i=0;i<16;i++){
    var p = pasTd3();
    p.on = Math.random() > 0.28;
    p.note = gamme[Math.floor(Math.random() * gamme.length)];
    p.oct = (Math.random() > 0.85) ? 1 : 0;
    p.acc = Math.random() > 0.72;
    p.slide = Math.random() > 0.82;
    m.pas[i] = p;
  }
  m.pas[0].on = true; m.pas[0].note = 0; m.pas[0].acc = true;
  majTd3(); memTd3(); H.inter();
  signal("LIGNE DE BASSE TIRÉE AU SORT");
});
document.getElementById("td3-couleur").addEventListener("click", function(){
  TD3.couleur = (TD3.couleur + 1) % 5;
  appliquerCouleurTd3(); memTd3(); H.cran();
  signal(["VIOLET","NOIR","ARGENT","ROUGE","VERT"][TD3.couleur]);
});
document.getElementById("td3-notice").addEventListener("click", function(){ ouvrirNotice(); });

var unitTd3 = document.getElementById("unit-td3");
function activerTd3(){
  stop();
  S.modele = "td3";
  MACHINE = MACHINE_TD3;
  poserMachine("td3");
  audioInit();
  chargerTd3();
  debrancherTout(TD3.noeuds); TD3.noeuds = null; TD3.precSlide = false;
  batirTd3();
  appliquerCouleurTd3();
  majTd3(); majKnobsTd3();
  actif = unitTd3;
  save(); fit(); setTimeout(fit, 120);
}


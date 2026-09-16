/* ===================== ROLAND CR-5000 =====================
   Boîte à présélections de 1980 : on ne programme rien. On choisit un des
   vingt-quatre rythmes, et l'ARRANGER y ajoute des instruments par-dessus.
   Les instruments, dans l'ordre : grosse caisse, caisse claire, tom, rim shot,
   conga, claves, cowbell, charley fermé, charley ouvert, cymbale, accent. */
var CR_INSTR = ["bd","sd","tom","rim","cga","clv","cwb","hh","oh","cym","acc"];
var CR_GROUPES = {bd:"bd", sd:"sd", tom:"sd", rim:"sd", cga:"cga", clv:"clv", cwb:"clv",
                  hh:"cym", oh:"cym", cym:"cym"};
/* Chaque rythme : nom, mesure (16 pas ou 12 pour les ternaires), puis les
   lignes non vides. Les lettres marquent un pas, le point le silence. */
var CR_RYTHMES = [
  /* banque I */
  {n:"WALTZ",    p:12, l:{bd:"x.....x.....", sd:"...x.....x..", hh:"x.xx.xx.xx.x", cwb:"............"}},
  {n:"SWING 1",  p:12, l:{bd:"x.....x.....", sd:"...x.....x..", hh:"x.xx.xx.xx.x", rim:"............"}},
  {n:"SWING 2",  p:12, l:{bd:"x.....x..x..", sd:"...x.....x..", hh:"x.xx.xx.xx.x", cym:"x..........."}},
  {n:"S.ROCK",   p:16, l:{bd:"x..x..x...x.x...", sd:"....x.......x...", hh:"x.x.x.x.x.x.x.x."}},
  {n:"TANGO",    p:16, l:{bd:"x..x..x.x.......", sd:"....x.......x...", clv:"x..x..x.x...x...", cga:"..x...x...x...x."}},
  {n:"HABANERA", p:16, l:{bd:"x..x..x.x.......", cga:"x.x.x.x.x.x.x.x.", clv:"x.....x...x.....", cwb:"....x.......x..."}},
  {n:"ENKA",     p:16, l:{bd:"x.......x.......", sd:"....x.......x...", tom:"..........x.x...", hh:"x.x.x.x.x.x.x.x."}},
  {n:"BD-4",     p:16, l:{bd:"x...x...x...x...", hh:"x.x.x.x.x.x.x.x.", sd:"....x.......x..."}},
  /* banque II */
  {n:"ROCK 1",   p:16, l:{bd:"x.......x.......", sd:"....x.......x...", hh:"x.x.x.x.x.x.x.x."}},
  {n:"ROCK 2",   p:16, l:{bd:"x.....x.x.....x.", sd:"....x.......x...", hh:"x.x.x.x.x.x.x.x."}},
  {n:"ROCK 3",   p:16, l:{bd:"x..x..x...x.....", sd:"....x.......x...", hh:"xxxxxxxxxxxxxxxx"}},
  {n:"ROCK 4",   p:16, l:{bd:"x...x.....x.x...", sd:"....x.......x...", hh:"x.x.x.x.x.x.x.x.", oh:"..............x."}},
  {n:"ROCK 5",   p:16, l:{bd:"x.x.....x.x.....", sd:"....x.......x...", hh:"xxxxxxxxxxxxxxxx", cym:"x..............."}},
  {n:"ROCK 6",   p:16, l:{bd:"x.....x...x.....", sd:"....x.......x...", tom:"............x.x.", hh:"x.x.x.x.x.x.x.x."}},
  {n:"DISCO",    p:16, l:{bd:"x...x...x...x...", sd:"....x.......x...", hh:"x.x.x.x.x.x.x.x.", oh:"..x...x...x...x."}},
  {n:"FOX TROT", p:16, l:{bd:"x...x...x...x...", sd:"..x...x...x...x.", hh:"x.x.x.x.x.x.x.x.", rim:"....x.......x..."}},
  /* banque III */
  {n:"SAMBA 1",  p:16, l:{bd:"x..x..x.x..x..x.", cga:"..x.x...x.x.x...", clv:"x..x..x...x..x..", hh:"x.x.x.x.x.x.x.x."}},
  {n:"SAMBA 2",  p:16, l:{bd:"x..x..x.x..x..x.", cga:"x.xx.x.xx.xx.x.x", cwb:"....x.......x...", hh:"x.x.x.x.x.x.x.x."}},
  {n:"MERENGUE", p:16, l:{bd:"x...x...x...x...", cga:"x.x.xx..x.x.xx..", clv:"..x...x...x...x.", rim:"....x.......x..."}},
  {n:"MAMBO",    p:16, l:{bd:"x.....x.x.....x.", cga:"x.x.x.x.x.x.x.x.", cwb:"x...x...x...x...", clv:"..x..x..x...x..."}},
  {n:"CHACHA",   p:16, l:{bd:"x...x...x...x...", cga:"..x...x...x...x.", clv:"x..x..x...x.x...", cwb:"....x.......x..."}},
  {n:"RHUMBA",   p:16, l:{bd:"x.....x...x.....", cga:"..x...x...x...x.", clv:"x..x..x...x.x...", rim:"....x.......x..."}},
  {n:"BEGUINE",  p:16, l:{bd:"x.....x.x.....x.", cga:"x.x.x.x.x.x.x.x.", clv:"x..x..x...x.x...", hh:"..x...x...x...x."}},
  {n:"BOSSANOVA",p:16, l:{bd:"x..x..x.x..x..x.", rim:"x..x..x...x..x..", hh:"x.x.x.x.x.x.x.x.", cga:"....x.......x..."}}
];
/* L'arrangeur : chaque bouton pose un instrument par-dessus le rythme. */
var CR_ARR = [
  {id:"cy4",  nom:'CY-4"',   instr:"cym", m:"x.......x.......", m12:"x.....x....."},
  {id:"cy8",  nom:'CY-8"',   instr:"cym", m:"x...............", m12:"x..........."},
  {id:"hh4",  nom:'HH-4"',   instr:"hh",  m:"x...x...x...x...", m12:"x...x...x..."},
  {id:"hh16", nom:'HH-16"',  instr:"hh",  m:"xxxxxxxxxxxxxxxx", m12:"xxxxxxxxxxxx"},
  {id:"ohh",  nom:"OPEN HH", instr:"oh",  m:"..x...x...x...x.", m12:"..x...x...x."},
  {id:"cga",  nom:"CONGA",   instr:"cga", m:"x.x.x.x.x.x.x.x.", m12:"x.x.x.x.x.x."}
];
var CR_FILL = {bd:"x.......x...x.x.", sd:"....x.x.x.xxx.xx", tom:"........x.x.x.x.", cym:"x..............."};
var CR_MIDI = {bd:36, sd:38, tom:45, rim:37, cga:64, clv:75, cwb:56, hh:42, oh:46, cym:49};

var CR5 = {ryt:0, banq:1, arr:{}, shuffle:false, fill:false, fillAuto:0, mesure:0,
           niv:{bd:0.8, sd:0.8, cga:0.7, clv:0.7, cym:0.7, acc:0.6},
           pos:-1, noeuds:{}, ohGain:null, reg:false};
CR_ARR.forEach(function(a){ CR5.arr[a.id] = false; });

function rythmeCr(){ return CR_RYTHMES[CR5.banq * 8 + CR5.ryt] || CR_RYTHMES[8]; }
function sortieCr(g){
  if(!CR5.noeuds[g]){
    var n = ctx.createGain();
    n.connect(busSet("cr") || master);
    CR5.noeuds[g] = n;
  }
  return CR5.noeuds[g];
}
function voixCr(t, id, acc){
  var grp = CR_GROUPES[id] || "bd";
  var dest = sortieCr(grp);
  dest.gain.setValueAtTime(1, t);
  var niv = mv("niv", CR5.niv[grp === "sd" ? "sd" : grp === "cga" ? "cga" : grp === "clv" ? "clv"
                             : grp === "cym" ? "cym" : "bd"]);
  niv *= 0.85 * (acc ? (0.75 + mv("niv", CR5.niv.acc) * 0.6) : 0.72);
  var g = ctx.createGain();
  g.connect(dest);

  if(id === "bd"){
    var o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.04);
    trEnv(g, t, niv * 1.15, 0.24, 0.002);
    o.connect(g); o.start(t); o.stop(t + 0.3);
  }
  else if(id === "sd"){
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = 1900; bp.Q.value = 0.7;
    var nb = trBruit(t, 0.13);
    trEnv(g, t, niv * 1.1, 0.13, 0.001);
    nb.connect(bp); bp.connect(g);
    var ot = ctx.createOscillator(); ot.type = "triangle"; ot.frequency.value = 210;
    var gt = ctx.createGain();
    trEnv(gt, t, niv * 0.4, 0.07, 0.001);
    ot.connect(gt); gt.connect(dest); ot.start(t); ot.stop(t + 0.1);
  }
  else if(id === "tom"){
    var od = ctx.createOscillator(); od.type = "sine";
    od.frequency.setValueAtTime(190, t);
    od.frequency.exponentialRampToValueAtTime(105, t + 0.06);
    trEnv(g, t, niv * 1.1, 0.26, 0.002);
    od.connect(g); od.start(t); od.stop(t + 0.32);
  }
  else if(id === "rim"){
    var orf = ctx.createOscillator(); orf.type = "triangle"; orf.frequency.value = 1500;
    var br = ctx.createBiquadFilter(); br.type = "bandpass"; br.frequency.value = 1600; br.Q.value = 5;
    var nr = trBruit(t, 0.02);
    trEnv(g, t, niv * 1.0, 0.022, 0.0006);
    orf.connect(g); nr.connect(br); br.connect(g);
    orf.start(t); orf.stop(t + 0.04);
  }
  else if(id === "cga"){
    var oc = ctx.createOscillator(); oc.type = "sine";
    oc.frequency.setValueAtTime(340, t);
    oc.frequency.exponentialRampToValueAtTime(230, t + 0.035);
    trEnv(g, t, niv * 1.05, 0.17, 0.0015);
    oc.connect(g); oc.start(t); oc.stop(t + 0.22);
  }
  else if(id === "clv"){
    var ol = ctx.createOscillator(); ol.type = "sine"; ol.frequency.value = 2500;
    trEnv(g, t, niv * 0.95, 0.05, 0.0008);
    ol.connect(g); ol.start(t); ol.stop(t + 0.07);
  }
  else if(id === "cwb"){
    var som = ctx.createGain(); som.gain.value = 0.4;
    [560, 845].forEach(function(f){
      var ob = ctx.createOscillator(); ob.type = "square"; ob.frequency.value = f;
      ob.connect(som); ob.start(t); ob.stop(t + 0.26);
    });
    var bb = ctx.createBiquadFilter(); bb.type = "bandpass"; bb.frequency.value = 2700; bb.Q.value = 1.2;
    trEnv(g, t, niv * 1.3, 0.2, 0.001);
    som.connect(bb); bb.connect(g);
  }
  else {                                        /* charleys et cymbale */
    var dh = (id === "hh") ? 0.035 : (id === "oh") ? 0.3 : 1.1;
    var m = trMetal(t, dh, id === "cym" ? 360 : 880, 0.45);
    var hp = ctx.createBiquadFilter(); hp.type = "highpass";
    hp.frequency.value = (id === "cym") ? 3600 : 8200;
    trEnv(g, t, niv * (id === "hh" ? 1.55 : 1.25), dh, 0.001);
    m.connect(hp); hp.connect(g);
    if(id === "hh" && CR5.ohGain){
      try{ CR5.ohGain.gain.cancelScheduledValues(t);
           CR5.ohGain.gain.setTargetAtTime(0.0001, t, 0.004); }catch(e){}
    }
    if(id === "oh") CR5.ohGain = g;
  }
  var n2 = CR_MIDI[id];
  if(n2) midiNoteA(n2, t, acc ? 1 : 0.7, MIDI.canal, 0.12);
}

/* ---------- séquenceur ---------- */
function longueurCr(){ return rythmeCr().p; }
function scheduleCr(i, t){
  var r = rythmeCr(), douze = (r.p === 12);
  if(CR5.shuffle && i % 2 === 1) t += stepDur() * 0.22;
  var source = (CR5.fill || (CR5.fillAuto && CR5.mesure > 0 && CR5.mesure % CR5.fillAuto === 0))
               ? CR_FILL : r.l;
  var acc = (i === 0);
  CR_INSTR.forEach(function(id){
    var ligne = source[id];
    if(ligne && ligne.charAt(i) !== "." && ligne.charAt(i) !== "" && ligne.charAt(i) !== " ")
      voixCr(t, id, acc);
  });
  CR_ARR.forEach(function(a){
    if(!CR5.arr[a.id]) return;
    var m = douze ? a.m12 : a.m;
    if(m.charAt(i) === "x") voixCr(t, a.instr, acc);
  });
  if(!cache) queue.push({i:i, t:t});
}
function beatCr(i){ CR5.pos = i; }
function arretCr(){
  CR5.pos = -1; CR5.mesure = 0; CR5.fill = false;
  var b = document.getElementById("cr-start");
  if(b) b.classList.remove("on");
  majCr();
}
function boucleCr(){
  CR5.mesure++;
  if(CR5.fill){ CR5.fill = false; majCr(); }
}
var MACHINE_CR = {schedule:scheduleCr, beat:beatCr, arret:arretCr, boucle:boucleCr,
                  longueur:longueurCr};

/* ---------- interface ---------- */
var CR_KNOBS = [];
(function construireCr(){
  var kns = document.getElementById("cr-kns");
  [["bd","BASS DRUM"],["sd","SNARE / TOM"],["cga","CONGA"],["clv","CLAVES / COWBELL"],
   ["cym","CYMBAL / HI HAT"],["acc","ACCENT"],["vol","VOLUME"],["tempo","TEMPO"]].forEach(function(x){
    var d = document.createElement("div");
    d.className = "cr-kn";
    d.id = "cr-k-" + x[0];
    d.innerHTML = '<div class="bt"><i></i></div><em>' + x[1] + '</em>';
    kns.appendChild(d);
  });

  var arr = document.getElementById("cr-arr");
  CR_ARR.forEach(function(a){
    var b = document.createElement("button");
    b.className = "crk vert";
    b.innerHTML = '<i></i>' + a.nom;
    b.dataset.a = a.id;
    arr.appendChild(b);
  });
  arr.addEventListener("click", function(e){
    var b2 = e.target.closest(".crk");
    if(!b2) return;
    CR5.arr[b2.dataset.a] = !CR5.arr[b2.dataset.a];
    majCr(); memCr(); H.cran();
  });

  var banq = document.getElementById("cr-banq");
  ["I","II","III"].forEach(function(n, i){
    var b = document.createElement("button");
    b.className = "crk " + ["amb","beige","vert"][i];
    b.innerHTML = '<i></i>' + n;
    b.dataset.b = i;
    banq.appendChild(b);
  });
  banq.addEventListener("click", function(e){
    var b3 = e.target.closest(".crk");
    if(!b3) return;
    CR5.banq = +b3.dataset.b;
    majCr(); memCr(); H.inter();
  });

  var ryt = document.getElementById("cr-ryt");
  for(var i=0;i<8;i++){
    var b4 = document.createElement("button");
    b4.className = "crk";
    b4.dataset.r = i;
    ryt.appendChild(b4);
  }
  ryt.addEventListener("click", function(e){
    var b5 = e.target.closest(".crk");
    if(!b5) return;
    CR5.ryt = +b5.dataset.r;
    majCr(); memCr(); H.inter();
  });
})();

function knobCr(nom, etiq){
  return knobEm("cr-k-" + nom, {min:0, max:1,
    get:function(){ return CR5.niv[nom]; },
    set:function(v){ CR5.niv[nom] = v; lcdCr(String(Math.round(v*100)), etiq, true); memCr(); }});
}
[["bd","BASS DRUM"],["sd","SNARE"],["cga","CONGA"],["clv","CLAVES"],["cym","CYMBAL"],
 ["acc","ACCENT"]].forEach(function(x){ CR_KNOBS.push(knobCr(x[0], x[1])); });
var kCrVol = knobEm("cr-k-vol", {min:0, max:1, get:function(){ return S.vol; },
  set:function(v){ S.vol = v; if(master && ctx) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
    lcdCr(String(Math.round(v*100)), "VOLUME", true); saveSoon(); }});
var kCrTempo = knobEm("cr-k-tempo", {min:0, max:1, get:function(){ return (S.bpm - 40) / 220; },
  set:function(v){ S.bpm = Math.round(40 + v * 220); lcdCr(String(S.bpm), "TEMPO", true); saveSoon(); }});
function majKnobsCr(){
  CR_KNOBS.forEach(function(k){ k.maj(); });
  kCrVol.maj(); kCrTempo.maj();
}

var crTmr = null;
function lcdCr(v, l, fugace){
  var a = document.getElementById("cr-val"), b = document.getElementById("cr-lab");
  if(!a) return;
  a.textContent = v; b.textContent = l;
  clearTimeout(crTmr);
  if(fugace) crTmr = setTimeout(majLcdCr, 1300);
}
function majLcdCr(){
  var r = rythmeCr();
  lcdCr(r.n, (r.p === 12 ? "3/4 · " : "4/4 · ") + ["I","II","III"][CR5.banq]);
}
function majCr(){
  var i;
  var bs = document.querySelectorAll("#cr-ryt .crk");
  for(i=0;i<bs.length;i++){
    var r = CR_RYTHMES[CR5.banq * 8 + i];
    bs[i].innerHTML = '<i></i>' + (r ? r.n : "—");
    bs[i].classList.toggle("on", i === CR5.ryt);
  }
  var bq = document.querySelectorAll("#cr-banq .crk");
  for(i=0;i<bq.length;i++) bq[i].classList.toggle("on", i === CR5.banq);
  CR_ARR.forEach(function(a){
    var b = document.querySelector('#cr-arr .crk[data-a="' + a.id + '"]');
    if(b) b.classList.toggle("on", !!CR5.arr[a.id]);
  });
  document.getElementById("cr-shuffle").classList.toggle("on", CR5.shuffle);
  document.getElementById("cr-fill").classList.toggle("on", CR5.fill);
  document.getElementById("cr-register").classList.toggle("on", CR5.reg);
  document.getElementById("cr-crash").innerHTML = "<i></i>CRASH";
  var f = document.getElementById("cr-register");
  f.innerHTML = '<i></i>AUTO FILL ' + (CR5.fillAuto ? CR5.fillAuto : "OFF");
  majLcdCr();
}
function memCr(){
  memoire.cr5 = {ryt:CR5.ryt, banq:CR5.banq, arr:CR5.arr, shuffle:CR5.shuffle,
                 fillAuto:CR5.fillAuto, niv:CR5.niv};
  sauverMachine("cr5");
}
function chargerCr(){
  var m = memLire("cr5");
  if(!m) return;
  if(typeof m.ryt === "number") CR5.ryt = Math.min(7, m.ryt);
  if(typeof m.banq === "number") CR5.banq = Math.min(2, m.banq);
  if(typeof m.fillAuto === "number") CR5.fillAuto = m.fillAuto;
  CR5.shuffle = !!m.shuffle;
  if(m.arr) for(var a in CR5.arr) CR5.arr[a] = !!m.arr[a];
  if(m.niv) for(var n in CR5.niv) if(typeof m.niv[n] === "number") CR5.niv[n] = m.niv[n];
}

document.getElementById("cr-start").addEventListener("click", function(){
  audioInit();
  if(S.run){ stop(); H.stop(); } else { step = 0; CR5.mesure = 0; start(); H.start(); }
  this.classList.toggle("on", S.run);
});
document.getElementById("cr-shuffle").addEventListener("click", function(){
  CR5.shuffle = !CR5.shuffle; majCr(); memCr(); H.cran();
});
document.getElementById("cr-fill").addEventListener("click", function(){
  audioInit();
  CR5.fill = true;
  majCr(); H.inter();
  if(!S.run){ step = 0; start(); H.start(); document.getElementById("cr-start").classList.add("on"); }
});
document.getElementById("cr-register").addEventListener("click", function(){
  var v = [0, 2, 4, 8, 12, 16];
  CR5.fillAuto = v[(v.indexOf(CR5.fillAuto) + 1) % v.length];
  majCr(); memCr(); H.cran();
  signal(CR5.fillAuto ? ("BREAK AUTOMATIQUE TOUTES LES " + CR5.fillAuto + " MESURES")
                      : "BREAK AUTOMATIQUE COUPÉ");
});
document.getElementById("cr-crash").addEventListener("click", function(){
  audioInit();
  voixCr(maintenantAudio() + 0.01, "cym", true);
  H.inter();
});
document.getElementById("cr-notice").addEventListener("click", function(){ ouvrirNotice(); });

var unitCr = document.getElementById("unit-cr5");
function activerCr(){
  stop();
  S.modele = "cr5";
  MACHINE = MACHINE_CR;
  poserMachine("cr5");
  audioInit();
  chargerCr();
  debrancherTout(CR5.noeuds); CR5.noeuds = {}; CR5.ohGain = null; CR5.mesure = 0; CR5.fill = false;
  majCr(); majKnobsCr();
  actif = unitCr;
  save(); fit(); setTimeout(fit, 120);
}


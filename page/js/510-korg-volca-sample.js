/* ===================== KORG volca sample =====================
   Dix parties, seize pas, dix motifs. Les onze potards et les cinq
   interrupteurs sont ceux du format de motif Korg, documenté dans le SDK
   et repris de MOC'TA BASS : un motif exporté fait 2624 octets, en-tête
   PTST, dix parties de 256 octets, pied PTED. */
var VLC_PARAMS = [
  ["level","LEVEL",127], ["pan","PAN",64], ["speed","SPEED",64],
  ["ampeg_attack","A.ATK",0], ["ampeg_decay","A.DEC",127],
  ["pitcheg_int","P.INT",64], ["pitcheg_attack","P.ATK",0], ["pitcheg_decay","P.DEC",0],
  ["start_point","START",0], ["length","LENGTH",127], ["hicut","HI CUT",127]
];
var VLC_FONCS = ["motion","loop","reverb","reverse","mute"];
var VLC_TAILLE = 0xA40, VLC_TAILLE_PARTIE = 0x100, VLC_DEVCODE = 0x33B8;

function partieVlc(i){
  var p = {ech:"b" + (i % 24), pas:0, f:{}, par:{}, mot:{}};
  VLC_PARAMS.forEach(function(x){ p.par[x[0]] = x[2]; });
  VLC_FONCS.forEach(function(f){ p.f[f] = false; });
  return p;
}
function motifVlc(n){
  var m = {parties:[], actif:0xFFFF};
  for(var i=0;i<10;i++) m.parties.push(partieVlc(i));
  if(n === 0){
    m.parties[0].pas = 0x1111; m.parties[1].pas = 0x4444;
    m.parties[3].pas = 0xFFFF; m.parties[3].par.level = 90;
  } else if(n === 1){
    m.parties[0].pas = 0x1041; m.parties[1].pas = 0x4444;
    m.parties[3].pas = 0x5555; m.parties[6].pas = 0x0400;
  }
  return m;
}
/* rec : enregistrement des MOUVEMENTS de potards (bouton MOTION)
   recPas : enregistrement des DÉCLENCHEMENTS (bouton REC PAS) — deux choses */
var VLC = {motifs:[], cur:0, sel:0, pos:-1, noeuds:[], rec:false, recPas:false,
  modePas:"normal", swing:0, bass:0.5, treble:0.5, reverbMix:0.34, song:false, chaine:[0,1], songPos:0, songStep:0, songEvents:[], reverb:null, sortie:null};
for(var vz=0; vz<10; vz++) VLC.motifs.push(motifVlc(vz < 2 ? vz : 9));

function motifVlcCur(){ return VLC.motifs[VLC.cur]; }
function partieVlcSel(){ return motifVlcCur().parties[VLC.sel]; }

/* ---------- sortie globale : ANALOGUE ISOLATOR ----------
   La vraie volca place BASS et TREBLE sur sa sortie. Deux étagères donnent
   ici le même geste : centre = 0 dB, droite = +6 dB ; la butée gauche
   approche le -infini par -60 dB, valeur pratiquement muette. */
function dbIsoVlc(v){
  v = Math.max(0, Math.min(1, v));
  if(v < 0.5){
    if(v < 0.002) return -60;
    var x = v / 0.5;
    return -60 * Math.pow(1 - x, 2);
  }
  return (v - 0.5) * 12;
}
function texteIsoVlc(v){
  var d = dbIsoVlc(v);
  if(d <= -59) return "CUT";
  return (d >= 0 ? "+" : "") + d.toFixed(Math.abs(d) < 10 ? 1 : 0) + " dB";
}
function gainIsoVlc(v){ return Math.pow(10, dbIsoVlc(v) / 20); }
function appliquerIsoVlc(){
  if(!VLC.sortie || VLC.sortie.ctx !== ctx) return;
  lisser(VLC.sortie.gl.gain, gainIsoVlc(VLC.bass), 0.012);
  lisser(VLC.sortie.gh.gain, gainIsoVlc(VLC.treble), 0.012);
}
function sortieGeneraleVlc(){
  if(VLC.sortie && VLC.sortie.ctx === ctx) return VLC.sortie.e;
  var e = ctx.createGain(), o = ctx.createGain();
  /* Deux voies Linkwitz-Riley d'ordre 4 : quand BASS et TREBLE sont au centre,
     leur somme reste plate. Korg ne publie pas la fréquence de séparation de
     l'isolateur analogique ; 1 kHz donne ici deux bandes réellement couvrantes,
     contrairement à deux simples étagères qui laisseraient le médium intact. */
  var lo1 = ctx.createBiquadFilter(), lo2 = ctx.createBiquadFilter();
  var hi1 = ctx.createBiquadFilter(), hi2 = ctx.createBiquadFilter();
  /* v241 : le Q des passe-bas et passe-haut de l'API est en DÉCIBELS (voir v150).
     Q = 0,7071 y valait 1,085 en linéaire : deux cellules trop pointues, et la
     somme des deux bandes montait de +7,4 dB à 1 kHz, isolateur au centre. Le Q
     de Butterworth (0,7071 linéaire) s'écrit −3,01 dB. */
  var qButterworth = 20 * Math.log10(Math.SQRT1_2);
  [lo1,lo2].forEach(function(f){ f.type = "lowpass"; f.frequency.value = 1000; f.Q.value = qButterworth; });
  [hi1,hi2].forEach(function(f){ f.type = "highpass"; f.frequency.value = 1000; f.Q.value = qButterworth; });
  var gl = ctx.createGain(), gh = ctx.createGain();
  e.connect(lo1); lo1.connect(lo2); lo2.connect(gl); gl.connect(o);
  e.connect(hi1); hi1.connect(hi2); hi2.connect(gh); gh.connect(o);
  o.connect(busSet("vlc") || master);
  VLC.sortie = {e:e, o:o, lo1:lo1, lo2:lo2, hi1:hi1, hi2:hi2, gl:gl, gh:gh, ctx:ctx};
  /* nœuds neufs : poser directement évite une rampe inutile au premier son */
  gl.gain.value = gainIsoVlc(VLC.bass);
  gh.gain.value = gainIsoVlc(VLC.treble);
  return e;
}

/* ---------- réverbération commune, comme sur la machine ---------- */
function reverbVlc(){
  if(VLC.reverb) return VLC.reverb;
  var c = ctx.createConvolver(), g = ctx.createGain();
  var n = Math.floor(ctx.sampleRate * 1.1), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for(var k=0;k<2;k++){
    var d = b.getChannelData(k);
    for(var i=0;i<n;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/n, 2.6);
  }
  c.buffer = b;
  g.gain.value = VLC.reverbMix;
  g.connect(c); c.connect(sortieGeneraleVlc());
  VLC.reverb = g;
  return g;
}
function sortieVlc(k){
  if(!VLC.noeuds[k]){
    var g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    var sortie = sortieGeneraleVlc();
    if(p){ g.connect(p); p.connect(sortie); } else g.connect(sortie);
    VLC.noeuds[k] = {g:g, p:p};
  }
  return VLC.noeuds[k];
}
function v127(x){ return Math.max(0, Math.min(127, x)) / 127; }
function voixVlc(t, k, pas){
  var P = motifVlcCur().parties[k];
  if(!P || P.f.mute) return;
  banqueEs();
  var buf = P.f.reverse ? inverse(P.ech) : ES.buf[P.ech];
  if(!buf) return;
  /* un mouvement enregistré remplace la valeur du potard pour ce pas */
  function val(nom){
    var m = P.mot[nom];
    if(m && pas !== undefined && m[pas] >= 0) return m[pas];
    return P.par[nom];
  }
  var n = sortieVlc(k);
  n.g.gain.setValueAtTime(1, t);
  if(n.p) n.p.pan.setValueAtTime((val("pan") - 64) / 64, t);

  var src = ctx.createBufferSource();
  src.loop = !!P.f.loop;
  var vitesse = Math.pow(2, (val("speed") - 64) / 24);
  var pintMax = (val("pitcheg_int") - 64) / 64;
  /* la vitesse la plus haute atteinte, enveloppe de hauteur comprise */
  poserTampon(src, buf, vitesse * Math.max(1, Math.abs(pintMax) > 0.02 ? Math.pow(2, pintMax * 2) : 1));
  src.playbackRate.setValueAtTime(vitesse, t);
  /* enveloppe de hauteur : intensité, attaque, chute */
  var pint = (val("pitcheg_int") - 64) / 64;
  if(Math.abs(pint) > 0.02){
    var pa = v127(val("pitcheg_attack")) * 0.3, pd = 0.01 + v127(val("pitcheg_decay")) * 0.6;
    src.playbackRate.setValueAtTime(vitesse * Math.pow(2, pint * 2), t);
    if(pa > 0.005) src.playbackRate.linearRampToValueAtTime(vitesse * Math.pow(2, pint * 2), t + pa);
    src.playbackRate.exponentialRampToValueAtTime(Math.max(0.02, vitesse), t + pa + pd);
  }
  var deb = v127(val("start_point")) * buf.duration * 0.95;
  var lg = Math.max(0.02, (buf.duration - deb) * (0.05 + v127(val("length")) * 0.95) / vitesse);
  var atk = v127(val("ampeg_attack")) * 0.25;
  var dec = 0.02 + v127(val("ampeg_decay")) * 1.4;
  var duree = Math.min(lg, atk + dec);

  var lp = ctx.createBiquadFilter(); lp.type = "lowpass";
  lp.frequency.setValueAtTime(180 * Math.pow(100, v127(val("hicut"))), t);
  var g = ctx.createGain();
  var pic = mv("niv", v127(val("level")));
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(pic, t + Math.max(0.002, atk));
  g.gain.setValueAtTime(pic, t + Math.max(0.004, Math.min(duree - 0.01, atk + 0.005)));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.02, duree));

  src.connect(lp); lp.connect(g); g.connect(pasVoie(n.g));
  if(P.f.reverb) g.connect(pasVoie(reverbVlc()));
  src.start(t, Math.min(deb, Math.max(0, buf.duration - 0.01)));
  src.stop(t + duree + 0.05);
  midiNoteA(MIDI.base + k, t, v127(val("level")), MIDI.canal, duree);
}
/* La volca n'a pas d'accent : une frappe est une frappe. REC PAS écrit les
   déclenchements ; MOTION, à côté, enregistre les mouvements de potards —
   ce sont deux choses différentes et elles cohabitent. */
function frapperVlc(k){
  audioInit();
  if(!ctx) return;
  voixVlc(maintenantAudio() + 0.005, k);
  if(S.run && VLC.recPas && !VLC.song){
    var j = pasLePlusProche(VLC.pos, 16);
    if(j >= 0){
      motifVlcCur().parties[k].pas |= (1 << j);
      majVlc(); memVlc();
    }
  }
}

/* ---------- séquenceur ---------- */
/* ACTIVE STEP n'est pas un mute de pas : sur la vraie volca les pas désactivés
   sont sautés. Le séquenceur travaille donc avec un index logique 0..N-1, puis
   le traduit vers l'une des seize touches physiques. */
function pasActifsVlc(){
  var masque = motifVlcCur().actif, r = [];
  for(var i=0;i<16;i++) if(masque & (1 << i)) r.push(i);
  return r.length ? r : [0];
}
function nombrePasActifsVlc(){ return pasActifsVlc().length; }
function pasReelVlc(i){
  var a = pasActifsVlc();
  return a[((i % a.length) + a.length) % a.length];
}
function indexPasVlc(reel){ return pasActifsVlc().indexOf(reel); }
/* SWING : la commande physique retarde les pas pairs jusqu'à 75 %. Avec
   FUNC elle agit dans le sens opposé. Pour ce sens négatif, on retarde l'autre
   moitié de la paire : musicalement c'est le même décalage relatif, sans jamais
   programmer un son dans le passé. */
function tempsSwingVlc(i, t){
  var sw = VLC.swing || 0;
  if(Math.abs(sw) < 0.001) return t;
  var retard = stepDur() * 0.75 * Math.abs(sw);
  if(sw > 0) return (i & 1) ? t + retard : t;
  return (i & 1) ? t : t + retard;
}
function scheduleVlc(i, t){
  if(VLC.song){
    VLC.cur = VLC.chaine[VLC.songPos];
    i = VLC.songStep;
  }
  t = tempsSwingVlc(i, t);
  var CHARGE_N = ouvrirPas();
  var m = motifVlcCur(), reel = pasReelVlc(i);
  for(var k=0;k<10;k++){
    if(m.parties[k].pas & (1 << reel)) CHARGE_N++, voixVlc(t, k, reel);
  }
  /* La file garde l'index logique : beatVlc fait la même traduction. Cela
     reste juste en vue d'ensemble, où draw() lui passe également cet index. */
  if(!cache) queue.push({i:i, t:t});
  if(VLC.song){
    if(!cache){
      VLC.songEvents.push({t:t, reel:reel, motif:VLC.cur, pos:VLC.songPos});
      if(VLC.songEvents.length > 256) VLC.songEvents.shift();
    }
    if(++VLC.songStep >= nombrePasActifsVlc()){
      VLC.songStep = 0;
      VLC.songPos = (VLC.songPos + 1) % VLC.chaine.length;
    }
  }
  attenuerVoie("vlc", CHARGE_N, t);
}
var vlcPas = [];
function beatVlc(i){
  var reel = pasReelVlc(i);
  if(VLC.song && ctx){
    while(VLC.songEvents.length && VLC.songEvents[0].t <= maintenantAudio()){
      var e = VLC.songEvents.shift(); reel = e.reel;
      document.getElementById("vlc-motif").textContent = "PTN " + (e.motif + 1);
      document.getElementById("vlc-song").textContent = "SONG " + (e.pos + 1) + "/" + VLC.chaine.length;
    }
  }
  VLC.pos = reel;
  for(var j=0;j<16;j++) vlcPas[j].classList.toggle("cur", j === reel);
}
function arretVlc(){
  resetSongVlc();
  VLC.pos = -1;
  for(var j=0;j<16;j++) vlcPas[j].classList.remove("cur");
  var b = document.getElementById("vlc-play");
  if(b) b.classList.remove("on");
}
function resetSongVlc(){
  VLC.songPos = 0; VLC.songStep = 0; VLC.songEvents = [];
  if(VLC.song) VLC.cur = VLC.chaine[0];
}
function configSongVlc(){
  if(S.run){ signal("ARRETEZ PLAY POUR MODIFIER SONG"); return; }
  var texte = window.prompt("Ordre des motifs (1 à 10), séparés par des espaces. Jusqu’à 16 positions. Répétez un numéro pour répéter le motif.", VLC.chaine.map(function(n){ return n+1; }).join(" "));
  if(texte === null) return;
  var mots = texte.trim().split(/[\s,;]+/);
  if(!texte.trim() || mots.length > 16 || mots.some(function(n){ return !/^(10|[1-9])$/.test(n); })){
    signal("SONG : 1 A 16 NUMEROS ENTRE 1 ET 10"); return;
  }
  VLC.chaine = mots.map(function(n){ return Number(n)-1; });
  resetSongVlc(); majVlc(); majKnobsVlc(); memVlc();
}
function boucleVlc(){ }
var MACHINE_VLC = {schedule:scheduleVlc, beat:beatVlc, arret:arretVlc, boucle:boucleVlc,
                   longueur:nombrePasActifsVlc};

/* STEP JUMP recale le prochain pas réellement ordonnancé. L'ordonnanceur
   travaille 220 ms en avance : il faut annuler ce qui n'a pas encore commencé,
   sinon on entendrait encore l'ancienne position avant le saut. */
function sauterVlc(reel){
  if(VLC.song){ signal("STEP JUMP : QUITTEZ SONG"); return; }
  var logique = indexPasVlc(reel);
  if(logique < 0){ signal("STEP JUMP : PAS INACTIF"); return; }
  if(!S.run){ signal("STEP JUMP : LANCEZ PLAY"); return; }
  step = logique; queue = [];
  if(MIDI.sync && MIDI.ouvert >= 0){
    signal("STEP JUMP : PAS " + (reel + 1));
    return;                           /* le prochain tic MIDI partira d'ici */
  }
  couperSourcesFutures();
  midiSilence();                     /* aucune note MIDI prévue avant le saut */
  nextT = maintenantAudio() + 0.015;
  tick();
  signal("STEP JUMP : PAS " + (reel + 1));
}

/* ---------- motif au format Korg : 2624 octets ---------- */
var VLC_PISTES_MOTION = {level:1, pan:3, speed:5, ampeg_attack:6, ampeg_decay:7,
  pitcheg_int:8, pitcheg_attack:9, pitcheg_decay:10, start_point:11, length:12, hicut:13};
function octetsVlc(){
  var o = new Uint8Array(VLC_TAILLE), v = new DataView(o.buffer);
  var m = motifVlcCur();
  o[0] = 0x50; o[1] = 0x54; o[2] = 0x53; o[3] = 0x54;          /* PTST */
  v.setUint16(4, VLC_DEVCODE, true);
  v.setUint16(8, m.actif, true);
  for(var k=0;k<10;k++){
    var b = 0x20 + k * VLC_TAILLE_PARTIE, P = m.parties[k];
    var num = parseInt(String(P.ech).replace(/[^0-9]/g, ""), 10);
    v.setUint16(b, isNaN(num) ? k : Math.min(99, num), true);   /* numéro d'échantillon */
    v.setUint16(b + 2, P.pas, true);
    v.setUint16(b + 4, 0, true);
    o[b + 8] = Math.min(127, P.par.level);
    VLC_PARAMS.forEach(function(x, i){ o[b + 9 + i] = Math.min(255, P.par[x[0]]); });
    var f = 0;
    VLC_FONCS.forEach(function(nom, i){ if(P.f[nom]) f |= (1 << i); });
    o[b + 20] = f;
    for(var nom in VLC_PISTES_MOTION){
      var piste = VLC_PISTES_MOTION[nom], mot = P.mot[nom];
      if(!mot) continue;
      for(var s=0;s<16;s++){
        var val = mot[s] >= 0 ? mot[s] : P.par[nom];
        o[b + 32 + piste * 16 + s] = Math.round(Math.min(127, val) * 255 / 127);
      }
    }
  }
  o[VLC_TAILLE - 4] = 0x50; o[VLC_TAILLE - 3] = 0x54;
  o[VLC_TAILLE - 2] = 0x45; o[VLC_TAILLE - 1] = 0x44;          /* PTED */
  return o;
}
function lireOctetsVlc(o){
  if(o.length < VLC_TAILLE) return "fichier trop court : " + o.length + " octets";
  if(!(o[0] === 0x50 && o[1] === 0x54 && o[2] === 0x53 && o[3] === 0x54)) return "en-tête PTST absent";
  var v = new DataView(o.buffer, o.byteOffset, o.byteLength);
  var m = motifVlc(9);
  m.actif = v.getUint16(8, true) || 0xFFFF;
  for(var k=0;k<10;k++){
    var b = 0x20 + k * VLC_TAILLE_PARTIE, P = m.parties[k];
    var num = v.getUint16(b, true);
    if(ES.buf["b" + num]) P.ech = "b" + num;
    P.pas = v.getUint16(b + 2, true);
    VLC_PARAMS.forEach(function(x, i){ P.par[x[0]] = o[b + 9 + i]; });
    P.par.level = o[b + 8] || P.par.level;
    var f = o[b + 20];
    VLC_FONCS.forEach(function(nom, i){ P.f[nom] = !!(f & (1 << i)); });
    for(var nom in VLC_PISTES_MOTION){
      var piste = VLC_PISTES_MOTION[nom], l = [], utile = false;
      for(var s=0;s<16;s++){
        var brut = o[b + 32 + piste * 16 + s];
        l.push(Math.round(brut * 127 / 255));
        if(brut) utile = true;
      }
      if(utile && (f & 1)) P.mot[nom] = l;
    }
  }
  VLC.motifs[VLC.cur] = m;
  return null;
}

/* ---------- interface ---------- */
var VLC_KNOBS = [];
(function construireVlc(){
  var kns = document.getElementById("vlc-kns");
  VLC_PARAMS.forEach(function(x){
    var d = document.createElement("div");
    d.className = "vlc-kn";
    d.id = "vlc-k-" + x[0];
    d.innerHTML = '<div class="bt"><i></i></div><em>' + x[1] + '</em>';
    kns.appendChild(d);
  });
  var dt = document.createElement("div");
  dt.className = "vlc-kn";
  dt.id = "vlc-k-tempo";
  dt.innerHTML = '<div class="bt"><i></i></div><em>TEMPO</em>';
  kns.appendChild(dt);
  [["swing","SWING"],["bass","BASS"],["treble","TREBLE"],["reverbMix","REV MIX"]].forEach(function(x){
    var d2 = document.createElement("div");
    d2.className = "vlc-kn";
    d2.id = "vlc-k-" + x[0];
    d2.innerHTML = '<div class="bt"><i></i></div><em>' + x[1] + '</em>';
    kns.appendChild(d2);
  });

  var ancre = document.getElementById("vlc-motif");
  [["vlc-song","SONG"],["vlc-song-edit","EDIT SONG"]].forEach(function(x){
    var b = document.createElement("button"); b.id=x[0]; b.className="vlcb"; b.textContent=x[1];
    ancre.parentNode.appendChild(b);
  });
  document.getElementById("vlc-song").addEventListener("click", function(){
    if(S.run){ signal("ARRETEZ PLAY POUR CHANGER DE MODE"); return; }
    VLC.song=!VLC.song; resetSongVlc(); majVlc(); majKnobsVlc(); memVlc(); H.inter();
  });
  document.getElementById("vlc-song-edit").addEventListener("click", configSongVlc);
  var parts = document.getElementById("vlc-parts");
  for(var i=0;i<10;i++){
    var b = document.createElement("button");
    b.className = "vlcb";
    b.textContent = "PART " + (i + 1);
    b.dataset.p = i;
    parts.appendChild(b);
  }
  parts.addEventListener("click", function(e){
    var b2 = e.target.closest(".vlcb");
    if(!b2) return;
    VLC.sel = +b2.dataset.p;
    frapperVlc(VLC.sel);
    majVlc(); majKnobsVlc(); H.cran();
  });

  var pas = document.getElementById("vlc-pas");
  for(var j=0;j<16;j++){
    var b3 = document.createElement("button");
    b3.dataset.i = j;
    pas.appendChild(b3);
    vlcPas.push(b3);
  }
  pas.addEventListener("click", function(e){
    var b4 = e.target.closest("button");
    if(!b4) return;
    if(VLC.song && S.run){ signal("ARRETEZ SONG POUR EDITER LES PAS"); return; }
    var i2 = +b4.dataset.i, P = partieVlcSel(), m = motifVlcCur();
    if(VLC.modePas === "active"){
      var bit = 1 << i2;
      if((m.actif & bit) && nombrePasActifsVlc() <= 1){
        signal("ACTIVE STEP : GARDEZ UN PAS");
        return;
      }
      m.actif ^= bit;
      if(S.run && MACHINE === MACHINE_VLC) step %= nombrePasActifsVlc();
      majVlc(); memVlc(); H.cran();
      return;
    }
    if(VLC.modePas === "jump"){
      sauterVlc(i2); H.cran(); return;
    }
    P.pas ^= (1 << i2);
    if(!S.run && (P.pas & (1 << i2))){
      audioInit();
      voixVlc(maintenantAudio() + 0.01, VLC.sel, i2);
    }
    majVlc(); memVlc(); H.cran();
  });
})();

function knobVlc(nom, etiq){
  return knobEm("vlc-k-" + nom, {min:0, max:127,
    get:function(){ return partieVlcSel().par[nom]; },
    set:function(v){
      var P = partieVlcSel();
      P.par[nom] = Math.round(v);
      if(VLC.rec && S.run && VLC.pos >= 0 && !VLC.song){      /* enregistrement de mouvement */
        if(!P.mot[nom]){ P.mot[nom] = []; for(var i=0;i<16;i++) P.mot[nom].push(-1); }
        P.mot[nom][VLC.pos] = Math.round(v);
        P.f.motion = true;
      }
      lcdVlc(String(Math.round(v)), etiq, true);
      memVlc();
    }});
}
VLC_PARAMS.forEach(function(x){ VLC_KNOBS.push(knobVlc(x[0], x[1])); });
var kVlcTempo = knobEm("vlc-k-tempo", {min:0, max:1, get:function(){ return (S.bpm - 50) / 200; },
  set:function(v){ S.bpm = Math.round(50 + v * 200); lcdVlc(String(S.bpm), "TEMPO", true); saveSoon(); }});
var kVlcSwing = knobEm("vlc-k-swing", {min:-1, max:1, get:function(){ return VLC.swing; },
  set:function(v){
    VLC.swing = Math.max(-1, Math.min(1, v));
    var pc = Math.round(VLC.swing * 75);
    lcdVlc((pc > 0 ? "+" : "") + pc + "%", "SWING", true); memVlc();
  }});
var kVlcBass = knobEm("vlc-k-bass", {min:0, max:1, get:function(){ return VLC.bass; },
  set:function(v){ VLC.bass = Math.max(0, Math.min(1, v)); appliquerIsoVlc();
    lcdVlc(texteIsoVlc(VLC.bass), "BASS", true); memVlc(); }});
var kVlcTreble = knobEm("vlc-k-treble", {min:0, max:1, get:function(){ return VLC.treble; },
  set:function(v){ VLC.treble = Math.max(0, Math.min(1, v)); appliquerIsoVlc();
    lcdVlc(texteIsoVlc(VLC.treble), "TREBLE", true); memVlc(); }});
var kVlcReverbMix = knobEm("vlc-k-reverbMix", {min:0, max:1,
  get:function(){ return VLC.reverbMix; },
  set:function(v){ VLC.reverbMix=Math.max(0,Math.min(1,v));
    if(VLC.reverb) lisser(VLC.reverb.gain, VLC.reverbMix, 0.012);
    lcdVlc(Math.round(VLC.reverbMix*100)+"%", "REVERB MIX", true); memVlc(); }});
function majKnobsVlc(){
  VLC_KNOBS.forEach(function(k){ k.maj(); });
  kVlcTempo.maj(); kVlcSwing.maj(); kVlcBass.maj(); kVlcTreble.maj(); kVlcReverbMix.maj();
}

var vlcTmr = null;
function lcdVlc(v, l, fugace){
  var a = document.getElementById("vlc-val"), b = document.getElementById("vlc-lab");
  if(!a) return;
  a.textContent = v; b.textContent = l;
  clearTimeout(vlcTmr);
  if(fugace) vlcTmr = setTimeout(majLcdVlc, 1300);
}
function majLcdVlc(){
  var P = partieVlcSel();
  lcdVlc("P" + (VLC.sel + 1), nomBib(P.ech).slice(0, 14));
}
function majVlc(){
  var P = partieVlcSel(), m = motifVlcCur(), i, zone = document.getElementById("vlc-pas");
  if(zone){
    zone.classList.toggle("mode-active", VLC.modePas === "active");
    zone.classList.toggle("mode-jump", VLC.modePas === "jump");
  }
  for(i=0;i<16;i++){
    var actifPas = !!(m.actif & (1 << i));
    vlcPas[i].classList.toggle("act", !!(P.pas & (1 << i)));
    vlcPas[i].classList.toggle("actif-step", actifPas);
    vlcPas[i].classList.toggle("inactif", !actifPas);
  }
  var ba = document.getElementById("vlc-active"), bj = document.getElementById("vlc-jump");
  if(ba) ba.classList.toggle("on", VLC.modePas === "active");
  if(bj) bj.classList.toggle("on", VLC.modePas === "jump");
  var bs = document.querySelectorAll("#vlc-parts .vlcb");
  for(i=0;i<bs.length;i++) bs[i].classList.toggle("on", i === VLC.sel);
  VLC_FONCS.forEach(function(f){
    var b = document.getElementById("vlc-" + f);
    if(b) b.classList.toggle("on", !!P.f[f]);
  });
  document.getElementById("vlc-motion").classList.toggle("on", VLC.rec || !!P.f.motion);
  document.getElementById("vlc-rec").classList.toggle("on", VLC.recPas);
  document.getElementById("vlc-motif").textContent = "PTN " + (VLC.cur + 1);
  var songButton = document.getElementById("vlc-song");
  songButton.classList.toggle("on", VLC.song);
  songButton.textContent = VLC.song ? "SONG " + (VLC.songPos+1) + "/" + VLC.chaine.length : "SONG";
  majLcdVlc();
}

function memVlc(){
  memoire.vlc = {cur:VLC.cur, sel:VLC.sel, swing:VLC.swing, bass:VLC.bass, treble:VLC.treble,
    reverbMix:VLC.reverbMix, song:VLC.song, chaine:VLC.chaine.slice(),
    motifs:VLC.motifs.map(function(m){
      return {actif:m.actif, parties:m.parties.map(function(P){
        return {ech:P.ech, pas:P.pas, par:P.par, f:P.f, mot:P.mot};
      })};
    })};
  sauverMachine("vlc");
}
function chargerVlc(){
  VLC.motifs = [];
  for(var i=0;i<10;i++) VLC.motifs.push(motifVlc(i < 2 ? i : 9));
  VLC.cur = 0; VLC.sel = 0; VLC.rec = false; VLC.recPas = false; VLC.modePas = "normal";
  VLC.swing = 0; VLC.bass = 0.5; VLC.treble = 0.5;
  VLC.reverbMix=0.34; VLC.song=false; VLC.chaine=[0,1]; resetSongVlc();
  var m = memLire("vlc");
  if(m && m.motifs && m.motifs.length === 10){
    VLC.motifs = m.motifs.map(function(o, n){
      var r = motifVlc(9);
      r.actif = (typeof o.actif === "number") ? o.actif : 0xFFFF;
      (o.parties || []).forEach(function(P, k){
        if(k >= 10) return;
        var d = r.parties[k];
        if(P.ech) d.ech = P.ech;
        d.pas = P.pas || 0;
        if(P.par) for(var q in P.par) if(d.par[q] !== undefined) d.par[q] = P.par[q];
        if(P.f) for(var w in P.f) d.f[w] = !!P.f[w];
        if(P.mot) d.mot = P.mot;
      });
      return r;
    });
    if(Number.isFinite(m.reverbMix)) VLC.reverbMix=Math.max(0,Math.min(1,m.reverbMix));
    if(Array.isArray(m.chaine) && m.chaine.length && m.chaine.length<=16 && m.chaine.every(function(n){ return Number.isInteger(n) && n>=0 && n<10; })) VLC.chaine=m.chaine.slice();
    VLC.song=m.song===true;
    if(typeof m.cur === "number") VLC.cur = m.cur;
    if(typeof m.sel === "number") VLC.sel = m.sel;
    if(typeof m.swing === "number") VLC.swing = Math.max(-1, Math.min(1, m.swing));
    if(typeof m.bass === "number") VLC.bass = Math.max(0, Math.min(1, m.bass));
    if(typeof m.treble === "number") VLC.treble = Math.max(0, Math.min(1, m.treble));
  }
  VLC.cur=Math.max(0,Math.min(9,Math.floor(VLC.cur)||0));
  VLC.sel=Math.max(0,Math.min(9,Math.floor(VLC.sel)||0));
  resetSongVlc();
}

document.getElementById("vlc-play").addEventListener("click", function(){
  audioInit(); banqueEs();
  if(S.run){ stop(); H.stop(); } else { step = 0; start(); H.start(); }
  this.classList.toggle("on", S.run);
});
function choisirModePasVlc(mode){
  VLC.modePas = (VLC.modePas === mode) ? "normal" : mode;
  majVlc(); H.inter();
  if(VLC.modePas === "active") signal("ACTIVE STEP : TOUCHEZ LES PAS A GARDER");
  else if(VLC.modePas === "jump") signal("STEP JUMP : TOUCHEZ UN PAS PENDANT PLAY");
  else signal("PAS : PROGRAMMATION");
}
document.getElementById("vlc-active").addEventListener("click", function(){ choisirModePasVlc("active"); });
document.getElementById("vlc-jump").addEventListener("click", function(){ choisirModePasVlc("jump"); });
VLC_FONCS.forEach(function(f){
  var b = document.getElementById("vlc-" + f);
  if(!b || f === "motion") return;
  b.addEventListener("click", function(){
    var P = partieVlcSel();
    P.f[f] = !P.f[f];
    if(f === "reverse") delete ES.inv[P.ech];
    majVlc(); memVlc(); H.inter();
  });
});
document.getElementById("vlc-motion").addEventListener("click", function(){
  var P = partieVlcSel();
  if(VLC.rec){ VLC.rec = false; signal("MOUVEMENTS : LECTURE"); }
  else if(P.f.motion && !VLC.rec && window.confirm("Effacer les mouvements de cette partie ?")){
    P.mot = {}; P.f.motion = false; signal("MOUVEMENTS EFFACÉS");
  } else {
    VLC.rec = true; signal("TOURNEZ UN POTARD PENDANT LA LECTURE");
  }
  majVlc(); memVlc(); H.inter();
});
document.getElementById("vlc-son").addEventListener("click", function(){
  audioInit(); banqueEs();
  var l = listeEch(), P = partieVlcSel();
  var i = l.indexOf(P.ech);
  P.ech = l[((i < 0 ? 0 : i) + 1) % l.length];
  delete ES.inv[P.ech];
  voixVlc(maintenantAudio() + 0.01, VLC.sel);
  majVlc(); memVlc(); H.cran();
});
document.getElementById("vlc-motif").addEventListener("click", function(){
  if(VLC.song){ signal("QUITTEZ SONG POUR CHOISIR UN MOTIF"); return; }
  memVlc();
  VLC.cur = (VLC.cur + 1) % 10;
  majVlc(); majKnobsVlc(); memVlc(); H.inter();
});
document.getElementById("vlc-export").addEventListener("click", function(){
  var p = HOST;
  if(!p || !p.fichierSauver){ signal("ÉCRITURE IMPOSSIBLE ICI"); return; }
  var o = octetsVlc();
  var nom = "volca-ptn-" + (VLC.cur + 1) + ".dat";
  var chemin = "";
  try{ chemin = p.fichierSauver(nom, octetsVersB64(o)); }catch(e){}
  signal(chemin ? (nom + " · " + o.length + " OCTETS") : "ÉCRITURE REFUSÉE");
  H.inter();
});
document.getElementById("vlc-import").addEventListener("click", function(){
  var p = HOST;
  if(!p || !p.fichierListe){ signal("LECTURE IMPOSSIBLE ICI"); return; }
  var l = bibFichiers(".dat");
  if(!l.length){ signal("AUCUN .dat DANS DOCUMENTS"); return; }
  var liste = l.map(function(f, i){ return (i + 1) + " · " + f.nom; }).join("\n");
  var v = window.prompt("Quel motif charger dans PTN " + (VLC.cur + 1) + " ?\n\n" + liste, "1");
  var n = parseInt(v, 10) - 1;
  if(isNaN(n) || n < 0 || n >= l.length) return;
  var b64 = "";
  try{ b64 = p.fichierCharger(l[n].nom) || ""; }catch(e){}
  if(!b64){ signal("FICHIER ILLISIBLE"); return; }
  var err = lireOctetsVlc(b64VersOctets(b64));
  if(err){ signal("REFUSÉ : " + err.toUpperCase()); return; }
  majVlc(); majKnobsVlc(); memVlc();
  signal("MOTIF CHARGÉ DE " + l[n].nom);
  H.inter();
});
document.getElementById("vlc-rec").addEventListener("click", function(){
  VLC.recPas = !VLC.recPas; majVlc(); H.inter();
  signal(VLC.recPas ? "FRAPPEZ UNE PARTIE PENDANT LA LECTURE" : "ENREGISTREMENT COUPÉ");
});
document.getElementById("vlc-notice").addEventListener("click", function(){ ouvrirNotice(); });

var unitVlc = document.getElementById("unit-vlc");
function activerVlc(){
  stop();
  S.modele = "vlc";
  MACHINE = MACHINE_VLC;
  poserMachine("vlc");
  audioInit(); banqueEs(); chargerEchs();
  chargerVlc();
  debrancherTout(VLC.noeuds); debrancherTout(VLC.reverb); debrancherTout(VLC.sortie);
  VLC.noeuds = []; VLC.reverb = null; VLC.sortie = null;
  majVlc(); majKnobsVlc();
  actif = unitVlc;
  save(); fit(); setTimeout(fit, 120);
}


/* ===================== ELECTRIBE ES-1 ===================== */
var ES_PARTS = [{n:"1/ST."},{n:"2/–"},{n:"3/ST."},{n:"4/–"},{n:"5"},
                {n:"A"},{n:"B"},{n:"A"},{n:"B"},{n:"Acc"}];
var ES_BANQUE = ["KICK","SNARE","CLAP","HAT","OPEN HAT","TOM","COWBELL","RIM",
                 "ZAP","BLIP","NOISE","STAB","BASS","VOX",
                 "KICK 2","SNARE 2","RIMSHOT","CLAVE","SHAKER","CRASH","RIDE","CONGA",
                 "LASER","CHOIR"];

/* --- échantillons de fabrique, calculés point par point --- */
function genEch(i){
  var sr = 44100;
  var durs = [0.42,0.22,0.20,0.06,0.38,0.32,0.28,0.05,0.26,0.10,0.45,0.55,0.55,0.5,
              0.26,0.17,0.05,0.06,0.10,1.20,1.00,0.30,0.26,0.80];
  var dur = durs[i] || 0.3;
  var n = Math.floor(sr*dur), b = ctx.createBuffer(1,n,sr), d = b.getChannelData(0);
  var ph = 0, y = 0, prec = 0, j, t, f, e, x;
  for(j=0;j<n;j++){
    t = j/sr; x = 0;
    if(i===0){                                   /* kick */
      f = 45 + 130*Math.exp(-t*26); ph += 2*Math.PI*f/sr;
      x = Math.sin(ph)*Math.exp(-t*6.5);
    } else if(i===1){                            /* snare */
      ph += 2*Math.PI*190/sr;
      x = 0.5*Math.sin(ph)*Math.exp(-t*20) + (Math.random()*2-1)*Math.exp(-t*24)*0.8;
    } else if(i===2){                            /* clap */
      e = 0;
      [0,0.011,0.022,0.033].forEach(function(o){
        if(t>o) e += Math.exp(-(t-o)*90);
      });
      e += Math.exp(-t*12)*0.25;
      x = (Math.random()*2-1)*Math.min(1,e)*0.9;
      x = x - prec*0.6; prec = x;
    } else if(i===3 || i===4){                   /* charleys */
      e = Math.exp(-t*(i===3?95:9));
      x = (Math.random()*2-1)*e;
      x = x - prec*0.85; prec = x;
    } else if(i===5){                            /* tom */
      f = 110 + 120*Math.exp(-t*12); ph += 2*Math.PI*f/sr;
      x = Math.sin(ph)*Math.exp(-t*9);
    } else if(i===6){                            /* cowbell */
      x = (Math.sign(Math.sin(2*Math.PI*540*t)) + Math.sign(Math.sin(2*Math.PI*800*t)))*0.35*Math.exp(-t*14);
    } else if(i===7){                            /* rim */
      x = Math.sign(Math.sin(2*Math.PI*1700*t))*Math.exp(-t*120)*0.7;
    } else if(i===8){                            /* zap */
      f = 80 + 1300*Math.exp(-t*14); ph += 2*Math.PI*f/sr;
      x = ((ph/(2*Math.PI))%1*2-1)*Math.exp(-t*11);
    } else if(i===9){                            /* blip */
      x = Math.sin(2*Math.PI*1800*t)*Math.exp(-t*30);
    } else if(i===10){                           /* bruit balayé */
      y += (0.01 + 0.25*Math.exp(-t*6))*((Math.random()*2-1) - y);
      x = y*Math.exp(-t*4)*1.6;
    } else if(i===11){                           /* stab : accord */
      x = (Math.sin(2*Math.PI*220*t) + Math.sin(2*Math.PI*277*t) + Math.sin(2*Math.PI*330*t))*0.28;
      x *= Math.exp(-t*7);
      x = Math.tanh(x*2);
    } else if(i===12){                           /* basse */
      f = 55; ph += 2*Math.PI*f/sr;
      x = ((ph/(2*Math.PI))%1*2-1);
      y += 0.06*(x-y); x = y*Math.exp(-t*3.2)*1.4;
    } else if(i===14){                           /* kick 2 : plus sec */
      f = 52 + 210*Math.exp(-t*42); ph += 2*Math.PI*f/sr;
      x = Math.sin(ph)*Math.exp(-t*12) + (Math.random()*2-1)*Math.exp(-t*160)*0.35;
    } else if(i===15){                           /* snare 2 : plus clair */
      ph += 2*Math.PI*240/sr;
      x = 0.4*Math.sin(ph)*Math.exp(-t*26) + (Math.random()*2-1)*Math.exp(-t*30)*0.9;
      x = x - prec*0.5; prec = x;
    } else if(i===16){                           /* rimshot */
      x = Math.sign(Math.sin(2*Math.PI*1450*t))*Math.exp(-t*150)*0.6
        + (Math.random()*2-1)*Math.exp(-t*220)*0.5;
    } else if(i===17){                           /* clave */
      x = Math.sin(2*Math.PI*2350*t)*Math.exp(-t*55)*0.8;
    } else if(i===18){                           /* shaker */
      e = Math.min(1, t*90)*Math.exp(-t*38);
      x = (Math.random()*2-1)*e;
      x = x - prec*0.9; prec = x;
    } else if(i===19){                           /* crash */
      y += 0.65*((Math.random()*2-1) - y);
      x = ((Math.random()*2-1) - y)*Math.exp(-t*2.6);
      x += Math.sin(2*Math.PI*3100*t)*Math.exp(-t*3)*0.12;
    } else if(i===20){                           /* ride */
      x = 0;
      [1,1.41,1.93,2.62,3.31].forEach(function(r){ x += Math.sin(2*Math.PI*520*r*t)/5; });
      x = x*Math.exp(-t*2.2)*0.7 + (Math.random()*2-1)*Math.exp(-t*22)*0.2;
    } else if(i===21){                           /* conga */
      f = 200 + 90*Math.exp(-t*18); ph += 2*Math.PI*f/sr;
      x = Math.sin(ph)*Math.exp(-t*11)*0.9;
    } else if(i===22){                           /* laser */
      f = 140 + 2600*t*t*40; ph += 2*Math.PI*Math.min(8000,f)/sr;
      x = Math.sign(Math.sin(ph))*Math.exp(-t*9)*0.5;
    } else if(i===23){                           /* choeur */
      x = 0;
      [1,1.26,1.5].forEach(function(r){
        x += (Math.sin(2*Math.PI*196*r*t) + 0.5*Math.sin(2*Math.PI*392*r*t))/3;
      });
      x *= (0.55+0.45*Math.sin(2*Math.PI*4.5*t))*Math.exp(-t*2.2)*0.55;
    } else {                                     /* voix : deux formants */
      x = (Math.sin(2*Math.PI*700*t)*0.6 + Math.sin(2*Math.PI*1180*t)*0.4)
          * (0.6+0.4*Math.sin(2*Math.PI*5.5*t)) * Math.exp(-t*3.4)
          * (0.5+0.5*Math.sin(2*Math.PI*110*t));
    }
    d[j] = Math.max(-1, Math.min(1, x*0.9));
  }
  return b;
}

/* --- état --- */
function sonEs(){
  return {ech:"b0", pitch:0, filt:1, lvl:0.8, pan:0, rev:false, roll:false, fx:false, slice:false};
}
function motifEs(n){
  var p = {sw:0, len:16, rollN:4, st:[], son:[], mot:[]};
  for(var k=0;k<10;k++){ p.st.push(ligneVide()); p.son.push(sonEs()); p.mot.push(null); }
  ["b0","b1","b2","b3","b4","b5","b6","b7","b11","b0"].forEach(function(e,k){ p.son[k].ech=e; });
  function met(k,s){ s.split("").forEach(function(c,i){ if(c!=="." && c!==" ") p.st[k][i]=1; }); }
  if(n===0){ met(0,"x...x...x...x..."); met(1,"....x.......x..."); met(3,"..x...x...x...x."); met(9,"x...x...x...x..."); }
  else if(n===1){ met(0,"x..x..x...x.x..."); met(2,"....x.......x..."); met(3,"xxxxxxxxxxxxxxxx"); met(4,"......x.......x."); }
  else if(n===2){ met(0,"x.......x......."); met(1,"....x.......x..."); met(8,"..x.......x....."); met(5,"............x..."); }
  return p;
}
var ES = {
  pat: motifEs(0), slots: [], cur:0, sel:0, param:0, mode:0,
  rec:false, shift:false, protect:false, clip:null,
  song:[], spos:0, ssel:0, pos:-1,
  dDep:0.2, dTime:0.3, bpmSync:true, ech:0, v:1, mute:[], solo:[],
  buf:{}, inv:{}, noms:{}, noeuds:[]
};
for(var sz=0; sz<16; sz++) ES.slots.push(motifEs(sz<3?sz:9));

function banqueEs(){
  for(var i=0;i<ES_BANQUE.length;i++){
    if(!ES.buf["b"+i]) ES.buf["b"+i] = genEch(i);
  }
}
/* Une étiquette « LED + texte » dont le texte vient de l'extérieur (v132) :
   la LED est posée en HTML fixe, le texte en nœud texte. */
function texteApresLed(el, texte){
  if(!el) return;
  el.innerHTML = "<i></i>";
  el.appendChild(document.createTextNode(String(texte)));
}
function nomEch(id){
  if(!id) return "---";
  if(BIB && BIB.noms && BIB.noms[id]) return BIB.noms[id];
  if(id.charAt(0)==="b") return ES_BANQUE[+id.slice(1)] || "---";
  return (ES.noms[id] === "fichier" ? "FICHIER " : "MIC ") + id.slice(-3).toUpperCase();
}
function listeEch(){
  var l = [];
  for(var i=0;i<ES_BANQUE.length;i++) l.push("b"+i);
  for(var k in ES.buf) if(k.charAt(0)!=="b") l.push(k);
  return l;
}
function inverse(id){
  if(ES.inv[id]) return ES.inv[id];
  var b = ES.buf[id]; if(!b) return null;
  var n = b.length, r = ctx.createBuffer(1,n,b.sampleRate);
  var s = b.getChannelData(0), d = r.getChannelData(0);
  for(var i=0;i<n;i++) d[i] = s[n-1-i];
  ES.inv[id] = r;
  return r;
}

/* --- sortie --- */
function sortieEs(k,t){
  if(!ES.noeuds[k]){
    var g = ctx.createGain(), pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    var s = ctx.createGain();
    if(pn){ g.connect(pn); pn.connect(busSet("es") || master); } else { g.connect(busSet("es") || master); }
    busEffets();
    g.connect(s); s.connect(fxIn);
    var s2 = ctx.createGain(); g.connect(s2); s2.connect(dlyIn);
    ES.noeuds[k] = {g:g, p:pn, s:s, d:s2};
  }
  var n = ES.noeuds[k], son = ES.pat.son[k];
  var quand = (t === undefined) ? maintenantAudio() : t;
  var niv = mv("lvl", son.lvl), pano = mv("pan", son.pan);
  var lisse = !!(MOT && MOT.lisse);
  n.g.gain.cancelScheduledValues(quand);
  n.g.gain.setValueAtTime(niv, quand);
  if(lisse && MOT.p==="lvl") n.g.gain.linearRampToValueAtTime(MOT.suiv, quand+stepDur());
  if(n.p){
    n.p.pan.cancelScheduledValues(quand);
    n.p.pan.setValueAtTime(pano, quand);
    if(lisse && MOT.p==="pan") n.p.pan.linearRampToValueAtTime(MOT.suiv, quand+stepDur());
  }
  n.s.gain.setValueAtTime(son.fx ? 0.9 : 0, quand);
  n.d.gain.setValueAtTime(ES.dDep*0.6, quand);
  return n.g;
}
function jouerEs(t,k,vel,pas){
  var son = ES.pat.son[k];
  var buf = son.rev ? inverse(son.ech) : ES.buf[son.ech];
  if(!buf) return;
  var dest = pasVoie(sortieEs(k,t));
  var src = ctx.createBufferSource();
  src.playbackRate.value = Math.pow(2, mv("pitch", son.pitch)*2);
  poserTampon(src, buf, src.playbackRate.value);
  var f = ctx.createBiquadFilter(); f.type="lowpass";
  f.frequency.value = Math.min(18000, 140*Math.pow(120, mv("filt", son.filt)));
  var g = ctx.createGain();
  var duree = son.slice ? (buf.duration/16)/src.playbackRate.value
                        : buf.duration/src.playbackRate.value;
  /* petite attaque et petite chute : sans elles, une tranche claque à chaque bout */
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.8*vel, t+0.003);
  g.gain.setValueAtTime(0.8*vel, t+Math.max(0.006, duree-0.006));
  g.gain.linearRampToValueAtTime(0.0001, t+Math.max(0.008, duree));
  src.connect(f); f.connect(g); g.connect(dest);
  if(son.slice){
    var dc = buf.duration/16;
    src.start(t, (pas%16)*dc, dc*1.08);
  } else src.start(t);
  src.stop(t + duree + 0.05);
}

/* --- séquenceur --- */
function motionEs(k,i){
  var m = ES.pat.mot[k];
  if(!m || !m.mode || !m.v) return null;
  var L = ES.pat.len||16, v = m.v[i];
  if(typeof v !== "number") return null;
  var su = m.v[(i+1)%L];
  return {p:m.p, v:v, suiv:(typeof su==="number"?su:v), lisse:m.mode===1};
}
function enregMotionEs(champ, val){
  var k = ES.sel, m = ES.pat.mot[k];
  if(!m || !m.mode) return;
  if(!ES.rec || !S.run || ES.pos < 0){ m.p = champ; return; }
  if(m.p !== champ || !m.v){ m.p = champ; m.v = []; for(var i=0;i<16;i++) m.v.push(val); }
  m.v[ES.pos] = val;
}
function scheduleEs(i,t){
  var CHARGE_N = ouvrirPas();
  var p = ES.pat;
  if(p.sw && i%2===1) t += stepDur()*p.sw*0.55;
  var acc = p.st[9][i];
  var velAcc = velAccent(p.son[9].lvl);
  var soloActif = false, q;
  for(q=0;q<9;q++) if(ES.solo[q]) soloActif = true;
  for(var k=0;k<9;k++){
    if(!p.st[k][i]) continue;
    if(ES.mute[k]) continue;
    if(soloActif && !ES.solo[k]) continue;
    MOT = motionEs(k,i);
    var n = p.son[k].roll ? (p.rollN||4) : 1;
    for(var j=0;j<n;j++) CHARGE_N++, jouerEs(t + j*stepDur()/n, k, acc?velAcc:0.75, i);
    midiNoteA(MIDI.base+k, t, acc?velAcc:0.75, MIDI.canal);
    MOT = null;
  }
  if(!cache) queue.push({i:i,t:t});
  attenuerVoie("es", CHARGE_N, t);
}
var esBeats=[], esKeys=[];
function beatEs(i){
  ES.pos = i;
  if(ES.mode===1){
    for(var q=0;q<16;q++){ esBeats[q].classList.toggle("on", q===ES.spos); esKeys[q].classList.remove("cur"); }
    return;
  }
  for(var j=0;j<16;j++){
    esBeats[j].classList.toggle("on", j===i);
    esKeys[j].classList.toggle("cur", j===i);
  }
}
function arretEs(){
  ES.pos=-1;
  var pb=document.getElementById("es-play"); if(pb) pb.classList.remove("on");
  for(var j=0;j<16;j++){ esBeats[j].classList.remove("on"); esKeys[j].classList.remove("cur"); }
}
function boucleEs(){
  if(ES.mode!==1 || !ES.song.length) return;
  ES.spos=(ES.spos+1)%ES.song.length;
  ES.cur=ES.song[ES.spos]; ES.pat=ES.slots[ES.cur];
  majTouchesEs(); majKnobsEs(); majLedsEs();
  lcdEs(("00"+(ES.cur+1)).slice(-3), "SONG "+(ES.spos+1), true);
}
var MACHINE_ES = {schedule:scheduleEs, beat:beatEs, arret:arretEs, boucle:boucleEs,
                  longueur:function(){ return ES.pat.len||16; }};

/* --- afficheur --- */
var esVal=document.getElementById("es-val"), esLab=document.getElementById("es-lab"), esTmr=null;
function lcdEs(v,l,fugace){
  esVal.textContent=v; esLab.textContent=l;
  clearTimeout(esTmr);
  if(fugace) esTmr=setTimeout(majLcdEs,1400);
}
function majLcdEs(){
  if(ES.param===1) lcdEs(String(S.bpm),"TEMPO");
  else if(ES.param===2) lcdEs(nomEch(ES.pat.son[ES.sel].ech), "SAMPLE");
  else lcdEs(("00"+(ES.cur+1)).slice(-3),"PATTERN");
}

/* --- enregistrement et import --- */
var ES_REC = {mr:null};
function majSampling(){
  document.getElementById("es-sampling").classList.toggle("on", !!ES_REC.mr);
}
function reduireEch(buf, srCible, maxSec){
  var n0 = buf.length, sr0 = buf.sampleRate;
  var canaux = buf.numberOfChannels, src0 = buf.getChannelData(0);
  var src1 = canaux>1 ? buf.getChannelData(1) : null;
  var dureeMax = Math.min(buf.duration, maxSec);
  var n = Math.floor(dureeMax*srCible);
  var out = ctx.createBuffer(1, Math.max(1,n), srCible), d = out.getChannelData(0);
  var r = sr0/srCible, crete = 0.0001;
  for(var i=0;i<n;i++){
    var x = i*r, a = Math.floor(x), f = x-a;
    var v0 = src0[a]||0, v1 = src0[a+1]||v0;
    var v = v0+(v1-v0)*f;
    if(src1){ var w0=src1[a]||0, w1=src1[a+1]||w0; v = (v + w0+(w1-w0)*f)*0.5; }
    d[i]=v; if(Math.abs(v)>crete) crete=Math.abs(v);
  }
  if(crete>0.02){ var gg=0.92/crete; for(var j=0;j<n;j++) d[j]*=gg; }
  return out;
}
function wavDe(buf){
  var n=buf.length, sr=buf.sampleRate, d=buf.getChannelData(0);
  var ab=new ArrayBuffer(44+n*2), v=new DataView(ab), i;
  function txt(o,s){ for(var q=0;q<s.length;q++) v.setUint8(o+q, s.charCodeAt(q)); }
  txt(0,"RIFF"); v.setUint32(4,36+n*2,true); txt(8,"WAVEfmt ");
  v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
  v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true);
  txt(36,"data"); v.setUint32(40,n*2,true);
  for(i=0;i<n;i++){
    var s=Math.max(-1,Math.min(1,d[i]));
    v.setInt16(44+i*2, s<0 ? s*0x8000 : s*0x7FFF, true);
  }
  return ab;
}
function b64De(ab){
  var o=new Uint8Array(ab), s="", pas=0x8000;
  for(var i=0;i<o.length;i+=pas) s += String.fromCharCode.apply(null, o.subarray(i, i+pas));
  return btoa(s);
}
function sauverEch(id, buf){
  if(PROJET_EN_COURS) return false;
  var p = HOST;
  if(!p || !p.echSauver) return false;
  var ok = false;
  try{ ok = !!p.echSauver(id, b64De(wavDe(buf))); }catch(e){ ok = false; }
  if(!ok) signal("ÉCHEC D'ÉCRITURE · SON PERDU AU REDÉMARRAGE");
  return ok;
}
/* v170 : les banques Kaoss peuvent réutiliser ces sons. Deux ouvertures de
   panneau ne doivent pas lancer deux décodages concurrents du même fichier. */
var ES_CHARGES = Object.create(null);
function actualiserEchs(){
  majLedsEs();
  if(typeof MC !== "undefined" && MC && S.modele === "mc") majMc();
  if(typeof KP !== "undefined" && KP && S.modele === "kp") majKp();
  var bib = document.getElementById("bib");
  if(bib && bib.classList.contains("show")) majBibUI();
}
function chargerEchs(){
  var p = HOST;
  if(!ctx || !p || !p.echListe || !p.echCharger) return;
  var l = "";
  try{ l = p.echListe() || ""; }catch(e){}
  l.split("\n").forEach(function(id){
    if(!id || ES.buf[id] || (ES_CHARGES[id] && ES_CHARGES[id].ctx === ctx)) return;
    var b64 = "";
    try{ b64 = p.echCharger(id) || ""; }catch(e){}
    if(!b64) return;
    var token = {ctx:ctx}; ES_CHARGES[id] = token;
    function finir(buf){
      if(ES_CHARGES[id] !== token) return;      /* supprimé ou rechargé entre-temps */
      delete ES_CHARGES[id];
      if(buf && !ES.buf[id]){                  /* conserver un son déjà remplacé ou traité */
        ES.buf[id]=buf;
        if(ES.noms[id]===undefined) ES.noms[id]="mic";
      }
      actualiserEchs();                        /* jamais de lancement automatique */
    }
    try{
      var bin = atob(b64), ab = new ArrayBuffer(bin.length), o = new Uint8Array(ab);
      for(var i=0;i<bin.length;i++) o[i]=bin.charCodeAt(i);
      var decode = token.ctx.decodeAudioData(ab, finir, function(){ finir(null); });
      /* La promesse peut être rejetée en plus du rappel d'erreur. */
      if(decode && decode.catch) decode.catch(function(){ finir(null); });
    }catch(e){ finir(null); }
  });
}
/* Un son peut servir dans les motifs Electribe/Volca, les MPC et le Kaoss. */
function usagesEch(id){
  var n = 0;
  function compter(slots){
    if(!Array.isArray(slots)) return;
    slots.forEach(function(p){
      var sons = p && p.son;
      if(!Array.isArray(sons)) return;
      sons.forEach(function(so){ if(so && so.ech === id) n++; });
    });
  }
  if(S.modele === "es1" || S.modele === "es2") compter(ES.slots);
  if(S.modele === "esx") compter(SX.slots);
  ["es1","es2","esx"].forEach(function(k){
    if(k === S.modele) return;
    var m = memLire(k);
    if(m && m.slots) compter(m.slots);
  });
  ["mpc3000","mpc2000"].forEach(function(k){
    var m = S.modele === k && typeof MPC !== "undefined" ? MPC : memLire(k);
    if(m && Array.isArray(m.pads)) m.pads.forEach(function(p){ if(p && p.ech === id) n++; });
  });
  var v = S.modele === "vlc" && typeof VLC !== "undefined" ? VLC : memLire("vlc");
  if(v && Array.isArray(v.motifs)) v.motifs.forEach(function(m){
    if(m && Array.isArray(m.parties)) m.parties.forEach(function(p){ if(p && p.ech === id) n++; });
  });
  var km = S.modele === "kp" && typeof KP !== "undefined" && KP ? KP : memLire("kp");
  if(km && Array.isArray(km.banques)) km.banques.forEach(function(b){ if(b && b.ech === id) n++; });
  var mc = S.modele === "mc" && typeof MC !== "undefined" ? MC : memLire("mc");
  if(mc && Array.isArray(mc.pistes)) mc.pistes.forEach(function(p){ if(p && p.ech === id) n++; });
  return n;
}
function supprimerEch(id){
  if(typeof PROJET_EN_COURS !== "undefined" && PROJET_EN_COURS) return;
  delete ES_CHARGES[id];
  var p = HOST;
  if(p && p.echSupprimer) try{ p.echSupprimer(id); }catch(e){}
  delete ES.buf[id]; delete ES.inv[id]; delete ES.noms[id];
  if(typeof KP !== "undefined" && KP){
    KP.banques.forEach(function(b, k){
      if(b.ech !== id) return;
      arreterBanqueKp(k); KP.tranches[k] = null;
    });
  }
  actualiserEchs();
}

function poserEch(k, buf, quoi){
  if(PROJET_EN_COURS) return;
  if(ES.protect){ lcdEs("PRT","PROTECT",true); return; }
  if(S.modele !== "es1" && S.modele !== "es2"){ signal("MACHINE CHANGÉE · SON NON AFFECTÉ"); return; }
  var court = reduireEch(buf, 32000, 6);
  var id = "u" + Date.now().toString(36);
  ES.buf[id] = court; ES.noms[id] = quoi;
  ES.pat.son[k].ech = id;
  delete ES.inv[id];
  sauverEch(id, court);
  majLedsEs(); memEs();
  lcdEs(nomEch(id), quoi==="fichier" ? "IMPORT" : "SAMPLING", true);
  H.inter();
}
function echantillonner(){
  if(ES_REC.mr){ try{ ES_REC.mr.stop(); }catch(e){} return; }
  audioInit(); banqueEs();
  var p = HOST;
  if(p && p.micro){
    var ok = false;
    try{ ok = !!p.micro(); }catch(e){}
    if(!ok){ lcdEs("MIC","AUTORISEZ PUIS RETOUCHEZ",true); return; }
  }
  if(!navigator.mediaDevices || !window.MediaRecorder){ lcdEs("ERR","MICRO INDISPONIBLE",true); return; }
  var cible = ES.sel;                      /* la destination est figée au départ */
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(flux){
    var morceaux = [], mr = new MediaRecorder(flux), minuteur = null;
    ES_REC.mr = mr; majSampling();
    lcdEs("REC","SAMPLING",false);
    mr.ondataavailable = function(e){ if(e.data && e.data.size) morceaux.push(e.data); };
    mr.onstop = function(){
      clearTimeout(minuteur);
      flux.getTracks().forEach(function(t){ t.stop(); });
      if(ES_REC.mr === mr) ES_REC.mr = null;
      majSampling();
      new Blob(morceaux).arrayBuffer().then(function(ab){
        return new Promise(function(res, rej){ ctx.decodeAudioData(ab, res, rej); });
      }).then(function(buf){ poserEch(cible, buf, "mic"); })
        .catch(function(){ lcdEs("ERR","DÉCODAGE",true); });
    };
    mr.start();
    /* le minuteur ne peut arrêter que sa propre prise */
    minuteur = setTimeout(function(){ if(ES_REC.mr === mr) try{ mr.stop(); }catch(e){} }, 6000);
  }).catch(function(){ lcdEs("ERR","MICRO REFUSE",true); });
}

/* --- construction --- */
(function construireEs(){
  var i,b;
  var C1=["Pattern","Tempo","Sample","Motion Dest.","Motion Value"];
  var C2=["Song","Tempo","Position","Pattern",""];
  var C3=["Sample","Start","End","Fadeout","Memory"];
  var C4=["Metronome","Clock","MIDI ch","Note No.","Audio In Mode"];
  var bp=document.getElementById("es-params");
  for(i=0;i<5;i++){
    [[C1[i], i<3 ? 1:0],[C2[i],0],[C3[i],0],[C4[i],0]].forEach(function(c){
      var u=document.createElement("u");
      if(!c[0]){ u.innerHTML="&nbsp;"; bp.appendChild(u); return; }
      u.innerHTML='<i></i>'+c[0];
      if(c[1]){ u.dataset.p=i; if(i===0) u.className="on"; } else u.className="no";
      bp.appendChild(u);
    });
  }
  bp.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u || u.dataset.p===undefined) return;
    ES.param=+u.dataset.p;
    var us=bp.querySelectorAll("u[data-p]");
    for(var j=0;j<us.length;j++) us[j].classList.toggle("on", +us[j].dataset.p===ES.param);
    majLcdEs(); H.cran();
  });

  var bt=document.getElementById("es-types");
  construireTypesEs(1);
  bt.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u) return;
    EM.fxType=+u.dataset.t; construireFx(); majLedsEs();
    teleEs1(-1, "fxType", EXC_FX_ES1[EM.fxType] || 0);
    lcdEs(String(EM.fxType+1), FX_NOMS[EM.fxType].toUpperCase(), true); H.cran();
  });

  var bpa=document.getElementById("es-parts"), bs=document.getElementById("es-sous");
  ES_PARTS.forEach(function(pp,k){
    var b2=document.createElement("button"); b2.className="btn"; b2.dataset.k=k; b2.textContent="";
    bpa.appendChild(b2);
    var sp=document.createElement("span"); sp.textContent=pp.n; bs.appendChild(sp);
  });
  bpa.addEventListener("click", function(e){
    var b2=e.target.closest(".btn"); if(!b2) return;
    choisirEs(+b2.dataset.k);
  });
  bpa.addEventListener("pointerdown", function(e){
    var b2=e.target.closest(".btn"); if(!b2) return;
    var k=+b2.dataset.k;
    if(!ctx) audioInit();
    banqueEs(); busEffets();
    if(k<9) jouerEs(maintenantAudio()+0.01, k, 1, ES.pos>=0?ES.pos:0);
    if(ES.rec && S.run && ES.pos>=0 && !ES.protect){
      var j=(ES.pos+1)%(ES.pat.len||16);
      ES.pat.st[k][j]=1;
      if(k===ES.sel) majTouchesEs();
      memEs();
    }
  });

  var bb=document.getElementById("es-beats"), bk=document.getElementById("es-keys");
  for(i=0;i<16;i++){
    var d=document.createElement("i"); if(i%4===0) d.className="b4";
    bb.appendChild(d); esBeats.push(d);
    b=document.createElement("button"); b.className="btn"; b.textContent=String(i+1); b.dataset.i=i;
    bk.appendChild(b); esKeys.push(b);
  }
  bk.addEventListener("click", function(e){
    var b2=e.target.closest(".btn"); if(!b2) return;
    var i2=+b2.dataset.i;
    if(ES.shift){ shiftEs(i2); return; }
    if(ES.pset){ allerMotifEs(i2); return; }
    if(ES.mode===1){ songEs(i2); return; }
    if(ES.protect){ lcdEs("PRT","PROTECT",true); return; }
    var p=ES.pat, k=ES.sel;
    p.st[k][i2] = p.st[k][i2] ? 0 : 1;
    majTouchesEs(); memEs(); H.cran();
  });
})();

function construireTypesEs(v){
  var bt = document.getElementById("es-types");
  bt.innerHTML = "";
  var liste = (v===2) ? FX_ES2 : [0,1,2,3,4,5,6,7,8,9,10];
  liste.forEach(function(idx){
    var u=document.createElement("u"); u.innerHTML='<i></i>'+FX_NOMS[idx]; u.dataset.t=idx;
    bt.appendChild(u);
  });
  if(liste.indexOf(EM.fxType) < 0){ EM.fxType = liste[0]; construireFx(); }
}
function choisirEs(k){
  ES.sel=k;
  var bs=document.querySelectorAll("#es-parts .btn");
  for(var j=0;j<bs.length;j++) bs[j].classList.toggle("on", +bs[j].dataset.k===k);
  majTouchesEs(); majKnobsEs(); majLedsEs();
  lcdEs(ES_PARTS[k].n, k===9 ? "ACCENT" : nomEch(ES.pat.son[k].ech), true);
  H.cran();
}
function majTouchesEs(){
  var p=ES.pat, k=ES.sel, i;
  if(ES.pset){
    for(i=0;i<16;i++){
      esKeys[i].textContent = ("0"+(i+1)).slice(-2);
      esKeys[i].classList.toggle("act", i === ES.cur);
      esKeys[i].classList.remove("sel","hors");
    }
    return;
  }
  if(ES.mode===1){
    for(i=0;i<16;i++){
      var v=ES.song[i];
      esKeys[i].textContent=(v===undefined)?"–":("0"+(v+1)).slice(-2);
      esKeys[i].classList.toggle("act", v!==undefined && i!==ES.spos);
      esKeys[i].classList.toggle("sel", i===ES.ssel);
      esKeys[i].classList.toggle("hors", v===undefined);
    }
    return;
  }
  for(i=0;i<16;i++){
    esKeys[i].textContent=String(i+1);
    esKeys[i].classList.toggle("act", !!p.st[k][i]);
    esKeys[i].classList.remove("sel");
    esKeys[i].classList.toggle("hors", i >= (p.len||16));
    esBeats[i].classList.toggle("hors", i >= (p.len||16));
  }
}
function majLedsEs(){
  var son=ES.pat.son[ES.sel];
  document.getElementById("es-slice").classList.toggle("on", son.slice);
  document.getElementById("es-rev").classList.toggle("on", son.rev);
  document.getElementById("es-fx").classList.toggle("on", son.fx);
  document.getElementById("es-roll").classList.toggle("on", son.roll);
  document.getElementById("es-bpmsync").classList.toggle("on", ES.bpmSync);
  var m=ES.pat.mot[ES.sel], mode=m?m.mode||0:0;
  document.getElementById("es-smooth").classList.toggle("on", mode===1);
  document.getElementById("es-trig").classList.toggle("on", mode===2);
  document.getElementById("es-mseq").classList.toggle("on", mode!==0);
  document.getElementById("es-mute").classList.toggle("on", !!ES.mute[ES.sel]);
  document.getElementById("es-solo").classList.toggle("on", !!ES.solo[ES.sel]);
  var bs=document.querySelectorAll("#es-parts .btn");
  for(var j=0;j<bs.length;j++){
    var kk=+bs[j].dataset.k, mm=ES.pat.mot[kk];
    bs[j].classList.toggle("mot", !!(mm && mm.mode));
    bs[j].classList.toggle("vide", (kk<9 && !ES.buf[ES.pat.son[kk].ech]) || !!ES.mute[kk]);
  }
  var us=document.querySelectorAll("#es-types u");
  for(var q=0;q<us.length;q++) us[q].classList.toggle("on", +us[q].dataset.t===EM.fxType);
}
function majDelaiEs(){
  if(!dlyNode) return;
  var t = ES.bpmSync ? (60/S.bpm)*[0.25,0.375,0.5,0.75,1][Math.min(4,Math.floor(ES.dTime*5))]
                     : 0.03 + ES.dTime*1.1;
  dlyNode.delayTime.setTargetAtTime(Math.min(1.1,t), maintenantAudio(), 0.05);
  if(dlyIn) dlyIn.gain.setTargetAtTime(ES.dDep*0.6, maintenantAudio(), 0.05);
  if(dlyFb) dlyFb.gain.setTargetAtTime(0.12+ES.dDep*0.48, maintenantAudio(), 0.05);
}

/* --- mémoire --- */
function serEs(p){
  return {sw:p.sw, len:p.len, rollN:p.rollN, son:p.son, mot:p.mot,
          st:p.st.map(function(l){ return l.join(""); })};
}
function memEs(){
  memoire["es"+ES.v] = {cur:ES.cur, song:ES.song.slice(), sel:ES.sel, noms:ES.noms,
                 dDep:ES.dDep, dTime:ES.dTime, bpmSync:ES.bpmSync,
                 slots:ES.slots.map(serEs)};
  memoire["es"+ES.v].slots[ES.cur] = serEs(ES.pat);
  sauverMachine("es"+ES.v);
}
function chargerEs(){
  ES.slots = [];
  for(var z=0; z<16; z++) ES.slots.push(motifEs(z<3?z:9));
  ES.cur=0; ES.sel=0; ES.song=[]; ES.mute=[]; ES.solo=[]; ES.pat=ES.slots[0];
  var m=memLire("es"+ES.v);
  if(!m) return;
  if(m.slots && m.slots.length===16){
    ES.slots = m.slots.map(function(o){
      var p=motifEs(9);
      p.sw=o.sw||0; p.len=o.len||16; p.rollN=o.rollN||4;
      if(o.st) o.st.forEach(function(s,k){ for(var i=0;i<16;i++) p.st[k][i]=s.charAt(i)==="1"?1:0; });
      if(o.son) p.son=o.son;
      if(o.mot) p.mot=o.mot;
      return p;
    });
  }
  if(m.song && m.song.length) ES.song=m.song.slice();
  if(m.noms) ES.noms=m.noms;
  ["cur","sel","dDep","dTime"].forEach(function(c){ if(typeof m[c]==="number") ES[c]=m[c]; });
  if(typeof m.bpmSync==="boolean") ES.bpmSync=m.bpmSync;
  ES.pat=ES.slots[ES.cur];
}

/* --- boutons rotatifs --- */
function knobEs(id, champ, min, max, nom){
  return knobEm(id, {min:min,max:max,
    get:function(){ return ES.pat.son[ES.sel][champ]; },
    set:function(v){
      ES.pat.son[ES.sel][champ]=v; enregMotionEs(champ,v);
      teleEs1(ES.sel, champ, v);
      lcdEs(String(Math.round(v*127)), nom, true);
    }});
}
var kEsVol = knobEm("es-k-vol",{min:0,max:1,get:function(){return S.vol;},set:function(v){
  S.vol=v; if(master) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
  lcdEs(String(Math.round(v*100)),"VOLUME",true); saveSoon();
}});
var kEsPitch = knobEs("es-k-pitch","pitch",-1,1,"PITCH/SPEED");
var kEsFilt  = knobEs("es-k-filt","filt",0,1,"FILTER");
var kEsLvl   = knobEs("es-k-lvl","lvl",0,1,"LEVEL");
var kEsPan   = knobEs("es-k-pan","pan",-1,1,"PAN");
var kEsE1 = knobEm("es-k-e1",{min:0,max:1,get:function(){return EM.e1;},
  set:function(v){ EM.e1=v; construireFx(); teleEs1(-1,"e1",v); lcdEs(String(Math.round(v*127)),"EDIT 1",true); }});
var kEsE2 = knobEm("es-k-e2",{min:0,max:1,get:function(){return EM.e2;},
  set:function(v){ EM.e2=v; construireFx(); teleEs1(-1,"e2",v); lcdEs(String(Math.round(v*127)),"EDIT 2",true); }});
var kEsDDep = knobEm("es-k-ddep",{min:0,max:1,get:function(){return ES.dDep;},
  set:function(v){ ES.dDep=v; majDelaiEs(); teleEs1(-1,"dDep",v); lcdEs(String(Math.round(v*127)),"DELAY DEPTH",true); }});
var kEsDTime = knobEm("es-k-dtime",{min:0,max:1,get:function(){return ES.dTime;},
  set:function(v){ ES.dTime=v; majDelaiEs(); teleEs1(-1,"dTime",v); lcdEs(String(Math.round(v*127)),"DELAY TIME",true); }});
function majKnobsEs(){ [kEsPitch,kEsFilt,kEsLvl,kEsPan].forEach(function(k){ k.maj(); }); }

/* --- molette --- */
(function moletteEs(){
  var el=document.getElementById("es-dial"), st={drag:false,y0:0};
  el.addEventListener("pointerdown", function(e){ st.drag=true; st.y0=e.clientY; el.setPointerCapture(e.pointerId); e.preventDefault(); });
  el.addEventListener("pointermove", function(e){
    if(!st.drag || PINCE) return;
    var d=st.y0-e.clientY; if(Math.abs(d)<12) return;
    st.y0=e.clientY; pasEs(d>0?1:-1);
  });
  el.addEventListener("pointerup", function(){ st.drag=false; memEs(); });
  el.addEventListener("pointercancel", function(){ st.drag=false; });
  function pasEs(d){
    if(ES.mode===1 && ES.song.length && ES.param===0){
      ES.song[ES.ssel]=(ES.song[ES.ssel]+d+16)%16;
      majTouchesEs(); memEs(); lcdEs(("00"+(ES.song[ES.ssel]+1)).slice(-3),"SONG "+(ES.ssel+1)); H.cran(); return;
    }
    if(ES.param===1){ S.bpm=Math.max(40,Math.min(220,S.bpm+d)); majDelaiEs(); }
    else if(ES.param===2){
      banqueEs();
      var l=listeEch(), k=ES.sel;
      if(k>8){ lcdEs("---","ACCENT",true); return; }
      var idx=l.indexOf(ES.pat.son[k].ech);
      idx=((idx<0?0:idx)+d+l.length)%l.length;
      ES.pat.son[k].ech=l[idx]; memEs(); majLedsEs();
      lcdEs(nomEch(l[idx]),"SAMPLE"); H.cran(); return;
    }
    else {
      memEs();
      ES.cur=(ES.cur+d+16)%16; ES.pat=ES.slots[ES.cur];
      majTouchesEs(); majKnobsEs(); majLedsEs();
    }
    majLcdEs(); H.cran();
  }
  ES.pas=pasEs;
  document.getElementById("es-prev").addEventListener("click", function(){ pasEs(-1); });
  document.getElementById("es-next").addEventListener("click", function(){ pasEs(1); });
})();

/* --- boutons --- */
function basculeEs(id, champ, nom){
  document.getElementById(id).addEventListener("click", function(){
    var s=ES.pat.son[ES.sel];
    s[champ]=!s[champ];
    if(champ==="rev") delete ES.inv[s.ech];
    majLedsEs(); memEs(); H.cran();
    lcdEs(s[champ]?"ON":"OFF", nom, true);
  });
}
basculeEs("es-slice","slice","SLICE");
basculeEs("es-rev","rev","REVERSE");
basculeEs("es-fx","fx","EFFECT");
basculeEs("es-roll","roll","ROLL");
document.getElementById("es-mute").addEventListener("click", function(){
  var k=ES.sel; if(k>8) return;
  ES.mute[k]=!ES.mute[k]; majLedsEs(); H.inter();
  lcdEs(ES.mute[k]?"MUT":"ON", "PART MUTE", true);
});
document.getElementById("es-solo").addEventListener("click", function(){
  var k=ES.sel; if(k>8) return;
  ES.solo[k]=!ES.solo[k]; majLedsEs(); H.inter();
  lcdEs(ES.solo[k]?"SOL":"OFF", "SOLO", true);
});
document.getElementById("es-bpmsync").addEventListener("click", function(){
  ES.bpmSync=!ES.bpmSync; majLedsEs(); majDelaiEs(); memEs(); H.inter();
  lcdEs(ES.bpmSync?"SYN":"FRE","BPM SYNC",true);
});
document.getElementById("es-mseq").addEventListener("click", function(){
  var k=ES.sel, m=ES.pat.mot[k];
  if(!m) m=ES.pat.mot[k]={mode:0,p:"lvl",v:null};
  m.mode=(m.mode+1)%3;
  if(m.mode && !m.v){ m.v=[]; for(var i=0;i<16;i++) m.v.push(ES.pat.son[k][m.p]); }
  majLedsEs(); memEs(); H.inter();
  lcdEs(m.mode===0?"OFF":(m.mode===1?"SMTH":"HOLD"), "MOTION · "+m.p.toUpperCase(), true);
});
document.getElementById("es-sampling").addEventListener("click", function(){ echantillonner(); });
document.getElementById("es-import").addEventListener("click", function(){
  audioInit(); banqueEs();
  document.getElementById("es-fichier").click();
});
document.getElementById("es-fichier").addEventListener("change", function(){
  var f=this.files && this.files[0]; if(!f) return;
  if(f.size > 40*1024*1024){ signal("FICHIER TROP GROS · 40 Mo AU PLUS"); this.value=""; return; }
  var cible = ES.sel;
  lcdEs("...","IMPORT",false);
  f.arrayBuffer().then(function(ab){
    return new Promise(function(res,rej){ ctx.decodeAudioData(ab,res,rej); });
  }).then(function(buf){ poserEch(cible, buf, "fichier"); })
    .catch(function(){ lcdEs("ERR","FICHIER ILLISIBLE",true); });
  this.value="";
});
function allerMotifEs(i){
  memEs();
  ES.cur = i; ES.pat = ES.slots[i];
  majTouchesEs(); majKnobsEs(); majLedsEs(); majLcdEs();
  lcdEs(("00"+(i+1)).slice(-3), "PATTERN", true); H.inter();
}
document.getElementById("es-pset").addEventListener("click", function(){
  ES.pset = !ES.pset;
  this.classList.toggle("on", ES.pset);
  majTouchesEs();
  lcdEs(ES.pset ? "SET" : "---", ES.pset ? "TOUCHE = MOTIF" : "PATTERN", true);
  H.inter();
});
document.getElementById("es-shift").addEventListener("click", function(){
  ES.shift=!ES.shift; this.classList.toggle("on", ES.shift);
  lcdEs(ES.shift?"SHF":"---", ES.shift?"SHIFT":"PATTERN", true); H.cran();
});
document.getElementById("es-erase").addEventListener("click", function(){
  if(ES.protect){ lcdEs("PRT","PROTECT",true); return; }
  if(ES.mode===1){
    if(ES.song.length){ ES.song.splice(ES.ssel,1); ES.ssel=Math.max(0,Math.min(ES.ssel,ES.song.length-1)); majTouchesEs(); memEs(); lcdEs("DEL","SONG",true); }
    return;
  }
  ES.pat.st[ES.sel]=ligneVide(); majTouchesEs(); memEs(); lcdEs("CLR","CLEAR PART",true); H.inter();
});
document.getElementById("es-write").addEventListener("click", function(){
  if(ES.protect){ lcdEs("PRT","PROTECT",true); return; }
  ES.slots[ES.cur]=ES.pat; memEs(); writeMem();
  lcdEs("SAVE","PATTERN "+(ES.cur+1),true); H.inter();
});
var esModes=document.querySelectorAll("[data-esmode]");
for(var sm=0; sm<esModes.length; sm++){
  esModes[sm].addEventListener("click", function(){
    var m=+this.dataset.esmode;
    for(var j=0;j<esModes.length;j++) esModes[j].classList.toggle("on", +esModes[j].dataset.esmode===m);
    ES.mode=m;
    if(m===1){
      ES.spos=0; ES.ssel=0;
      if(ES.song.length){ ES.cur=ES.song[0]; ES.pat=ES.slots[ES.cur]; }
      majTouchesEs(); majKnobsEs();
      lcdEs(ES.song.length?("00"+(ES.cur+1)).slice(-3):"---","SONG",true);
    } else if(m===2){
      ES.param=2; banqueEs();
      var us=document.querySelectorAll("#es-params u[data-p]");
      for(var q=0;q<us.length;q++) us[q].classList.toggle("on", +us[q].dataset.p===2);
      majLcdEs();
    } else if(m===3){
      ouvrirNotice();
      lcdEs("MIDI","GLOBAL",true);
    } else { majTouchesEs(); majLcdEs(); }
    H.cran();
  });
}
document.getElementById("es-play").addEventListener("click", function(){
  audioInit(); banqueEs(); busEffets(); majDelaiEs();
  if(S.run){ stop(); H.stop(); } else { start(); H.start(); }
  this.classList.toggle("on", S.run);
});
document.getElementById("es-stop").addEventListener("click", function(){
  stop(); step=0; H.stop();
  document.getElementById("es-play").classList.remove("on");
});
document.getElementById("es-rec").addEventListener("click", function(){
  ES.rec=!ES.rec; this.classList.toggle("on", ES.rec);
  lcdEs(ES.rec?"REC":"---", ES.rec?"TAP RECORD":"PATTERN", true); H.inter();
});
var esTaps=[];
document.getElementById("es-tap").addEventListener("click", function(){
  var now=Date.now();
  if(esTaps.length && now-esTaps[esTaps.length-1]>2200) esTaps=[];
  esTaps.push(now); if(esTaps.length>5) esTaps.shift();
  if(esTaps.length<2){ lcdEs("TAP","TEMPO",true); H.cran(); return; }
  var s=0; for(var i=1;i<esTaps.length;i++) s+=esTaps[i]-esTaps[i-1];
  var bpm=Math.round(60000/(s/(esTaps.length-1)));
  if(bpm>=40&&bpm<=220){ S.bpm=bpm; majDelaiEs(); lcdEs(String(bpm),"TEMPO",true); saveSoon(); }
  H.cran();
});
document.getElementById("es-notice").addEventListener("click", function(){
  ouvrirNotice();
});
function songEs(i){
  if(ES.protect){ lcdEs("PRT","PROTECT",true); return; }
  if(i > ES.song.length){ lcdEs("---","SONG",true); H.cran(); return; }
  if(i === ES.song.length) ES.song.push(ES.cur);
  ES.ssel=i; majTouchesEs(); memEs(); H.cran();
  lcdEs(("00"+(ES.song[i]+1)).slice(-3),"SONG "+(i+1),true);
}
function shiftEs(i){
  var p=ES.pat, k=ES.sel, v, n, son=p.son[k], buf=ES.buf[son.ech];
  if(ES.protect && i!==15){ lcdEs("PRT","PROTECT",true); H.cran(); return; }
  if(i===0){ v=[4,8,12,16]; n=(v.indexOf(p.len)+1)%4; p.len=v[n]; majTouchesEs(); memEs(); lcdEs(String(p.len),"LENGTH",true); }
  else if(i===1){ p.sw = p.sw ? 0 : 0.33; memEs(); lcdEs(p.sw?"x12":"x16","SCALE",true); }
  else if(i===2){ v=[0,0.15,0.25,0.37,0.5]; n=(v.indexOf(p.sw)+1)%v.length; p.sw=v[n]; memEs();
                  lcdEs(Math.round(p.sw*100)+"%","SWING",true); }
  else if(i===3){ v=[2,3,4,6]; n=(v.indexOf(p.rollN)+1)%v.length; p.rollN=v[n]; memEs(); lcdEs("x"+p.rollN,"ROLL TYPE",true); }
  else if(i===4){ ES.clip={st:p.st[k].slice(), son:JSON.parse(JSON.stringify(son))}; lcdEs("CPY","COPY PART",true); }
  else if(i===5){ p.mot[k]=null; majLedsEs(); memEs(); lcdEs("CLR","CLEAR MOTION",true); }
  else if(i===6){ p.st[k]=ligneVide(); majTouchesEs(); memEs(); lcdEs("CLR","CLEAR PART",true); }
  else if(i===7){
    var su=(ES.cur+1)%16;
    ES.slots[ES.cur]=p;
    var np=motifEs(9);
    np.sw=p.sw; np.len=p.len; np.rollN=p.rollN;
    np.st=p.st.map(function(l){return l.slice();});
    np.son=JSON.parse(JSON.stringify(p.son));
    ES.slots[su]=np; ES.cur=su; ES.pat=np;
    majTouchesEs(); majKnobsEs(); majLedsEs(); memEs();
    lcdEs(("00"+(su+1)).slice(-3),"INSERT PATTERN",true);
  }
  else if(i===8){ ES.pat=motifEs(9); ES.slots[ES.cur]=ES.pat; majTouchesEs(); majKnobsEs(); majLedsEs(); memEs(); lcdEs("DEL","DELETE PATTERN",true); }
  else if(i===9){ ES.song=[]; ES.spos=0; ES.ssel=0; if(ES.mode===1) majTouchesEs(); memEs(); lcdEs("CLR","CLEAR SONG",true); }
  else if(i===10){                                  /* Normalize */
    if(buf){
      var d=buf.getChannelData(0), c=0.0001, q;
      for(q=0;q<d.length;q++) if(Math.abs(d[q])>c) c=Math.abs(d[q]);
      var g=0.95/c;
      for(q=0;q<d.length;q++) d[q]*=g;
      delete ES.inv[son.ech];
      if(son.ech.charAt(0)!=="b") sauverEch(son.ech, buf);
      lcdEs("NRM","NORMALIZE",true);
    } else lcdEs("---","NORMALIZE",true);
  }
  else if(i===11){                                  /* Truncate : coupe le silence de fin */
    if(buf){
      var dd=buf.getChannelData(0), fin=dd.length-1;
      while(fin>100 && Math.abs(dd[fin])<0.004) fin--;
      if(fin>100 && fin<dd.length-200){
        var nb=ctx.createBuffer(1,fin+1,buf.sampleRate), nd=nb.getChannelData(0);
        for(var z=0;z<=fin;z++) nd[z]=dd[z];
        ES.buf[son.ech]=nb; delete ES.inv[son.ech];
        if(son.ech.charAt(0)!=="b") sauverEch(son.ech, nb);
      }
      lcdEs("TRC","TRUNCATE",true);
    } else lcdEs("---","TRUNCATE",true);
  }
  else if(i===12){ son.slice=!son.slice; majLedsEs(); memEs(); lcdEs(son.slice?"ON":"OFF","TIME SLICE",true); }
  else if(i===13){                                  /* Delete Sample */
    var idEs = son.ech;
    son.ech = "b0";
    if(idEs.charAt(0) !== "b"){
      var nEs = usagesEch(idEs);
      if(nEs > 0){
        signal("SON ENCORE UTILISÉ " + nEs + " FOIS · RETIRÉ DE CETTE PARTIE SEULEMENT");
        lcdEs("KEEP","DELETE SAMPLE",true);
      } else {
        supprimerEch(idEs);
        lcdEs("DEL","DELETE SAMPLE",true);
      }
    } else lcdEs("DEL","DELETE SAMPLE",true);
    majLedsEs(); memEs();
  }
  else if(i===14){ lcdEs("---","CARD : À VENIR",true); }
  else { ES.protect=!ES.protect; lcdEs(ES.protect?"ON":"OFF","PROTECT",true); }
  H.cran();
}

var unitEs = document.getElementById("unit-es1");
function activerEs(v){
  stop();
  ES.v = (v===2) ? 2 : 1;
  S.modele = "es" + ES.v;
  MACHINE=MACHINE_ES;
  poserMachine("es1", ES.v===2 ? "mk2" : null);
  audioInit(); banqueEs(); busEffets(); chargerEchs();
  construireTypesEs(ES.v);
  chargerEs();
  document.getElementById("es-notice").textContent = ES.v===2 ? "ES-1 mkII" : "ES-1";
  choisirEs(ES.sel||0);
  majTouchesEs(); majKnobsEs(); majLedsEs(); majLcdEs(); kEsVol.maj(); majDelaiEs();
  actif = unitEs;
  save(); fit(); setTimeout(fit,120);
}

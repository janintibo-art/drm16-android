/* ===================== ELECTRIBE ER-1 ===================== */
var ER_PARTS = [
  {n:"1", t:"perc"}, {n:"2", t:"perc"}, {n:"3", t:"perc"}, {n:"4", t:"perc"},
  {n:"1", t:"bruit"}, {n:"2", t:"bruit"},
  {n:"Close", t:"hhc"}, {n:"Open", t:"hho"},
  {n:"Crash", t:"crash"}, {n:"Clap", t:"clap"},
  {n:"Acc", t:"accent"}
];
var ER_ONDES = ["SINE","TRI"];
var ER_MODS  = ["SINE","SQR","TRI","SAW UP","SAW DN","NOISE"];

function sonUsine(i){
  var s = {pitch:0.45, modD:0, modS:0.3, wave:0, modT:4, dec:0.35, lvl:0.8, pan:0, boost:0, ring:false, pcm:0};
  if(i===0){ s.pitch=0.04; s.modD=0.6; s.modS=0.1; s.modT=4; s.dec=0.4; s.lvl=0.95; s.boost=0.5; }
  else if(i===1){ s.pitch=0.3; s.modD=0.35; s.modS=0.55; s.modT=5; s.dec=0.25; s.wave=1; }
  else if(i===2){ s.pitch=0.55; s.modD=0.2; s.modS=0.75; s.modT=0; s.dec=0.2; s.pan=-0.35; }
  else if(i===3){ s.pitch=0.7; s.modD=0.5; s.modS=0.9; s.modT=1; s.dec=0.15; s.pan=0.35; }
  else if(i===4){ s.pitch=0.7; s.dec=0.12; s.lvl=0.75; s.pcm=2; }
  else if(i===5){ s.pitch=0.35; s.dec=0.3; s.lvl=0.55; s.pcm=11; }
  else if(i===6){ s.dec=0.12; s.lvl=0.85; }
  else if(i===7){ s.dec=0.5; s.lvl=0.7; }
  else if(i===8){ s.dec=0.7; s.lvl=0.5; }
  else if(i===9){ s.dec=0.3; s.lvl=0.7; }
  return s;
}
function motifEr(n){
  var p = {sw:0, len:16, st:[], son:[], mot:[]};
  for(var k=0;k<11;k++){ p.st.push(ligneVide()); p.son.push(sonUsine(k)); p.mot.push(null); }
  function met(k,s){ s.split("").forEach(function(c,i){ if(c!=="." && c!==" ") p.st[k][i]=1; }); }
  if(n===0){
    met(0,"x...x...x...x..."); met(1,"....x.......x...");
    met(6,"..x...x...x...x."); met(10,"x...x...x...x...");
  } else if(n===1){
    met(0,"x..x..x...x.x..."); met(9,"....x.......x...");
    met(6,"xxxxxxxxxxxxxxxx"); met(7,"......x.......x.");
    met(2,"..........x....."); p.sw=0.18;
  } else if(n===2){
    met(0,"x.......x......."); met(1,"....x.......x...");
    met(3,"..x.x.....x.x..."); met(4,"x.x.x.x.x.x.x.x.");
    met(8,"x...............");
  }
  return p;
}

var ER = {
  pat: motifEr(0), slots: [], cur:0, sel:0, param:0, mode:0,
  rec:false, shift:false, protect:false, clip:null,
  song:[], spos:0, ssel:0, pos:-1, pasSel:-1, son:0, v:1, pset:false, mute:[], solo:[],
  dDep:0.25, dTime:0.3, dTempo:false, dMot:false,
  noeuds:[], ohGain:null
};
for(var ez=0; ez<16; ez++) ER.slots.push(motifEr(ez<3?ez:9));

/* --- sortie d'une partie --- */
function sortieEr(k,t){
  if(!ER.noeuds[k]){
    var g = ctx.createGain(), pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    var s = ctx.createGain(), ls = ctx.createBiquadFilter();
    ls.type = "lowshelf"; ls.frequency.value = 95;
    g.connect(ls);
    if(pn){ ls.connect(pn); pn.connect(busSet("er") || master); } else { ls.connect(busSet("er") || master); }
    busEffets();
    ls.connect(s); s.connect(dlyIn);
    ER.noeuds[k] = {g:g, p:pn, s:s, ls:ls};
  }
  var n = ER.noeuds[k], son = ER.pat.son[k];
  var quand = (t === undefined) ? maintenantAudio() : t;
  var niv = mv("lvl", son.lvl), pano = mv("pan", son.pan), bst = mv("boost", son.boost);
  var lisse = !!(MOT && MOT.lisse);
  n.g.gain.cancelScheduledValues(quand);
  n.g.gain.setValueAtTime(niv, quand);
  if(lisse && MOT.p === "lvl") n.g.gain.linearRampToValueAtTime(MOT.suiv, quand + stepDur());
  if(n.p){
    n.p.pan.cancelScheduledValues(quand);
    n.p.pan.setValueAtTime(pano, quand);
    if(lisse && MOT.p === "pan") n.p.pan.linearRampToValueAtTime(MOT.suiv, quand + stepDur());
  }
  n.ls.gain.setValueAtTime(bst*15, quand);
  n.s.gain.setValueAtTime(ER.dDep*0.7, quand);
  return n.g;
}

/* --- voix de l'ER-1 --- */
function freqEr(p){ return 40*Math.pow(48, p); }
function voixEr(t,k,vel){
  var son = ER.pat.son[k], typ = ER_PARTS[k].t, dest = pasVoie(sortieEr(k,t));
  var dec = 0.03 + mv("dec", son.dec)*1.4;
  var g = ctx.createGain();
  if(typ === "clap"){ jouerVoix("cp", t, vel, dest); return; }
  if(typ === "crash"){
    var om=outMix; outMix=dest; metal(t, 0.4+son.dec*1.8, 5200, 0.5*vel, 36); outMix=om; return;
  }
  if(typ === "hhc" || typ === "hho"){
    var om2 = outMix; outMix = dest;
    var gh = metal(t, typ==="hhc" ? 0.02+son.dec*0.2 : 0.1+son.dec*0.9, 7600, 0.55*vel, 42);
    outMix = om2;
    if(typ === "hho") ER.ohGain = gh;
    else if(ER.ohGain){
      try{
        ER.ohGain.gain.cancelScheduledValues(t);
        ER.ohGain.gain.setTargetAtTime(0.0001, t, 0.004);
      }catch(e){}
      ER.ohGain = null;
    }
    return;
  }
  if(typ === "bruit" && ER.v === 2){            /* mkII : parties PCM */
    banqueEs();
    var bufp = ES.buf["b"+(son.pcm||0)];
    if(!bufp) return;
    var sp = ctx.createBufferSource();
    sp.playbackRate.value = Math.pow(2, (mv("pitch", son.pitch)-0.5)*2.4);
    poserTampon(sp, bufp, sp.playbackRate.value);
    var gp = ctx.createGain();
    env(gp, t, 0.7*vel, Math.max(0.05, dec), 0.002);
    sp.connect(gp); gp.connect(dest);
    sp.start(t); sp.stop(t + dec + 0.05);
    return;
  }
  if(typ === "bruit"){
    var f = ctx.createBiquadFilter(); f.type="bandpass";
    f.frequency.value = 180 + mv("pitch", son.pitch)*6000;
    f.Q.value = 1 + son.modD*14;
    var sN = ctx.createBufferSource(); sN.buffer = noiseBuf; sN.loop = true;
    env(g, t, 0.55*vel, dec, 0.002);
    sN.connect(f); f.connect(g); g.connect(dest);
    sN.start(t); sN.stop(t+dec+0.05);
    return;
  }
  /* percussion synthétisée : oscillateur + modulation */
  var f0 = freqEr(mv("pitch", son.pitch));
  var o = ctx.createOscillator();
  o.type = son.wave ? "triangle" : "sine";
  o.frequency.setValueAtTime(f0, t);
  var prof = mv("modD", son.modD), vit = mv("modS", son.modS);
  if(prof > 0.01){
    if(son.modT === 4){                       /* saw dn : chute de hauteur */
      o.frequency.exponentialRampToValueAtTime(Math.max(24, f0*(1-0.93*prof)), t + 0.01 + (1-vit)*0.25);
    } else if(son.modT === 3){                /* saw up : montée */
      o.frequency.exponentialRampToValueAtTime(f0*(1+6*prof), t + 0.01 + (1-vit)*0.25);
    } else if(son.modT === 5){                /* bruit : hauteur aléatoire par petits paliers */
      var pasM = Math.max(0.004, 0.05 - vit*0.045);
      for(var q=0;q<Math.min(30, dec/pasM);q++)
        o.frequency.setValueAtTime(Math.max(30, f0*(1 + (Math.random()*2-1)*prof*1.6)), t+q*pasM);
    } else {
      var lfo = ctx.createOscillator();
      lfo.type = ["sine","square","triangle"][son.modT] || "sine";
      lfo.frequency.value = 0.5 + vit*160;
      var lg = ctx.createGain(); lg.gain.value = f0*2.2*prof;
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t); lfo.stop(t+dec+0.1);
    }
  }
  env(g, t, 0.6*vel, dec, 0.002);
  if(son.ring){
    var partenaire = ER.pat.son[k^1];
    var rg = ctx.createGain(); rg.gain.value = 0;
    var ro = ctx.createOscillator(); ro.type = "sine";
    ro.frequency.value = freqEr(partenaire.pitch);
    ro.connect(rg.gain); ro.start(t); ro.stop(t+dec+0.1);
    o.connect(rg); rg.connect(g);
  } else {
    o.connect(g);
  }
  g.connect(dest);
  o.start(t); o.stop(t + dec + 0.1);
}

/* --- séquenceur --- */
function motionEr(k,i){
  var m = ER.pat.mot[k];
  if(!m || !m.mode || !m.v) return null;
  var L = ER.pat.len||16, v = m.v[i];
  if(typeof v !== "number") return null;
  var su = m.v[(i+1)%L];
  return {p:m.p, v:v, suiv:(typeof su==="number"?su:v), lisse:m.mode===1};
}
function enregMotionEr(champ, val){
  var k = ER.sel, m = ER.pat.mot[k];
  if(!m || !m.mode) return;
  if(!ER.rec || !S.run || ER.pos < 0){ m.p = champ; return; }
  if(m.p !== champ || !m.v){
    m.p = champ; m.v = [];
    for(var i=0;i<16;i++) m.v.push(val);
  }
  m.v[ER.pos] = val;
}
function appliquerMotFxEr(v, champ){
  if(champ === "dDep"){ ER.dDep = v; if(dlyIn) ctp(dlyIn.gain, v*0.6, 0.05); }
  else { ER.dTime = v; majDelaiEr(); }
}
function scheduleEr(i,t){
  var CHARGE_N = ouvrirPas();
  var p = ER.pat;
  var vfx = motFxValeur(p.motFx, i, p.len);
  if(vfx !== null) appliquerMotFxEr(vfx, p.motFx.p);
  if(p.sw && i%2===1) t += stepDur()*p.sw*0.55;
  var acc = p.st[10][i];
  var soloEr = false, q;
  for(q=0;q<10;q++) if(ER.solo[q]) soloEr = true;
  for(var k=0;k<10;k++){
    if(!p.st[k][i]) continue;
    if(ER.mute[k]) continue;
    if(soloEr && !ER.solo[k]) continue;
    MOT = motionEr(k,i);
    var velEr = acc ? velAccent(p.son[10].lvl) : 0.72;
    CHARGE_N++, voixEr(t, k, velEr);
    midiNoteA(MIDI.base+k, t, velEr, MIDI.canal);
    MOT = null;
  }
  if(!cache) queue.push({i:i,t:t});
  attenuerVoie("er", CHARGE_N, t);
}
var erBeats = [], erKeys = [];
function beatEr(i){
  ER.pos = i;
  if(ER.mode === 1){
    for(var q=0;q<16;q++){ erBeats[q].classList.toggle("on", q===ER.spos); erKeys[q].classList.remove("cur"); }
    return;
  }
  for(var j=0;j<16;j++){
    erBeats[j].classList.toggle("on", j===i);
    erKeys[j].classList.toggle("cur", j===i);
  }
}
function arretEr(){
  ER.pos = -1;
  var pb = document.getElementById("er-play"); if(pb) pb.classList.remove("on");
  for(var j=0;j<16;j++){ erBeats[j].classList.remove("on"); erKeys[j].classList.remove("cur"); }
}
function boucleEr(){
  if(ER.mode !== 1 || !ER.song.length) return;
  ER.spos = (ER.spos+1) % ER.song.length;
  ER.cur = ER.song[ER.spos];
  ER.pat = ER.slots[ER.cur];
  majTouchesEr(); majKnobsEr();
  lcdEr(("00"+(ER.cur+1)).slice(-3), "SONG "+(ER.spos+1), true);
}
var MACHINE_ER = {schedule:scheduleEr, beat:beatEr, arret:arretEr, boucle:boucleEr,
                  longueur:function(){ return ER.pat.len||16; }};

/* --- afficheur --- */
var erVal = document.getElementById("er-val"), erLab = document.getElementById("er-lab"), erTmr=null;
function lcdEr(v,l,fugace){
  erVal.textContent = v; erLab.textContent = l;
  clearTimeout(erTmr);
  if(fugace) erTmr = setTimeout(majLcdEr, 1200);
}
function majLcdEr(){
  if(ER.param===2){
    if(ER.v===2 && ER_PARTS[ER.sel].t==="bruit") lcdEr(ES_BANQUE[ER.pat.son[ER.sel].pcm||0], "PCM");
    else lcdEr(ER_SONS[ER.son||0].n, "SOUND");
  }
  else if(ER.param===1) lcdEr(String(S.bpm), "TEMPO");
  else lcdEr(("00"+(ER.cur+1)).slice(-3), "PATTERN");
}

/* --- construction --- */
(function construireEr(){
  var i, b;
  var C1=["Pattern","Tempo","Sound","",""], C2=["Song","Tempo","Position","Pattern",""];
  var C3=["Metronome","Input Gain 1","Input Gain 2","Clock","Protect"];
  var C4=["MIDI ch","Note No.","Dump","MIDI Filter",""];
  var bp = document.getElementById("er-params");
  for(i=0;i<5;i++){
    [[C1[i],1],[C2[i],0],[C3[i],0],[C4[i],0]].forEach(function(c){
      var u=document.createElement("u");
      if(!c[0]){ u.innerHTML="&nbsp;"; bp.appendChild(u); return; }
      u.innerHTML='<i></i>'+c[0];
      if(c[1]){ u.dataset.p=i; if(i===0) u.className="on"; } else u.className="no";
      bp.appendChild(u);
    });
  }
  bp.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u || u.dataset.p===undefined) return;
    ER.param = +u.dataset.p;
    var us=bp.querySelectorAll("u[data-p]");
    for(var j=0;j<us.length;j++) us[j].classList.toggle("on", +us[j].dataset.p===ER.param);
    majLcdEr(); H.cran();
  });

  var bpart = document.getElementById("er-parts"), bsous = document.getElementById("er-sous");
  ER_PARTS.forEach(function(pp,k){
    var bt=document.createElement("button");
    bt.className="btn"; bt.dataset.k=k; bt.textContent="";
    bpart.appendChild(bt);
    var s=document.createElement("span"); s.textContent=pp.n; bsous.appendChild(s);
  });
  bpart.addEventListener("click", function(e){
    var bt=e.target.closest(".btn"); if(!bt) return;
    choisirEr(+bt.dataset.k);
  });
  bpart.addEventListener("pointerdown", function(e){
    var bt=e.target.closest(".btn"); if(!bt) return;
    var k=+bt.dataset.k;
    if(!ctx) audioInit();
    busEffets();
    if(ER_PARTS[k].t !== "accent") voixEr(maintenantAudio()+0.01, k, 1);
    if(ER.rec && S.run && ER.pos>=0 && !ER.protect){
      var j=(ER.pos+1)%(ER.pat.len||16);
      ER.pat.st[k][j]=1;
      if(k===ER.sel) majTouchesEr();
      memEr();
    }
  });

  var bb=document.getElementById("er-beats"), bk=document.getElementById("er-keys");
  for(i=0;i<16;i++){
    var d=document.createElement("i"); if(i%4===0) d.className="b4";
    bb.appendChild(d); erBeats.push(d);
    b=document.createElement("button"); b.className="btn"; b.textContent=String(i+1); b.dataset.i=i;
    bk.appendChild(b); erKeys.push(b);
  }
  bk.addEventListener("click", function(e){
    var bt=e.target.closest(".btn"); if(!bt) return;
    var i=+bt.dataset.i;
    if(ER.shift){ shiftEr(i); return; }
    if(ER.pset){ allerMotifEr(i); return; }
    if(ER.mode===1){ songEr(i); return; }
    if(ER.protect){ lcdEr("PRT","PROTECT",true); return; }
    var p=ER.pat, k=ER.sel;
    p.st[k][i] = p.st[k][i] ? 0 : 1;
    ER.pasSel = i;
    majTouchesEr(); memEr(); H.cran();
  });
})();

function choisirEr(k){
  ER.sel = k; ER.pasSel = -1;
  var bs = document.querySelectorAll("#er-parts .btn");
  for(var j=0;j<bs.length;j++) bs[j].classList.toggle("on", +bs[j].dataset.k===k);
  majTouchesEr(); majKnobsEr(); majLedsEr();
  lcdEr(ER_PARTS[k].n, nomPartieEr(k), true);
  H.cran();
}
function nomPartieEr(k){
  var t=ER_PARTS[k].t;
  if(t==="perc") return "PERCUSSION "+ER_PARTS[k].n;
  if(t==="bruit") return (ER.v===2 ? "PCM " : "AUDIO IN ")+ER_PARTS[k].n;
  if(t==="hhc") return "HI-HAT CLOSE";
  if(t==="hho") return "HI-HAT OPEN";
  if(t==="crash") return "CRASH";
  if(t==="clap") return "HAND CLAP";
  return "ACCENT";
}
function majTouchesEr(){
  var p=ER.pat, k=ER.sel, i;
  if(ER.pset){
    for(i=0;i<16;i++){
      erKeys[i].textContent = ("0"+(i+1)).slice(-2);
      erKeys[i].classList.toggle("act", i === ER.cur);
      erKeys[i].classList.remove("sel","hors");
    }
    return;
  }
  if(ER.mode===1){
    for(i=0;i<16;i++){
      var v=ER.song[i];
      erKeys[i].textContent = (v===undefined) ? "–" : ("0"+(v+1)).slice(-2);
      erKeys[i].classList.toggle("act", v!==undefined && i!==ER.spos);
      erKeys[i].classList.toggle("sel", i===ER.ssel);
      erKeys[i].classList.toggle("hors", v===undefined);
    }
    return;
  }
  for(i=0;i<16;i++){
    erKeys[i].textContent = String(i+1);
    erKeys[i].classList.toggle("act", !!p.st[k][i]);
    erKeys[i].classList.toggle("sel", i===ER.pasSel);
    erKeys[i].classList.toggle("hors", i >= (p.len||16));
    erBeats[i].classList.toggle("hors", i >= (p.len||16));
  }
}
function majLedsEr(){
  document.getElementById("er-mute").classList.toggle("on", !!ER.mute[ER.sel]);
  document.getElementById("er-solo").classList.toggle("on", !!ER.solo[ER.sel]);
  var m = ER.pat.mot[ER.sel], mode = m ? m.mode||0 : 0;
  document.getElementById("er-smooth").classList.toggle("on", mode===1);
  document.getElementById("er-trig").classList.toggle("on", mode===2);
  document.getElementById("er-mseq").classList.toggle("on", mode!==0);
  var bs = document.querySelectorAll("#er-parts .btn");
  for(var j=0;j<bs.length;j++){
    var mm = ER.pat.mot[+bs[j].dataset.k];
    bs[j].classList.toggle("mot", !!(mm && mm.mode));
  }
  document.getElementById("er-dmot").classList.toggle("on", ER.dMot);
  document.getElementById("er-dtempo").classList.toggle("on", ER.dTempo);
  document.getElementById("er-ring0").classList.toggle("on", ER.pat.son[0].ring);
  document.getElementById("er-ring2").classList.toggle("on", ER.pat.son[2].ring);
  document.getElementById("er-wave-nom").textContent = ER_ONDES[ER.pat.son[ER.sel].wave||0];
  document.getElementById("er-modt-nom").textContent = ER_MODS[ER.pat.son[ER.sel].modT||0];
}

/* --- mémoire --- */
function memEr(){
  memoire["er"+ER.v] = {cur:ER.cur, song:ER.song.slice(), dDep:ER.dDep, dTime:ER.dTime,
                 dTempo:ER.dTempo, dMot:ER.dMot, sel:ER.sel,
                 slots:ER.slots.map(function(p){
                   return {sw:p.sw, len:p.len, son:p.son, mot:p.mot, motFx:p.motFx,
                           st:p.st.map(function(l){ return l.join(""); })};
                 })};
  memoire["er"+ER.v].slots[ER.cur] = {sw:ER.pat.sw, len:ER.pat.len, son:ER.pat.son, mot:ER.pat.mot, motFx:ER.pat.motFx,
                               st:ER.pat.st.map(function(l){ return l.join(""); })};
  sauverMachine("er"+ER.v);
}
function chargerEr(){
  ER.slots = [];
  for(var z=0; z<16; z++) ER.slots.push(motifEr(z<3?z:9));
  ER.cur = 0; ER.sel = 0; ER.song = []; ER.pat = ER.slots[0];
  var m = memLire("er"+ER.v);
  if(!m) return;
  if(m.slots && m.slots.length===16){
    ER.slots = m.slots.map(function(o){
      var p = motifEr(9);
      p.sw=o.sw||0; p.len=o.len||16;
      if(o.st) o.st.forEach(function(s,k){ for(var i=0;i<16;i++) p.st[k][i]= s.charAt(i)==="1"?1:0; });
      if(o.son) p.son=o.son;
      if(o.mot) p.mot=o.mot;
      if(o.motFx) p.motFx=o.motFx;
      return p;
    });
  }
  if(m.song && m.song.length) ER.song = m.song.slice();
  ["cur","dDep","dTime","sel"].forEach(function(c){ if(typeof m[c]==="number") ER[c]=m[c]; });
  ER.dTempo = !!m.dTempo; ER.dMot = !!m.dMot;
  ER.pat = ER.slots[ER.cur];
}

/* --- boutons rotatifs --- */
function knobEr(id, champ, min, max){
  return knobEm(id, {min:min, max:max,
    get:function(){ return ER.pat.son[ER.sel][champ]; },
    set:function(v){
      ER.pat.son[ER.sel][champ] = v;
      enregMotionEr(champ, v);
      teleEr(champ, v);
      lcdEr(String(Math.round((champ==="pan"? v*63 : v*127))), champ.toUpperCase(), true);
    }});
}
var kErVol = knobEm("er-k-vol",{min:0,max:1,get:function(){return S.vol;},set:function(v){
  S.vol=v; if(master) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
  lcdEr(String(Math.round(v*100)),"VOLUME",true); saveSoon();
}});
var kErPitch = knobEr("er-k-pitch","pitch",0,1);
var kErModD  = knobEr("er-k-modd","modD",0,1);
var kErModS  = knobEr("er-k-mods","modS",0,1);
var kErDec   = knobEr("er-k-dec","dec",0,1);
var kErLvl   = knobEr("er-k-lvl","lvl",0,1);
var kErPan   = knobEr("er-k-pan","pan",-1,1);
var kErBoost = knobEr("er-k-boost","boost",0,1);
var kErModT  = knobEm("er-k-modt",{min:0,max:5,pas:1,
  get:function(){ return ER.pat.son[ER.sel].modT; },
  set:function(v){
    ER.pat.son[ER.sel].modT = Math.round(v);
    document.getElementById("er-modt-nom").textContent = ER_MODS[Math.round(v)];
    lcdEr(ER_MODS[Math.round(v)], "MOD TYPE", true);
  }});
var kErDDep = knobEm("er-k-ddep",{min:0,max:1,get:function(){return ER.dDep;},set:function(v){
  ER.dDep=v; if(dlyIn) dlyIn.gain.setTargetAtTime(v*0.6, maintenantAudio(), 0.05);
  motFxEcrire(ER.pat.motFx, "dDep", v, ER.rec && S.run, ER.pos); teleEr("dDep", v);
  lcdEr(String(Math.round(v*127)),"DELAY DEPTH",true);
}});
var kErDTime = knobEm("er-k-dtime",{min:0,max:1,get:function(){return ER.dTime;},set:function(v){
  ER.dTime=v; majDelaiEr();
  motFxEcrire(ER.pat.motFx, "dTime", v, ER.rec && S.run, ER.pos); teleEr("dTime", v);
  lcdEr(String(Math.round(v*127)),"DELAY TIME",true);
}});
function majDelaiEr(){
  if(!dlyNode) return;
  var t = ER.dTempo ? (60/S.bpm)*[0.25,0.375,0.5,0.75,1][Math.min(4,Math.floor(ER.dTime*5))]
                    : 0.03 + ER.dTime*1.1;
  dlyNode.delayTime.setTargetAtTime(Math.min(1.1,t), maintenantAudio(), 0.05);
  if(dlyFb) dlyFb.gain.setTargetAtTime(0.12+ER.dDep*0.48, maintenantAudio(), 0.05);
}
function majKnobsEr(){
  [kErPitch,kErModD,kErModS,kErDec,kErLvl,kErPan,kErBoost,kErModT].forEach(function(k){ k.maj(); });
}

/* --- molette --- */
(function moletteEr(){
  var el = document.getElementById("er-dial"), st={drag:false,y0:0};
  el.addEventListener("pointerdown", function(e){ st.drag=true; st.y0=e.clientY; el.setPointerCapture(e.pointerId); e.preventDefault(); });
  el.addEventListener("pointermove", function(e){
    if(!st.drag || PINCE) return;
    var d=st.y0-e.clientY;
    if(Math.abs(d)<12) return;
    st.y0=e.clientY; pasEr(d>0?1:-1);
  });
  el.addEventListener("pointerup", function(){ st.drag=false; memEr(); });
  el.addEventListener("pointercancel", function(){ st.drag=false; });
  function pasEr(d){
    if(ER.mode===1 && ER.song.length && ER.param===0){
      ER.song[ER.ssel] = (ER.song[ER.ssel]+d+16)%16;
      majTouchesEr(); memEr();
      lcdEr(("00"+(ER.song[ER.ssel]+1)).slice(-3), "SONG "+(ER.ssel+1)); H.cran(); return;
    }
    if(ER.param===2){
      if(ER.v===2 && ER_PARTS[ER.sel].t==="bruit"){
        banqueEs();
        var sn = ER.pat.son[ER.sel];
        sn.pcm = ((sn.pcm||0) + d + ES_BANQUE.length) % ES_BANQUE.length;
        memEr(); lcdEr(ES_BANQUE[sn.pcm], "PCM"); H.cran(); return;
      }
      ER.son = ((ER.son===undefined?0:ER.son) + d + ER_SONS.length) % ER_SONS.length;
      appliquerSonEr(ER.sel, ER.son);
      majKnobsEr(); majLedsEr(); memEr();
      lcdEr(ER_SONS[ER.son].n, "SOUND"); H.cran(); return;
    }
    if(ER.param===1){ S.bpm = Math.max(40,Math.min(220,S.bpm+d)); majDelaiEr(); }
    else {
      memEr();
      ER.cur=(ER.cur+d+16)%16; ER.pat=ER.slots[ER.cur];
      majTouchesEr(); majKnobsEr(); majLedsEr();
    }
    majLcdEr(); H.cran();
  }
  ER.pas = pasEr;
  document.getElementById("er-prev").addEventListener("click", function(){ pasEr(-1); });
  document.getElementById("er-next").addEventListener("click", function(){ pasEr(1); });
})();

/* --- boutons --- */
document.getElementById("er-wave").addEventListener("click", function(){
  var s=ER.pat.son[ER.sel]; s.wave=(s.wave+1)%2;
  document.getElementById("er-wave-nom").textContent=ER_ONDES[s.wave];
  lcdEr(ER_ONDES[s.wave],"WAVE",true); memEr(); H.cran();
});
document.getElementById("er-ring0").addEventListener("click", function(){
  var v=!ER.pat.son[0].ring; ER.pat.son[0].ring=v; ER.pat.son[1].ring=v;
  majLedsEr(); memEr(); H.inter(); lcdEr(v?"ON":"OFF","RING MOD 1·2",true);
});
document.getElementById("er-ring2").addEventListener("click", function(){
  var v=!ER.pat.son[2].ring; ER.pat.son[2].ring=v; ER.pat.son[3].ring=v;
  majLedsEr(); memEr(); H.inter(); lcdEr(v?"ON":"OFF","RING MOD 3·4",true);
});
document.getElementById("er-b-crash").addEventListener("click", function(){ choisirEr(8); });
document.getElementById("er-b-clap").addEventListener("click", function(){ choisirEr(9); });
document.getElementById("er-dtype").addEventListener("click", function(){
  if(!ER.dTempo && !ER.dMot){ ER.dTempo=true; }
  else if(ER.dTempo){ ER.dTempo=false; ER.dMot=true; }
  else { ER.dMot=false; }
  var p = ER.pat;
  if(!p.motFx) p.motFx = motFxVide();
  p.motFx.mode = ER.dMot ? 1 : 0;
  if(p.motFx.mode && !p.motFx.v){
    p.motFx.p = "dTime";
    p.motFx.v = []; for(var i=0;i<16;i++) p.motFx.v.push(ER.dTime);
  }
  majLedsEr(); majDelaiEr(); memEr(); H.inter();
  lcdEr(ER.dTempo?"TMP":(ER.dMot?"MOT":"OFF"),"DELAY TYPE",true);
});
document.getElementById("er-mseq").addEventListener("click", function(){
  var k=ER.sel, m=ER.pat.mot[k];
  if(!m) m = ER.pat.mot[k] = {mode:0,p:"lvl",v:null};
  m.mode=(m.mode+1)%3;
  if(m.mode && !m.v){ m.v=[]; for(var i=0;i<16;i++) m.v.push(ER.pat.son[k][m.p]); }
  majLedsEr(); memEr(); H.inter();
  lcdEr(m.mode===0?"OFF":(m.mode===1?"SMTH":"HOLD"), "MOTION · "+m.p.toUpperCase(), true);
});
function allerMotifEr(i){
  memEr();
  ER.cur = i; ER.pat = ER.slots[i];
  majTouchesEr(); majKnobsEr(); majLedsEr(); majLcdEr();
  lcdEr(("00"+(i+1)).slice(-3), "PATTERN", true); H.inter();
}
function basculeCoupeEr(quoi){
  var k = ER.sel;
  ER[quoi][k] = !ER[quoi][k];
  majLedsEr();
  lcdEr(ER[quoi][k] ? (quoi==="mute"?"MUT":"SOL") : "ON", nomPartieEr(k), true);
  H.inter();
}
document.getElementById("er-mute").addEventListener("click", function(){ basculeCoupeEr("mute"); });
document.getElementById("er-solo").addEventListener("click", function(){ basculeCoupeEr("solo"); });
document.getElementById("er-pset").addEventListener("click", function(){
  ER.pset = !ER.pset;
  this.classList.toggle("on", ER.pset);
  majTouchesEr();
  lcdEr(ER.pset ? "SET" : "---", ER.pset ? "TOUCHE = MOTIF" : "PATTERN", true);
  H.inter();
});
document.getElementById("er-shift").addEventListener("click", function(){
  ER.shift=!ER.shift; this.classList.toggle("on", ER.shift);
  lcdEr(ER.shift?"SHF":"---", ER.shift?"SHIFT":"PATTERN", true); H.cran();
});
document.getElementById("er-erase").addEventListener("click", function(){
  if(ER.protect){ lcdEr("PRT","PROTECT",true); return; }
  if(ER.mode===1){
    if(ER.song.length){ ER.song.splice(ER.ssel,1); ER.ssel=Math.max(0,Math.min(ER.ssel,ER.song.length-1)); majTouchesEr(); memEr(); lcdEr("DEL","SONG",true); }
    return;
  }
  ER.pat.st[ER.sel]=ligneVide(); majTouchesEr(); memEr();
  lcdEr("CLR", nomPartieEr(ER.sel), true); H.inter();
});
document.getElementById("er-write").addEventListener("click", function(){
  if(ER.protect){ lcdEr("PRT","PROTECT",true); return; }
  ER.slots[ER.cur]=ER.pat; memEr(); writeMem();
  lcdEr("SAVE","PATTERN "+(ER.cur+1),true); H.inter();
});
var erModes = document.querySelectorAll("[data-ermode]");
for(var em2=0; em2<erModes.length; em2++){
  erModes[em2].addEventListener("click", function(){
    var m=+this.dataset.ermode;
    for(var j=0;j<erModes.length;j++) erModes[j].classList.toggle("on", +erModes[j].dataset.ermode===m);
    ER.mode=m;
    if(m===1){
      ER.spos=0; ER.ssel=0;
      if(ER.song.length){ ER.cur=ER.song[0]; ER.pat=ER.slots[ER.cur]; }
      majTouchesEr(); majKnobsEr();
      lcdEr(ER.song.length?("00"+(ER.cur+1)).slice(-3):"---","SONG",true);
    } else if(m>=2){
      ouvrirNotice();
      lcdEr("MIDI", m===2?"GLOBAL":"MIDI", true);
    } else { majTouchesEr(); majLcdEr(); }
    H.cran();
  });
}
document.getElementById("er-play").addEventListener("click", function(){
  audioInit(); busEffets(); majDelaiEr();
  if(S.run){ stop(); H.stop(); } else { start(); H.start(); }
  this.classList.toggle("on", S.run);
});
document.getElementById("er-stop").addEventListener("click", function(){
  stop(); step=0; H.stop();
  document.getElementById("er-play").classList.remove("on");
});
document.getElementById("er-rec").addEventListener("click", function(){
  ER.rec=!ER.rec; this.classList.toggle("on", ER.rec);
  lcdEr(ER.rec?"REC":"---", ER.rec?"TAP RECORD":"PATTERN", true); H.inter();
});
var erTaps=[];
document.getElementById("er-tap").addEventListener("click", function(){
  var now=Date.now();
  if(erTaps.length && now-erTaps[erTaps.length-1]>2200) erTaps=[];
  erTaps.push(now); if(erTaps.length>5) erTaps.shift();
  if(erTaps.length<2){ lcdEr("TAP","TEMPO",true); H.cran(); return; }
  var s=0; for(var i=1;i<erTaps.length;i++) s+=erTaps[i]-erTaps[i-1];
  var bpm=Math.round(60000/(s/(erTaps.length-1)));
  if(bpm>=40&&bpm<=220){ S.bpm=bpm; majDelaiEr(); lcdEr(String(bpm),"TEMPO",true); saveSoon(); }
  H.cran();
});
document.getElementById("er-notice").addEventListener("click", function(){
  ouvrirNotice();
});

function songEr(i){
  if(ER.protect){ lcdEr("PRT","PROTECT",true); return; }
  if(i > ER.song.length){ lcdEr("---","SONG",true); H.cran(); return; }
  if(i === ER.song.length) ER.song.push(ER.cur);
  ER.ssel=i; majTouchesEr(); memEr(); H.cran();
  lcdEr(("00"+(ER.song[i]+1)).slice(-3), "SONG "+(i+1), true);
}
function shiftEr(i){
  var p=ER.pat, k=ER.sel, v, n;
  if(ER.protect && i!==15){ lcdEr("PRT","PROTECT",true); H.cran(); return; }
  if(i<4){ p.len=[4,8,12,16][i]; majTouchesEr(); memEr(); lcdEr(String(p.len),"PATTERN LENGTH",true); }
  else if(i===4){ p.sw=0; memEr(); lcdEr("x16","SCALE",true); }
  else if(i===5){ p.sw=0.33; memEr(); lcdEr("x16","SHUFFLE",true); }
  else if(i===6){ p.len=12; majTouchesEr(); memEr(); lcdEr("x12","SCALE",true); }
  else if(i===7){ v=[0,0.15,0.25,0.37,0.5]; n=(v.indexOf(p.sw)+1)%v.length; p.sw=v[n]; memEr();
                  lcdEr(Math.round(p.sw*100)+"%","SWING",true); }
  else if(i===8){ p.st[k].unshift(p.st[k].pop()); majTouchesEr(); memEr(); lcdEr(">>1","MOVE DATA",true); }
  else if(i===9){ ER.clip={st:p.st[k].slice(), son:JSON.parse(JSON.stringify(p.son[k]))};
                  lcdEr("CPY","COPY PART",true); }
  else if(i===10){ p.mot[k]=null; majLedsEr(); memEr(); lcdEr("CLR","CLEAR MOTION",true); }
  else if(i===11){ p.st[k]=ligneVide(); majTouchesEr(); memEr(); lcdEr("CLR","CLEAR PART",true); }
  else if(i===12){
    var su=(ER.cur+1)%16;
    ER.slots[ER.cur]=p;
    ER.slots[su]=motifEr(9);
    ER.slots[su].sw=p.sw; ER.slots[su].len=p.len;
    ER.slots[su].st=p.st.map(function(l){return l.slice();});
    ER.slots[su].son=JSON.parse(JSON.stringify(p.son));
    ER.cur=su; ER.pat=ER.slots[su];
    majTouchesEr(); majKnobsEr(); majLedsEr(); memEr();
    lcdEr(("00"+(su+1)).slice(-3),"INSERT PATTERN",true);
  }
  else if(i===13){ ER.pat=motifEr(9); ER.slots[ER.cur]=ER.pat; majTouchesEr(); majKnobsEr(); majLedsEr(); memEr();
                   lcdEr("DEL","DELETE PATTERN",true); }
  else if(i===14){ if(ER.song.length){ ER.song.splice(ER.ssel,1); majTouchesEr(); memEr(); } lcdEr("DEL","CLEAR EVENT",true); }
  else if(i===15){ ER.song=[]; ER.spos=0; ER.ssel=0; if(ER.mode===1) majTouchesEr(); memEr(); lcdEr("CLR","CLEAR SONG",true); }
  H.cran();
}
function collerEr(){
  if(!ER.clip) return;
  ER.pat.st[ER.sel]=ER.clip.st.slice();
  ER.pat.son[ER.sel]=JSON.parse(JSON.stringify(ER.clip.son));
  majTouchesEr(); majKnobsEr(); memEr();
}

var unitEr = document.getElementById("unit-er1");
function activerEr(v){
  stop();
  routerEffets("er");
  ER.v = (v===2) ? 2 : 1;
  S.modele = "er" + ER.v;
  MACHINE = MACHINE_ER;
  poserMachine("er1", ER.v===2 ? "mk2" : null);
  chargerEr();
  document.getElementById("er-notice").textContent = ER.v===2 ? "ER-1 mkII" : "ER-1";
  document.getElementById("er-grp-audio").textContent = ER.v===2 ? "PCM" : "AUDIO IN";
  choisirEr(ER.sel||0);
  majTouchesEr(); majKnobsEr(); majLedsEr(); majLcdEr(); kErVol.maj();
  actif = unitEr;
  save(); fit(); setTimeout(fit,120);
}


/* ===================== ELECTRIBE EA-1 ===================== */
var EA_ONDES = ["SAW","SQR","TRI"];
var EA_TYPES_ONDE = ["sawtooth","square","triangle"];
var EA_MODS = ["OFF","RING","SYNC","DECI","CROSS"];

function sonEa(i){
  return {w1:0, w2:0, bal:0.4, ofs:0, porta:0, mod:0,
          cut:0.55, res:0.25, egi:0.45, dec:0.35,
          dist:false, lvl:0.75, gate:0.6};
}
function motifEa(n){
  var p = {sw:0, len:16, gamme:0, st:[], nt:[], tie:[], son:[], mot:[]};
  for(var k=0;k<2;k++){
    p.st.push(ligneVide());
    p.nt.push([36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36]);
    p.tie.push(ligneVide());
    p.son.push(sonEa(k)); p.mot.push(null);
  }
  p.son[1].w1 = 1; p.son[1].cut = 0.75; p.son[1].dec = 0.2; p.son[1].lvl = 0.6;
  function met(k,s,notes){
    s.split("").forEach(function(c,i){ if(c!=="." && c!==" ") p.st[k][i]=1; });
    if(notes) notes.forEach(function(v,i){ p.nt[k][i]=v; });
  }
  if(n===0){
    met(0,"x...x...x.x.x...",[36,36,36,36,36,36,36,36,43,43,41,41,36,36,36,36]);
    met(1,"..x...x...x...x.",[60,60,63,60,60,60,67,60,60,60,63,60,60,60,65,60]);
  } else if(n===1){
    met(0,"x.x.x.x.x.x.x.x.",[36,36,48,36,36,36,48,36,39,39,51,39,36,36,48,36]);
    p.son[0].dec=0.15; p.son[0].cut=0.4; p.son[0].res=0.5;
  } else if(n===2){
    met(0,"x.......x.......",[33,33,33,33,33,33,33,33,40,40,40,40,40,40,40,40]);
    p.tie[0][0]=1; p.tie[0][8]=1;
    met(1,"....x.......x...",[55,55,55,55,58,58,58,58,55,55,55,55,62,62,62,62]);
    p.son[0].porta=0.4;
  }
  return p;
}

var EA = {
  pat: motifEa(0), slots: [], cur:0, sel:0, param:0, mode:0,
  rec:false, shift:false, kb:false, oct:3, pasSel:-1, protect:false, clip:null,
  song:[], spos:0, ssel:0, pos:-1, note:48, son:0, v:1,
  fxType:0, fDep:0.3, fTime:0.35,
  noeuds:[], dernier:[0,0]
};
for(var az=0; az<16; az++) EA.slots.push(motifEa(az<3?az:9));

/* --- sortie et effet --- */
var eaFx = null;
function sortieEa(k,t){
  if(!EA.noeuds[k]){
    var g = ctx.createGain(), s = ctx.createGain();
    g.connect(busSet("ea") || master);
    busEffets();
    g.connect(s); s.connect(dlyIn);
    EA.noeuds[k] = {g:g, s:s};
  }
  var n = EA.noeuds[k], son = EA.pat.son[k];
  var quand = (t === undefined) ? maintenantAudio() : t;
  var niv = mv("lvl", son.lvl);
  var lisse = !!(MOT && MOT.lisse);
  n.g.gain.cancelScheduledValues(quand);
  n.g.gain.setValueAtTime(niv, quand);
  if(lisse && MOT.p === "lvl") n.g.gain.linearRampToValueAtTime(MOT.suiv, quand + stepDur());
  n.s.gain.setValueAtTime(EA.fDep*0.65, quand);
  return n.g;
}
function majEffetEa(){
  if(!dlyNode) return;
  var t;
  if(EA.fxType === 0){
    t = (60/S.bpm)*[0.25,0.375,0.5,0.75,1][Math.min(4,Math.floor(EA.fTime*5))];
    if(dlyFb) dlyFb.gain.setTargetAtTime(0.15+EA.fDep*0.5, maintenantAudio(), 0.05);
  } else {
    t = 0.004 + EA.fTime*0.02;                 /* chorus / flanger */
    if(dlyFb) dlyFb.gain.setTargetAtTime(0.35+EA.fDep*0.35, maintenantAudio(), 0.05);
  }
  dlyNode.delayTime.setTargetAtTime(Math.min(1.1,t), maintenantAudio(), 0.05);
  if(dlyIn) dlyIn.gain.setTargetAtTime(EA.fDep*0.6, maintenantAudio(), 0.05);
}

/* --- voix --- */
function voixEa(t,k,note,vel,duree){
  var son = EA.pat.son[k], dest = pasVoie(sortieEa(k,t));
  var f0 = 440*Math.pow(2,(note-69)/12);
  var g = ctx.createGain();
  var cut = mv("cut", son.cut), res = mv("res", son.res);
  var egi = mv("egi", son.egi), dec = mv("dec", son.dec);
  var bal = mv("bal", son.bal), ofs = mv("ofs", son.ofs);
  var lp = ctx.createBiquadFilter(); lp.type = "lowpass";
  var base = 80*Math.pow(140, cut);
  lp.frequency.setValueAtTime(Math.min(17000, base), t);
  lp.frequency.linearRampToValueAtTime(Math.min(17000, base*(1+egi*9)), t+0.008);
  lp.frequency.exponentialRampToValueAtTime(Math.max(70, base), t + 0.03 + dec*1.6);
  lp.Q.value = 0.7 + res*24;

  var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
  var g1 = ctx.createGain(), g2 = ctx.createGain();
  o1.type = EA_TYPES_ONDE[son.w1]; o2.type = EA_TYPES_ONDE[son.w2];
  var f2 = f0*Math.pow(2, ofs);
  if(son.mod === 2) f2 = f0*(1 + 2.2*Math.abs(ofs) + 0.5);   /* sync : rapport élevé */
  var porta = mv("porta", son.porta);
  var prec = EA.dernier[k] || f0;
  if(porta > 0.01){
    o1.frequency.setValueAtTime(prec, t);
    o1.frequency.exponentialRampToValueAtTime(Math.max(20,f0), t + 0.01 + porta*0.5);
    o2.frequency.setValueAtTime(prec*Math.pow(2,ofs), t);
    o2.frequency.exponentialRampToValueAtTime(Math.max(20,f2), t + 0.01 + porta*0.5);
  } else {
    o1.frequency.setValueAtTime(f0, t);
    o2.frequency.setValueAtTime(f2, t);
  }
  EA.dernier[k] = f0;
  g1.gain.value = 1-bal; g2.gain.value = bal;

  var entree = ctx.createGain();
  if(son.mod === 1){                              /* ring : osc2 module osc1 */
    var rg = ctx.createGain(); rg.gain.value = 0;
    o2.connect(rg.gain);
    o1.connect(rg); rg.connect(entree);
  } else if(son.mod === 2){                       /* sync approché : osc2 découpé par osc1 */
    var sg = ctx.createGain(); sg.gain.value = 0;
    var dents = ctx.createOscillator(); dents.type = "sawtooth"; dents.frequency.value = f0;
    var da = ctx.createGain(); da.gain.value = 0.5;
    var dc = ctx.createConstantSource(); dc.offset.value = 0.5;
    dents.connect(da); da.connect(sg.gain); dc.connect(sg.gain);
    dents.start(t); dc.start(t); dents.stop(t+duree+0.3); dc.stop(t+duree+0.3);
    o2.connect(sg); sg.connect(entree);
    o1.connect(g1); g1.connect(entree);
  } else {
    o1.connect(g1); g1.connect(entree);
    o2.connect(g2); g2.connect(entree);
  }
  if(son.mod === 4){                              /* cross : modulation de fréquence */
    var cm = ctx.createGain(); cm.gain.value = f0*1.6*(0.2+bal);
    o2.connect(cm); cm.connect(o1.frequency);
  }
  if(son.mod === 3){                              /* deci */
    var n2=1024, cd=new Float32Array(n2), niv2=6;
    for(var i=0;i<n2;i++){ var x=i*2/n2-1; cd[i]=Math.round(x*niv2)/niv2; }
    var wd = ctx.createWaveShaper(); wd.curve = cd;
    entree.connect(wd); wd.connect(lp);
  } else {
    entree.connect(lp);
  }

  var apres = lp;
  if(son.dist){
    var ws = ctx.createWaveShaper(); ws.curve = courbeDist(0.55); ws.oversample="2x";
    lp.connect(ws); apres = ws;
  }
  apres.connect(g); g.connect(dest);
  var d = Math.max(0.05, duree);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.45*vel, t+0.006);
  g.gain.setValueAtTime(0.45*vel, t+d*0.85);
  g.gain.exponentialRampToValueAtTime(0.0001, t+d);
  o1.start(t); o2.start(t);
  o1.stop(t+d+0.05); o2.stop(t+d+0.05);
}

/* --- séquenceur --- */
function motionEa(k,i){
  var m = EA.pat.mot[k];
  if(!m || !m.mode || !m.v) return null;
  var L = EA.pat.len||16, v = m.v[i];
  if(typeof v !== "number") return null;
  var su = m.v[(i+1)%L];
  return {p:m.p, v:v, suiv:(typeof su==="number"?su:v), lisse:m.mode===1};
}
function enregMotionEa(champ, val){
  var k = EA.sel, m = EA.pat.mot[k];
  if(!m || !m.mode) return;
  if(!EA.rec || !S.run || EA.pos < 0){ m.p = champ; return; }
  if(m.p !== champ || !m.v){
    m.p = champ; m.v = [];
    for(var i=0;i<16;i++) m.v.push(val);
  }
  m.v[EA.pos] = val;
}
function dureeEa(k,i){
  var p = EA.pat, L = p.len||16, d = stepDur()*p.son[k].gate*1.05, j = i, n = 0;
  while(p.tie[k][j] && n < L){ d += stepDur(); j = (j+1)%L; n++; }
  return d;
}
function scheduleEa(i,t){
  var CHARGE_N = ouvrirPas();
  var p = EA.pat;
  if(p.sw && i%2===1) t += stepDur()*p.sw*0.55;
  for(var k=0;k<2;k++){
    if(!p.st[k][i]) continue;
    var prec = (i-1+ (p.len||16)) % (p.len||16);
    if(p.tie[k][prec] && p.st[k][prec]) continue;   /* tenue : pas de nouvelle attaque */
    MOT = motionEa(k,i);
    var dEa = dureeEa(k,i);
    CHARGE_N++, voixEa(t, k, p.nt[k][i], 1, dEa);
    midiNoteA(p.nt[k][i], t, 1, MIDI.canalSy + k, dEa);
    MOT = null;
  }
  if(!cache) queue.push({i:i,t:t});
  attenuerVoie("ea", CHARGE_N, t);
}
var eaBeats = [], eaKeys = [];
function beatEa(i){
  EA.pos = i;
  if(EA.mode === 1){
    for(var q=0;q<16;q++){ eaBeats[q].classList.toggle("on", q===EA.spos); eaKeys[q].classList.remove("cur"); }
    return;
  }
  for(var j=0;j<16;j++){
    eaBeats[j].classList.toggle("on", j===i);
    eaKeys[j].classList.toggle("cur", j===i);
  }
}
function arretEa(){
  EA.pos = -1;
  var pb = document.getElementById("ea-play"); if(pb) pb.classList.remove("on");
  for(var j=0;j<16;j++){ eaBeats[j].classList.remove("on"); eaKeys[j].classList.remove("cur"); }
}
function boucleEa(){
  if(EA.mode !== 1 || !EA.song.length) return;
  EA.spos = (EA.spos+1) % EA.song.length;
  EA.cur = EA.song[EA.spos];
  EA.pat = EA.slots[EA.cur];
  majTouchesEa(); majKnobsEa();
  lcdEa(("00"+(EA.cur+1)).slice(-3), "SONG "+(EA.spos+1), true);
}
var MACHINE_EA = {schedule:scheduleEa, beat:beatEa, arret:arretEa, boucle:boucleEa,
                  longueur:function(){ return EA.pat.len||16; }};

/* --- afficheur --- */
var eaVal = document.getElementById("ea-val"), eaLab = document.getElementById("ea-lab"), eaTmr=null;
function lcdEa(v,l,fugace){
  eaVal.textContent = v; eaLab.textContent = l;
  clearTimeout(eaTmr);
  if(fugace) eaTmr = setTimeout(majLcdEa, 1200);
}
function majLcdEa(){
  var p = EA.pat, k = EA.sel;
  if(EA.param===4) lcdEa(EA_SONS[EA.son||0].n, "SOUND");
  else if(EA.param===1) lcdEa(String(S.bpm), "TEMPO");
  else if(EA.param===2) lcdEa(String(Math.round(p.son[k].gate*100)), "GATE TIME");
  else if(EA.param===3){
    var n = (EA.pasSel>=0 && p.st[k][EA.pasSel]) ? p.nt[k][EA.pasSel] : EA.note;
    lcdEa(nomNote(n), (EA.pasSel>=0 && p.st[k][EA.pasSel]) ? "PITCH · PAS "+(EA.pasSel+1) : "PITCH");
  }
  else lcdEa(("00"+(EA.cur+1)).slice(-3), "PATTERN");
}

/* --- construction --- */
(function construireEa(){
  var i, b;
  var C1=["Pattern","Tempo","Gate Time","Pitch","Sound"];
  var C2=["Song","Tempo","Position","Pattern","Pitch Ofs"];
  var C3=["Metronome","Input Gain","Clock","Protect",""];
  var C4=["MIDI ch","P2 ch","Dump","MIDI Filter","Bend Range"];
  var bp = document.getElementById("ea-params");
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
    EA.param = +u.dataset.p;
    var us=bp.querySelectorAll("u[data-p]");
    for(var j=0;j<us.length;j++) us[j].classList.toggle("on", +us[j].dataset.p===EA.param);
    majLcdEa(); H.cran();
  });

  var bb=document.getElementById("ea-beats"), bk=document.getElementById("ea-keys");
  for(i=0;i<16;i++){
    var d=document.createElement("i"); if(i%4===0) d.className="b4";
    bb.appendChild(d); eaBeats.push(d);
    b=document.createElement("button"); b.className="btn"; b.textContent=String(i+1); b.dataset.i=i;
    bk.appendChild(b); eaKeys.push(b);
  }
  bk.addEventListener("click", function(e){
    var bt=e.target.closest(".btn"); if(!bt) return;
    var i=+bt.dataset.i;
    if(EA.shift){ shiftEa(i); return; }
    if(EA.mode===1){ songEa(i); return; }
    if(EA.kb){ clavierEa(i); return; }
    if(EA.protect){ lcdEa("PRT","PROTECT",true); return; }
    var p=EA.pat, k=EA.sel;
    p.st[k][i] = p.st[k][i] ? 0 : 1;
    if(p.st[k][i]) p.nt[k][i] = EA.note;
    EA.pasSel = i;
    majTouchesEa(); memEa(); H.cran();
    if(p.st[k][i]) lcdEa(nomNote(p.nt[k][i]), "PAS "+(i+1), true);
  });
})();

function noteClavierEa(i){ return 12*EA.oct + GAMMES[EA.pat.gamme||0].i[i]; }
function clavierEa(i){
  var p = EA.pat, k = EA.sel;
  if(i === 14){                       /* Rest */
    if(EA.pasSel>=0){ p.st[k][EA.pasSel]=0; p.tie[k][EA.pasSel]=0; majTouchesEa(); memEa(); }
    lcdEa("RST","REST",true); H.cran(); return;
  }
  if(i === 15){                       /* Tie */
    if(EA.pasSel>=0){ p.tie[k][EA.pasSel] = p.tie[k][EA.pasSel] ? 0 : 1; majTouchesEa(); memEa(); }
    lcdEa("TIE", EA.pasSel>=0 && p.tie[k][EA.pasSel] ? "TIE ON" : "TIE OFF", true); H.cran(); return;
  }
  var n = noteClavierEa(i);
  if(!ctx) audioInit();
  busEffets();
  voixEa(maintenantAudio()+0.01, k, n, 1, 0.35);
  EA.note = n;
  if(!EA.protect){
    if(EA.rec && S.run && EA.pos>=0){
      var j=(EA.pos+1)%(p.len||16);
      p.st[k][j]=1; p.nt[k][j]=n;
    } else if(EA.pasSel>=0 && p.st[k][EA.pasSel]){
      p.nt[k][EA.pasSel]=n;
    }
    memEa();
  }
  majTouchesEa();
  lcdEa(nomNote(n), EA.pasSel>=0 && !EA.rec ? "PAS "+(EA.pasSel+1) : "KEYBOARD", true);
  H.cran();
}
function majTouchesEa(){
  var p=EA.pat, k=EA.sel, i;
  if(EA.mode===1){
    for(i=0;i<16;i++){
      var v=EA.song[i];
      eaKeys[i].textContent = (v===undefined) ? "–" : ("0"+(v+1)).slice(-2);
      eaKeys[i].classList.toggle("act", v!==undefined && i!==EA.spos);
      eaKeys[i].classList.toggle("sel", i===EA.ssel);
      eaKeys[i].classList.toggle("hors", v===undefined);
    }
    return;
  }
  if(EA.kb){
    var cour = (EA.pasSel>=0 && p.st[k][EA.pasSel]) ? p.nt[k][EA.pasSel] : EA.note;
    for(i=0;i<16;i++){
      eaKeys[i].textContent = (i===14) ? "REST" : (i===15 ? "TIE" : nomNote(noteClavierEa(i)));
      eaKeys[i].classList.toggle("act", i<14 && noteClavierEa(i)===cour);
      eaKeys[i].classList.remove("sel","hors");
    }
    return;
  }
  for(i=0;i<16;i++){
    eaKeys[i].textContent = String(i+1);
    eaKeys[i].classList.toggle("act", !!p.st[k][i]);
    eaKeys[i].classList.toggle("sel", i===EA.pasSel);
    eaKeys[i].classList.toggle("hors", i >= (p.len||16));
    eaBeats[i].classList.toggle("hors", i >= (p.len||16));
  }
}
function majLedsEa(){
  var son = EA.pat.son[EA.sel];
  document.getElementById("ea-p1").classList.toggle("on", EA.sel===0);
  document.getElementById("ea-p2").classList.toggle("on", EA.sel===1);
  document.getElementById("ea-osc1-nom").textContent = EA_ONDES[son.w1];
  document.getElementById("ea-osc2-nom").textContent = EA_ONDES[son.w2];
  document.getElementById("ea-mod-nom").textContent = EA_MODS[son.mod];
  document.getElementById("ea-dist").classList.toggle("on", son.dist);
  document.getElementById("ea-fx1").classList.toggle("on", EA.fxType===0);
  document.getElementById("ea-fx2").classList.toggle("on", EA.fxType===1);
  var m = EA.pat.mot[EA.sel], mode = m ? m.mode||0 : 0;
  document.getElementById("ea-smooth").classList.toggle("on", mode===1);
  document.getElementById("ea-trig").classList.toggle("on", mode===2);
  document.getElementById("ea-mseq").classList.toggle("on", mode!==0);
}

/* --- mémoire --- */
function memEa(){
  memoire["ea"+EA.v] = {cur:EA.cur, song:EA.song.slice(), sel:EA.sel,
                 fxType:EA.fxType, fDep:EA.fDep, fTime:EA.fTime, oct:EA.oct,
                 slots:EA.slots.map(serEa)};
  memoire["ea"+EA.v].slots[EA.cur] = serEa(EA.pat);
  sauverMachine("ea"+EA.v);
}
function serEa(p){
  return {sw:p.sw, len:p.len, gamme:p.gamme, son:p.son, mot:p.mot,
          st:p.st.map(function(l){ return l.join(""); }),
          tie:p.tie.map(function(l){ return l.join(""); }),
          nt:p.nt.map(function(l){ return l.join(","); })};
}
function chargerEa(){
  EA.slots = [];
  for(var z=0; z<16; z++) EA.slots.push(motifEa(z<3?z:9));
  EA.cur = 0; EA.sel = 0; EA.song = []; EA.pat = EA.slots[0];
  var m = memLire("ea"+EA.v);
  if(!m) return;
  if(m.slots && m.slots.length===16){
    EA.slots = m.slots.map(function(o){
      var p = motifEa(9);
      p.sw=o.sw||0; p.len=o.len||16; p.gamme=o.gamme||0;
      if(o.st) o.st.forEach(function(s,k){ for(var i=0;i<16;i++) p.st[k][i]= s.charAt(i)==="1"?1:0; });
      if(o.tie) o.tie.forEach(function(s,k){ for(var i=0;i<16;i++) p.tie[k][i]= s.charAt(i)==="1"?1:0; });
      if(o.nt) o.nt.forEach(function(s,k){ p.nt[k]=s.split(",").map(Number); });
      if(o.son) p.son=o.son;
      if(o.mot) p.mot=o.mot;
      return p;
    });
  }
  if(m.song && m.song.length) EA.song = m.song.slice();
  ["cur","sel","fxType","fDep","fTime","oct"].forEach(function(c){ if(typeof m[c]==="number") EA[c]=m[c]; });
  EA.pat = EA.slots[EA.cur];
}

/* --- boutons rotatifs --- */
function knobEa(id, champ, min, max, nom){
  return knobEm(id, {min:min, max:max,
    get:function(){ return EA.pat.son[EA.sel][champ]; },
    set:function(v){
      EA.pat.son[EA.sel][champ] = v;
      enregMotionEa(champ, v);
      lcdEa(String(Math.round(v*127)), nom, true);
      if(champ==="bal"||champ==="ofs") majLedsEa();
    }});
}
var kEaVol = knobEm("ea-k-vol",{min:0,max:1,get:function(){return S.vol;},set:function(v){
  S.vol=v; if(master) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
  lcdEa(String(Math.round(v*100)),"VOLUME",true); saveSoon();
}});
var kEaPorta = knobEa("ea-k-porta","porta",0,1,"PORTAMENTO");
var kEaBal   = knobEa("ea-k-bal","bal",0,1,"OSC BALANCE");
var kEaOfs   = knobEm("ea-k-ofs",{min:-1,max:1,
  get:function(){ return EA.pat.son[EA.sel].ofs; },
  set:function(v){ EA.pat.son[EA.sel].ofs=v; enregMotionEa("ofs",v);
                   lcdEa(String(Math.round(v*12)),"OSC2 PITCH",true); }});
var kEaCut = knobEa("ea-k-cut","cut",0,1,"CUTOFF");
var kEaRes = knobEa("ea-k-res","res",0,1,"RESONANCE");
var kEaEgi = knobEa("ea-k-egi","egi",0,1,"EG INT");
var kEaDec = knobEa("ea-k-dec","dec",0,1,"DECAY");
var kEaLvl = knobEa("ea-k-lvl","lvl",0,1,"LEVEL");
var kEaDep = knobEm("ea-k-fdep",{min:0,max:1,get:function(){return EA.fDep;},
  set:function(v){ EA.fDep=v; majEffetEa(); lcdEa(String(Math.round(v*127)),"FX DEPTH",true); }});
var kEaTime = knobEm("ea-k-ftime",{min:0,max:1,get:function(){return EA.fTime;},
  set:function(v){ EA.fTime=v; majEffetEa(); lcdEa(String(Math.round(v*127)),"FX TIME",true); }});
function majKnobsEa(){
  [kEaPorta,kEaBal,kEaOfs,kEaCut,kEaRes,kEaEgi,kEaDec,kEaLvl].forEach(function(k){ k.maj(); });
}

/* --- molette --- */
(function moletteEa(){
  var el = document.getElementById("ea-dial"), st={drag:false,y0:0};
  el.addEventListener("pointerdown", function(e){ st.drag=true; st.y0=e.clientY; el.setPointerCapture(e.pointerId); e.preventDefault(); });
  el.addEventListener("pointermove", function(e){
    if(!st.drag || PINCE) return;
    var d=st.y0-e.clientY;
    if(Math.abs(d)<12) return;
    st.y0=e.clientY; pasEa(d>0?1:-1);
  });
  el.addEventListener("pointerup", function(){ st.drag=false; memEa(); });
  el.addEventListener("pointercancel", function(){ st.drag=false; });
  function pasEa(d){
    var p=EA.pat, k=EA.sel;
    if(EA.mode===1 && EA.song.length && EA.param===0){
      EA.song[EA.ssel]=(EA.song[EA.ssel]+d+16)%16;
      majTouchesEa(); memEa();
      lcdEa(("00"+(EA.song[EA.ssel]+1)).slice(-3),"SONG "+(EA.ssel+1)); H.cran(); return;
    }
    if(EA.param===1){ S.bpm=Math.max(40,Math.min(220,S.bpm+d)); majEffetEa(); }
    else if(EA.param===2){ p.son[k].gate=Math.max(0.05,Math.min(1,p.son[k].gate+d*0.05)); }
    else if(EA.param===3){
      if(EA.pasSel>=0 && p.st[k][EA.pasSel]){
        p.nt[k][EA.pasSel]=Math.max(12,Math.min(96,p.nt[k][EA.pasSel]+d));
        EA.note=p.nt[k][EA.pasSel];
      } else EA.note=Math.max(12,Math.min(96,EA.note+d));
      if(EA.kb) majTouchesEa();
    } else if(EA.param===4){
      EA.son = ((EA.son===undefined?0:EA.son) + d + EA_SONS.length) % EA_SONS.length;
      appliquerSonEa(EA.sel, EA.son);
      majKnobsEa(); majLedsEa(); memEa();
      lcdEa(EA_SONS[EA.son].n, "SOUND"); H.cran(); return;
    } else {
      memEa();
      EA.cur=(EA.cur+d+16)%16; EA.pat=EA.slots[EA.cur];
      majTouchesEa(); majKnobsEa(); majLedsEa();
    }
    majLcdEa(); H.cran();
  }
  EA.pas = pasEa;
  document.getElementById("ea-prev").addEventListener("click", function(){
    if(EA.kb){ EA.oct=Math.max(1,EA.oct-1); majTouchesEa(); lcdEa("OCT "+EA.oct,"KEYBOARD",true); H.cran(); }
    else pasEa(-1);
  });
  document.getElementById("ea-next").addEventListener("click", function(){
    if(EA.kb){ EA.oct=Math.min(6,EA.oct+1); majTouchesEa(); lcdEa("OCT "+EA.oct,"KEYBOARD",true); H.cran(); }
    else pasEa(1);
  });
})();

/* --- boutons --- */
document.getElementById("ea-part").addEventListener("click", function(){
  EA.sel = EA.sel ? 0 : 1; EA.pasSel = -1;
  majTouchesEa(); majKnobsEa(); majLedsEa();
  lcdEa("P"+(EA.sel+1), "PART SELECT", true); H.inter();
});
document.getElementById("ea-osc1").addEventListener("click", function(){
  var s=EA.pat.son[EA.sel]; s.w1=(s.w1+1)%3; majLedsEa(); memEa();
  lcdEa(EA_ONDES[s.w1],"OSC1",true); H.cran();
});
document.getElementById("ea-osc2").addEventListener("click", function(){
  var s=EA.pat.son[EA.sel]; s.w2=(s.w2+1)%3; majLedsEa(); memEa();
  lcdEa(EA_ONDES[s.w2],"OSC2",true); H.cran();
});
document.getElementById("ea-mod").addEventListener("click", function(){
  var s=EA.pat.son[EA.sel]; s.mod=(s.mod+1)%(EA.v===2?5:4); majLedsEa(); memEa();
  lcdEa(EA_MODS[s.mod],"OSC MOD",true); H.cran();
});
document.getElementById("ea-dist").addEventListener("click", function(){
  var s=EA.pat.son[EA.sel]; s.dist=!s.dist; majLedsEa(); memEa();
  lcdEa(s.dist?"ON":"OFF","DISTORTION",true); H.cran();
});
document.getElementById("ea-fxtype").addEventListener("click", function(){
  EA.fxType = EA.fxType ? 0 : 1; majLedsEa(); majEffetEa(); memEa();
  lcdEa(EA.fxType?"CHO":"DLY", EA.fxType?"CHORUS/FLANGER":"TEMPO DELAY", true); H.inter();
});
document.getElementById("ea-mseq").addEventListener("click", function(){
  var k=EA.sel, m=EA.pat.mot[k];
  if(!m) m = EA.pat.mot[k] = {mode:0,p:"cut",v:null};
  m.mode=(m.mode+1)%3;
  if(m.mode && !m.v){ m.v=[]; for(var i=0;i<16;i++) m.v.push(EA.pat.son[k][m.p]); }
  majLedsEa(); memEa(); H.inter();
  lcdEa(m.mode===0?"OFF":(m.mode===1?"SMTH":"HOLD"), "MOTION · "+m.p.toUpperCase(), true);
});
document.getElementById("ea-kb").addEventListener("click", function(){
  EA.kb=!EA.kb; this.classList.toggle("on", EA.kb);
  majTouchesEa();
  lcdEa(EA.kb?GAMMES[EA.pat.gamme||0].n:"---", EA.kb?"KEYBOARD OCT "+EA.oct:"PATTERN", true); H.inter();
});
document.getElementById("ea-shift").addEventListener("click", function(){
  EA.shift=!EA.shift; this.classList.toggle("on", EA.shift);
  lcdEa(EA.shift?"SHF":"---", EA.shift?"SHIFT":"PATTERN", true); H.cran();
});
document.getElementById("ea-erase").addEventListener("click", function(){
  if(EA.protect){ lcdEa("PRT","PROTECT",true); return; }
  if(EA.mode===1){
    if(EA.song.length){ EA.song.splice(EA.ssel,1); EA.ssel=Math.max(0,Math.min(EA.ssel,EA.song.length-1)); majTouchesEa(); memEa(); lcdEa("DEL","SONG",true); }
    return;
  }
  EA.pat.st[EA.sel]=ligneVide(); EA.pat.tie[EA.sel]=ligneVide();
  majTouchesEa(); memEa(); lcdEa("CLR","CLEAR PART",true); H.inter();
});
document.getElementById("ea-write").addEventListener("click", function(){
  if(EA.protect){ lcdEa("PRT","PROTECT",true); return; }
  EA.slots[EA.cur]=EA.pat; memEa(); writeMem();
  lcdEa("SAVE","PATTERN "+(EA.cur+1),true); H.inter();
});
var eaModes = document.querySelectorAll("[data-eamode]");
for(var am=0; am<eaModes.length; am++){
  eaModes[am].addEventListener("click", function(){
    var m=+this.dataset.eamode;
    for(var j=0;j<eaModes.length;j++) eaModes[j].classList.toggle("on", +eaModes[j].dataset.eamode===m);
    EA.mode=m;
    if(m===1){
      EA.spos=0; EA.ssel=0;
      if(EA.song.length){ EA.cur=EA.song[0]; EA.pat=EA.slots[EA.cur]; }
      majTouchesEa(); majKnobsEa();
      lcdEa(EA.song.length?("00"+(EA.cur+1)).slice(-3):"---","SONG",true);
    } else if(m>=2){
      ouvrirNotice();
      lcdEa("MIDI", m===2?"GLOBAL":"MIDI", true);
    } else { majTouchesEa(); majLcdEa(); }
    H.cran();
  });
}
document.getElementById("ea-play").addEventListener("click", function(){
  audioInit(); busEffets(); majEffetEa();
  if(S.run){ stop(); H.stop(); } else { start(); H.start(); }
  this.classList.toggle("on", S.run);
});
document.getElementById("ea-stop").addEventListener("click", function(){
  stop(); step=0; H.stop();
  document.getElementById("ea-play").classList.remove("on");
});
document.getElementById("ea-rec").addEventListener("click", function(){
  EA.rec=!EA.rec; this.classList.toggle("on", EA.rec);
  lcdEa(EA.rec?"REC":"---", EA.rec?"TAP RECORD":"PATTERN", true); H.inter();
});
var eaTaps=[];
document.getElementById("ea-tap").addEventListener("click", function(){
  var now=Date.now();
  if(eaTaps.length && now-eaTaps[eaTaps.length-1]>2200) eaTaps=[];
  eaTaps.push(now); if(eaTaps.length>5) eaTaps.shift();
  if(eaTaps.length<2){ lcdEa("TAP","TEMPO",true); H.cran(); return; }
  var s=0; for(var i=1;i<eaTaps.length;i++) s+=eaTaps[i]-eaTaps[i-1];
  var bpm=Math.round(60000/(s/(eaTaps.length-1)));
  if(bpm>=40&&bpm<=220){ S.bpm=bpm; majEffetEa(); lcdEa(String(bpm),"TEMPO",true); saveSoon(); }
  H.cran();
});
document.getElementById("ea-notice").addEventListener("click", function(){
  ouvrirNotice();
});
function songEa(i){
  if(EA.protect){ lcdEa("PRT","PROTECT",true); return; }
  if(i > EA.song.length){ lcdEa("---","SONG",true); H.cran(); return; }
  if(i === EA.song.length) EA.song.push(EA.cur);
  EA.ssel=i; majTouchesEa(); memEa(); H.cran();
  lcdEa(("00"+(EA.song[i]+1)).slice(-3), "SONG "+(i+1), true);
}
function shiftEa(i){
  var p=EA.pat, k=EA.sel, v, n;
  if(EA.protect){ lcdEa("PRT","PROTECT",true); H.cran(); return; }
  if(i<4){ p.len=[4,8,12,16][i]; majTouchesEa(); memEa(); lcdEa(String(p.len),"PATTERN LENGTH",true); }
  else if(i===4){ p.sw=0; memEa(); lcdEa("x16","SCALE",true); }
  else if(i===5){ p.gamme=((p.gamme||0)+1)%GAMMES.length; if(EA.kb) majTouchesEa(); memEa();
                  lcdEa(GAMMES[p.gamme].n,"SCALE",true); }
  else if(i===6){ p.len=12; majTouchesEa(); memEa(); lcdEa("x12","SCALE",true); }
  else if(i===7){ v=[0,0.15,0.25,0.37,0.5]; n=(v.indexOf(p.sw)+1)%v.length; p.sw=v[n]; memEa();
                  lcdEa(Math.round(p.sw*100)+"%","SWING",true); }
  else if(i===8){ p.st[k].unshift(p.st[k].pop()); p.nt[k].unshift(p.nt[k].pop());
                  p.tie[k].unshift(p.tie[k].pop()); majTouchesEa(); memEa(); lcdEa(">>1","MOVE DATA",true); }
  else if(i===9){ EA.clip={st:p.st[k].slice(), nt:p.nt[k].slice(), tie:p.tie[k].slice(),
                           son:JSON.parse(JSON.stringify(p.son[k]))};
                  lcdEa("CPY","COPY PART",true); }
  else if(i===10){ p.mot[k]=null; majLedsEa(); memEa(); lcdEa("CLR","CLEAR MOTION",true); }
  else if(i===11){ p.st[k]=ligneVide(); p.tie[k]=ligneVide(); majTouchesEa(); memEa(); lcdEa("CLR","CLEAR PART",true); }
  else if(i===12){
    var su=(EA.cur+1)%16;
    EA.slots[EA.cur]=p;
    EA.slots[su]=motifEa(9);
    EA.slots[su].sw=p.sw; EA.slots[su].len=p.len;
    EA.slots[su].st=p.st.map(function(l){return l.slice();});
    EA.slots[su].nt=p.nt.map(function(l){return l.slice();});
    EA.slots[su].tie=p.tie.map(function(l){return l.slice();});
    EA.slots[su].son=JSON.parse(JSON.stringify(p.son));
    EA.cur=su; EA.pat=EA.slots[su];
    majTouchesEa(); majKnobsEa(); majLedsEa(); memEa();
    lcdEa(("00"+(su+1)).slice(-3),"INSERT PATTERN",true);
  }
  else if(i===13){ EA.pat=motifEa(9); EA.slots[EA.cur]=EA.pat; majTouchesEa(); majKnobsEa(); majLedsEa(); memEa();
                   lcdEa("DEL","DELETE PATTERN",true); }
  else if(i===14){ if(EA.song.length){ EA.song.splice(EA.ssel,1); majTouchesEa(); memEa(); } lcdEa("DEL","CLEAR EVENT",true); }
  else { EA.song=[]; EA.spos=0; EA.ssel=0; if(EA.mode===1) majTouchesEa(); memEa(); lcdEa("CLR","CLEAR SONG",true); }
  H.cran();
}

var unitEa = document.getElementById("unit-ea1");
function activerEa(v){
  stop();
  EA.v = (v===2) ? 2 : 1;
  S.modele = "ea" + EA.v;
  MACHINE = MACHINE_EA;
  poserMachine("ea1", EA.v===2 ? "mk2" : null);
  chargerEa();
  document.getElementById("ea-notice").textContent = EA.v===2 ? "EA-1 mkII" : "EA-1";
  majTouchesEa(); majKnobsEa(); majLedsEa(); majLcdEa(); kEaVol.maj();
  actif = unitEa;
  save(); fit(); setTimeout(fit,120);
}


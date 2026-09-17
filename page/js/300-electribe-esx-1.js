/* ===================== ELECTRIBE ESX-1 ===================== */
var SX_DRUMS = ["1/ST","2/–","3/ST","4/–","5","6A","6B","7A","7B","ACC"];
var SX_KEYS = ["1","2"];
var SX_STRETCH = ["1/ST","2/–"];
var SX_FX = [13,1,0,2,5,3,6,15,7,10,14,4,11,12,9,8];
var SX_MDEST = ["PITCH","CUTOFF","AMP","PAN"];

function sonSx(k){
  var s = {ech:"b0", pitch:0, start:0, lvl:0.8, pan:0, eg:0.4, amp:false, roll:false,
           rev:false, slice:false, send:false, slot:0,
           cut:1, res:0.15, egi:0, ftype:0,
           mspeed:0.3, mdepth:0, mwave:0, mdest:0, msync:false};
  var def = ["b0","b1","b2","b3","b5","b6","b18","b19","b20","b0","b12","b23","b11","b10"];
  s.ech = def[k] || "b0";
  return s;
}
function motifSx(n){
  var p = {sw:0, len:16, st:[], nt:[], son:[], mot:[]};
  for(var k=0;k<14;k++){
    p.st.push(ligneVide());
    p.nt.push([48,48,48,48,48,48,48,48,48,48,48,48,48,48,48,48]);
    p.son.push(sonSx(k));
    p.mot.push(null);
  }
  function met(k,s,notes){
    s.split("").forEach(function(c,i){ if(c!=="." && c!==" ") p.st[k][i]=1; });
    if(notes) notes.forEach(function(v,i){ p.nt[k][i]=v; });
  }
  if(n===0){
    met(0,"x...x...x...x..."); met(1,"....x.......x...");
    met(3,"..x...x...x...x."); met(9,"x...x...x...x...");
    met(10,"x.....x...x.....",[36,36,36,36,36,36,43,43,43,43,41,41,36,36,36,36]);
  } else if(n===1){
    met(0,"x..x..x...x.x..."); met(2,"....x.......x...");
    met(3,"xxxxxxxxxxxxxxxx"); met(6,"......x.......x.");
    met(12,"x...............");
    p.son[12].slice=true; p.sw=0.15;
  } else if(n===2){
    met(0,"x.......x......."); met(1,"....x.......x...");
    met(7,"..x.x.....x.x..."); met(11,"........x.......",[55,55,55,55,55,55,55,55,55,55,55,55,55,55,55,55]);
    met(13,"x...............");
    p.son[13].slice=true;
  }
  return p;
}

var SX = {
  pat: motifSx(0), slots: [], cur:0, sel:0, param:0, mode:0,
  rec:false, shift:false, kb:false, oct:3, pasSel:-1, protect:false, clip:null,
  song:[], spos:0, ssel:0, pos:-1, note:48, gamme:0,
  slot:0, chaine:false, tube:0.3,
  fx:[{t:10,e1:0.4,e2:0.35},{t:6,e1:0.35,e2:0.5},{t:4,e1:0.4,e2:0.3}],
  mute:[], solo:[], noeuds:[], entrees:[], sorties:[], regFx:[[],[],[]],
  tubeIn:null, tubeNode:null, tubeSortie:null
};
for(var xz=0; xz<16; xz++) SX.slots.push(motifSx(xz<3?xz:9));

/* --- chaîne audio --- */
function sxAudio(){
  if(SX.tubeIn || !ctx) return;
  busEffets();
  SX.tubeIn = ctx.createGain();
  SX.tubeNode = ctx.createWaveShaper(); SX.tubeNode.oversample = "4x";
  SX.tubeSortie = ctx.createGain();
  SX.tubeIn.connect(SX.tubeNode); SX.tubeNode.connect(SX.tubeSortie); SX.tubeSortie.connect(busSet("sx") || master);
  SX.entrees = []; SX.sorties = []; SX.regFx = [[],[],[]];
  for(var i=0;i<3;i++){ SX.entrees.push(ctx.createGain()); SX.sorties.push(ctx.createGain()); }
  majTubeSx(); cablerFxSx();
}
function majTubeSx(){
  if(!SX.tubeNode) return;
  SX.tubeNode.curve = courbeLampe(SX.tube);
  SX.tubeSortie.gain.value = 1/(1+SX.tube*1.6);
  var v = document.getElementById("sx-valve");
  if(v){
    var l = v.querySelectorAll("i");
    for(var i=0;i<l.length;i++){
      l[i].style.opacity = 0.4 + SX.tube*0.6;
      l[i].style.boxShadow = "0 0 " + Math.round(10+SX.tube*30) + "px #ff9d2e" + (SX.tube>0.5?"cc":"80");
    }
  }
}
/* un seul emplacement à reconstruire, et rien du tout si seuls EDIT 1 et 2 bougent */
function majFxSx(i){
  var reg = SX.regFx[i];
  if(reg && reg.type === SX.fx[i].t && reg.maj){
    if(reg.maj(SX.fx[i].e1, SX.fx[i].e2) !== false) return true;
  }
  return false;
}
function cablerFxSx(){
  if(!SX.entrees.length) return;
  for(var i=0;i<3;i++){
    try{ SX.sorties[i].disconnect(); }catch(e){}
    SX.regFx[i].forEach(function(n){ try{ n.disconnect(); }catch(e){} try{ if(n.stop) n.stop(); }catch(e){} });
    SX.regFx[i] = [];
    try{ SX.entrees[i].disconnect(); }catch(e){}
  }
  for(i=0;i<3;i++){
    construireFxEntre(SX.entrees[i], SX.sorties[i], SX.fx[i].t, SX.fx[i].e1, SX.fx[i].e2, SX.regFx[i]);
    SX.regFx[i].type = SX.fx[i].t;
    if(SX.chaine && i<2) SX.sorties[i].connect(SX.entrees[i+1]);
    else SX.sorties[i].connect(SX.tubeIn);
  }
}
function sortieSx(k,t){
  sxAudio();
  if(!SX.noeuds[k]){
    var g = ctx.createGain(), pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    var s = ctx.createGain();
    if(pn){ g.connect(pn); pn.connect(SX.tubeIn); } else { g.connect(SX.tubeIn); }
    g.connect(s);
    SX.noeuds[k] = {g:g, p:pn, s:s, slot:-1};
  }
  var n = SX.noeuds[k], son = SX.pat.son[k];
  var quand = (t===undefined) ? maintenantAudio() : t;
  if(n.slot !== son.slot){
    try{ n.s.disconnect(); }catch(e){}
    n.s.connect(SX.entrees[son.slot||0]);
    n.slot = son.slot;
  }
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
  n.s.gain.setValueAtTime(son.send ? 0.9 : 0, quand);
  return n.g;
}

/* --- lecture d'un échantillon --- */
function tampon(son){
  banqueEs();
  return son.rev ? inverse(son.ech) : ES.buf[son.ech];
}
function voixSx(t,k,vel,pas,note,duree){
  var son = SX.pat.son[k], buf = tampon(son);
  if(!buf) return;
  var dest = pasVoie(sortieSx(k,t));
  var src = ctx.createBufferSource();
  var vitesse;
  if(k>=10 && k<12) vitesse = Math.pow(2, ((note===undefined?48:note)-48)/12 + mv("pitch",son.pitch));
  else vitesse = Math.pow(2, mv("pitch", son.pitch)*2);
  src.playbackRate.value = vitesse;
  poserTampon(src, buf, vitesse);

  var lp = ctx.createBiquadFilter();
  lp.type = ["lowpass","highpass","bandpass","bandpass"][son.ftype] || "lowpass";
  var cut = mv("cut", son.cut), res = mv("res", son.res), egi = mv("egi", son.egi);
  var base = 120*Math.pow(140, cut);
  lp.frequency.setValueAtTime(Math.min(18000, base), t);
  if(egi > 0.02){
    lp.frequency.linearRampToValueAtTime(Math.min(18000, base*(1+egi*8)), t+0.01);
    lp.frequency.exponentialRampToValueAtTime(Math.max(80, base), t+0.05+son.eg*1.2);
  }
  lp.Q.value = 0.7 + res*(son.ftype===3 ? 30 : 20);

  var g = ctx.createGain();
  var dep = mv("start", son.start) * buf.duration * 0.9;
  var dur;
  if(son.slice){
    var dc = buf.duration/16;
    dep = (pas%16)*dc;
    dur = Math.min(dc*1.08, duree || dc*1.08);
  } else {
    dur = son.amp ? (0.03 + mv("eg", son.eg)*1.4) : (duree || (buf.duration - dep)/vitesse);
  }
  dur = Math.max(0.04, dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.62*vel, t+0.004);
  g.gain.setValueAtTime(0.62*vel, t+dur*0.85);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);

  var prof = mv("mdepth", son.mdepth);
  if(prof > 0.01){
    var lfo = ctx.createOscillator();
    lfo.type = ["sawtooth","square","triangle","sine","sine"][son.mwave] || "sine";
    lfo.frequency.value = son.msync ? (S.bpm/60)*[0.25,0.5,1,2,4][Math.min(4,Math.floor(son.mspeed*5))]
                                    : 0.05 + son.mspeed*18;
    lfo.start(t); lfo.stop(t+dur+0.2);
    var ga = ctx.createGain();
    lfo.connect(ga);
    if(son.mdest===0){ ga.gain.value = prof*vitesse*0.6; ga.connect(src.playbackRate); }
    else if(son.mdest===1){ ga.gain.value = prof*base*2; ga.connect(lp.frequency); }
    else if(son.mdest===2){ ga.gain.value = prof*0.35; ga.connect(g.gain); }
    else if(SX.noeuds[k].p){ ga.gain.value = prof*0.9; ga.connect(SX.noeuds[k].p.pan); }
  }

  src.connect(lp); lp.connect(g); g.connect(dest);
  src.start(t, Math.min(dep, Math.max(0, buf.duration-0.02)), dur*vitesse + 0.05);
  src.stop(t + dur + 0.1);
}

/* --- séquenceur --- */
function motionSx(k,i){
  var m = SX.pat.mot[k];
  if(!m || !m.mode || !m.v) return null;
  var L = SX.pat.len||16, v = m.v[i];
  if(typeof v !== "number") return null;
  var su = m.v[(i+1)%L];
  return {p:m.p, v:v, suiv:(typeof su==="number"?su:v), lisse:m.mode===1};
}
function enregMotionSx(champ, val){
  var k = SX.sel, m = SX.pat.mot[k];
  if(!m || !m.mode) return;
  if(!SX.rec || !S.run || SX.pos < 0){ m.p = champ; return; }
  if(m.p !== champ || !m.v){ m.p = champ; m.v = []; for(var i=0;i<16;i++) m.v.push(val); }
  m.v[SX.pos] = val;
}
function appliquerMotFxSx(v){
  var m = SX.pat.motFx, sl = m.slot||0;
  SX.fx[sl][m.p] = v;
  if(!majFxSx(sl)) cablerFxSx();
}
function scheduleSx(i,t){
  var CHARGE_N = ouvrirPas();
  var p = SX.pat, k;
  var vfx = motFxValeur(p.motFx, i, p.len);
  if(vfx !== null) appliquerMotFxSx(vfx);
  if(p.sw && i%2===1) t += stepDur()*p.sw*0.55;
  var acc = p.st[9][i];
  var soloActif = false;
  for(k=0;k<14;k++) if(SX.solo[k]) soloActif = true;
  for(k=0;k<14;k++){
    if(k===9) continue;
    if(!p.st[k][i]) continue;
    if(SX.mute[k]) continue;
    if(soloActif && !SX.solo[k]) continue;
    MOT = motionSx(k,i);
    var n = p.son[k].roll ? 4 : 1, j;
    for(j=0;j<n;j++){
      var tt = t + j*stepDur()/n;
      if(k>=12){                                   /* parties étirées : une tranche par pas */
        var buf = tampon(p.son[k]);
        if(buf){
          var L = p.len||16;
          CHARGE_N++, voixSxTranche(tt, k, acc?velAccent(p.son[9].lvl):0.8, i, L);
        }
      } else if(k>=10){
        var dSx = p.son[k].amp ? (0.03 + p.son[k].eg*1.4) : stepDur()*0.95;
        CHARGE_N++, voixSx(tt, k, acc?velAccent(p.son[9].lvl):0.8, i, p.nt[k][i], p.son[k].amp ? null : stepDur()*0.95);
        midiNoteA(p.nt[k][i], tt, acc?velAccent(p.son[9].lvl):0.8, k-10, dSx);
      } else {
        CHARGE_N++, voixSx(tt, k, acc?velAccent(p.son[9].lvl):0.75, i);
        midiNoteA(MIDI.base+k, tt, acc?velAccent(p.son[9].lvl):0.75, MIDI.canal);
      }
    }
    MOT = null;
  }
  if(!cache) queue.push({i:i,t:t});
  attenuerVoie("sx", CHARGE_N, t);
}
/* une partie étirée découpe l'échantillon en autant de tranches que de pas :
   la hauteur ne bouge pas, seule la position avance */
function voixSxTranche(t,k,vel,pas,L){
  var son = SX.pat.son[k], buf = tampon(son);
  if(!buf) return;
  var dest = pasVoie(sortieSx(k,t));
  var dc = buf.duration/L;
  var src = ctx.createBufferSource();
  src.playbackRate.value = Math.pow(2, mv("pitch", son.pitch));
  poserTampon(src, buf, src.playbackRate.value);
  var g = ctx.createGain();
  var dur = stepDur();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.linearRampToValueAtTime(0.62*vel, t+0.004);
  g.gain.setValueAtTime(0.62*vel, t+dur*0.9);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur*1.02);
  var lp = ctx.createBiquadFilter(); lp.type="lowpass";
  lp.frequency.value = Math.min(18000, 120*Math.pow(140, mv("cut", son.cut)));
  lp.Q.value = 0.7 + mv("res", son.res)*18;
  src.connect(lp); lp.connect(g); g.connect(dest);
  src.start(t, Math.min(buf.duration-0.02, (pas%L)*dc), dc*1.2);
  src.stop(t + dur*1.1);
}
var sxBeats=[], sxKeys=[];
function beatSx(i){
  SX.pos=i;
  if(SX.mode===3){
    for(var q=0;q<16;q++){ sxBeats[q].classList.toggle("on", q===SX.spos); sxKeys[q].classList.remove("cur"); }
    return;
  }
  for(var j=0;j<16;j++){
    sxBeats[j].classList.toggle("on", j===i);
    sxKeys[j].classList.toggle("cur", j===i);
  }
}
function arretSx(){
  SX.pos=-1;
  var pb=document.getElementById("sx-play"); if(pb) pb.classList.remove("on");
  for(var j=0;j<16;j++){ sxBeats[j].classList.remove("on"); sxKeys[j].classList.remove("cur"); }
}
function boucleSx(){
  if(SX.mode!==3 || !SX.song.length) return;
  SX.spos=(SX.spos+1)%SX.song.length;
  SX.cur=SX.song[SX.spos]; SX.pat=SX.slots[SX.cur];
  majTouchesSx(); majKnobsSx(); majLedsSx();
  lcdSx("SONG "+(SX.spos+1), "PATTERN "+nomMotif(SX.cur), true);
}
var MACHINE_SX = {schedule:scheduleSx, beat:beatSx, arret:arretSx, boucle:boucleSx,
                  longueur:function(){ return SX.pat.len||16; }};

/* --- afficheur --- */
var sxVal=document.getElementById("sx-val"), sxLab=document.getElementById("sx-lab"), sxTmr=null;
function lcdSx(v,l,fugace){
  sxVal.textContent=v; sxLab.textContent=l;
  clearTimeout(sxTmr);
  if(fugace) sxTmr=setTimeout(majLcdSx,1400);
}
function nomPartieSx(k){
  if(k===9) return "ACCENT";
  if(k>=12) return "STRETCH "+SX_STRETCH[k-12];
  if(k>=10) return "KEYBOARD "+SX_KEYS[k-10];
  return "DRUM "+SX_DRUMS[k];
}
function majLcdSx(){
  var k=SX.sel, son=SX.pat.son[k];
  if(SX.param===1) lcdSx(String(S.bpm),"TEMPO");
  else if(SX.param===2) lcdSx(nomEch(son.ech), "SAMPLE · "+nomPartieSx(k));
  else if(SX.param===3) lcdSx(nomNote(SX.pasSel>=0 && SX.pat.st[k][SX.pasSel] ? SX.pat.nt[k][SX.pasSel] : SX.note),
                              SX.pasSel>=0 ? "NOTE · PAS "+(SX.pasSel+1) : "NOTE");
  else if(SX.param===4) lcdSx(String(SX.pat.len), "LENGTH");
  else if(SX.param===5) lcdSx(Math.round(SX.pat.sw*100)+"%","SWING");
  else lcdSx("ESX-1", "PATTERN "+nomMotif(SX.cur));
}

/* --- construction --- */
(function construireSx(){
  var i,b;
  var C1=["Pattern","Tempo","Sample","Note No.","Length","Swing"];
  var C2=["Song","Tempo","Position","Pattern","Mute Hold","Next Song"];
  var C3=["Sample","Start","Loop Start","Sample Tune","Stretch Step","Auto Sampling"];
  var C4=["Metronome","Audio In Mode","Clock","MIDI ch","Memory","Protect"];
  var bp=document.getElementById("sx-params");
  for(i=0;i<6;i++){
    [[C1[i],1],[C2[i],0],[C3[i],0],[C4[i],0]].forEach(function(c){
      var u=document.createElement("u");
      u.innerHTML='<i></i>'+c[0];
      if(c[1]){ u.dataset.p=i; if(i===0) u.className="on"; } else u.className="no";
      bp.appendChild(u);
    });
  }
  bp.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u || u.dataset.p===undefined) return;
    SX.param=+u.dataset.p;
    var us=bp.querySelectorAll("u[data-p]");
    for(var j=0;j<us.length;j++) us[j].classList.toggle("on", +us[j].dataset.p===SX.param);
    majLcdSx(); H.cran();
  });

  var bf=document.getElementById("sx-fxtypes");
  SX_FX.forEach(function(idx){
    var u=document.createElement("u"); u.innerHTML='<i></i>'+FX_NOMS[idx]; u.dataset.t=idx;
    bf.appendChild(u);
  });
  bf.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u) return;
    SX.fx[SX.slot].t=+u.dataset.t; cablerFxSx(); majLedsSx(); memSx();
    lcdSx(FX_NOMS[SX.fx[SX.slot].t], "FX "+(SX.slot+1), true); H.cran();
  });

  var bt=document.getElementById("sx-ftypes");
  MX_FILTRES.forEach(function(nom,idx){
    var u=document.createElement("u"); u.innerHTML='<i></i>'+nom; u.dataset.f=idx; bt.appendChild(u);
  });
  bt.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u) return;
    SX.pat.son[SX.sel].ftype=+u.dataset.f; majLedsSx(); memSx();
    lcdSx(MX_FILTRES[SX.pat.son[SX.sel].ftype],"FILTER TYPE",true); H.cran();
  });
  var bd=document.getElementById("sx-mdest");
  SX_MDEST.forEach(function(nom,idx){
    var u=document.createElement("u"); u.innerHTML='<i></i>'+nom; u.dataset.d=idx; bd.appendChild(u);
  });
  bd.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u) return;
    SX.pat.son[SX.sel].mdest=+u.dataset.d; majLedsSx(); memSx();
    lcdSx(SX_MDEST[SX.pat.son[SX.sel].mdest],"MOD DEST",true); H.cran();
  });

  function rangee(boite, sous, labels, base){
    labels.forEach(function(nom,idx){
      var bb=document.createElement("button"); bb.className="sxb"; bb.dataset.k=base+idx; bb.textContent="";
      boite.appendChild(bb);
      var sp=document.createElement("span"); sp.textContent=nom; sous.appendChild(sp);
    });
  }
  rangee(document.getElementById("sx-drums"), document.getElementById("sx-drums-sous"), SX_DRUMS, 0);
  rangee(document.getElementById("sx-keys"), document.getElementById("sx-keys-sous"), SX_KEYS, 10);
  rangee(document.getElementById("sx-stretchs"), document.getElementById("sx-stretchs-sous"), SX_STRETCH, 12);
  function clicPartie(e){
    var bb=e.target.closest(".sxb"); if(!bb) return;
    choisirSx(+bb.dataset.k);
  }
  function frappePartie(e){
    var bb=e.target.closest(".sxb"); if(!bb) return;
    var k=+bb.dataset.k;
    if(k===9) return;
    if(!ctx) audioInit();
    sxAudio(); banqueEs();
    if(k>=12) voixSxTranche(maintenantAudio()+0.01, k, 1, SX.pos>=0?SX.pos:0, SX.pat.len||16);
    else voixSx(maintenantAudio()+0.01, k, 1, SX.pos>=0?SX.pos:0, k>=10?SX.note:undefined);
    if(SX.rec && S.run && SX.pos>=0 && !SX.protect){
      var j=(SX.pos+1)%(SX.pat.len||16);
      SX.pat.st[k][j]=1;
      if(k>=10 && k<12) SX.pat.nt[k][j]=SX.note;
      if(k===SX.sel) majTouchesSx();
      memSx();
    }
  }
  ["sx-drums","sx-keys","sx-stretchs"].forEach(function(id){
    document.getElementById(id).addEventListener("click", clicPartie);
    document.getElementById(id).addEventListener("pointerdown", frappePartie);
  });

  var bb2=document.getElementById("sx-beats"), bk=document.getElementById("sx-steps");
  for(i=0;i<16;i++){
    var d=document.createElement("i"); if(i%4===0) d.className="b4";
    bb2.appendChild(d); sxBeats.push(d);
    b=document.createElement("button"); b.className="sxb"; b.textContent=String(i+1); b.dataset.i=i;
    bk.appendChild(b); sxKeys.push(b);
  }
  bk.addEventListener("click", function(e){
    var bb3=e.target.closest(".sxb"); if(!bb3) return;
    var i2=+bb3.dataset.i;
    if(SX.shift){ shiftSx(i2); return; }
    if(SX.pset){ allerMotifSx(i2); return; }
    if(SX.mode === 2){ choisirPasSx(i2); return; }
    if(SX.mode===3){ songSx(i2); return; }
    if(SX.kb && SX.sel>=10 && SX.sel<12){ clavierSx(i2); return; }
    if(SX.protect){ lcdSx("PROTECT","ÉCRITURE BLOQUÉE",true); return; }
    var p=SX.pat, k=SX.sel;
    p.st[k][i2] = p.st[k][i2] ? 0 : 1;
    if(p.st[k][i2] && k>=10 && k<12) p.nt[k][i2]=SX.note;
    SX.pasSel=i2;
    majTouchesSx(); memSx(); H.cran();
  });
})();

function noteClavierSx(i){ return 12*SX.oct + GAMMES[SX.gamme||0].i[i]; }
function clavierSx(i){
  var p=SX.pat, k=SX.sel, n=noteClavierSx(i);
  if(!ctx) audioInit();
  sxAudio(); banqueEs();
  voixSx(maintenantAudio()+0.01, k, 1, 0, n, 0.6);
  SX.note=n;
  if(!SX.protect){
    if(SX.rec && S.run && SX.pos>=0){
      var j=(SX.pos+1)%(p.len||16);
      p.st[k][j]=1; p.nt[k][j]=n;
    } else if(SX.pasSel>=0 && p.st[k][SX.pasSel]) p.nt[k][SX.pasSel]=n;
    memSx();
  }
  majTouchesSx();
  lcdSx(nomNote(n), SX.pasSel>=0 && !SX.rec ? "PAS "+(SX.pasSel+1) : "KEYBOARD", true);
  H.cran();
}
function choisirSx(k){
  SX.sel=k; SX.pasSel=-1;
  var bs=document.querySelectorAll("#sx-drums .sxb,#sx-keys .sxb,#sx-stretchs .sxb");
  for(var j=0;j<bs.length;j++) bs[j].classList.toggle("on", +bs[j].dataset.k===k);
  majTouchesSx(); majKnobsSx(); majLedsSx();
  lcdSx(nomPartieSx(k), k===9 ? "ACCENT" : nomEch(SX.pat.son[k].ech), true);
  H.cran();
}
function choisirPasSx(i){
  var p=SX.pat, k=SX.sel;
  SX.pasSel = i; SX.param = 3;
  majTouchesSx(); H.cran();
  if(!p.st[k][i]) lcdSx("---", "PAS "+(i+1)+" · VIDE", true);
  else if(k>=10 && k<12) lcdSx(nomNote(p.nt[k][i]), "PAS "+(i+1)+" · "+nomPartieSx(k), true);
  else lcdSx("ON", "PAS "+(i+1)+" · "+nomPartieSx(k), true);
}
function majTouchesSx(){
  var p=SX.pat, k=SX.sel, i;
  if(SX.pset){
    for(i=0;i<16;i++){
      sxKeys[i].textContent = nomMotif(i);
      sxKeys[i].classList.toggle("act", i === SX.cur);
      sxKeys[i].classList.remove("hors");
    }
    return;
  }
  if(SX.mode===3){
    for(i=0;i<16;i++){
      var v=SX.song[i];
      sxKeys[i].textContent=(v===undefined)?"–":nomMotif(v);
      sxKeys[i].classList.toggle("act", v!==undefined && i!==SX.spos);
      sxKeys[i].classList.toggle("hors", v===undefined);
    }
    return;
  }
  if(SX.kb && k>=10 && k<12){
    var cour=(SX.pasSel>=0 && p.st[k][SX.pasSel]) ? p.nt[k][SX.pasSel] : SX.note;
    for(i=0;i<16;i++){
      sxKeys[i].textContent=nomNote(noteClavierSx(i));
      sxKeys[i].classList.toggle("act", noteClavierSx(i)===cour);
      sxKeys[i].classList.remove("hors");
    }
    return;
  }
  for(i=0;i<16;i++){
    sxKeys[i].textContent=String(i+1);
    sxKeys[i].classList.toggle("act", !!p.st[k][i]);
    sxKeys[i].classList.toggle("sel", i === SX.pasSel && SX.mode === 2);
    sxKeys[i].classList.toggle("hors", i >= (p.len||16));
    sxBeats[i].classList.toggle("hors", i >= (p.len||16));
  }
}
function majLedsSx(){
  var k=SX.sel, son=SX.pat.son[k], j, us;
  us=document.querySelectorAll("#sx-ftypes u");
  for(j=0;j<us.length;j++) us[j].classList.toggle("on", +us[j].dataset.f===son.ftype);
  us=document.querySelectorAll("#sx-mdest u");
  for(j=0;j<us.length;j++) us[j].classList.toggle("on", +us[j].dataset.d===son.mdest);
  us=document.querySelectorAll("#sx-fxtypes u");
  for(j=0;j<us.length;j++) us[j].classList.toggle("on", +us[j].dataset.t===SX.fx[SX.slot].t);
  for(j=0;j<3;j++) document.getElementById("sx-slot"+j).classList.toggle("on", SX.slot===j);
  document.getElementById("sx-chain").classList.toggle("on", SX.chaine);
  document.getElementById("sx-fxmot").classList.toggle("on", !!(SX.pat.motFx && SX.pat.motFx.mode));
  document.getElementById("sx-ampeg").classList.toggle("on", son.amp);
  document.getElementById("sx-roll").classList.toggle("on", son.roll);
  document.getElementById("sx-fxsend").classList.toggle("on", son.send);
  document.getElementById("sx-rev").classList.toggle("on", son.rev);
  document.getElementById("sx-slice").classList.toggle("on", son.slice);
  document.getElementById("sx-fxsel").textContent="FX SELECT "+((son.slot||0)+1);
  document.getElementById("sx-bpmsync").classList.toggle("on", son.msync);
  document.getElementById("sx-kb").classList.toggle("on", SX.kb);
  document.getElementById("sx-mute").classList.toggle("on", !!SX.mute[k]);
  document.getElementById("sx-solo").classList.toggle("on", !!SX.solo[k]);
  var buf = ES.buf[son.ech];
  /* v132 : le nom d'un échantillon vient de l'utilisateur ou d'archive.org —
     jamais interprété comme du HTML */
  texteApresLed(document.getElementById("sx-ech-nom"), nomEch(son.ech));
  texteApresLed(document.getElementById("sx-ech-info"),
    buf ? (buf.duration.toFixed(2)+" s · "+Math.round(buf.sampleRate/1000)+" kHz") : "vide");
  var m=SX.pat.mot[k], mode=m?m.mode||0:0;
  document.getElementById("sx-smooth").classList.toggle("on", mode===1);
  document.getElementById("sx-trig").classList.toggle("on", mode===2);
  document.getElementById("sx-mseq").classList.toggle("on", mode!==0);
  var bs=document.querySelectorAll("#sx-drums .sxb,#sx-keys .sxb,#sx-stretchs .sxb");
  for(j=0;j<bs.length;j++){
    var kk=+bs[j].dataset.k, mm=SX.pat.mot[kk];
    bs[j].classList.toggle("mot", !!(mm && mm.mode));
    bs[j].classList.toggle("vide", kk!==9 && !ES.buf[SX.pat.son[kk].ech]);
  }
}

/* --- mémoire --- */
function serSx(p){
  return {sw:p.sw, len:p.len, son:p.son, mot:p.mot, motFx:p.motFx,
          st:p.st.map(function(l){ return l.join(""); }),
          nt:p.nt.map(function(l){ return l.join(","); })};
}
function memSx(){
  memoire.esx = {cur:SX.cur, song:SX.song.slice(), sel:SX.sel, tube:SX.tube, noms:ES.noms,
                 fx:SX.fx, chaine:SX.chaine, slot:SX.slot, gamme:SX.gamme, oct:SX.oct,
                 slots:SX.slots.map(serSx)};
  memoire.esx.slots[SX.cur]=serSx(SX.pat);
  sauverMachine("esx");
}
function chargerSx(){
  SX.slots=[];
  for(var z=0;z<16;z++) SX.slots.push(motifSx(z<3?z:9));
  SX.cur=0; SX.sel=0; SX.song=[]; SX.mute=[]; SX.solo=[]; SX.pat=SX.slots[0];
  var m=memLire("esx");
  if(!m) return;
  if(m.slots && m.slots.length===16){
    SX.slots=m.slots.map(function(o){
      var p=motifSx(9);
      p.sw=o.sw||0; p.len=o.len||16;
      if(o.st) o.st.forEach(function(s,k){ for(var i=0;i<16;i++) p.st[k][i]=s.charAt(i)==="1"?1:0; });
      if(o.nt) o.nt.forEach(function(s,k){ p.nt[k]=s.split(",").map(Number); });
      if(o.son) p.son=o.son;
      if(o.mot) p.mot=o.mot;
      if(o.motFx) p.motFx=o.motFx;
      return p;
    });
  }
  if(m.song && m.song.length) SX.song=m.song.slice();
  if(m.noms) for(var nk in m.noms) if(ES.noms[nk]===undefined) ES.noms[nk]=m.noms[nk];
  if(m.fx && m.fx.length===3) SX.fx=m.fx;
  ["cur","sel","tube","slot","gamme","oct"].forEach(function(c){ if(typeof m[c]==="number") SX[c]=m[c]; });
  SX.chaine=!!m.chaine;
  SX.pat=SX.slots[SX.cur];
}

/* --- boutons rotatifs --- */
function knobSx(id, champ, min, max, nom){
  return knobEm(id, {min:min,max:max,
    get:function(){ return SX.pat.son[SX.sel][champ]; },
    set:function(v){
      SX.pat.son[SX.sel][champ]=v; enregMotionSx(champ,v);
      lcdSx(String(Math.round((champ==="pan"||champ==="pitch")? v*63 : v*127)), nom, true);
    }});
}
var kSxVol = knobEm("sx-k-vol",{min:0,max:1,get:function(){return S.vol;},set:function(v){
  S.vol=v; if(master) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
  lcdSx(String(Math.round(v*100)),"MASTER VOLUME",true); saveSoon();
}});
var kSxTube = knobEm("sx-k-tube",{min:0,max:1,get:function(){return SX.tube;},set:function(v){
  SX.tube=v; majTubeSx(); lcdSx(String(Math.round(v*127)),"TUBE GAIN",true);
}});
var kSxPitch = knobSx("sx-k-pitch","pitch",-1,1,"PITCH");
var kSxPan   = knobSx("sx-k-pan","pan",-1,1,"PAN");
var kSxStart = knobSx("sx-k-start","start",0,1,"START POINT");
var kSxEg    = knobSx("sx-k-eg","eg",0,1,"EG TIME");
var kSxLvl   = knobSx("sx-k-lvl","lvl",0,1,"LEVEL");
var kSxCut   = knobSx("sx-k-cut","cut",0,1,"CUTOFF");
var kSxRes   = knobSx("sx-k-res","res",0,1,"RESONANCE");
var kSxEgi   = knobSx("sx-k-egi","egi",0,1,"EG INT");
var kSxMs    = knobSx("sx-k-mspeed","mspeed",0,1,"MOD SPEED");
var kSxMd    = knobSx("sx-k-mdepth","mdepth",0,1,"MOD DEPTH");
var kSxF1 = knobEm("sx-k-fx1",{min:0,max:1,get:function(){return SX.fx[SX.slot].e1;},
  set:function(v){ SX.fx[SX.slot].e1=v; if(!majFxSx(SX.slot)) cablerFxSx();
    motFxEcrire(SX.pat.motFx, "e1", v, SX.rec && S.run, SX.pos);
    lcdSx(String(Math.round(v*127)),"FX "+(SX.slot+1)+" EDIT 1",true); }});
var kSxF2 = knobEm("sx-k-fx2",{min:0,max:1,get:function(){return SX.fx[SX.slot].e2;},
  set:function(v){ SX.fx[SX.slot].e2=v; if(!majFxSx(SX.slot)) cablerFxSx();
    motFxEcrire(SX.pat.motFx, "e2", v, SX.rec && S.run, SX.pos);
    lcdSx(String(Math.round(v*127)),"FX "+(SX.slot+1)+" EDIT 2",true); }});
function majKnobsSx(){
  [kSxPitch,kSxPan,kSxStart,kSxEg,kSxLvl,kSxCut,kSxRes,kSxEgi,kSxMs,kSxMd,kSxF1,kSxF2,kSxTube]
    .forEach(function(k){ k.maj(); });
}

/* --- molette --- */
(function moletteSx(){
  var el=document.getElementById("sx-dial"), st={drag:false,y0:0};
  el.addEventListener("pointerdown", function(e){ st.drag=true; st.y0=e.clientY; el.setPointerCapture(e.pointerId); e.preventDefault(); });
  el.addEventListener("pointermove", function(e){
    if(!st.drag || PINCE) return;
    var d=st.y0-e.clientY; if(Math.abs(d)<12) return;
    st.y0=e.clientY; pasSx(d>0?1:-1);
  });
  el.addEventListener("pointerup", function(){ st.drag=false; memSx(); });
  el.addEventListener("pointercancel", function(){ st.drag=false; });
  function pasSx(d){
    var p=SX.pat, k=SX.sel;
    if(SX.mode===3 && SX.song.length && SX.param===0){
      SX.song[SX.ssel]=(SX.song[SX.ssel]+d+16)%16;
      majTouchesSx(); memSx(); lcdSx(nomMotif(SX.song[SX.ssel]),"SONG "+(SX.ssel+1)); H.cran(); return;
    }
    if(SX.param===1){ S.bpm=Math.max(40,Math.min(300,S.bpm+d)); }
    else if(SX.param===2){
      banqueEs();
      var l=listeEch(), idx=l.indexOf(p.son[k].ech);
      idx=((idx<0?0:idx)+d+l.length)%l.length;
      p.son[k].ech=l[idx]; delete ES.inv[l[idx]];
      majLedsSx(); memSx(); lcdSx(nomEch(l[idx]),"SAMPLE"); H.cran(); return;
    }
    else if(SX.param===3){
      if(SX.pasSel>=0 && k>=10 && k<12 && p.st[k][SX.pasSel]){
        p.nt[k][SX.pasSel]=Math.max(12,Math.min(96,p.nt[k][SX.pasSel]+d));
        SX.note=p.nt[k][SX.pasSel];
      } else SX.note=Math.max(12,Math.min(96,SX.note+d));
      if(SX.kb) majTouchesSx();
    }
    else if(SX.param===4){ p.len=Math.max(1,Math.min(16,p.len+d)); majTouchesSx(); }
    else if(SX.param===5){ p.sw=Math.max(0,Math.min(0.6,+(p.sw+d*0.05).toFixed(2))); }
    else {
      memSx();
      SX.cur=(SX.cur+d+16)%16; SX.pat=SX.slots[SX.cur];
      majTouchesSx(); majKnobsSx(); majLedsSx();
    }
    majLcdSx(); H.cran();
  }
  SX.pas=pasSx;
  document.getElementById("sx-prev").addEventListener("click", function(){
    if(SX.kb){ SX.oct=Math.max(1,SX.oct-1); majTouchesSx(); lcdSx("OCT "+SX.oct,"KEYBOARD",true); H.cran(); }
    else pasSx(-1);
  });
  document.getElementById("sx-next").addEventListener("click", function(){
    if(SX.kb){ SX.oct=Math.min(6,SX.oct+1); majTouchesSx(); lcdSx("OCT "+SX.oct,"KEYBOARD",true); H.cran(); }
    else pasSx(1);
  });
})();

/* --- ruban --- */
(function rubanSx(){
  var el=document.getElementById("sx-ruban"), curseur=el.querySelector("b");
  var actif=false, dernier=-1, minuteur=null;
  function noteDe(e){
    var r=el.getBoundingClientRect();
    var x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    curseur.style.left=(x*100)+"%"; curseur.style.opacity=1;
    return 12*SX.oct + GAMMES[SX.gamme||0].i[Math.min(15,Math.floor(x*16))];
  }
  function jouer(n){
    if(!ctx) audioInit();
    sxAudio(); banqueEs();
    var k=(SX.sel>=10 && SX.sel<12) ? SX.sel : 10;
    voixSx(maintenantAudio()+0.01, k, 1, 0, n, 0.35);
    SX.note=n;
    lcdSx(nomNote(n),"ARPEGGIATOR",true);
  }
  el.addEventListener("pointerdown", function(e){
    actif=true; el.setPointerCapture(e.pointerId); e.preventDefault();
    dernier=noteDe(e); jouer(dernier);
    clearInterval(minuteur);
    minuteur=setInterval(function(){ if(actif && dernier>=0) jouer(dernier); }, Math.max(90, stepDur()*1000*2));
  });
  el.addEventListener("pointermove", function(e){
    if(!actif || PINCE) return;
    var n=noteDe(e);
    if(n!==dernier){ dernier=n; jouer(n); }
  });
  function fin(){ actif=false; clearInterval(minuteur); curseur.style.opacity=0; }
  el.addEventListener("pointerup", fin);
  el.addEventListener("pointercancel", fin);
})();

/* --- boutons --- */
function basculeSx(id, champ, nom){
  document.getElementById(id).addEventListener("click", function(){
    var son=SX.pat.son[SX.sel];
    son[champ]=!son[champ];
    if(champ==="rev") delete ES.inv[son.ech];
    majLedsSx(); memSx(); H.cran();
    lcdSx(son[champ]?"ON":"OFF", nom, true);
  });
}
basculeSx("sx-ampeg","amp","AMP EG");
basculeSx("sx-roll","roll","ROLL");
basculeSx("sx-fxsend","send","FX SEND");
basculeSx("sx-rev","rev","REVERSE");
basculeSx("sx-slice","slice","SLICE");
document.getElementById("sx-fxsel").addEventListener("click", function(){
  var son=SX.pat.son[SX.sel];
  son.slot=((son.slot||0)+1)%3;
  if(SX.noeuds[SX.sel]) SX.noeuds[SX.sel].slot=-1;
  majLedsSx(); memSx(); H.cran();
  lcdSx("FX "+(son.slot+1),"FX SELECT",true);
});
document.getElementById("sx-bpmsync").addEventListener("click", function(){
  var son=SX.pat.son[SX.sel]; son.msync=!son.msync;
  majLedsSx(); memSx(); H.cran(); lcdSx(son.msync?"SYNC":"FREE","MOD BPM SYNC",true);
});
document.getElementById("sx-mtype").addEventListener("click", function(){
  var son=SX.pat.son[SX.sel]; son.mwave=(son.mwave+1)%MX_MWAVES.length;
  majLedsSx(); memSx(); H.cran(); lcdSx(MX_MWAVES[son.mwave],"MOD WAVE",true);
});
document.getElementById("sx-dest").addEventListener("click", function(){
  var son=SX.pat.son[SX.sel]; son.mdest=(son.mdest+1)%SX_MDEST.length;
  majLedsSx(); memSx(); H.cran(); lcdSx(SX_MDEST[son.mdest],"MOD DEST",true);
});
document.getElementById("sx-ftype").addEventListener("click", function(){
  var son=SX.pat.son[SX.sel]; son.ftype=(son.ftype+1)%MX_FILTRES.length;
  majLedsSx(); memSx(); H.cran(); lcdSx(MX_FILTRES[son.ftype],"FILTER TYPE",true);
});
for(var xsl=0; xsl<3; xsl++){
  (function(i){
    document.getElementById("sx-slot"+i).addEventListener("click", function(){
      SX.slot=i; majLedsSx(); majKnobsSx(); H.cran();
      lcdSx(FX_NOMS[SX.fx[i].t],"FX "+(i+1),true);
    });
  })(xsl);
}
document.getElementById("sx-fxmot").addEventListener("click", function(){
  var p = SX.pat;
  if(!p.motFx) p.motFx = motFxVide();
  p.motFx.mode = p.motFx.mode ? 0 : 1;
  if(p.motFx.mode && !p.motFx.v){
    p.motFx.slot = SX.slot; p.motFx.p = "e1";
    p.motFx.v = []; for(var i=0;i<16;i++) p.motFx.v.push(SX.fx[SX.slot].e1);
  }
  this.classList.toggle("on", !!p.motFx.mode);
  memSx();
  lcdSx(p.motFx.mode ? "ON" : "OFF", "MOTION · FX "+((p.motFx.slot||0)+1), true);
  H.inter();
});
document.getElementById("sx-chain").addEventListener("click", function(){
  SX.chaine=!SX.chaine; cablerFxSx(); majLedsSx(); memSx(); H.inter();
  lcdSx(SX.chaine?"1→2→3":"PARALLÈLE","FX CHAIN",true);
});
document.getElementById("sx-mseq").addEventListener("click", function(){
  var k=SX.sel, m=SX.pat.mot[k];
  if(!m) m=SX.pat.mot[k]={mode:0,p:"lvl",v:null};
  m.mode=(m.mode+1)%3;
  if(m.mode && !m.v){ m.v=[]; for(var i=0;i<16;i++) m.v.push(SX.pat.son[k][m.p]); }
  majLedsSx(); memSx(); H.inter();
  lcdSx(m.mode===0?"OFF":(m.mode===1?"SMOOTH":"TRIG HOLD"),"MOTION · "+m.p.toUpperCase(),true);
});
document.getElementById("sx-kb").addEventListener("click", function(){
  SX.kb=!SX.kb; majTouchesSx(); majLedsSx();
  lcdSx(SX.kb?GAMMES[SX.gamme||0].n:"ESX-1", SX.kb?"KEYBOARD OCT "+SX.oct:"PATTERN "+nomMotif(SX.cur), true);
  H.inter();
});
function allerMotifSx(i){
  memSx();
  SX.cur = i; SX.pat = SX.slots[i];
  majTouchesSx(); majKnobsSx(); majLedsSx(); majLcdSx();
  lcdSx(nomMotif(i), "PATTERN", true); H.inter();
}
document.getElementById("sx-pset").addEventListener("click", function(){
  if(SX.kb){
    SX.gamme=((SX.gamme||0)+1)%GAMMES.length;
    majTouchesSx(); memSx();
    lcdSx(GAMMES[SX.gamme].n,"SCALE",true); H.cran();
    return;
  }
  SX.pset = !SX.pset;
  this.classList.toggle("on", SX.pset);
  majTouchesSx();
  lcdSx(SX.pset ? "SET" : "ESX-1", SX.pset ? "TOUCHE = MOTIF" : "PATTERN "+nomMotif(SX.cur), true);
  H.inter();
});
document.getElementById("sx-shift").addEventListener("click", function(){
  SX.shift=!SX.shift; this.classList.toggle("on", SX.shift);
  lcdSx(SX.shift?"SHIFT":"ESX-1", SX.shift?"FONCTIONS":"PATTERN "+nomMotif(SX.cur), true); H.cran();
});
document.getElementById("sx-mute").addEventListener("click", function(){
  SX.mute[SX.sel]=!SX.mute[SX.sel]; majLedsSx(); H.inter();
  lcdSx(SX.mute[SX.sel]?"MUTE":"ON", nomPartieSx(SX.sel), true);
});
document.getElementById("sx-solo").addEventListener("click", function(){
  SX.solo[SX.sel]=!SX.solo[SX.sel]; majLedsSx(); H.inter();
  lcdSx(SX.solo[SX.sel]?"SOLO":"OFF", nomPartieSx(SX.sel), true);
});
document.getElementById("sx-erase").addEventListener("click", function(){
  if(SX.protect){ lcdSx("PROTECT","ÉCRITURE BLOQUÉE",true); return; }
  if(SX.mode===3){
    if(SX.song.length){ SX.song.splice(SX.ssel,1); SX.ssel=Math.max(0,Math.min(SX.ssel,SX.song.length-1)); majTouchesSx(); memSx(); }
    return;
  }
  SX.pat.st[SX.sel]=ligneVide(); majTouchesSx(); memSx();
  lcdSx("CLEAR", nomPartieSx(SX.sel), true); H.inter();
});
document.getElementById("sx-write").addEventListener("click", function(){
  if(SX.protect){ lcdSx("PROTECT","ÉCRITURE BLOQUÉE",true); return; }
  SX.slots[SX.cur]=SX.pat; memSx(); writeMem();
  lcdSx("WRITE","PATTERN "+nomMotif(SX.cur),true); H.inter();
});
document.getElementById("sx-audioin").addEventListener("click", function(){
  lcdSx("---","PAS D'ENTRÉE LIGNE",true); H.cran();
});
document.getElementById("sx-stretch").addEventListener("click", function(){
  var k=SX.sel;
  if(k<12){ lcdSx("---","PARTIE STRETCH SEULEMENT",true); return; }
  SX.pat.son[k].slice=true; majLedsSx(); memSx();
  lcdSx("STRETCH","TRANCHE PAR PAS",true); H.cran();
});
/* échantillonnage : micro et import, comme sur l'ES-1 */
document.getElementById("sx-sampling").addEventListener("click", function(){ echantillonnerSx(); });
function echantillonnerSx(){
  if(ES_REC.mr){ try{ ES_REC.mr.stop(); }catch(e){} return; }
  audioInit(); banqueEs(); sxAudio();
  var p = HOST;
  if(p && p.micro){
    var ok=false;
    try{ ok = !!p.micro(); }catch(e){}
    if(!ok){ lcdSx("MIC","AUTORISEZ PUIS RETOUCHEZ",true); return; }
  }
  if(!navigator.mediaDevices || !window.MediaRecorder){ lcdSx("ERR","MICRO INDISPONIBLE",true); return; }
  var cibleSx = SX.sel;
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(flux){
    var morceaux=[], mr=new MediaRecorder(flux), minuteur=null;
    ES_REC.mr=mr;
    document.getElementById("sx-sampling").classList.add("on");
    lcdSx("REC","SAMPLING",false);
    mr.ondataavailable=function(e){ if(e.data && e.data.size) morceaux.push(e.data); };
    mr.onstop=function(){
      clearTimeout(minuteur);
      flux.getTracks().forEach(function(t){ t.stop(); });
      if(ES_REC.mr===mr) ES_REC.mr=null;
      document.getElementById("sx-sampling").classList.remove("on");
      new Blob(morceaux).arrayBuffer().then(function(ab){
        return new Promise(function(res,rej){ ctx.decodeAudioData(ab,res,rej); });
      }).then(function(buf){ poserEchSx(buf,"mic",cibleSx); })
        .catch(function(){ lcdSx("ERR","DÉCODAGE",true); });
    };
    mr.start();
    minuteur = setTimeout(function(){ if(ES_REC.mr===mr) try{ mr.stop(); }catch(e){} }, 8000);
  }).catch(function(){ lcdSx("ERR","MICRO REFUSÉ",true); });
}
function poserEchSx(buf, quoi, cible){
  if(PROJET_EN_COURS) return;
  if(SX.protect){ lcdSx("PROTECT","ÉCRITURE BLOQUÉE",true); return; }
  if(S.modele !== "esx"){ signal("MACHINE CHANGÉE · SON NON AFFECTÉ"); return; }
  var k = (cible === undefined) ? SX.sel : cible;
  var court = reduireEch(buf, 32000, 8);
  var id = "u" + Date.now().toString(36);
  ES.buf[id]=court; ES.noms[id]=quoi;
  SX.pat.son[k].ech=id;
  delete ES.inv[id];
  sauverEch(id, court);
  majLedsSx(); memSx();
  lcdSx(nomEch(id), quoi==="fichier" ? "IMPORT" : "SAMPLING", true);
  H.inter();
}
document.getElementById("sx-import").addEventListener("click", function(){
  audioInit(); banqueEs();
  document.getElementById("sx-fichier").click();
});
document.getElementById("sx-fichier").addEventListener("change", function(){
  var f=this.files && this.files[0]; if(!f) return;
  if(f.size > 40*1024*1024){ signal("FICHIER TROP GROS · 40 Mo AU PLUS"); this.value=""; return; }
  var cible = SX.sel;
  lcdSx("...","IMPORT",false);
  f.arrayBuffer().then(function(ab){
    return new Promise(function(res,rej){ ctx.decodeAudioData(ab,res,rej); });
  }).then(function(buf){ poserEchSx(buf,"fichier",cible); })
    .catch(function(){ lcdSx("ERR","FICHIER ILLISIBLE",true); });
  this.value="";
});
var sxModes=document.querySelectorAll("[data-sxmode]");
for(var sxm=0; sxm<sxModes.length; sxm++){
  sxModes[sxm].addEventListener("click", function(){
    var m=+this.dataset.sxmode;
    for(var j=0;j<sxModes.length;j++) sxModes[j].classList.toggle("on", +sxModes[j].dataset.sxmode===m);
    SX.mode=m;
    if(m===3){
      SX.spos=0; SX.ssel=0;
      if(SX.song.length){ SX.cur=SX.song[0]; SX.pat=SX.slots[SX.cur]; }
      majTouchesSx(); majKnobsSx(); lcdSx("SONG", SX.song.length?("PATTERN "+nomMotif(SX.cur)):"VIDE", true);
    } else if(m===4){ SX.param=2; banqueEs(); majLcdSx(); }
    else if(m===1){ SX.param=2; majLcdSx(); }
    else if(m===2){ SX.param=3; SX.pasSel=-1; majTouchesSx();
      lcdSx("STEP", "TOUCHE = CHOISIR UN PAS", true); }
    else { majTouchesSx(); majLcdSx(); }
    H.cran();
  });
}
document.getElementById("sx-play").addEventListener("click", function(){
  audioInit(); banqueEs(); sxAudio();
  if(S.run){ stop(); H.stop(); } else { start(); H.start(); }
  this.classList.toggle("on", S.run);
});
document.getElementById("sx-stop").addEventListener("click", function(){
  stop(); step=0; H.stop();
  document.getElementById("sx-play").classList.remove("on");
});
document.getElementById("sx-home").addEventListener("click", function(){ step=0; lcdSx("|◀","RETOUR AU PAS 1",true); H.cran(); });
document.getElementById("sx-rec").addEventListener("click", function(){
  SX.rec=!SX.rec; this.classList.toggle("on", SX.rec);
  lcdSx(SX.rec?"REC":"ESX-1", SX.rec?"ENREGISTREMENT AU VOL":"PATTERN "+nomMotif(SX.cur), true); H.inter();
});
var sxTaps=[];
document.getElementById("sx-tap").addEventListener("click", function(){
  var now=Date.now();
  if(sxTaps.length && now-sxTaps[sxTaps.length-1]>2200) sxTaps=[];
  sxTaps.push(now); if(sxTaps.length>5) sxTaps.shift();
  if(sxTaps.length<2){ lcdSx("TAP","TEMPO",true); H.cran(); return; }
  var s=0; for(var i=1;i<sxTaps.length;i++) s+=sxTaps[i]-sxTaps[i-1];
  var bpm=Math.round(60000/(s/(sxTaps.length-1)));
  if(bpm>=40&&bpm<=300){ S.bpm=bpm; lcdSx(String(bpm),"TEMPO",true); saveSoon(); }
  H.cran();
});
document.getElementById("sx-notice").addEventListener("click", function(){
  ouvrirNotice();
});
function songSx(i){
  if(SX.protect) return;
  if(i > SX.song.length){ lcdSx("SONG","POSITION SUIVANTE",true); H.cran(); return; }
  if(i === SX.song.length) SX.song.push(SX.cur);
  SX.ssel=i; majTouchesSx(); memSx(); H.cran();
  lcdSx(nomMotif(SX.song[i]),"SONG "+(i+1),true);
}
function shiftSx(i){
  var p=SX.pat, k=SX.sel, son=p.son[k], buf=ES.buf[son.ech], su, q;
  if(SX.protect && i!==15){ lcdSx("PROTECT","ÉCRITURE BLOQUÉE",true); H.cran(); return; }
  if(i===0){ SX.param=4; majLcdSx(); lcdSx(String(p.len),"LAST STEP · MOLETTE",true); }
  else if(i===1){ p.st[k].unshift(p.st[k].pop()); p.nt[k].unshift(p.nt[k].pop()); majTouchesSx(); memSx(); lcdSx(">> 1","MOVE DATA",true); }
  else if(i===2){ SX.clip={st:p.st[k].slice(), nt:p.nt[k].slice()}; lcdSx("COPY","PART",true); }
  else if(i===3){ SX.clipSon=JSON.parse(JSON.stringify(son)); lcdSx("COPY","SOUND",true); }
  else if(i===4){ p.mot[k]=null; majLedsSx(); memSx(); lcdSx("CLEAR","MOTION",true); }
  else if(i===5){ p.st[k]=ligneVide(); majTouchesSx(); memSx(); lcdSx("CLEAR","PART",true); }
  else if(i===6){ SX.pat=motifSx(9); SX.slots[SX.cur]=SX.pat; majTouchesSx(); majKnobsSx(); majLedsSx(); memSx(); lcdSx("CLEAR","PATTERN",true); }
  else if(i===7){
    su=(SX.cur+1)%16;
    SX.slots[SX.cur]=p;
    var np=motifSx(9);
    np.sw=p.sw; np.len=p.len;
    np.st=p.st.map(function(l){return l.slice();});
    np.nt=p.nt.map(function(l){return l.slice();});
    np.son=JSON.parse(JSON.stringify(p.son));
    SX.slots[su]=np; SX.cur=su; SX.pat=np;
    majTouchesSx(); majKnobsSx(); majLedsSx(); memSx();
    lcdSx(nomMotif(su),"INSERT PATTERN",true);
  }
  else if(i===8){ SX.slots[SX.cur]=motifSx(9); SX.pat=SX.slots[SX.cur]; majTouchesSx(); majKnobsSx(); majLedsSx(); memSx(); lcdSx("DELETE","PATTERN",true); }
  else if(i===9){ SX.song=[]; SX.spos=0; SX.ssel=0; if(SX.mode===3) majTouchesSx(); memSx(); lcdSx("CLEAR","SONG",true); }
  else if(i===10){
    if(buf){
      var d=buf.getChannelData(0), c=0.0001;
      for(q=0;q<d.length;q++) if(Math.abs(d[q])>c) c=Math.abs(d[q]);
      var gg=0.95/c;
      for(q=0;q<d.length;q++) d[q]*=gg;
      delete ES.inv[son.ech];
      if(son.ech.charAt(0)!=="b") sauverEch(son.ech, buf);
      majLedsSx(); lcdSx("NORM","NORMALIZE",true);
    } else lcdSx("---","NORMALIZE",true);
  }
  else if(i===11){
    if(buf){
      var dd=buf.getChannelData(0), fin=dd.length-1;
      while(fin>100 && Math.abs(dd[fin])<0.004) fin--;
      if(fin>100 && fin<dd.length-200){
        var nb=ctx.createBuffer(1,fin+1,buf.sampleRate), nd=nb.getChannelData(0);
        for(q=0;q<=fin;q++) nd[q]=dd[q];
        ES.buf[son.ech]=nb; delete ES.inv[son.ech];
        if(son.ech.charAt(0)!=="b") sauverEch(son.ech, nb);
      }
      majLedsSx(); lcdSx("TRUNC","TRUNCATE",true);
    } else lcdSx("---","TRUNCATE",true);
  }
  else if(i===12){ son.slice=!son.slice; majLedsSx(); memSx(); lcdSx(son.slice?"ON":"OFF","TIME SLICE",true); }
  else if(i===13){
    var idSx = son.ech;
    son.ech = "b0";
    if(idSx.charAt(0) !== "b"){
      var nSx = usagesEch(idSx);
      if(nSx > 0){
        signal("SON ENCORE UTILISÉ " + nSx + " FOIS · RETIRÉ DE CETTE PARTIE SEULEMENT");
        lcdSx("KEEP","DELETE SAMPLE",true);
      } else {
        supprimerEch(idSx);
        lcdSx("DELETE","SAMPLE",true);
      }
    } else lcdSx("DELETE","SAMPLE",true);
    majLedsSx(); memSx();
  }
  else if(i===14){ ouvrirNotice(); lcdSx("UTILITY","RÉGLAGES",true); }
  else { SX.protect=!SX.protect; lcdSx(SX.protect?"ON":"OFF","PROTECT",true); }
  H.cran();
}

function activerSx(){
  stop();
  S.modele="esx";
  MACHINE=MACHINE_SX;
  poserMachine("esx");
  audioInit(); banqueEs(); sxAudio(); chargerEchs();
  chargerSx();
  cablerFxSx(); majTubeSx();
  choisirSx(SX.sel||0);
  majTouchesSx(); majKnobsSx(); majLedsSx(); majLcdSx(); kSxVol.maj();
  actif = document.getElementById("unit-esx");
  save(); fit(); setTimeout(fit,120);
}

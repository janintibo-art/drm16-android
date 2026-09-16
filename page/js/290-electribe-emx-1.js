/* ===================== ELECTRIBE EMX-1 ===================== */
var MX_DRUMS = ["1","2","3","4","5","6A","6B","7A","7B","ACC"];
var MX_SYNTHS = ["1","2","3","4","5","ACC"];
var MX_OSC = ["CROSS MOD","OSC SYNC","RING MOD","UNISON","CHORD","DUAL OSC","WAVEFORM","VPM",
              "WS","ADDITIVE","COMB","FORMANT","NOISE","PCM+COMB","PCM+WS"];
var MX_FILTRES = ["LPF","HPF","BPF","BPF+"];
var MX_MWAVES = ["SAW","SQR","TRI","S&H","ENV"];
var MX_MDEST = ["PITCH","OSC EDIT 1","OSC EDIT 2","CUTOFF","AMP","PAN"];
var MX_FX = [13,1,0,2,5,3,6,15,7,10,14,4,11,12,9,8];

function sonMx(synth,k){
  var s = {tim:0, pitch:0, lvl:0.8, pan:0, eg:0.35, roll:false, send:false, slot:0, amp:false,
           osc:5, o1:0.3, o2:0.4, cut:0.6, res:0.25, egi:0.45, drv:0.1, ftype:0,
           mspeed:0.3, mdepth:0, mwave:0, mdest:0, msync:false, glide:0};
  if(!synth){
    s.tim = [0,1,2,3,5,6,7,17,18,0][k] || 0;
    if(k===3) s.eg = 0.25;
  } else {
    s.osc = [5,3,7,10,12][k] || 5;
    s.cut = [0.5,0.7,0.62,0.55,0.8][k] || 0.6;
  }
  return s;
}
function motifMx(n){
  var p = {sw:0, len:16, st:[], nt:[], son:[], mot:[]};
  for(var k=0;k<16;k++){
    p.st.push(ligneVide());
    p.nt.push([36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36]);
    p.son.push(sonMx(k>=10, k>=10 ? k-10 : k));
    p.mot.push(null);
  }
  function met(k,s,notes){
    s.split("").forEach(function(c,i){ if(c!=="." && c!==" ") p.st[k][i]=1; });
    if(notes) notes.forEach(function(v,i){ p.nt[k][i]=v; });
  }
  if(n===0){
    met(0,"x...x...x...x..."); met(1,"....x.......x...");
    met(4,"..x...x...x...x."); met(9,"x...x...x...x...");
    met(10,"x.....x...x.....",[36,36,36,36,36,36,43,43,43,43,41,41,36,36,36,36]);
  } else if(n===1){
    met(0,"x..x..x...x.x..."); met(2,"....x.......x...");
    met(4,"xxxxxxxxxxxxxxxx"); met(5,"......x.......x.");
    met(11,"..x...x.....x..x",[48,48,51,48,48,48,55,48,48,48,48,48,53,48,48,51]);
    p.sw=0.15;
  } else if(n===2){
    met(0,"x.......x.......'".slice(0,16)); met(1,"....x.......x...");
    met(7,"..x.x.....x.x..."); met(12,"x...............",[60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60]);
    met(13,"........x.......",[43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43]);
  }
  return p;
}

var MX = {
  pat: motifMx(0), slots: [], cur:0, sel:0, param:0, mode:0,
  rec:false, shift:false, kb:false, oct:3, pasSel:-1, protect:false, clip:null,
  song:[], spos:0, ssel:0, pos:-1, note:48, gamme:0,
  slot:0, chaine:false, tube:0.25,
  fx:[{t:10,e1:0.4,e2:0.35},{t:6,e1:0.4,e2:0.5},{t:4,e1:0.4,e2:0.3}],
  mute:[], solo:[], noeuds:[], entrees:[], sorties:[], tubeIn:null, tubeNode:null, dernier:[]
};
for(var mz=0; mz<16; mz++) MX.slots.push(motifMx(mz<3?mz:9));

/* --- chaîne audio propre à l'EMX --- */
function mxAudio(){
  if(MX.tubeIn || !ctx) return;
  busEffets();
  MX.tubeIn = ctx.createGain();
  MX.tubeNode = ctx.createWaveShaper(); MX.tubeNode.oversample = "4x";
  MX.tubeSortie = ctx.createGain();
  MX.tubeIn.connect(MX.tubeNode); MX.tubeNode.connect(MX.tubeSortie); MX.tubeSortie.connect(busSet("mx") || master);
  majTube();
  MX.entrees = []; MX.sorties = []; MX.regFx = [[],[],[]];
  for(var i=0;i<3;i++){
    MX.entrees.push(ctx.createGain());
    MX.sorties.push(ctx.createGain());
  }
  cablerFxMx();
}
function courbeLampe(g){
  var n=2049, c=new Float32Array(n), k=1+g*9;
  for(var i=0;i<n;i++){
    var x=i*2/(n-1)-1;
    /* décalage avant la courbe : c'est lui qui engendre les harmoniques paires,
       comme un tube polarisé asymétriquement */
    var biais = 0.34*g;
    var y = (Math.tanh(k*(x + biais)) - Math.tanh(k*biais)) / Math.tanh(k*(1+biais));
    c[i] = x*(1-g) + y*g;      /* à gain nul la courbe est parfaitement droite */
  }
  return c;
}
function majTube(){
  if(!MX.tubeNode) return;
  MX.tubeNode.curve = courbeLampe(MX.tube);
  MX.tubeSortie.gain.value = 1/(1+MX.tube*1.6);
  var v = document.getElementById("mx-valve");
  if(v){
    var lampes = v.querySelectorAll("i");
    for(var i=0;i<lampes.length;i++){
      lampes[i].style.opacity = 0.4 + MX.tube*0.6;
      lampes[i].style.boxShadow = "0 0 " + Math.round(10+MX.tube*30) + "px #ff9d2e" +
        (MX.tube>0.5 ? "cc" : "80");
    }
  }
}
/* un seul emplacement à reconstruire, et rien du tout si seuls EDIT 1 et 2 bougent */
function majFxMx(i){
  var reg = MX.regFx[i];
  if(reg && reg.type === MX.fx[i].t && reg.maj){
    if(reg.maj(MX.fx[i].e1, MX.fx[i].e2) !== false) return true;
  }
  return false;
}
function cablerFxMx(){
  if(!MX.entrees.length) return;
  for(var i=0;i<3;i++){
    try{ MX.sorties[i].disconnect(); }catch(e){}
    MX.regFx[i].forEach(function(n){ try{ n.disconnect(); }catch(e){} try{ if(n.stop) n.stop(); }catch(e){} });
    MX.regFx[i] = [];
    try{ MX.entrees[i].disconnect(); }catch(e){}
  }
  for(i=0;i<3;i++){
    construireFxEntre(MX.entrees[i], MX.sorties[i], MX.fx[i].t, MX.fx[i].e1, MX.fx[i].e2, MX.regFx[i]);
    MX.regFx[i].type = MX.fx[i].t;
    if(MX.chaine && i<2) MX.sorties[i].connect(MX.entrees[i+1]);
    else MX.sorties[i].connect(MX.tubeIn);
  }
}
function sortieMx(k,t){
  mxAudio();
  if(!MX.noeuds[k]){
    var g = ctx.createGain(), pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    var s = ctx.createGain();
    if(pn){ g.connect(pn); pn.connect(MX.tubeIn); } else { g.connect(MX.tubeIn); }
    g.connect(s);
    MX.noeuds[k] = {g:g, p:pn, s:s, slot:-1};
  }
  var n = MX.noeuds[k], son = MX.pat.son[k];
  var quand = (t===undefined) ? maintenantAudio() : t;
  if(n.slot !== son.slot){
    try{ n.s.disconnect(); }catch(e){}
    n.s.connect(MX.entrees[son.slot||0]);
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

/* --- oscillateurs du synthé --- */
function ondeAdditive(e1){
  var n = 12, re = new Float32Array(n), im = new Float32Array(n);
  for(var h=1; h<n; h++){
    var poids = Math.pow(Math.max(0.02, 1 - Math.abs(h-1-e1*8)/4), 1.4);
    im[h] = poids/h;
  }
  return ctx.createPeriodicWave(re, im, {disableNormalization:false});
}
function oscMx(t, son, f0, dur, modOsc){
  var sortie = ctx.createGain(), o1, o2, i;
  var e1 = mv("o1", son.o1), e2 = mv("o2", son.o2), m = son.osc;
  function osc(type, f, gain){
    var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    var g = ctx.createGain(); g.gain.value = gain;
    o.connect(g); g.connect(sortie); o.start(t); o.stop(t+dur+0.1);
    return o;
  }
  if(m===0){                                   /* CROSS MOD */
    o1 = ctx.createOscillator(); o1.type="sawtooth"; o1.frequency.setValueAtTime(f0,t);
    o2 = ctx.createOscillator(); o2.type="sine"; o2.frequency.setValueAtTime(f0*(0.5+e2*6),t);
    var cm = ctx.createGain(); cm.gain.value = f0*e1*7;
    o2.connect(cm); cm.connect(o1.frequency);
    var g0 = ctx.createGain(); g0.gain.value=0.5; o1.connect(g0); g0.connect(sortie);
    o1.start(t); o2.start(t); o1.stop(t+dur+0.1); o2.stop(t+dur+0.1);
    if(modOsc) modOsc(cm.gain, f0*7);
  } else if(m===1){                            /* OSC SYNC */
    var sg = ctx.createGain(); sg.gain.value=0;
    o2 = ctx.createOscillator(); o2.type="sawtooth";
    o2.frequency.setValueAtTime(f0*(1+e1*5),t);
    var dents = ctx.createOscillator(); dents.type="sawtooth"; dents.frequency.setValueAtTime(f0,t);
    var da = ctx.createGain(); da.gain.value=0.5;
    var dc = ctx.createConstantSource(); dc.offset.value=0.5;
    dents.connect(da); da.connect(sg.gain); dc.connect(sg.gain);
    o2.connect(sg); sg.connect(sortie);
    o2.start(t); dents.start(t); dc.start(t);
    o2.stop(t+dur+0.1); dents.stop(t+dur+0.1); dc.stop(t+dur+0.1);
    if(modOsc) modOsc(o2.frequency, f0*5);
  } else if(m===2){                            /* RING MOD */
    var rg = ctx.createGain(); rg.gain.value=0;
    o1 = ctx.createOscillator(); o1.type="sawtooth"; o1.frequency.setValueAtTime(f0,t);
    o2 = ctx.createOscillator(); o2.type="sine"; o2.frequency.setValueAtTime(f0*(0.25+e1*7),t);
    o2.connect(rg.gain); o1.connect(rg); rg.connect(sortie);
    o1.start(t); o2.start(t); o1.stop(t+dur+0.1); o2.stop(t+dur+0.1);
    if(modOsc) modOsc(o2.frequency, f0*7);
  } else if(m===3){                            /* UNISON */
    for(i=0;i<4;i++) osc("sawtooth", f0*(1 + (i-1.5)*e1*0.03), 0.22);
  } else if(m===4){                            /* CHORD */
    var accords = [[0,4,7],[0,3,7],[0,4,7,11],[0,3,7,10],[0,5,7],[0,4,7,9]];
    var acc = accords[Math.min(accords.length-1, Math.floor(e1*accords.length))];
    acc.forEach(function(demi){ osc(e2>0.5?"square":"sawtooth", f0*Math.pow(2,demi/12), 0.75/acc.length); });
  } else if(m===5){                            /* DUAL OSC */
    osc("sawtooth", f0, 0.42);
    osc(e2>0.5?"square":"sawtooth", f0*Math.pow(2,(e1*24-12)/12), 0.42);
  } else if(m===6){                            /* WAVEFORM */
    osc(["sawtooth","square","triangle","sine"][Math.min(3,Math.floor(e1*4))], f0, 0.75);
  } else if(m===7){                            /* VPM : deux opérateurs */
    o1 = ctx.createOscillator(); o1.type="sine"; o1.frequency.setValueAtTime(f0,t);
    o2 = ctx.createOscillator(); o2.type="sine";
    o2.frequency.setValueAtTime(f0*Math.round(1+e1*11),t);
    var ix = ctx.createGain(); ix.gain.value = f0*e2*12;
    o2.connect(ix); ix.connect(o1.frequency);
    var gv = ctx.createGain(); gv.gain.value=0.7; o1.connect(gv); gv.connect(sortie);
    o1.start(t); o2.start(t); o1.stop(t+dur+0.1); o2.stop(t+dur+0.1);
    if(modOsc) modOsc(ix.gain, f0*12);
  } else if(m===8){                            /* WS : mise en forme d'onde */
    var ws = ctx.createWaveShaper(); ws.curve = courbeDist(0.15+e1*0.85); ws.oversample="2x";
    o1 = ctx.createOscillator(); o1.type="sine"; o1.frequency.setValueAtTime(f0,t);
    var gw = ctx.createGain(); gw.gain.value = 0.4+e2;
    o1.connect(gw); gw.connect(ws); ws.connect(sortie);
    o1.start(t); o1.stop(t+dur+0.1);
  } else if(m===9){                            /* ADDITIVE */
    o1 = ctx.createOscillator(); o1.setPeriodicWave(ondeAdditive(e1));
    o1.frequency.setValueAtTime(f0,t);
    var ga = ctx.createGain(); ga.gain.value=0.6; o1.connect(ga); ga.connect(sortie);
    o1.start(t); o1.stop(t+dur+0.1);
  } else if(m===10 || m===13){                 /* COMB et PCM+COMB */
    var src;
    if(m===13){
      banqueEs();
      var bf = ES.buf["b"+Math.min(ES_BANQUE.length-1, Math.floor(e2*ES_BANQUE.length))];
      if(bf){ src = ctx.createBufferSource(); src.buffer = bf; src.loop = true; }
    }
    if(!src){ src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; }
    var dl = ctx.createDelay(0.05); dl.delayTime.value = 1/Math.max(40,f0);
    var fb = ctx.createGain(); fb.gain.value = 0.55+e1*0.42;
    var amort = ctx.createBiquadFilter(); amort.type="lowpass"; amort.frequency.value=6000;
    src.connect(dl); dl.connect(amort); amort.connect(fb); fb.connect(dl);
    dl.connect(sortie);
    src.start(t); src.stop(t+dur+0.1);
  } else if(m===11){                           /* FORMANT */
    var voyelles = [[730,1090],[530,1840],[390,1990],[570,840],[300,870]];
    var vo = voyelles[Math.min(voyelles.length-1, Math.floor(e1*voyelles.length))];
    o1 = ctx.createOscillator(); o1.type="sawtooth"; o1.frequency.setValueAtTime(f0,t);
    var som = ctx.createGain(); som.gain.value=1.6;
    vo.forEach(function(fr,ix2){
      var bq = ctx.createBiquadFilter(); bq.type="bandpass"; bq.frequency.value=fr*(0.7+e2*0.6);
      bq.Q.value = 7;
      o1.connect(bq); bq.connect(som);
    });
    som.connect(sortie); o1.start(t); o1.stop(t+dur+0.1);
  } else if(m===12){                           /* NOISE */
    var sn = ctx.createBufferSource(); sn.buffer=noiseBuf; sn.loop=true;
    var bq2 = ctx.createBiquadFilter(); bq2.type="bandpass";
    bq2.frequency.value = Math.max(80, f0*(0.5+e1*6)); bq2.Q.value = 0.6+e2*18;
    var gn2 = ctx.createGain(); gn2.gain.value = 2.6;
    sn.connect(bq2); bq2.connect(gn2); gn2.connect(sortie); sn.start(t); sn.stop(t+dur+0.1);
    if(modOsc) modOsc(bq2.frequency, f0*4);
  } else {                                     /* PCM+WS */
    banqueEs();
    var bp = ES.buf["b"+Math.min(ES_BANQUE.length-1, Math.floor(e2*ES_BANQUE.length))];
    var sp = ctx.createBufferSource();
    sp.buffer = bp || noiseBuf;
    sp.playbackRate.value = f0/220;
    var ws2 = ctx.createWaveShaper(); ws2.curve = courbeDist(e1); ws2.oversample="2x";
    sp.connect(ws2); ws2.connect(sortie); sp.start(t); sp.stop(t+dur+0.1);
  }
  return sortie;
}

/* --- voix --- */
function voixMxSynth(t,k,note,vel,dur){
  var son = MX.pat.son[k], dest = pasVoie(sortieMx(k,t));
  var f0 = 440*Math.pow(2,(note + mv("pitch", son.pitch)*12 - 69)/12);
  var prec = MX.dernier[k] || f0;
  var glisse = son.glide;
  var lfo = null, lfoGain = null;
  var prof = mv("mdepth", son.mdepth);
  if(prof > 0.01){
    lfo = ctx.createOscillator();
    lfo.type = ["sawtooth","square","triangle","sine","sine"][son.mwave] || "sine";
    var vitesse = son.msync ? (S.bpm/60)*[0.25,0.5,1,2,4][Math.min(4,Math.floor(son.mspeed*5))]
                            : 0.05 + son.mspeed*18;
    lfo.frequency.value = vitesse;
    lfo.start(t); lfo.stop(t+dur+0.2);
    lfoGain = ctx.createGain();
    lfo.connect(lfoGain);
  }
  function brancher(param, echelle){
    if(!lfoGain) return;
    var g2 = ctx.createGain(); g2.gain.value = prof*echelle;
    lfo.connect(g2); g2.connect(param);
  }
  var modOsc = (son.mdest===1 || son.mdest===2) ? function(param, echelle){ brancher(param, echelle); } : null;
  var src = oscMx(t, son, f0, dur, modOsc);
  if(glisse > 0.01 && src.__freqs){ /* réservé */ }

  var lp = ctx.createBiquadFilter();
  lp.type = ["lowpass","highpass","bandpass","bandpass"][son.ftype] || "lowpass";
  var cut = mv("cut", son.cut), res = mv("res", son.res);
  var egi = mv("egi", son.egi), drv = mv("drv", son.drv);
  var base = 70*Math.pow(180, cut);
  lp.frequency.setValueAtTime(Math.min(18000, base), t);
  lp.frequency.linearRampToValueAtTime(Math.min(18000, base*(1+egi*10)), t+0.008);
  lp.frequency.exponentialRampToValueAtTime(Math.max(60, base), t + 0.03 + son.eg*1.6);
  lp.Q.value = 0.7 + res*(son.ftype===3 ? 30 : 22);
  if(son.mdest===3) brancher(lp.frequency, base*2.5);

  var ws = null;
  if(drv > 0.02){ ws = ctx.createWaveShaper(); ws.curve = courbeDist(drv*0.9); ws.oversample="2x"; }

  var g = ctx.createGain();
  var d = Math.max(0.05, dur);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.linearRampToValueAtTime(0.42*vel, t+0.006);
  g.gain.setValueAtTime(0.42*vel, t+d*0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t+d);
  if(son.mdest===4) brancher(g.gain, 0.3);

  src.connect(lp);
  if(ws){ lp.connect(ws); ws.connect(g); } else lp.connect(g);
  g.connect(dest);
  MX.dernier[k] = f0;
}
function voixMxDrum(t,k,vel){
  var son = MX.pat.son[k], dest = pasVoie(sortieMx(k,t));
  banqueEs();
  var buf = ES.buf["b"+Math.min(ES_BANQUE.length-1, son.tim||0)];
  if(!buf) return;
  var src = ctx.createBufferSource();
  src.playbackRate.value = Math.pow(2, mv("pitch", son.pitch)*2);
  poserTampon(src, buf, src.playbackRate.value);
  var g = ctx.createGain();
  var d = son.amp ? 0.03 + mv("eg", son.eg)*1.2 : buf.duration/src.playbackRate.value;
  env(g, t, 0.8*vel, Math.max(0.03, d), 0.002);
  src.connect(g); g.connect(dest);
  src.start(t); src.stop(t + d + 0.05);
}

/* --- séquenceur --- */
function motionMx(k,i){
  var m = MX.pat.mot[k];
  if(!m || !m.mode || !m.v) return null;
  var L = MX.pat.len||16, v = m.v[i];
  if(typeof v !== "number") return null;
  var su = m.v[(i+1)%L];
  return {p:m.p, v:v, suiv:(typeof su==="number"?su:v), lisse:m.mode===1};
}
function enregMotionMx(champ, val){
  var k = MX.sel, m = MX.pat.mot[k];
  if(!m || !m.mode) return;
  if(!MX.rec || !S.run || MX.pos < 0){ m.p = champ; return; }
  if(m.p !== champ || !m.v){ m.p = champ; m.v = []; for(var i=0;i<16;i++) m.v.push(val); }
  m.v[MX.pos] = val;
}
function appliquerMotFxMx(v){
  var m = MX.pat.motFx, sl = m.slot||0;
  MX.fx[sl][m.p] = v;
  if(!majFxMx(sl)) cablerFxMx();
}
function scheduleMx(i,t){
  var CHARGE_N = ouvrirPas();
  var p = MX.pat, k;
  var vfx = motFxValeur(p.motFx, i, p.len);
  if(vfx !== null) appliquerMotFxMx(vfx);
  if(p.sw && i%2===1) t += stepDur()*p.sw*0.55;
  var accD = p.st[9][i], accS = p.st[15][i];
  var soloActif = false;
  for(k=0;k<16;k++) if(MX.solo[k]) soloActif = true;
  for(k=0;k<16;k++){
    if(k===9 || k===15) continue;
    if(!p.st[k][i]) continue;
    if(MX.mute[k]) continue;
    if(soloActif && !MX.solo[k]) continue;
    var synth = k>=10;
    var vel = (synth ? accS : accD) ? velAccent(p.son[synth ? 15 : 9].lvl) : 0.72;
    MOT = motionMx(k,i);
    var n = p.son[k].roll ? 4 : 1, j;
    for(j=0;j<n;j++){
      var tt = t + j*stepDur()/n;
      if(synth){
        var d = p.son[k].amp ? (0.05 + p.son[k].eg*1.3) : stepDur()*0.95;
        CHARGE_N++, voixMxSynth(tt, k, p.nt[k][i], vel, d);
        midiNoteA(p.nt[k][i], tt, vel, Math.min(15, MIDI.canalSy + k-10), d);
      } else {
        CHARGE_N++, voixMxDrum(tt, k, vel);
        midiNoteA(MIDI.base+k, tt, vel, MIDI.canal);
      }
    }
    MOT = null;
  }
  if(!cache) queue.push({i:i,t:t});
  attenuerVoie("mx", CHARGE_N, t);
}
var mxBeats=[], mxKeys=[];
function beatMx(i){
  MX.pos=i;
  if(MX.mode===3){
    for(var q=0;q<16;q++){ mxBeats[q].classList.toggle("on", q===MX.spos); mxKeys[q].classList.remove("cur"); }
    return;
  }
  for(var j=0;j<16;j++){
    mxBeats[j].classList.toggle("on", j===i);
    mxKeys[j].classList.toggle("cur", j===i);
  }
}
function arretMx(){
  MX.pos=-1;
  var pb=document.getElementById("mx-play"); if(pb) pb.classList.remove("on");
  for(var j=0;j<16;j++){ mxBeats[j].classList.remove("on"); mxKeys[j].classList.remove("cur"); }
}
function boucleMx(){
  if(MX.mode!==3 || !MX.song.length) return;
  MX.spos=(MX.spos+1)%MX.song.length;
  MX.cur=MX.song[MX.spos]; MX.pat=MX.slots[MX.cur];
  majTouchesMx(); majKnobsMx(); majLedsMx();
  lcdMx("SONG "+(MX.spos+1), "PATTERN "+nomMotif(MX.cur), true);
}
var MACHINE_MX = {schedule:scheduleMx, beat:beatMx, arret:arretMx, boucle:boucleMx,
                  longueur:function(){ return MX.pat.len||16; }};

/* --- afficheur --- */
var mxVal=document.getElementById("mx-val"), mxLab=document.getElementById("mx-lab"), mxTmr=null;
function nomMotif(i){ return "ABCD".charAt(Math.floor(i/4)) + "." + (i%4+1) + (i<9?"":""); }
function lcdMx(v,l,fugace){
  mxVal.textContent=v; mxLab.textContent=l;
  clearTimeout(mxTmr);
  if(fugace) mxTmr=setTimeout(majLcdMx,1400);
}
function nomPartieMx(k){
  if(k===9) return "DRUM ACCENT";
  if(k===15) return "SYNTH ACCENT";
  return (k>=10 ? "SYNTH PART " + (k-9) : "DRUM PART " + MX_DRUMS[k]);
}
function majLcdMx(){
  var k=MX.sel, son=MX.pat.son[k];
  if(MX.param===1) lcdMx(String(S.bpm), "TEMPO");
  else if(MX.param===2) lcdMx(k>=10 ? MX_OSC[son.osc] : ES_BANQUE[son.tim||0], "SOUND · "+nomPartieMx(k));
  else if(MX.param===3) lcdMx(nomNote(MX.pasSel>=0 && MX.pat.st[k][MX.pasSel] ? MX.pat.nt[k][MX.pasSel] : MX.note),
                              MX.pasSel>=0 ? "NOTE · PAS "+(MX.pasSel+1) : "NOTE");
  else if(MX.param===4) lcdMx(String(MX.pat.len), "LENGTH");
  else lcdMx("EMX-1", "PATTERN " + nomMotif(MX.cur));
}

/* --- construction de l'interface --- */
(function construireMx(){
  var i,b;
  var C1=["Pattern","Tempo","Sound","Note No.","Length","Swing"];
  var C2=["Song","Tempo","Position","Pattern","Mute Hold","Next Song"];
  var C3=["Metronome","Gate Time","Motion Dest.","Arpeggio","Master Tune","Compare"];
  var C4=["Clock","MIDI ch","Bend Range","MIDI Filter","Memory","Card"];
  var bp=document.getElementById("mx-params");
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
    MX.param=+u.dataset.p;
    var us=bp.querySelectorAll("u[data-p]");
    for(var j=0;j<us.length;j++) us[j].classList.toggle("on", +us[j].dataset.p===MX.param);
    majLcdMx(); H.cran();
  });

  var bo=document.getElementById("mx-oscs");
  MX_OSC.forEach(function(nom,idx){
    var u=document.createElement("u"); u.innerHTML='<i></i>'+nom; u.dataset.o=idx;
    bo.appendChild(u);
  });
  bo.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u) return;
    var k=MX.sel;
    if(k<10 || k===15){ lcdMx("---","PARTIE DE SYNTHÉ SEULEMENT",true); return; }
    MX.pat.son[k].osc=+u.dataset.o; majLedsMx(); memMx();
    lcdMx(MX_OSC[MX.pat.son[k].osc], "SYNTH OSC", true); H.cran();
  });

  var bf=document.getElementById("mx-fxtypes");
  MX_FX.forEach(function(idx){
    var u=document.createElement("u"); u.innerHTML='<i></i>'+FX_NOMS[idx]; u.dataset.t=idx;
    bf.appendChild(u);
  });
  bf.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u) return;
    MX.fx[MX.slot].t=+u.dataset.t; cablerFxMx(); majLedsMx(); memMx();
    lcdMx(FX_NOMS[MX.fx[MX.slot].t], "FX "+(MX.slot+1), true); H.cran();
  });

  var bt=document.getElementById("mx-ftypes");
  MX_FILTRES.forEach(function(nom,idx){
    var u=document.createElement("u"); u.innerHTML='<i></i>'+nom; u.dataset.f=idx;
    bt.appendChild(u);
  });
  bt.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u) return;
    if(MX.sel<10) return;
    MX.pat.son[MX.sel].ftype=+u.dataset.f; majLedsMx(); memMx();
    lcdMx(MX_FILTRES[MX.pat.son[MX.sel].ftype], "FILTER TYPE", true); H.cran();
  });

  var bw=document.getElementById("mx-mwaves");
  MX_MWAVES.forEach(function(nom,idx){
    var u=document.createElement("u"); u.innerHTML='<i></i>'+nom; u.dataset.w=idx; bw.appendChild(u);
  });
  bw.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u || MX.sel<10) return;
    MX.pat.son[MX.sel].mwave=+u.dataset.w; majLedsMx(); memMx();
    lcdMx(MX_MWAVES[MX.pat.son[MX.sel].mwave], "MOD WAVE", true); H.cran();
  });
  var bd=document.getElementById("mx-mdest");
  MX_MDEST.forEach(function(nom,idx){
    var u=document.createElement("u"); u.innerHTML='<i></i>'+nom; u.dataset.d=idx; bd.appendChild(u);
  });
  bd.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u || MX.sel<10) return;
    MX.pat.son[MX.sel].mdest=+u.dataset.d; majLedsMx(); memMx();
    lcdMx(MX_MDEST[MX.pat.son[MX.sel].mdest], "MOD DEST", true); H.cran();
  });

  function rangee(boite, sous, labels, base){
    labels.forEach(function(nom,idx){
      var bb=document.createElement("button"); bb.className="mxb"; bb.dataset.k=base+idx; bb.textContent="";
      boite.appendChild(bb);
      var sp=document.createElement("span"); sp.textContent=nom; sous.appendChild(sp);
    });
  }
  rangee(document.getElementById("mx-drums"), document.getElementById("mx-drums-sous"), MX_DRUMS, 0);
  rangee(document.getElementById("mx-synths"), document.getElementById("mx-synths-sous"), MX_SYNTHS, 10);
  function clicPartie(e){
    var bb=e.target.closest(".mxb"); if(!bb) return;
    choisirMx(+bb.dataset.k);
  }
  document.getElementById("mx-drums").addEventListener("click", clicPartie);
  document.getElementById("mx-synths").addEventListener("click", clicPartie);
  function frappePartie(e){
    var bb=e.target.closest(".mxb"); if(!bb) return;
    var k=+bb.dataset.k;
    if(k===9 || k===15) return;
    if(!ctx) audioInit();
    mxAudio();
    if(k>=10) voixMxSynth(maintenantAudio()+0.01, k, MX.note, 1, 0.4);
    else voixMxDrum(maintenantAudio()+0.01, k, 1);
    if(MX.rec && S.run && MX.pos>=0 && !MX.protect){
      var j=(MX.pos+1)%(MX.pat.len||16);
      MX.pat.st[k][j]=1;
      if(k>=10) MX.pat.nt[k][j]=MX.note;
      if(k===MX.sel) majTouchesMx();
      memMx();
    }
  }
  document.getElementById("mx-drums").addEventListener("pointerdown", frappePartie);
  document.getElementById("mx-synths").addEventListener("pointerdown", frappePartie);

  var bb2=document.getElementById("mx-beats"), bk=document.getElementById("mx-steps");
  for(i=0;i<16;i++){
    var d=document.createElement("i"); if(i%4===0) d.className="b4";
    bb2.appendChild(d); mxBeats.push(d);
    b=document.createElement("button"); b.className="mxb"; b.textContent=String(i+1); b.dataset.i=i;
    bk.appendChild(b); mxKeys.push(b);
  }
  bk.addEventListener("click", function(e){
    var bb3=e.target.closest(".mxb"); if(!bb3) return;
    var i2=+bb3.dataset.i;
    if(MX.shift){ shiftMx(i2); return; }
    if(MX.pset){ allerMotifMx(i2); return; }
    if(MX.mode === 2){ choisirPasMx(i2); return; }
    if(MX.mode===3){ songMx(i2); return; }
    if(MX.kb && MX.sel>=10 && MX.sel!==15){ clavierMx(i2); return; }
    if(MX.protect){ lcdMx("PROTECT","ÉCRITURE BLOQUÉE",true); return; }
    var p=MX.pat, k=MX.sel;
    p.st[k][i2] = p.st[k][i2] ? 0 : 1;
    if(p.st[k][i2] && k>=10) p.nt[k][i2]=MX.note;
    MX.pasSel=i2;
    majTouchesMx(); memMx(); H.cran();
  });
})();

function noteClavierMx(i){ return 12*MX.oct + GAMMES[MX.gamme||0].i[i]; }
function clavierMx(i){
  var p=MX.pat, k=MX.sel, n=noteClavierMx(i);
  if(!ctx) audioInit();
  mxAudio();
  voixMxSynth(maintenantAudio()+0.01, k, n, 1, 0.4);
  MX.note=n;
  if(!MX.protect){
    if(MX.rec && S.run && MX.pos>=0){
      var j=(MX.pos+1)%(p.len||16);
      p.st[k][j]=1; p.nt[k][j]=n;
    } else if(MX.pasSel>=0 && p.st[k][MX.pasSel]) p.nt[k][MX.pasSel]=n;
    memMx();
  }
  majTouchesMx();
  lcdMx(nomNote(n), MX.pasSel>=0 && !MX.rec ? "PAS "+(MX.pasSel+1) : "KEYBOARD", true);
  H.cran();
}
function choisirMx(k){
  MX.sel=k; MX.pasSel=-1;
  var bs=document.querySelectorAll("#mx-drums .mxb,#mx-synths .mxb");
  for(var j=0;j<bs.length;j++) bs[j].classList.toggle("on", +bs[j].dataset.k===k);
  majTouchesMx(); majKnobsMx(); majLedsMx();
  lcdMx(nomPartieMx(k), k>=10 && k!==15 ? MX_OSC[MX.pat.son[k].osc] : (k<9 ? ES_BANQUE[MX.pat.son[k].tim||0] : "ACCENT"), true);
  H.cran();
}
function choisirPasMx(i){
  var p=MX.pat, k=MX.sel;
  MX.pasSel = i; MX.param = 3;
  majTouchesMx(); H.cran();
  if(!p.st[k][i]) lcdMx("---", "PAS "+(i+1)+" · VIDE", true);
  else if(k>=10 && k!==15) lcdMx(nomNote(p.nt[k][i]), "PAS "+(i+1)+" · "+nomPartieMx(k), true);
  else lcdMx("ON", "PAS "+(i+1)+" · "+nomPartieMx(k), true);
}
function majTouchesMx(){
  var p=MX.pat, k=MX.sel, i;
  if(MX.pset){
    for(i=0;i<16;i++){
      mxKeys[i].textContent = nomMotif(i);
      mxKeys[i].classList.toggle("act", i === MX.cur);
      mxKeys[i].classList.remove("hors");
    }
    return;
  }
  if(MX.mode===3){
    for(i=0;i<16;i++){
      var v=MX.song[i];
      mxKeys[i].textContent=(v===undefined)?"–":nomMotif(v);
      mxKeys[i].classList.toggle("act", v!==undefined && i!==MX.spos);
      mxKeys[i].classList.toggle("hors", v===undefined);
    }
    return;
  }
  if(MX.kb && k>=10 && k!==15){
    var cour=(MX.pasSel>=0 && p.st[k][MX.pasSel]) ? p.nt[k][MX.pasSel] : MX.note;
    for(i=0;i<16;i++){
      mxKeys[i].textContent=nomNote(noteClavierMx(i));
      mxKeys[i].classList.toggle("act", noteClavierMx(i)===cour);
      mxKeys[i].classList.remove("hors");
    }
    return;
  }
  for(i=0;i<16;i++){
    mxKeys[i].textContent=String(i+1);
    mxKeys[i].classList.toggle("act", !!p.st[k][i]);
    mxKeys[i].classList.toggle("sel", i === MX.pasSel && MX.mode === 2);
    mxKeys[i].classList.toggle("hors", i >= (p.len||16));
    mxBeats[i].classList.toggle("hors", i >= (p.len||16));
  }
}
function majLedsMx(){
  var k=MX.sel, son=MX.pat.son[k], j, us;
  us=document.querySelectorAll("#mx-oscs u");
  for(j=0;j<us.length;j++) us[j].classList.toggle("on", k>=10 && +us[j].dataset.o===son.osc);
  us=document.querySelectorAll("#mx-ftypes u");
  for(j=0;j<us.length;j++) us[j].classList.toggle("on", k>=10 && +us[j].dataset.f===son.ftype);
  us=document.querySelectorAll("#mx-mwaves u");
  for(j=0;j<us.length;j++) us[j].classList.toggle("on", k>=10 && +us[j].dataset.w===son.mwave);
  us=document.querySelectorAll("#mx-mdest u");
  for(j=0;j<us.length;j++) us[j].classList.toggle("on", k>=10 && +us[j].dataset.d===son.mdest);
  us=document.querySelectorAll("#mx-fxtypes u");
  for(j=0;j<us.length;j++) us[j].classList.toggle("on", +us[j].dataset.t===MX.fx[MX.slot].t);
  for(j=0;j<3;j++) document.getElementById("mx-slot"+j).classList.toggle("on", MX.slot===j);
  document.getElementById("mx-chain").classList.toggle("on", MX.chaine);
  document.getElementById("mx-fxmot").classList.toggle("on", !!(MX.pat.motFx && MX.pat.motFx.mode));
  document.getElementById("mx-ampeg").classList.toggle("on", son.amp);
  document.getElementById("mx-roll").classList.toggle("on", son.roll);
  document.getElementById("mx-fxsend").classList.toggle("on", son.send);
  document.getElementById("mx-fxsel").textContent = "FX SELECT " + ((son.slot||0)+1);
  document.getElementById("mx-bpmsync").classList.toggle("on", son.msync);
  document.getElementById("mx-kb").classList.toggle("on", MX.kb);
  document.getElementById("mx-mute").classList.toggle("on", !!MX.mute[k]);
  document.getElementById("mx-solo").classList.toggle("on", !!MX.solo[k]);
  var m=MX.pat.mot[k], mode=m?m.mode||0:0;
  document.getElementById("mx-smooth").classList.toggle("on", mode===1);
  document.getElementById("mx-trig").classList.toggle("on", mode===2);
  document.getElementById("mx-mseq").classList.toggle("on", mode!==0);
  var bs=document.querySelectorAll("#mx-drums .mxb,#mx-synths .mxb");
  for(j=0;j<bs.length;j++){
    var kk=+bs[j].dataset.k, mm=MX.pat.mot[kk];
    bs[j].classList.toggle("mot", !!(mm && mm.mode));
  }
}

/* --- mémoire --- */
function serMx(p){
  return {sw:p.sw, len:p.len, son:p.son, mot:p.mot, motFx:p.motFx,
          st:p.st.map(function(l){ return l.join(""); }),
          nt:p.nt.map(function(l){ return l.join(","); })};
}
function memMx(){
  memoire.emx = {cur:MX.cur, song:MX.song.slice(), sel:MX.sel, tube:MX.tube,
                 fx:MX.fx, chaine:MX.chaine, slot:MX.slot, gamme:MX.gamme, oct:MX.oct,
                 slots:MX.slots.map(serMx)};
  memoire.emx.slots[MX.cur]=serMx(MX.pat);
  sauverMachine("emx");
}
function chargerMx(){
  MX.slots=[];
  for(var z=0;z<16;z++) MX.slots.push(motifMx(z<3?z:9));
  MX.cur=0; MX.sel=0; MX.song=[]; MX.mute=[]; MX.solo=[]; MX.pat=MX.slots[0];
  var m=memLire("emx");
  if(!m) return;
  if(m.slots && m.slots.length===16){
    MX.slots=m.slots.map(function(o){
      var p=motifMx(9);
      p.sw=o.sw||0; p.len=o.len||16;
      if(o.st) o.st.forEach(function(s,k){ for(var i=0;i<16;i++) p.st[k][i]=s.charAt(i)==="1"?1:0; });
      if(o.nt) o.nt.forEach(function(s,k){ p.nt[k]=s.split(",").map(Number); });
      if(o.son) p.son=o.son;
      if(o.mot) p.mot=o.mot;
      if(o.motFx) p.motFx=o.motFx;
      return p;
    });
  }
  if(m.song && m.song.length) MX.song=m.song.slice();
  if(m.fx && m.fx.length===3) MX.fx=m.fx;
  ["cur","sel","tube","slot","gamme","oct"].forEach(function(c){ if(typeof m[c]==="number") MX[c]=m[c]; });
  MX.chaine=!!m.chaine;
  MX.pat=MX.slots[MX.cur];
}

/* --- boutons rotatifs --- */
function knobMx(id, champ, min, max, nom, synthSeul){
  return knobEm(id, {min:min,max:max,
    get:function(){ return MX.pat.son[MX.sel][champ]; },
    set:function(v){
      if(synthSeul && MX.sel<10){ lcdMx("---","PARTIE DE SYNTHÉ SEULEMENT",true); return; }
      MX.pat.son[MX.sel][champ]=v; enregMotionMx(champ,v);
      teleMx(MX.sel, champ, v);
      lcdMx(String(Math.round((champ==="pan"||champ==="pitch") ? v*63 : v*127)), nom, true);
    }});
}
var kMxVol = knobEm("mx-k-vol",{min:0,max:1,get:function(){return S.vol;},set:function(v){
  S.vol=v; if(master) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
  lcdMx(String(Math.round(v*100)),"MASTER VOLUME",true); saveSoon();
}});
var kMxTube = knobEm("mx-k-tube",{min:0,max:1,get:function(){return MX.tube;},set:function(v){
  MX.tube=v; majTube(); lcdMx(String(Math.round(v*127)),"TUBE GAIN",true);
}});
var kMxPitch = knobMx("mx-k-pitch","pitch",-1,1,"PITCH");
var kMxPan   = knobMx("mx-k-pan","pan",-1,1,"PAN");
var kMxEg    = knobMx("mx-k-eg","eg",0,1,"EG TIME");
var kMxLvl   = knobMx("mx-k-lvl","lvl",0,1,"LEVEL");
var kMxO1    = knobMx("mx-k-o1","o1",0,1,"OSC EDIT 1",true);
var kMxO2    = knobMx("mx-k-o2","o2",0,1,"OSC EDIT 2",true);
var kMxCut   = knobMx("mx-k-cut","cut",0,1,"CUTOFF",true);
var kMxRes   = knobMx("mx-k-res","res",0,1,"RESONANCE",true);
var kMxEgi   = knobMx("mx-k-egi","egi",0,1,"EG INT",true);
var kMxDrv   = knobMx("mx-k-drv","drv",0,1,"DRIVE",true);
var kMxMs    = knobMx("mx-k-mspeed","mspeed",0,1,"MOD SPEED",true);
var kMxMd    = knobMx("mx-k-mdepth","mdepth",0,1,"MOD DEPTH",true);
var kMxF1 = knobEm("mx-k-fx1",{min:0,max:1,get:function(){return MX.fx[MX.slot].e1;},
  set:function(v){ MX.fx[MX.slot].e1=v; if(!majFxMx(MX.slot)) cablerFxMx();
    motFxEcrire(MX.pat.motFx, "e1", v, MX.rec && S.run, MX.pos); teleMxFx(MX.slot, 1, v);
    lcdMx(String(Math.round(v*127)),"FX "+(MX.slot+1)+" EDIT 1",true); }});
var kMxF2 = knobEm("mx-k-fx2",{min:0,max:1,get:function(){return MX.fx[MX.slot].e2;},
  set:function(v){ MX.fx[MX.slot].e2=v; if(!majFxMx(MX.slot)) cablerFxMx();
    motFxEcrire(MX.pat.motFx, "e2", v, MX.rec && S.run, MX.pos); teleMxFx(MX.slot, 2, v);
    lcdMx(String(Math.round(v*127)),"FX "+(MX.slot+1)+" EDIT 2",true); }});
function majKnobsMx(){
  [kMxPitch,kMxPan,kMxEg,kMxLvl,kMxO1,kMxO2,kMxCut,kMxRes,kMxEgi,kMxDrv,kMxMs,kMxMd,kMxF1,kMxF2,kMxTube]
    .forEach(function(k){ k.maj(); });
}

/* --- molette --- */
(function moletteMx(){
  var el=document.getElementById("mx-dial"), st={drag:false,y0:0};
  el.addEventListener("pointerdown", function(e){ st.drag=true; st.y0=e.clientY; el.setPointerCapture(e.pointerId); e.preventDefault(); });
  el.addEventListener("pointermove", function(e){
    if(!st.drag || PINCE) return;
    var d=st.y0-e.clientY; if(Math.abs(d)<12) return;
    st.y0=e.clientY; pasMx(d>0?1:-1);
  });
  el.addEventListener("pointerup", function(){ st.drag=false; memMx(); });
  el.addEventListener("pointercancel", function(){ st.drag=false; });
  function pasMx(d){
    var p=MX.pat, k=MX.sel;
    if(MX.mode===3 && MX.song.length && MX.param===0){
      MX.song[MX.ssel]=(MX.song[MX.ssel]+d+16)%16;
      majTouchesMx(); memMx(); lcdMx(nomMotif(MX.song[MX.ssel]),"SONG "+(MX.ssel+1)); H.cran(); return;
    }
    if(MX.param===1){ S.bpm=Math.max(40,Math.min(300,S.bpm+d)); }
    else if(MX.param===2){
      if(k>=10 && k!==15) p.son[k].osc=(p.son[k].osc+d+MX_OSC.length)%MX_OSC.length;
      else if(k<9){ banqueEs(); p.son[k].tim=((p.son[k].tim||0)+d+ES_BANQUE.length)%ES_BANQUE.length; }
      majLedsMx();
    }
    else if(MX.param===3){
      if(MX.pasSel>=0 && k>=10 && p.st[k][MX.pasSel]){
        p.nt[k][MX.pasSel]=Math.max(12,Math.min(96,p.nt[k][MX.pasSel]+d));
        MX.note=p.nt[k][MX.pasSel];
      } else MX.note=Math.max(12,Math.min(96,MX.note+d));
      if(MX.kb) majTouchesMx();
    }
    else if(MX.param===4){ p.len=Math.max(1,Math.min(16,p.len+d)); majTouchesMx(); }
    else if(MX.param===5){ p.sw=Math.max(0,Math.min(0.6, +(p.sw+d*0.05).toFixed(2))); }
    else {
      memMx();
      MX.cur=(MX.cur+d+16)%16; MX.pat=MX.slots[MX.cur];
      majTouchesMx(); majKnobsMx(); majLedsMx();
    }
    majLcdMx(); H.cran();
  }
  MX.pas=pasMx;
  document.getElementById("mx-prev").addEventListener("click", function(){
    if(MX.kb){ MX.oct=Math.max(1,MX.oct-1); majTouchesMx(); lcdMx("OCT "+MX.oct,"KEYBOARD",true); H.cran(); }
    else pasMx(-1);
  });
  document.getElementById("mx-next").addEventListener("click", function(){
    if(MX.kb){ MX.oct=Math.min(6,MX.oct+1); majTouchesMx(); lcdMx("OCT "+MX.oct,"KEYBOARD",true); H.cran(); }
    else pasMx(1);
  });
})();

/* --- ruban de l'arpégiateur --- */
(function rubanMx(){
  var el=document.getElementById("mx-ruban"), curseur=el.querySelector("b");
  var actif=false, dernier=-1, minuteur=null;
  function noteDe(e){
    var r=el.getBoundingClientRect();
    var x=Math.max(0, Math.min(1, (e.clientX-r.left)/r.width));
    curseur.style.left=(x*100)+"%"; curseur.style.opacity=1;
    return 12*MX.oct + GAMMES[MX.gamme||0].i[Math.min(15, Math.floor(x*16))];
  }
  function jouer(n){
    if(!ctx) audioInit();
    mxAudio();
    var k = (MX.sel>=10 && MX.sel!==15) ? MX.sel : 10;
    voixMxSynth(maintenantAudio()+0.01, k, n, 1, 0.25);
    MX.note=n;
    lcdMx(nomNote(n), "ARPEGGIATOR", true);
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
function basculeMx(id, champ, nom){
  document.getElementById(id).addEventListener("click", function(){
    var son=MX.pat.son[MX.sel];
    son[champ]=!son[champ];
    majLedsMx(); memMx(); H.cran();
    lcdMx(son[champ]?"ON":"OFF", nom, true);
  });
}
basculeMx("mx-ampeg","amp","AMP EG");
basculeMx("mx-roll","roll","ROLL");
basculeMx("mx-fxsend","send","FX SEND");
document.getElementById("mx-fxsel").addEventListener("click", function(){
  var son=MX.pat.son[MX.sel];
  son.slot=((son.slot||0)+1)%3;
  if(MX.noeuds[MX.sel]) MX.noeuds[MX.sel].slot=-1;
  majLedsMx(); memMx(); H.cran();
  lcdMx("FX "+(son.slot+1), "FX SELECT", true);
});
document.getElementById("mx-bpmsync").addEventListener("click", function(){
  if(MX.sel<10) return;
  var son=MX.pat.son[MX.sel]; son.msync=!son.msync;
  majLedsMx(); memMx(); H.cran();
  lcdMx(son.msync?"SYNC":"FREE","MOD BPM SYNC",true);
});
document.getElementById("mx-mtype").addEventListener("click", function(){
  if(MX.sel<10) return;
  var son=MX.pat.son[MX.sel]; son.mwave=(son.mwave+1)%MX_MWAVES.length;
  majLedsMx(); memMx(); H.cran(); lcdMx(MX_MWAVES[son.mwave],"MOD WAVE",true);
});
document.getElementById("mx-dest").addEventListener("click", function(){
  if(MX.sel<10) return;
  var son=MX.pat.son[MX.sel]; son.mdest=(son.mdest+1)%MX_MDEST.length;
  majLedsMx(); memMx(); H.cran(); lcdMx(MX_MDEST[son.mdest],"MOD DEST",true);
});
document.getElementById("mx-ftype").addEventListener("click", function(){
  if(MX.sel<10) return;
  var son=MX.pat.son[MX.sel]; son.ftype=(son.ftype+1)%MX_FILTRES.length;
  majLedsMx(); memMx(); H.cran(); lcdMx(MX_FILTRES[son.ftype],"FILTER TYPE",true);
});
for(var sl=0; sl<3; sl++){
  (function(i){
    document.getElementById("mx-slot"+i).addEventListener("click", function(){
      MX.slot=i; majLedsMx(); majKnobsMx(); H.cran();
      lcdMx(FX_NOMS[MX.fx[i].t], "FX "+(i+1), true);
    });
  })(sl);
}
document.getElementById("mx-fxmot").addEventListener("click", function(){
  var p = MX.pat;
  if(!p.motFx) p.motFx = motFxVide();
  p.motFx.mode = p.motFx.mode ? 0 : 1;
  if(p.motFx.mode && !p.motFx.v){
    p.motFx.slot = MX.slot; p.motFx.p = "e1";
    p.motFx.v = []; for(var i=0;i<16;i++) p.motFx.v.push(MX.fx[MX.slot].e1);
  }
  this.classList.toggle("on", !!p.motFx.mode);
  memMx();
  lcdMx(p.motFx.mode ? "ON" : "OFF", "MOTION · FX "+((p.motFx.slot||0)+1), true);
  H.inter();
});
document.getElementById("mx-chain").addEventListener("click", function(){
  MX.chaine=!MX.chaine; cablerFxMx(); majLedsMx(); memMx(); H.inter();
  lcdMx(MX.chaine?"1→2→3":"PARALLÈLE","FX CHAIN",true);
});
document.getElementById("mx-mseq").addEventListener("click", function(){
  var k=MX.sel, m=MX.pat.mot[k];
  if(!m) m=MX.pat.mot[k]={mode:0,p:"lvl",v:null};
  m.mode=(m.mode+1)%3;
  if(m.mode && !m.v){ m.v=[]; for(var i=0;i<16;i++) m.v.push(MX.pat.son[k][m.p]); }
  majLedsMx(); memMx(); H.inter();
  lcdMx(m.mode===0?"OFF":(m.mode===1?"SMOOTH":"TRIG HOLD"), "MOTION · "+m.p.toUpperCase(), true);
});
document.getElementById("mx-kb").addEventListener("click", function(){
  MX.kb=!MX.kb; majTouchesMx(); majLedsMx();
  lcdMx(MX.kb?GAMMES[MX.gamme||0].n:"EMX-1", MX.kb?"KEYBOARD OCT "+MX.oct:"PATTERN "+nomMotif(MX.cur), true);
  H.inter();
});
function allerMotifMx(i){
  memMx();
  MX.cur = i; MX.pat = MX.slots[i];
  majTouchesMx(); majKnobsMx(); majLedsMx(); majLcdMx();
  lcdMx(nomMotif(i), "PATTERN", true); H.inter();
}
document.getElementById("mx-pset").addEventListener("click", function(){
  if(MX.kb){                       /* en mode clavier, ce bouton change la gamme */
    MX.gamme=((MX.gamme||0)+1)%GAMMES.length;
    majTouchesMx(); memMx();
    lcdMx(GAMMES[MX.gamme].n, "SCALE", true); H.cran();
    return;
  }
  MX.pset = !MX.pset;
  this.classList.toggle("on", MX.pset);
  majTouchesMx();
  lcdMx(MX.pset ? "SET" : "EMX-1", MX.pset ? "TOUCHE = MOTIF" : "PATTERN "+nomMotif(MX.cur), true);
  H.inter();
});
document.getElementById("mx-shift").addEventListener("click", function(){
  MX.shift=!MX.shift; this.classList.toggle("on", MX.shift);
  lcdMx(MX.shift?"SHIFT":"EMX-1", MX.shift?"FONCTIONS":"PATTERN "+nomMotif(MX.cur), true); H.cran();
});
document.getElementById("mx-mute").addEventListener("click", function(){
  MX.mute[MX.sel]=!MX.mute[MX.sel]; majLedsMx(); H.inter();
  lcdMx(MX.mute[MX.sel]?"MUTE":"ON", nomPartieMx(MX.sel), true);
});
document.getElementById("mx-solo").addEventListener("click", function(){
  MX.solo[MX.sel]=!MX.solo[MX.sel]; majLedsMx(); H.inter();
  lcdMx(MX.solo[MX.sel]?"SOLO":"OFF", nomPartieMx(MX.sel), true);
});
document.getElementById("mx-erase").addEventListener("click", function(){
  if(MX.protect){ lcdMx("PROTECT","ÉCRITURE BLOQUÉE",true); return; }
  if(MX.mode===3){
    if(MX.song.length){ MX.song.splice(MX.ssel,1); MX.ssel=Math.max(0,Math.min(MX.ssel,MX.song.length-1)); majTouchesMx(); memMx(); }
    return;
  }
  MX.pat.st[MX.sel]=ligneVide(); majTouchesMx(); memMx();
  lcdMx("CLEAR", nomPartieMx(MX.sel), true); H.inter();
});
document.getElementById("mx-write").addEventListener("click", function(){
  if(MX.protect){ lcdMx("PROTECT","ÉCRITURE BLOQUÉE",true); return; }
  MX.slots[MX.cur]=MX.pat; memMx(); writeMem();
  lcdMx("WRITE", "PATTERN "+nomMotif(MX.cur), true); H.inter();
});
var mxModes=document.querySelectorAll("[data-mxmode]");
for(var mm2=0; mm2<mxModes.length; mm2++){
  mxModes[mm2].addEventListener("click", function(){
    var m=+this.dataset.mxmode;
    for(var j=0;j<mxModes.length;j++) mxModes[j].classList.toggle("on", +mxModes[j].dataset.mxmode===m);
    MX.mode=m;
    if(m===3){
      MX.spos=0; MX.ssel=0;
      if(MX.song.length){ MX.cur=MX.song[0]; MX.pat=MX.slots[MX.cur]; }
      majTouchesMx(); majKnobsMx(); lcdMx("SONG", MX.song.length?("PATTERN "+nomMotif(MX.cur)):"VIDE", true);
    } else if(m===4){
      ouvrirNotice();
      lcdMx("GLOBAL","RÉGLAGES ET MIDI",true);
    } else if(m===1){ MX.param=2; majLcdMx(); }
    else if(m===2){ MX.param=3; MX.pasSel=-1; majTouchesMx();
      lcdMx("STEP", "TOUCHE = CHOISIR UN PAS", true); }
    else { majTouchesMx(); majLcdMx(); }
    H.cran();
  });
}
document.getElementById("mx-play").addEventListener("click", function(){
  audioInit(); mxAudio();
  if(S.run){ stop(); H.stop(); } else { start(); H.start(); }
  this.classList.toggle("on", S.run);
});
document.getElementById("mx-stop").addEventListener("click", function(){
  stop(); step=0; H.stop();
  document.getElementById("mx-play").classList.remove("on");
});
document.getElementById("mx-home").addEventListener("click", function(){ step=0; lcdMx("|◀","RETOUR AU PAS 1",true); H.cran(); });
document.getElementById("mx-rec").addEventListener("click", function(){
  MX.rec=!MX.rec; this.classList.toggle("on", MX.rec);
  lcdMx(MX.rec?"REC":"EMX-1", MX.rec?"ENREGISTREMENT AU VOL":"PATTERN "+nomMotif(MX.cur), true); H.inter();
});
var mxTaps=[];
document.getElementById("mx-tap").addEventListener("click", function(){
  var now=Date.now();
  if(mxTaps.length && now-mxTaps[mxTaps.length-1]>2200) mxTaps=[];
  mxTaps.push(now); if(mxTaps.length>5) mxTaps.shift();
  if(mxTaps.length<2){ lcdMx("TAP","TEMPO",true); H.cran(); return; }
  var s=0; for(var i=1;i<mxTaps.length;i++) s+=mxTaps[i]-mxTaps[i-1];
  var bpm=Math.round(60000/(s/(mxTaps.length-1)));
  if(bpm>=40&&bpm<=300){ S.bpm=bpm; lcdMx(String(bpm),"TEMPO",true); saveSoon(); }
  H.cran();
});
document.getElementById("mx-notice").addEventListener("click", function(){
  ouvrirNotice();
});
function songMx(i){
  if(MX.protect) return;
  if(i > MX.song.length){ lcdMx("SONG","POSITION SUIVANTE",true); H.cran(); return; }
  if(i === MX.song.length) MX.song.push(MX.cur);
  MX.ssel=i; majTouchesMx(); memMx(); H.cran();
  lcdMx(nomMotif(MX.song[i]), "SONG "+(i+1), true);
}
function shiftMx(i){
  var p=MX.pat, k=MX.sel, su;
  if(MX.protect && i!==15){ lcdMx("PROTECT","ÉCRITURE BLOQUÉE",true); H.cran(); return; }
  if(i===0){ MX.param=4; majLcdMx(); lcdMx(String(p.len),"LAST STEP · MOLETTE",true); }
  else if(i===1){ p.st[k].unshift(p.st[k].pop()); p.nt[k].unshift(p.nt[k].pop()); majTouchesMx(); memMx(); lcdMx(">> 1","MOVE DATA",true); }
  else if(i===2){
    if(k>=10){ for(var q=0;q<16;q++) p.nt[k][q]=Math.min(96,p.nt[k][q]+1); memMx(); lcdMx("+1","SHIFT NOTE",true); }
    else lcdMx("---","PARTIE DE SYNTHÉ SEULEMENT",true);
  }
  else if(i===3){ MX.clip={st:p.st[k].slice(), nt:p.nt[k].slice()}; lcdMx("COPY","PART "+nomPartieMx(k),true); }
  else if(i===4){ MX.clipSon=JSON.parse(JSON.stringify(p.son[k])); lcdMx("COPY","SOUND",true); }
  else if(i===5){ p.mot[k]=null; majLedsMx(); memMx(); lcdMx("CLEAR","MOTION",true); }
  else if(i===6){
    if(MX.clip && MX.clipSon===undefined){}
    p.st[k]=ligneVide(); majTouchesMx(); memMx(); lcdMx("CLEAR","PART",true);
  }
  else if(i===7){ MX.pat=motifMx(9); MX.slots[MX.cur]=MX.pat; majTouchesMx(); majKnobsMx(); majLedsMx(); memMx(); lcdMx("CLEAR","PATTERN",true); }
  else if(i===8){
    su=(MX.cur+1)%16;
    MX.slots[MX.cur]=p;
    var np=motifMx(9);
    np.sw=p.sw; np.len=p.len;
    np.st=p.st.map(function(l){return l.slice();});
    np.nt=p.nt.map(function(l){return l.slice();});
    np.son=JSON.parse(JSON.stringify(p.son));
    MX.slots[su]=np; MX.cur=su; MX.pat=np;
    majTouchesMx(); majKnobsMx(); majLedsMx(); memMx();
    lcdMx(nomMotif(su),"INSERT PATTERN",true);
  }
  else if(i===9){ MX.slots[MX.cur]=motifMx(9); MX.pat=MX.slots[MX.cur]; majTouchesMx(); majKnobsMx(); majLedsMx(); memMx(); lcdMx("DELETE","PATTERN",true); }
  else if(i===10){ MX.song=[]; MX.spos=0; MX.ssel=0; if(MX.mode===3) majTouchesMx(); memMx(); lcdMx("CLEAR","SONG",true); }
  else if(i===11){ ouvrirNotice(); lcdMx("UTILITY","RÉGLAGES",true); }
  else if(i===15){ MX.protect=!MX.protect; lcdMx(MX.protect?"ON":"OFF","PROTECT",true); }
  else if(MX.clip && i===12){ p.st[k]=MX.clip.st.slice(); p.nt[k]=MX.clip.nt.slice(); majTouchesMx(); memMx(); lcdMx("PASTE","PART",true); }
  else lcdMx("---","À VENIR",true);
  H.cran();
}

function activerMx(){
  stop();
  S.modele="emx";
  MACHINE=MACHINE_MX;
  poserMachine("emx");
  audioInit(); banqueEs(); mxAudio();
  chargerMx();
  cablerFxMx(); majTube();
  choisirMx(MX.sel||0);
  majTouchesMx(); majKnobsMx(); majLedsMx(); majLcdMx(); kMxVol.maj();
  actif = unitMx;
  save(); fit(); setTimeout(fit,120);
}


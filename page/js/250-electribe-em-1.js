/* ===================== ELECTRIBE EM-1 ===================== */

/* --- timbres supplémentaires --- */
V.lt = function(t,v){
  var o=ctx.createOscillator(), g=ctx.createGain();
  o.type="sine";
  o.frequency.setValueAtTime(210,t);
  o.frequency.exponentialRampToValueAtTime(88,t+0.18);
  env(g,t,0.6*v,0.34,0.003);
  o.connect(g); g.connect(outMix); o.start(t); o.stop(t+0.38);
  noise(t,0.03,"lowpass",900,0,0.18*v);
};
V.cb = function(t,v){
  var g=ctx.createGain(), bp=ctx.createBiquadFilter();
  bp.type="bandpass"; bp.frequency.value=2200; bp.Q.value=2.2;
  [540,800].forEach(function(f){
    var o=ctx.createOscillator(); o.type="square"; o.frequency.value=f;
    o.connect(bp); o.start(t); o.stop(t+0.3);
  });
  bp.connect(g); g.connect(outMix);
  env(g,t,0.32*v,0.26,0.001);
};

/* --- bus effet et délai --- */
var fxIn=null, fxOut=null, dlyIn=null, dlyNode=null, dlyFb=null, fxChaine=[];
function busEffets(){
  if(fxIn || !ctx) return;
  fxIn = ctx.createGain(); fxOut = ctx.createGain(); fxOut.gain.value = 0.6; fxOut.connect(master);
  dlyIn = ctx.createGain(); dlyIn.gain.value = 0;
  dlyNode = ctx.createDelay(1.2); dlyNode.delayTime.value = 0.25;
  dlyFb = ctx.createGain(); dlyFb.gain.value = 0.35;
  dlyIn.connect(dlyNode); dlyNode.connect(dlyFb); dlyFb.connect(dlyNode);
  dlyNode.connect(master);
  fxOut.connect(dlyIn);
  construireFx();
}
function courbeBits(bits){
  var niv = Math.pow(2, bits-1), n = 2049, c = new Float32Array(n);
  for(var i=0;i<n;i++){ var x = i*2/(n-1)-1; c[i] = Math.round(x*niv)/niv; }
  return c;
}
function courbeDist(k){
  var n=1025, c=new Float32Array(n);
  for(var i=0;i<n;i++){ var x=i*2/(n-1)-1; c[i]=Math.tanh(x*(1+k*14))/Math.tanh(1+k*14); }
  return c;
}
function irReverb(sec){
  var n = Math.floor(ctx.sampleRate*sec), b = ctx.createBuffer(2,n,ctx.sampleRate);
  var g = b.getChannelData(0), d = b.getChannelData(1), i;
  /* décroissance calculée par multiplication au lieu d'une puissance par échantillon,
     et canal droit obtenu par décalage : trois fois moins de travail, même queue */
  var k = Math.pow(0.0009, 1/Math.max(1,n)), a = 1;
  for(i=0;i<n;i++){
    g[i] = (Math.random()*2-1)*a*a;
    a *= k;
  }
  var dec = Math.max(1, Math.floor(n*0.013));
  for(i=0;i<n;i++) d[i] = g[(i+dec)%n]*0.94;
  return b;
}
var FX_NOMS = ["Pitch Shifter","Ring Mod","Phaser","Flg./Cho.","Reverb",
               "Compressor","Distortion","Decimator","Resonator","Filter","Mod. Delay",
               "Isolator","Reso. Filt.","Talking Mod","EQ","Grain Shifter"];
/* la mkII de l'ES-1 remplace Resonator et Filter par Isolator et Reso. Filt. */
var FX_ES2 = [0,1,2,3,4,5,6,7,11,12,10];
function construireFx(){
  if(!fxIn) return;
  if(fxChaine.type === EM.fxType && fxChaine.maj){   /* même effet : on ne refait pas le câblage */
    if(fxChaine.maj(EM.e1, EM.e2) !== false) return;
  }
  fxChaine.forEach(function(n){
    try{ n.disconnect(); }catch(e){}
    try{ if(n.stop) n.stop(); }catch(e){}
  });
  fxChaine = [];
  try{ fxIn.disconnect(); }catch(e){}
  construireFxEntre(fxIn, fxOut, EM.fxType, EM.e1, EM.e2, fxChaine);
  fxChaine.type = EM.fxType;
}
/* construit un effet entre deux nœuds : les paramètres masquent les variables
   globales de même nom, ce qui laisse le corps valable pour toutes les machines */
/* Cache des réponses impulsionnelles : en régénérer une à chaque mouvement de bouton
   coûtait quarante millisecondes, soit bien plus qu'une image d'affichage. */
var IR_CACHE = {};
function irCache(sec){
  var cle = Math.round(sec*8);          /* pas de 125 ms : l'oreille n'entend pas la marche */
  if(!IR_CACHE[cle]) IR_CACHE[cle] = irReverb(cle/8);
  return IR_CACHE[cle];
}
function ctp(param, v, lisse){ param.setTargetAtTime(v, maintenantAudio(), lisse === undefined ? 0.02 : lisse); }

/* Construit un effet entre deux nœuds. Le registre reçoit aussi une fonction `maj`
   qui applique EDIT 1 et EDIT 2 aux nœuds déjà en place : tourner un bouton ne
   reconstruit plus rien, et le son ne se coupe plus. */
function construireFxEntre(fxIn, fxOut, t, e1, e2, fxChaine){
  var i;
  fxChaine.maj = null;
  if(t===1){                                   /* Ring Mod */
    var rg = ctx.createGain(); rg.gain.value = 0;
    var lo = ctx.createOscillator(); lo.type="sine";
    lo.frequency.value = 40 + e1*1800;
    var la = ctx.createGain(); la.gain.value = 0.5 + e2*0.5;
    lo.connect(la); la.connect(rg.gain); lo.start();
    fxIn.connect(rg); rg.connect(fxOut);
    fxChaine.push(rg,lo,la);
    fxChaine.maj = function(a,b){ ctp(lo.frequency, 40+a*1800); ctp(la.gain, 0.5+b*0.5); };
  } else if(t===2){                            /* Phaser */
    var prec = fxIn, lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.type="sine"; lfo.frequency.value = 0.05 + e1*4; lg.gain.value = 400 + e2*1400;
    lfo.connect(lg); lfo.start(); fxChaine.push(lfo,lg);
    for(i=0;i<4;i++){
      var ap = ctx.createBiquadFilter(); ap.type="allpass";
      ap.frequency.value = 300 + i*400; ap.Q.value = 1.2;
      lg.connect(ap.frequency);
      prec.connect(ap); prec = ap; fxChaine.push(ap);
    }
    prec.connect(fxOut);
    fxChaine.maj = function(a,b){ ctp(lfo.frequency, 0.05+a*4); ctp(lg.gain, 400+b*1400); };
  } else if(t===3 || t===10){                  /* Flanger / Chorus et Mod. Delay */
    var court = (t===3);
    var d = ctx.createDelay(0.6);
    d.delayTime.value = court ? 0.004 + e1*0.016 : 0.05 + e1*0.45;
    var fb = ctx.createGain(); fb.gain.value = (court ? 0.55 : 0.6)*e2;
    var lf = ctx.createOscillator(), lag = ctx.createGain();
    lf.type="sine"; lf.frequency.value = court ? 0.3 : 0.15;
    lag.gain.value = court ? 0.003 : 0.002;
    lf.connect(lag); lag.connect(d.delayTime); lf.start();
    fxIn.connect(d); d.connect(fb); fb.connect(d);
    fxIn.connect(fxOut); d.connect(fxOut);
    fxChaine.push(d,fb,lf,lag);
    fxChaine.maj = function(a,b){
      ctp(d.delayTime, court ? 0.004+a*0.016 : 0.05+a*0.45, 0.05);
      ctp(fb.gain, (court?0.55:0.6)*b);
    };
  } else if(t===4){                            /* Reverb */
    var cv = ctx.createConvolver(); cv.buffer = irCache(0.4 + e1*2.2);
    var wet = ctx.createGain(); wet.gain.value = 0.3 + e2*0.7;
    fxIn.connect(cv); cv.connect(wet); wet.connect(fxOut);
    fxIn.connect(fxOut);
    fxChaine.push(cv,wet);
    var tailleAct = Math.round((0.4+e1*2.2)*8), tmrIR = null;
    fxChaine.maj = function(a,b){
      ctp(wet.gain, 0.3+b*0.7);
      var t2 = Math.round((0.4+a*2.2)*8);
      if(t2 === tailleAct) return;
      tailleAct = t2;
      /* poser une réponse impulsionnelle oblige le convolueur à refaire ses tables :
         on attend que le doigt s'arrête plutôt que de le faire soixante fois par seconde */
      clearTimeout(tmrIR);
      tmrIR = setTimeout(function(){ try{ cv.buffer = irCache(t2/8); }catch(e){} }, 130);
    };
  } else if(t===5){                            /* Compressor */
    var cp = ctx.createDynamicsCompressor();
    cp.threshold.value = -6 - e1*40; cp.ratio.value = 2 + e2*18;
    cp.attack.value = 0.004; cp.release.value = 0.18; cp.knee.value = 6;
    fxIn.connect(cp); cp.connect(fxOut); fxChaine.push(cp);
    fxChaine.maj = function(a,b){ ctp(cp.threshold, -6-a*40, 0.05); ctp(cp.ratio, 2+b*18, 0.05); };
  } else if(t===6){                            /* Distortion */
    var ws = ctx.createWaveShaper(); ws.curve = courbeDist(e1); ws.oversample="2x";
    var tn = ctx.createBiquadFilter(); tn.type="lowpass";
    tn.frequency.value = 600 + e2*9000;
    fxIn.connect(ws); ws.connect(tn); tn.connect(fxOut); fxChaine.push(ws,tn);
    var dAct = Math.round(e1*40);
    fxChaine.maj = function(a,b){
      ctp(tn.frequency, 600+b*9000, 0.03);
      var d2 = Math.round(a*40);
      if(d2 !== dAct){ dAct = d2; ws.curve = courbeDist(d2/40); }
    };
  } else if(t===7){                            /* Decimator */
    var bits = 1 + Math.round((1-e1)*10);
    var wd = ctx.createWaveShaper(); wd.curve = courbeBits(bits);
    wd.oversample = "none";                      /* voulu : le Decimator replie */
    var ld = ctx.createBiquadFilter(); ld.type="lowpass"; ld.frequency.value = 400 + (1-e2)*9000;
    fxIn.connect(wd); wd.connect(ld); ld.connect(fxOut); fxChaine.push(wd,ld);
    var bAct = bits;
    fxChaine.maj = function(a,b){
      ctp(ld.frequency, 400+(1-b)*9000, 0.03);
      var b2 = 1 + Math.round((1-a)*10);
      if(b2 !== bAct){ bAct = b2; wd.curve = courbeBits(b2); }
    };
  } else if(t===8){                            /* Resonator */
    var som = ctx.createGain(); som.gain.value = 0.5;
    var bqs = [];
    [1,1.5,2.4].forEach(function(m){
      var bq = ctx.createBiquadFilter(); bq.type="bandpass";
      bq.frequency.value = (120 + e1*1800)*m; bq.Q.value = 2 + e2*28;
      fxIn.connect(bq); bq.connect(som); fxChaine.push(bq); bqs.push({n:bq,m:m});
    });
    som.connect(fxOut); fxChaine.push(som);
    fxChaine.maj = function(a,b){
      bqs.forEach(function(o){ ctp(o.n.frequency, (120+a*1800)*o.m, 0.03); ctp(o.n.Q, 2+b*28, 0.03); });
    };
  } else if(t===13){                           /* Talking Mod : deux formants qui bougent */
    var voy = [[730,1090],[530,1840],[390,1990],[570,840],[300,870]];
    var v1 = voy[Math.min(voy.length-1, Math.floor(e1*voy.length))];
    var som2 = ctx.createGain(); som2.gain.value = 1.4;
    var lfo2 = ctx.createOscillator(); lfo2.type="sine"; lfo2.frequency.value = 0.2 + e2*7;
    lfo2.start(); fxChaine.push(lfo2);
    var bqv = [];
    v1.forEach(function(fr,ix){
      var bq3 = ctx.createBiquadFilter(); bq3.type="bandpass"; bq3.frequency.value = fr; bq3.Q.value = 8;
      var ga3 = ctx.createGain(); ga3.gain.value = fr*0.35;
      lfo2.connect(ga3); ga3.connect(bq3.frequency);
      fxIn.connect(bq3); bq3.connect(som2);
      fxChaine.push(bq3,ga3); bqv.push({f:bq3,g:ga3,i:ix});
    });
    som2.connect(fxOut); fxChaine.push(som2);
    fxChaine.maj = function(a,b){
      ctp(lfo2.frequency, 0.2+b*7, 0.05);
      var v2 = voy[Math.min(voy.length-1, Math.floor(a*voy.length))];
      bqv.forEach(function(o){ ctp(o.f.frequency, v2[o.i], 0.05); ctp(o.g.gain, v2[o.i]*0.35, 0.05); });
    };
  } else if(t===14){                           /* EQ trois bandes */
    var bas = ctx.createBiquadFilter(); bas.type="lowshelf"; bas.frequency.value=220;
    bas.gain.value = (0.5-e1)*24;
    var med = ctx.createBiquadFilter(); med.type="peaking"; med.frequency.value=1100;
    med.Q.value=1; med.gain.value=(e2-0.5)*24;
    var aig = ctx.createBiquadFilter(); aig.type="highshelf"; aig.frequency.value=4200;
    aig.gain.value=(e1-0.5)*24;
    fxIn.connect(bas); bas.connect(med); med.connect(aig); aig.connect(fxOut);
    fxChaine.push(bas,med,aig);
    fxChaine.maj = function(a,b){
      ctp(bas.gain, (0.5-a)*24, 0.03); ctp(aig.gain, (a-0.5)*24, 0.03); ctp(med.gain, (b-0.5)*24, 0.03);
    };
  } else if(t===15){                           /* Grain Shifter : le son bégaie par tranches */
    var dg = ctx.createDelay(0.5);
    var taille = 0.02 + e2*0.28;
    dg.delayTime.value = taille;
    var carre = ctx.createOscillator(); carre.type="square";
    carre.frequency.value = 0.5 + e1*11;
    var ag = ctx.createGain(); ag.gain.value = taille*0.9;
    carre.connect(ag); ag.connect(dg.delayTime);
    carre.start();
    fxIn.connect(dg); dg.connect(fxOut);
    fxChaine.push(dg,carre,ag);
    fxChaine.maj = function(a,b){
      var ta = 0.02 + b*0.28;
      ctp(carre.frequency, 0.5+a*11, 0.03);
      ctp(dg.delayTime, ta, 0.03); ctp(ag.gain, ta*0.9, 0.03);
    };
  } else if(t===11){                           /* Isolator : trois bandes */
    var bandes = [["lowpass",260],["bandpass",900],["highpass",3800]];
    var somme = ctx.createGain(); somme.gain.value = 1;
    var gains = [];
    bandes.forEach(function(bb,ib){
      var bq = ctx.createBiquadFilter(); bq.type = bb[0]; bq.frequency.value = bb[1];
      if(bb[0]==="bandpass") bq.Q.value = 0.9;
      var gg = ctx.createGain();
      var poids = Math.max(0, 1 - Math.abs(e1*2 - ib));
      gg.gain.value = poids + (1-poids)*(1-e2);
      fxIn.connect(bq); bq.connect(gg); gg.connect(somme);
      fxChaine.push(bq,gg); gains.push({g:gg,i:ib});
    });
    somme.connect(fxOut); fxChaine.push(somme);
    fxChaine.maj = function(a,b){
      gains.forEach(function(o){
        var p2 = Math.max(0, 1 - Math.abs(a*2 - o.i));
        ctp(o.g.gain, p2 + (1-p2)*(1-b), 0.03);
      });
    };
  } else if(t===12){                           /* Reso. Filt. : passe-bas très résonant */
    var rf = ctx.createBiquadFilter(); rf.type="lowpass";
    rf.frequency.value = 90*Math.pow(140, e1);
    rf.Q.value = 1 + e2*34;
    var comp = ctx.createGain(); comp.gain.value = 1/(1+e2*2.2);
    fxIn.connect(rf); rf.connect(comp); comp.connect(fxOut);
    fxChaine.push(rf,comp);
    fxChaine.maj = function(a,b){
      ctp(rf.frequency, 90*Math.pow(140,a), 0.03); ctp(rf.Q, 1+b*34, 0.03);
      ctp(comp.gain, 1/(1+b*2.2), 0.03);
    };
  } else if(t===9){                            /* Filter */
    var lp = ctx.createBiquadFilter(); lp.type="lowpass";
    lp.frequency.value = 120*Math.pow(80, e1); lp.Q.value = 0.7 + e2*22;
    fxIn.connect(lp); lp.connect(fxOut); fxChaine.push(lp);
    fxChaine.maj = function(a,b){
      ctp(lp.frequency, 120*Math.pow(80,a), 0.03); ctp(lp.Q, 0.7+b*22, 0.03);
    };
  } else if(t===0){                            /* Pitch Shifter, par deux lignes à retard */
    var demi = Math.round(e1*24-12), fenPas = Math.round(e2*20);
    /* les deux lignes sont démarrées en opposition de phase : on ne peut pas changer leur
       cadence sans les refaire, mais on ne refait que si la valeur arrondie a bougé */
    fxChaine.maj = function(a,b){
      return (Math.round(a*24-12) === demi && Math.round(b*20) === fenPas) ? true : false;
    };
    if(demi === 0){ fxIn.connect(fxOut); }
    else {
      var ratio = Math.pow(2, demi/12);
      var fen = 0.045 + e2*0.075;
      var vit = Math.abs(1-ratio)/fen, sens = (ratio > 1) ? -1 : 1;
      var t0 = maintenantAudio();
      for(i=0;i<2;i++){
        var dl = ctx.createDelay(1), gg2 = ctx.createGain();
        gg2.gain.value = 0;
        var ramp = ctx.createOscillator(); ramp.type="sawtooth"; ramp.frequency.value = vit;
        var ra = ctx.createGain(); ra.gain.value = fen/2*sens;
        var dc = ctx.createConstantSource(); dc.offset.value = fen/2;
        ramp.connect(ra); ra.connect(dl.delayTime); dc.connect(dl.delayTime);
        var fen2 = ctx.createOscillator(); fen2.type="triangle"; fen2.frequency.value = vit;
        var fa = ctx.createGain(); fa.gain.value = 0.5;
        var fc = ctx.createConstantSource(); fc.offset.value = 0.5;
        fen2.connect(fa); fa.connect(gg2.gain); fc.connect(gg2.gain);
        fxIn.connect(dl); dl.connect(gg2); gg2.connect(fxOut);
        var dep = t0 + (i ? 0.5/vit : 0);
        ramp.start(dep); fen2.start(dep); dc.start(t0); fc.start(t0);
        fxChaine.push(dl,gg2,ramp,ra,dc,fen2,fa,fc);
      }
    }
  } else {
    fxIn.connect(fxOut);
  }
}

/* --- parties --- */
var EM_PARTS = [
  {t:"1",  nom:"BASS DRUM",  v:"bd"},
  {t:"2",  nom:"SNARE",      v:"sd"},
  {t:"3",  nom:"CLAP",       v:"cp"},
  {t:"4",  nom:"LOW TOM",    v:"lt"},
  {t:"A",  nom:"CLOSED HAT", v:"hh"},
  {t:"B",  nom:"OPEN HAT",   v:"oh"},
  {t:"A",  nom:"CRASH",      v:"cy"},
  {t:"B",  nom:"COWBELL",    v:"cb"},
  {t:"1",  nom:"SYNTH 1",    synth:true},
  {t:"2",  nom:"SYNTH 2",    synth:true},
  {t:"Accent", nom:"DRUM ACCENT",  accent:true},
  {t:"Accent", nom:"SYNTH ACCENT", accent:true}
];
var ONDES = ["SAW","SQR","TRI","SIN","P25","P12","ORG","ODD"];
var TYPES_ONDE = ["sawtooth","square","triangle","sine"];
/* v217 : anciens indices inchangés ; ondes supplémentaires propres à chaque contexte. */
var EM_ONDES_CACHE = new WeakMap();
function indiceOndeEm(v){
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < ONDES.length ? v : 0;
}
function changerOndeEm(v, d){
  return ((indiceOndeEm(v) + d) % ONDES.length + ONDES.length) % ONDES.length;
}
function appliquerOndeEm(osc, valeur){
  var indice = indiceOndeEm(valeur);
  if(indice < TYPES_ONDE.length){ osc.type = TYPES_ONDE[indice]; return; }
  var cache = EM_ONDES_CACHE.get(ctx);
  if(!cache){ cache = {}; EM_ONDES_CACHE.set(ctx, cache); }
  if(!cache[indice]){
    var reel = new Float32Array(65), imag = new Float32Array(65);
    if(indice === 4 || indice === 5){
      var rapport = indice === 4 ? 0.25 : 0.125;
      for(var n=1;n<65;n++){
        reel[n] = Math.sin(2 * Math.PI * n * rapport) / (Math.PI * n);
        imag[n] = (1 - Math.cos(2 * Math.PI * n * rapport)) / (Math.PI * n);
      }
    }else if(indice === 6){
      imag[1]=1; imag[2]=0.5; imag[4]=0.25; imag[8]=0.125;
    }else{
      imag[1]=1; imag[3]=0.45; imag[5]=0.22; imag[7]=0.1;
    }
    cache[indice] = ctx.createPeriodicWave(reel, imag);
  }
  osc.setPeriodicWave(cache[indice]);
}

function nomNote(n){
  var noms=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return noms[((n%12)+12)%12] + (Math.floor(n/12)-1);
}

/* --- motifs --- */
function ligneVide(){ return [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; }
function ligneEmVide(){ return Array(64).fill(0); }
function longueurEm(v){ return Number.isInteger(v) && v >= 1 && v <= 64 ? v : 16; }
function motifVide(){
  var p = {sw:0, len:16, rollN:4, gamme:0, mot:[], tim:[], st:[], nt:[], lvl:[], pan:[], pit:[], amp:[], roll:[], fx:[], onde:[]};
  var TIM_DEF = [0,4,8,10,13,15,17,19,0,0,0,0];
  for(var k=0;k<12;k++){
    p.st.push(ligneEmVide());
    p.nt.push(Array(64).fill(36));
    p.lvl.push(0.8); p.pan.push(0); p.pit.push(0);
    p.amp.push(false); p.roll.push(false); p.fx.push(false); p.onde.push(0);
    p.mot.push(null); p.tim.push(TIM_DEF[k]);
  }
  p.lvl[8]=0.65; p.lvl[9]=0.55; p.onde[9]=1; p.fx[9]=true;
  return p;
}
function poser(p,k,s){ s.split("").forEach(function(c,i){ if(c!=="." && c!==" ") p.st[k][i]=1; }); }
function motifUsine(n){
  var p = motifVide();
  if(n===0){
    poser(p,0,"x...x...x...x..."); poser(p,2,"....x.......x...");
    poser(p,4,"..x...x...x...x."); poser(p,5,"......x.......x.");
    poser(p,8,"x.....x...x.....");
    p.nt[8]=[36,36,36,36,36,36,43,43,43,43,36,36,36,36,36,36].concat(Array(48).fill(36));
    poser(p,10,"x...x...x...x...");
  } else if(n===1){
    poser(p,0,"x..x..x...x.x..."); poser(p,1,"....x.......x...");
    poser(p,4,"xxxxxxxxxxxxxxxx"); poser(p,7,"..x.......x.....");
    poser(p,9,"..x...x.....x..x");
    p.nt[9]=[48,48,51,48,48,48,55,48,48,48,48,48,53,48,48,51].concat(Array(48).fill(36));
    p.sw=0.15;
  } else if(n===2){
    poser(p,0,"x.......x......."); poser(p,1,"....x.......x...");
    poser(p,3,"..........x.x..."); poser(p,4,"x.x.x.x.x.x.x.x.");
    poser(p,6,"x..............."); poser(p,11,"....x.......x...");
  }
  return p;
}

/* --- état de la machine --- */
var GAMMES = [
  {n:"CHROM", i:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]},
  {n:"MAJOR", i:[0,2,4,5,7,9,11,12,14,16,17,19,21,23,24,26]},
  {n:"MINOR", i:[0,2,3,5,7,8,10,12,14,15,17,19,20,22,24,26]},
  {n:"DORIAN",i:[0,2,3,5,7,9,10,12,14,15,17,19,21,22,24,26]},
  {n:"PENTA", i:[0,2,4,7,9,12,14,16,19,21,24,26,28,31,33,36]},
  {n:"BLUES", i:[0,3,5,6,7,10,12,15,17,18,19,22,24,27,29,30]}
];
var EM = {
  page:0, kb:false, oct:3, pasSel:-1, protect:false, clip:null, clipSon:null, pset:false, mute:[], solo:[],
  song:[], spos:0, ssel:0,
  pat: motifUsine(0), slots: [], cur: 0, sel: 0, param: 0, mode: 0,
  rec:false, shift:false, delayEdit:false, motion:false,
  fxType:9, e1:0.5, e2:0.3, dTime:0.25, dDepth:0.0,
  cut:0.8, res:0.12, egi:0.35, drv:0.05,
  noeuds:[], pos:-1
};
for(var z=0;z<16;z++) EM.slots.push(z<3 ? motifUsine(z) : motifVide());

/* --- sortie d'une partie --- */
function sortiePartie(k,t){
  if(!EM.noeuds[k]){
    var g = ctx.createGain(), pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    var s = ctx.createGain();
    if(pn){ g.connect(pn); pn.connect(busSet("em") || master); } else { g.connect(busSet("em") || master); }
    busEffets();
    g.connect(s); s.connect(fxIn);
    EM.noeuds[k] = {g:g, p:pn, s:s};
  }
  var n = EM.noeuds[k];
  var niv = mv("lvl", EM.pat.lvl[k]), pano = mv("pan", EM.pat.pan[k]);
  /* les valeurs sont posées à l'heure du pas, pas à l'heure de l'écriture :
     l'ordonnanceur travaille jusqu'à 1,2 s d'avance */
  var quand = (t === undefined) ? maintenantAudio() : t;
  var lisse = !!(MOT && MOT.lisse);
  n.g.gain.cancelScheduledValues(quand);
  n.g.gain.setValueAtTime(niv, quand);
  if(lisse && MOT.p === "lvl") n.g.gain.linearRampToValueAtTime(MOT.suiv, quand + stepDur());
  if(n.p){
    n.p.pan.cancelScheduledValues(quand);
    n.p.pan.setValueAtTime(pano, quand);
    if(lisse && MOT.p === "pan") n.p.pan.linearRampToValueAtTime(MOT.suiv, quand + stepDur());
  }
  n.s.gain.cancelScheduledValues(quand);
  n.s.gain.setValueAtTime(EM.pat.fx[k] ? 0.9 : 0, quand);
  return n.g;
}
function jouerVoix(voix,t,vel,dest){
  var om=outMix, ob=outBd;
  outMix = dest; outBd = dest;
  V[voix](t,vel);
  outMix = om; outBd = ob;
}
function voixSynth(t,k,note,vel){
  var dest = pasVoie(sortiePartie(k,t));
  var cut = mv("cut", EM.cut), res = mv("res", EM.res);
  var egi = mv("egi", EM.egi), drv = mv("drv", EM.drv);
  var egt = 0.05 + mv("egT", EM.egT)*0.9;
  var f0 = 440*Math.pow(2,(note + mv("pit", EM.pat.pit[k])*12 - 69)/12);
  var lp = ctx.createBiquadFilter(); lp.type="lowpass";
  var base = 90*Math.pow(120, cut);
  lp.frequency.setValueAtTime(Math.min(16000, base),t);
  lp.frequency.linearRampToValueAtTime(Math.min(16000, base*(1+egi*7)), t+0.012);
  lp.frequency.exponentialRampToValueAtTime(Math.max(80, base), t + 0.05 + egt*0.6);
  lp.Q.value = 0.7 + res*22;
  var ws = ctx.createWaveShaper(); ws.curve = courbeDist(drv*0.8); ws.oversample="2x";
  var g = ctx.createGain();
  var dur = EM.pat.amp[k] ? 0.06 + egt*1.1 : stepDur()*0.9;
  env(g, t, 0.5*vel, Math.max(0.08,dur), 0.004);
  var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
  appliquerOndeEm(o1, EM.pat.onde[k]); o1.frequency.value = f0;
  appliquerOndeEm(o2, EM.pat.onde[k]); o2.frequency.value = f0*0.5; o2.detune.value = 7;
  o1.connect(lp); o2.connect(lp); lp.connect(ws); ws.connect(g); g.connect(dest);
  o1.start(t); o2.start(t); o1.stop(t+dur+0.1); o2.stop(t+dur+0.1);
}
EM.egTime = function(){ return 0.05 + EM.egT*0.9; };
EM.egT = 0.35;

/* --- séquence de mouvement --- */
var MOT = null;
function mv(champ, defaut){ return (MOT && MOT.p === champ) ? MOT.v : defaut; }
/* l'accent n'est plus tout ou rien : le bouton LEVEL de la piste d'accent en règle la force */
function velAccent(niv){
  if(typeof niv !== "number") niv = 0.8;
  return Math.max(0.72, Math.min(1, 0.7 + niv*0.375));
}
function motionAu(k,i){
  var m = EM.pat.mot[k];
  if(!m || !m.mode || !m.v) return null;
  var L = EM.pat.len||16, v = m.v[i];
  if(typeof v !== "number") return null;
  var suiv = m.v[(i+1)%L];
  return {p:m.p, v:v, suiv:(typeof suiv==="number"?suiv:v), lisse:m.mode===1};
}
function enregMotion(champ, val){
  var k = EM.sel, m = EM.pat.mot[k];
  if(!m || !m.mode) return;
  if(!EM.rec || !S.run || EM.pos < 0){ m.p = champ; return; }
  if(m.p !== champ || !m.v){
    m.p = champ; m.v = [];
    for(var i=0;i<64;i++) m.v.push(val);
  }
  m.v[EM.pos] = val;
}

/* --- séquenceur de l'EM-1 --- */
function scheduleEm(i,t){
  var CHARGE_N = ouvrirPas();
  var p = EM.pat;
  var vfx = motFxValeur(p.motFx, i, p.len);
  if(vfx !== null) appliquerMotFxEm(vfx, p.motFx.p);
  if(p.sw && i%2===1) t += stepDur()*p.sw*0.55;
  var accD = p.st[10][i], accS = p.st[11][i];
  var soloEm = false, q;
  for(q=0;q<10;q++) if(EM.solo[q]) soloEm = true;
  for(var k=0;k<10;k++){
    if(!p.st[k][i]) continue;
    if(EM.mute[k]) continue;
    if(soloEm && !EM.solo[k]) continue;
    var part = EM_PARTS[k];
    var vel = (part.synth ? accS : accD) ? velAccent(p.lvl[part.synth ? 11 : 10]) : 0.7;
    var n = p.roll[k] ? (p.rollN||4) : 1, j;
    MOT = motionAu(k,i);
    for(j=0;j<n;j++){
      var tt = t + j*stepDur()/n;
      if(part.synth){
        var dEm = EM.pat.amp[k] ? (0.06 + EM.egTime()*1.1) : stepDur()*0.9;
        CHARGE_N++, voixSynth(tt,k,p.nt[k][i],vel);
        midiNoteA(p.nt[k][i], tt, vel, MIDI.canalSy + (k===9?1:0), dEm);
      } else {
        CHARGE_N++, jouerTimbre(p.tim[k], tt, vel, sortiePartie(k,tt));
        midiNoteA(MIDI.base + k, tt, vel, MIDI.canal);
      }
    }
    MOT = null;
  }
  if(!cache) queue.push({i:i,t:t});
  attenuerVoie("em", CHARGE_N, t);
}
var beatsEls = [], keysEls = [];
function beatEm(i){
  EM.pos = i;
  majPagesEm();
  majEditionSongEm();
  if(EM.mode === 2){
    for(var q=0;q<16;q++){
      beatsEls[q].classList.toggle("on", q===EM.spos);
      keysEls[q].classList.remove("cur");
    }
    return;
  }
  for(var j=0;j<16;j++){
    beatsEls[j].classList.toggle("on", j + EM.page*16===i);
    keysEls[j].classList.toggle("cur", j + EM.page*16===i);
  }
}
function arretEm(){
  EM.pos = -1;
  majPagesEm();
  majEditionSongEm();
  var pb = document.getElementById("em-play"); if(pb) pb.classList.remove("on");
  for(var j=0;j<16;j++){ beatsEls[j].classList.remove("on"); keysEls[j].classList.remove("cur"); }
}

/* --- afficheur --- */
var emVal = document.getElementById("em-val"), emLab = document.getElementById("em-lab");
var emTmr = null;
function lcd(val,lab,fugace){
  emVal.textContent = val; emLab.textContent = lab;
  clearTimeout(emTmr);
  if(fugace) emTmr = setTimeout(majLcd, 1200);
}
var PARAMS = ["PATTERN","TEMPO","WAVE","NOTE NO.","STEP REC."];
function majLcd(){
  var k = EM.sel, p = EM.pat;
  if(EM.param===0) lcd(("00"+(EM.cur+1)).slice(-3), "PATTERN");
  else if(EM.param===1) lcd(String(S.bpm), "TEMPO");
  else if(EM.param===2) lcd(EM_PARTS[k].synth ? ONDES[indiceOndeEm(p.onde[k])] : (TIMBRES[p.tim[k]]||TIMBRES[0]).n, "WAVE");
  else if(EM.param===3){
    var lab = (EM.pasSel>=0 && p.st[k][EM.pasSel]) ? "NOTE · PAS "+(EM.pasSel+1) : "NOTE NO.";
    var nn = (EM.pasSel>=0 && p.st[k][EM.pasSel]) ? p.nt[k][EM.pasSel] : EM.note;
    lcd(EM_PARTS[k].synth ? nomNote(nn) : "---", lab);
  }
  else lcd("---","STEP REC.");
}
EM.note = 36;

/* --- construction de l'interface --- */
(function construireEm(){
  var i, b;

  /* liste des paramètres, trois colonnes comme sur la façade */
  var COL1 = ["Pattern","Tempo","Wave","Note No.","Step Rec."];
  var COL2 = ["Motion Dest.","Motion Value","Gate Time","Pattern","Note Ofs."];
  var COL3 = ["Song","Tempo","Position","Drums Note No.","MIDI Filter"];
  var boxP = document.getElementById("em-params");
  for(i=0;i<5;i++){
    [[COL1[i],0],[COL2[i],1],[COL3[i],2]].forEach(function(c){
      var u=document.createElement("u");
      u.innerHTML='<i></i>'+c[0];
      if(c[1]===0){ u.dataset.p=i; if(i===0) u.className="on"; }
      else u.className="no";
      boxP.appendChild(u);
    });
  }
  boxP.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u || u.dataset.p===undefined) return;
    EM.param = +u.dataset.p;
    var us=boxP.querySelectorAll("u[data-p]");
    for(var j=0;j<us.length;j++) us[j].classList.toggle("on", +us[j].dataset.p===EM.param);
    majLcd(); H.cran();
  });

  /* types d'effet */
  var boxT = document.getElementById("em-types");
  FX_NOMS.forEach(function(nom,idx){
    var u=document.createElement("u"); u.innerHTML='<i></i>'+nom; u.dataset.t=idx;
    if(idx===EM.fxType) u.className="on";
    boxT.appendChild(u);
  });
  boxT.addEventListener("click", function(e){
    var u=e.target.closest("u"); if(!u) return;
    EM.fxType = +u.dataset.t;
    var us=boxT.querySelectorAll("u");
    for(var j=0;j<us.length;j++) us[j].classList.toggle("on", +us[j].dataset.t===EM.fxType);
    construireFx();
    lcd(String(EM.fxType+1).slice(-3), FX_NOMS[EM.fxType].toUpperCase(), true);
    H.cran();
  });

  /* boutons de parties */
  function bouton(k,txt,sous){
    var d=document.createElement("div"); d.style.flex="1";
    var b=document.createElement("button"); b.className="btn"; b.dataset.k=k; b.textContent="";
    b.style.width="100%"; b.style.padding="14px 2px";
    var s=document.createElement("div"); s.className="em-sous"; s.textContent=sous;
    d.appendChild(b); d.appendChild(s);
    return d;
  }
  var dr = document.getElementById("em-drums");
  [[0,"1"],[1,"2"],[2,"3"],[3,"4"],[4,"A"],[5,"B"],[6,"A"],[7,"B"],[10,"Accent"]].forEach(function(c){
    dr.appendChild(bouton(c[0],"",c[1]));
  });
  var sy = document.getElementById("em-synth");
  [[8,"1"],[9,"2"],[11,"Accent"]].forEach(function(c){ sy.appendChild(bouton(c[0],"",c[1])); });

  function choisirPartie(k){
    EM.sel = k; EM.pasSel = -1;
    var bs = document.querySelectorAll("#em-drums .btn,#em-synth .btn");
    for(var j=0;j<bs.length;j++) bs[j].classList.toggle("on", +bs[j].dataset.k===k);
    majTouches(); majBascules(); majMotionLeds();
    lcd(EM_PARTS[k].t, EM_PARTS[k].nom, true);
    H.cran();
  }
  document.getElementById("em-drums").addEventListener("click", function(e){
    var b=e.target.closest(".btn"); if(b) choisirPartie(+b.dataset.k);
  });
  document.getElementById("em-synth").addEventListener("click", function(e){
    var b=e.target.closest(".btn"); if(b) choisirPartie(+b.dataset.k);
  });
  EM.choisirPartie = choisirPartie;

  /* témoins de tempo et touches de pas */
  var bb=document.getElementById("em-beats"), bk=document.getElementById("em-keys");
  for(i=0;i<16;i++){
    var d=document.createElement("i"); if(i%4===0) d.className="b4";
    bb.appendChild(d); beatsEls.push(d);
    b=document.createElement("button"); b.className="btn"; b.textContent=String(i+1); b.dataset.i=i;
    bk.appendChild(b); keysEls.push(b);
  }
  bk.addEventListener("click", function(e){
    var b=e.target.closest(".btn"); if(!b) return;
    var i = +b.dataset.i;
    if(EM.shift){ fonctionShift(i); return; }
    if(EM.pset){ allerMotifEm(i); return; }
    if(EM.mode === 1){ choisirPasEm(i + EM.page*16); return; }
    if(EM.mode === 2){ toucheSong(i); return; }
    if(EM.kb){ toucheClavier(i); return; }
    if(EM.protect){ lcd("PRT","PROTECT",true); return; }
    i += EM.page*16;
    var k = EM.sel, p = EM.pat;
    p.st[k][i] = p.st[k][i] ? 0 : 1;
    if(p.st[k][i] && EM_PARTS[k].synth) p.nt[k][i] = EM.note;
    EM.pasSel = i;
    majTouches(); memEm(); H.cran();
    if(EM_PARTS[k].synth && p.st[k][i]) lcd(nomNote(p.nt[k][i]), "PAS "+(i+1), true);
  });
})();

function noteClavier(i){
  return 12*EM.oct + GAMMES[EM.pat.gamme||0].i[i];
}
function choisirPasEm(i){
  var p = EM.pat, k = EM.sel;
  EM.pasSel = i;
  majTouches(); H.cran();
  if(!p.st[k][i]) lcd("---", "PAS "+(i+1)+" · VIDE", true);
  else if(EM_PARTS[k].synth) lcd(nomNote(p.nt[k][i]), "PAS "+(i+1)+" · "+EM_PARTS[k].nom, true);
  else lcd("ON", "PAS "+(i+1)+" · "+EM_PARTS[k].nom, true);
}
function majTouches(){
  majPagesEm();
  majEditionSongEm();
  var p = EM.pat, k = EM.sel, i;
  if(EM.pset){
    for(i=0;i<16;i++){
      keysEls[i].textContent = ("0"+(i+1)).slice(-2);
      keysEls[i].classList.toggle("act", i === EM.cur);
      keysEls[i].classList.remove("sel","hors");
    }
    return;
  }
  if(EM.mode === 2){
    for(i=0;i<16;i++){
      var v = EM.song[i];
      keysEls[i].textContent = (v===undefined) ? "–" : ("0"+(v+1)).slice(-2);
      keysEls[i].classList.toggle("act", v!==undefined && i!==EM.spos);
      keysEls[i].classList.toggle("sel", i===EM.ssel);
      keysEls[i].classList.toggle("hors", v===undefined);
      beatsEls[i].classList.toggle("hors", v===undefined);
    }
    return;
  }
  if(EM.kb){
    var courante = (EM.pasSel>=0 && p.st[k][EM.pasSel]) ? p.nt[k][EM.pasSel] : EM.note;
    for(i=0;i<16;i++){
      keysEls[i].textContent = nomNote(noteClavier(i));
      keysEls[i].classList.toggle("act", noteClavier(i) === courante);
      keysEls[i].classList.remove("sel");
      keysEls[i].classList.toggle("hors", false);
    }
    return;
  }
  for(i=0;i<16;i++){
    var pas = i + EM.page*16;
    keysEls[i].textContent = String(pas+1);
    keysEls[i].classList.toggle("act", !!p.st[k][pas]);
    keysEls[i].classList.toggle("sel", pas === EM.pasSel);
    keysEls[i].classList.toggle("cur", pas === EM.pos);
    beatsEls[i].classList.toggle("on", pas === EM.pos);
    keysEls[i].classList.toggle("hors", pas >= p.len);
    beatsEls[i].classList.toggle("hors", pas >= p.len);
  }
}
function toucheSong(i){
  if(S.run || WAVX.occupe) return;
  if(EM.protect){ protege(); return; }
  if(i > EM.song.length){ lcd("---","SONG",true); H.cran(); return; }
  if(i === EM.song.length) EM.song.push(EM.cur);
  EM.ssel = i;
  majTouches(); memEm(); H.cran();
  lcd(("00"+(EM.song[i]+1)).slice(-3), "SONG "+(i+1), true);
}
function toucheClavier(i){
  var k = EM.sel, p = EM.pat, n = noteClavier(i);
  if(!ctx) audioInit();
  busEffets();
  if(EM_PARTS[k].synth) voixSynth(maintenantAudio()+0.01, k, n, 1);
  else jouerTimbre(EM.pat.tim[k], maintenantAudio()+0.01, 1, sortiePartie(k, maintenantAudio()+0.01));
  EM.note = n;
  if(!EM.protect && EM_PARTS[k].synth){
    if(EM.rec && S.run && EM.pos >= 0){
      var j = (EM.pos+1) % (p.len||16);
      p.st[k][j] = 1; p.nt[k][j] = n;
    } else if(EM.pasSel >= 0 && p.st[k][EM.pasSel]){
      p.nt[k][EM.pasSel] = n;
    }
    memEm();
  }
  majTouches();
  lcd(nomNote(n), EM.pasSel>=0 && !EM.rec ? "PAS "+(EM.pasSel+1) : "KEYBOARD", true);
  H.cran();
}
function majBascules(){
  var p=EM.pat, k=EM.sel;
  document.getElementById("em-mute").classList.toggle("on", !!EM.mute[k]);
  document.getElementById("em-solo").classList.toggle("on", !!EM.solo[k]);
  document.getElementById("em-amp").classList.toggle("on", p.amp[k]);
  document.getElementById("em-roll").classList.toggle("on", p.roll[k]);
  document.getElementById("em-fx").classList.toggle("on", p.fx[k]);
}
function copiePartie(k){
  return {st:EM.pat.st[k].slice(), nt:EM.pat.nt[k].slice()};
}
function fonctionShift(i){
  var p = EM.pat, k = EM.sel, j, v, n, tmp;
  var ecrit = !EM.protect;
  if(i===0){                                  /* Length */
    if(!ecrit) return protege();
    v=[16,32,48,64,12,8,6,4,2,1]; n=(v.indexOf(p.len)+1)%v.length;
    if(!choisirLongueurEm(v[n])) return;
    lcd(String(p.len), "LENGTH", true);
  } else if(i===1){                           /* Scale / Beat */
    if(!ecrit) return protege();
    p.gamme = ((p.gamme||0)+1) % GAMMES.length;
    if(EM.kb) majTouches(); memEm();
    lcd(GAMMES[p.gamme].n, "SCALE", true);
  } else if(i===2){                           /* Swing */
    if(!ecrit) return protege();
    v=[0,0.15,0.25,0.37,0.5]; n=(v.indexOf(p.sw)+1)%v.length;
    p.sw = v[n]; memEm();
    lcd(Math.round(p.sw*100)+"%", "SWING", true);
  } else if(i===3){                           /* Roll Type */
    if(!ecrit) return protege();
    v=[2,3,4,6]; n=(v.indexOf(p.rollN)+1)%v.length;
    p.rollN = v[n]; memEm();
    lcd("x"+p.rollN, "ROLL TYPE", true);
  } else if(i===4){                           /* Move Data : décale la partie d'un pas */
    if(!ecrit) return protege();
    ["st","nt"].forEach(function(nom){
      var ligne = p[nom][k].slice(0,p.len); ligne.unshift(ligne.pop());
      p[nom][k] = ligne.concat(p[nom][k].slice(p.len));
    });
    majTouches(); memEm();
    lcd(">>1", "MOVE DATA", true);
  } else if(i===5){                           /* Copy Part */
    EM.clip = copiePartie(k);
    lcd("CPY", "COPY PART "+EM_PARTS[k].nom, true);
  } else if(i===6){                           /* Copy Sound */
    EM.clipSon = {lvl:p.lvl[k], pan:p.pan[k], pit:p.pit[k], amp:p.amp[k],
                  roll:p.roll[k], fx:p.fx[k], onde:p.onde[k]};
    lcd("CPY", "COPY SOUND", true);
  } else if(i===7){                           /* Clear Motion */
    if(!ecrit) return protege();
    p.mot[k] = null; majMotionLeds(); memEm();
    lcd("CLR", "CLEAR MOTION", true);
  } else if(i===8){                           /* Clear Part */
    if(!ecrit) return protege();
    p.st[k] = ligneEmVide(); majTouches(); memEm();
    lcd("CLR", "CLEAR PART", true);
  } else if(i===9){                           /* Swap Part : échange avec la copie */
    if(!ecrit) return protege();
    if(EM.clipSon){
      p.lvl[k]=EM.clipSon.lvl; p.pan[k]=EM.clipSon.pan; p.pit[k]=EM.clipSon.pit;
      p.amp[k]=EM.clipSon.amp; p.roll[k]=EM.clipSon.roll; p.fx[k]=EM.clipSon.fx;
      p.onde[k]=EM.clipSon.onde;
      majBascules(); majKnobsPartie();
    }
    if(EM.clip){
      tmp = copiePartie(k);
      p.st[k] = EM.clip.st.slice(); p.nt[k] = EM.clip.nt.slice();
      EM.clip = tmp;
      majTouches();
    }
    memEm();
    lcd("SWP", "SWAP PART", true);
  } else if(i===10){                          /* Insert Pattern */
    if(!ecrit) return protege();
    var suiv = (EM.cur+1)%16;
    EM.slots[EM.cur] = p;
    EM.slots[suiv] = deserialiser(serialiser(p));
    EM.cur = suiv; EM.pat = EM.slots[suiv];
    majTouches(); majBascules(); majKnobsPartie(); memEm();
    lcd(("00"+(suiv+1)).slice(-3), "INSERT PATTERN", true);
  } else if(i===11){                          /* Delete Pattern */
    if(!ecrit) return protege();
    EM.pat = motifVide(); EM.slots[EM.cur] = EM.pat;
    majTouches(); majBascules(); majKnobsPartie(); memEm();
    lcd("DEL", "DELETE PATTERN", true);
  } else if(i===12){                          /* Clear Song */
    if(S.run || WAVX.occupe) return;
    if(!ecrit) return protege();
    EM.song = []; EM.spos = 0; EM.ssel = 0;
    if(EM.mode===2) majTouches();
    memEm();
    lcd("CLR", "CLEAR SONG", true);
  } else if(i===15){                          /* Protect */
    EM.protect = !EM.protect;
    lcd(EM.protect?"ON":"OFF", "PROTECT", true);
  } else {
    lcd("---", "À VENIR", true);
  }
  H.cran();
}
function protege(){ lcd("PRT","PROTECT",true); H.cran(); }

/* --- mémoire de l'EM-1 --- */
function serialiser(p){
  return {sw:p.sw, len:p.len, rollN:p.rollN, gamme:p.gamme,
          st:p.st.map(function(l){ return l.join(""); }),
          nt:p.nt.map(function(l){ return l.join(","); }),
          lvl:p.lvl, pan:p.pan, pit:p.pit,
          amp:p.amp, roll:p.roll, fx:p.fx, onde:p.onde, mot:p.mot, tim:p.tim, motFx:p.motFx};
}
function deserialiser(o){
  var p = motifVide();
  if(!o) return p;
  p.sw = o.sw||0;
  p.len = longueurEm(o.len); p.rollN = o.rollN||4; p.gamme = o.gamme||0;
  if(Array.isArray(o.st)) o.st.slice(0,12).forEach(function(s,k){ if(typeof s === "string") for(var i=0;i<64;i++) p.st[k][i] = s.charAt(i)==="1"?1:0; });
  if(Array.isArray(o.nt)) o.nt.slice(0,12).forEach(function(s,k){
    var notes = typeof s === "string" ? s.split(",").map(Number) : [];
    for(var i=0;i<64;i++) p.nt[k][i] = Number.isFinite(notes[i]) ? Math.max(0,Math.min(127,notes[i])) : 36;
  });
  ["lvl","pan","pit","amp","roll","fx","onde","mot","tim"].forEach(function(c){ if(o[c]) p[c]=o[c]; });
  p.onde = Array.from({length:12}, function(_, k){return indiceOndeEm(p.onde[k]);});
  if(o.motFx) p.motFx = o.motFx;
  return p;
}
function memEm(){
  memoire.em1 = {cur:EM.cur, song:EM.song.slice(), fxType:EM.fxType, e1:EM.e1, e2:EM.e2,
                 dTime:EM.dTime, dDepth:EM.dDepth, cut:EM.cut, res:EM.res, egi:EM.egi,
                 drv:EM.drv, egT:EM.egT, sel:EM.sel,
                 slots:EM.slots.map(serialiser)};
  memoire.em1.slots[EM.cur] = serialiser(EM.pat);
  sauverMachine("em1");
}
function chargerEm(){
  var m = memLire("em1");
  if(!m) return;
  if(m.slots && m.slots.length===16) EM.slots = m.slots.map(deserialiser);
  if(m.song && m.song.length) EM.song = m.song.slice();
  ["fxType","e1","e2","dTime","dDepth","cut","res","egi","drv","egT","sel","cur"].forEach(function(c){
    if(typeof m[c] === "number") EM[c] = m[c];
  });
  EM.pat = EM.slots[EM.cur];
}

/* --- boutons rotatifs de l'EM-1 --- */
function knobEm(id, opt){
  var el = document.getElementById(id), pin = el.querySelector("i");
  var st = {v:opt.get(), drag:false, yp:0, x0:0, moved:0};
  function render(){
    var a = -140 + 280*((st.v-opt.min)/(opt.max-opt.min));
    pin.style.transformOrigin = "50% 140%";
    pin.style.transform = "rotate("+a+"deg)";
  }
  el.addEventListener("pointerdown", function(e){
    st.drag=true; st.moved=0; st.yp=e.clientY; st.x0=e.clientX;
    el.setPointerCapture(e.pointerId); e.preventDefault();
  });
  el.addEventListener("pointermove", function(e){
    if(!st.drag || PINCE) return;
    /* On cumule les petits déplacements au lieu de mesurer depuis le point de
       départ : sans cela, changer de finesse au milieu du geste ferait sauter
       la valeur d'un coup. */
    var d = st.yp - e.clientY;
    st.yp = e.clientY;
    st.moved += Math.abs(d);
    /* S'écarter sur le côté affine le réglage, jusqu'à dix fois. C'est le geste
       des logiciels de studio, et c'est le seul moyen de viser juste sur un
       potard de six millimètres comme ceux de l'Eurorack. Un glissé droit se
       comporte exactement comme avant. */
    var fin = 1 + Math.min(9, Math.abs(e.clientX - st.x0) / 26);
    var r = opt.max-opt.min;
    st.v = Math.max(opt.min, Math.min(opt.max, st.v + d/(190*fin)*r));
    render(); enLissant(function(){ opt.set(st.v); });
  });
  el.addEventListener("pointerup", function(){
    if(!st.drag) return;
    st.drag=false;
    /* toucher sans tourner : la machine dit ce qu'est ce potard et où il en est */
    if(st.moved < 5 && opt.tap) opt.tap();
    memEm();
  });
  el.addEventListener("pointercancel", function(){ st.drag=false; });
  /* molette de la souris (v146) : un cran de molette = un quarantième de la
     course (opt.pas s'il est donné, pour un sélecteur à positions) ; Maj affine
     dix fois. Le cran se mesure à l'amplitude : un pavé tactile, qui envoie
     beaucoup de petits événements, ne s'emballe pas. */
  el.addEventListener("wheel", function(e){
    if(!e.deltaY) return;
    e.preventDefault();
    var crans = -e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 100 : 1) / 100;
    var pas = opt.pas || (opt.max - opt.min) / 40;
    if(e.shiftKey && !opt.pas) pas /= 10;
    if(opt.pas){                        /* sélecteur : on attend un cran entier */
      st.acc = (st.acc || 0) + crans;
      crans = st.acc > 0 ? Math.floor(st.acc) : Math.ceil(st.acc);
      st.acc -= crans;
      if(!crans) return;
    }
    st.v = Math.max(opt.min, Math.min(opt.max, opt.get() + crans * pas));
    render(); enLissant(function(){ opt.set(st.v); });
    clearTimeout(st.tMem);
    st.tMem = setTimeout(memEm, 400);
  }, {passive:false});
  render();
  return {maj:function(){ st.v = opt.get(); render(); }};
}
var kEmVol = knobEm("em-k-vol",{min:0,max:1,get:function(){return S.vol;},set:function(v){
  S.vol=v; if(master) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
  lcd(String(Math.round(v*100)),"VOLUME",true); saveSoon();
}});
var kEmE1 = knobEm("em-k-e1",{min:0,max:1,get:function(){return EM.delayEdit?EM.dTime/1.2:EM.e1;},
  set:function(v){
    if(EM.delayEdit){ EM.dTime = 0.03+v*1.1; if(dlyNode) dlyNode.delayTime.setTargetAtTime(EM.dTime,maintenantAudio(),0.05);
      motFxEcrire(EM.pat.motFx, "dTime", v, EM.rec && S.run, EM.pos, 64);
      lcd(Math.round(EM.dTime*1000)+"","DELAY TIME",true); }
    else { EM.e1=v; construireFx();
      motFxEcrire(EM.pat.motFx, "e1", v, EM.rec && S.run, EM.pos, 64);
      lcd(String(Math.round(v*127)),"EDIT 1",true); }
  }});
var kEmE2 = knobEm("em-k-e2",{min:0,max:1,get:function(){return EM.delayEdit?EM.dDepth:EM.e2;},
  set:function(v){
    if(EM.delayEdit){ EM.dDepth=v;
      if(dlyIn) dlyIn.gain.setTargetAtTime(v*0.6, maintenantAudio(), 0.05);
      if(dlyFb) dlyFb.gain.setTargetAtTime(0.12+v*0.48, maintenantAudio(), 0.05);
      motFxEcrire(EM.pat.motFx, "dDep", v, EM.rec && S.run, EM.pos, 64);
      lcd(String(Math.round(v*127)),"DELAY DEPTH",true); }
    else { EM.e2=v; construireFx();
      motFxEcrire(EM.pat.motFx, "e2", v, EM.rec && S.run, EM.pos, 64);
      lcd(String(Math.round(v*127)),"EDIT 2",true); }
  }});
knobEm("em-k-cut",{min:0,max:1,get:function(){return EM.cut;},
  set:function(v){ EM.cut=v; enregMotion("cut",v); lcd(String(Math.round(v*127)),"CUTOFF",true); }});
knobEm("em-k-res",{min:0,max:1,get:function(){return EM.res;},
  set:function(v){ EM.res=v; enregMotion("res",v); lcd(String(Math.round(v*127)),"RESONANCE",true); }});
knobEm("em-k-egi",{min:0,max:1,get:function(){return EM.egi;},
  set:function(v){ EM.egi=v; enregMotion("egi",v); lcd(String(Math.round(v*127)),"EG INT",true); }});
knobEm("em-k-drv",{min:0,max:1,get:function(){return EM.drv;},
  set:function(v){ EM.drv=v; enregMotion("drv",v); lcd(String(Math.round(v*127)),"DRIVE",true); }});
knobEm("em-k-eg",{min:0,max:1,get:function(){return EM.egT;},
  set:function(v){ EM.egT=v; enregMotion("egT",v); lcd(String(Math.round(v*127)),"EG TIME",true); }});
var kEmPit = knobEm("em-k-pit",{min:-1,max:1,get:function(){return EM.pat.pit[EM.sel];},
  set:function(v){ EM.pat.pit[EM.sel]=v; enregMotion("pit",v); lcd(String(Math.round(v*12)),"PITCH",true); }});
var kEmLvl = knobEm("em-k-lvl",{min:0,max:1,get:function(){return EM.pat.lvl[EM.sel];},
  set:function(v){ EM.pat.lvl[EM.sel]=v; enregMotion("lvl",v); lcd(String(Math.round(v*127)),"LEVEL",true); }});
var kEmPan = knobEm("em-k-pan",{min:-1,max:1,get:function(){return EM.pat.pan[EM.sel];},
  set:function(v){ EM.pat.pan[EM.sel]=v; enregMotion("pan",v); lcd(v<-0.05?"L"+Math.round(-v*63):(v>0.05?"R"+Math.round(v*63):"CNT"),"PAN",true); }});
function majKnobsPartie(){ kEmPit.maj(); kEmLvl.maj(); kEmPan.maj(); }

/* --- molette --- */
(function molette(){
  var el = document.getElementById("em-dial");
  var st = {drag:false, y0:0, acc:0};
  el.addEventListener("pointerdown", function(e){
    st.drag=true; st.y0=e.clientY; st.acc=0; el.setPointerCapture(e.pointerId); e.preventDefault();
  });
  el.addEventListener("pointermove", function(e){
    if(!st.drag || PINCE) return;
    var d = st.y0 - e.clientY;
    if(Math.abs(d) < 12) return;
    st.y0 = e.clientY;
    pas(d > 0 ? 1 : -1);
  });
  el.addEventListener("pointerup", function(){ st.drag=false; memEm(); });
  el.addEventListener("pointercancel", function(){ st.drag=false; });
  function pas(d){
    var k = EM.sel, p = EM.pat;
    if(EM.param===0 && EM.mode===2 && EM.song.length){
      if(S.run || EM.protect || WAVX.occupe) return;
      EM.song[EM.ssel] = (EM.song[EM.ssel] + d + 16)%16;
      majTouches(); memEm();
      lcd(("00"+(EM.song[EM.ssel]+1)).slice(-3), "SONG "+(EM.ssel+1));
      H.cran(); return;
    }
    if(EM.param===0){
      memEm();
      EM.cur = (EM.cur + d + 16)%16;
      EM.pat = EM.slots[EM.cur];
      majTouches(); majBascules(); majKnobsPartie();
    } else if(EM.param===1){
      S.bpm = Math.max(40, Math.min(220, S.bpm + d));
    } else if(EM.param===2){
      if(EM_PARTS[k].synth) p.onde[k] = changerOndeEm(p.onde[k], d);
      else if(!EM_PARTS[k].accent) p.tim[k] = (p.tim[k] + d + TIMBRES.length) % TIMBRES.length;
    } else if(EM.param===3){
      if(EM.pasSel >= 0 && EM_PARTS[k].synth && p.st[k][EM.pasSel]){
        p.nt[k][EM.pasSel] = Math.max(12, Math.min(96, p.nt[k][EM.pasSel] + d));
        EM.note = p.nt[k][EM.pasSel];
      } else {
        EM.note = Math.max(12, Math.min(96, EM.note + d));
      }
      if(EM.kb) majTouches();
    }
    majLcd(); H.cran();
  }
  EM.pas = pas;
  document.getElementById("em-prev").addEventListener("click", function(){
    if(EM.kb){ EM.oct = Math.max(1, EM.oct-1); majTouches(); lcd("OCT "+EM.oct,"KEYBOARD",true); H.cran(); }
    else pas(-1);
  });
  document.getElementById("em-next").addEventListener("click", function(){
    if(EM.kb){ EM.oct = Math.min(6, EM.oct+1); majTouches(); lcd("OCT "+EM.oct,"KEYBOARD",true); H.cran(); }
    else pas(1);
  });
})();

/* --- boutons de la façade --- */
function bascule(id, champ){
  document.getElementById(id).addEventListener("click", function(){
    var p = EM.pat, k = EM.sel;
    p[champ][k] = !p[champ][k];
    majBascules(); memEm(); H.cran();
    lcd(p[champ][k] ? "ON" : "OFF", champ.toUpperCase(), true);
  });
}
bascule("em-amp","amp"); bascule("em-roll","roll"); bascule("em-fx","fx");

document.getElementById("em-delay").addEventListener("click", function(){
  EM.delayEdit = !EM.delayEdit;
  this.classList.toggle("on", EM.delayEdit);
  kEmE1.maj(); kEmE2.maj();
  lcd(EM.delayEdit?"DLY":"FX", EM.delayEdit?"DELAY EDIT":"EFFECT EDIT", true);
  H.inter();
});
document.getElementById("em-kb").addEventListener("click", function(){
  EM.kb = !EM.kb;
  this.classList.toggle("on", EM.kb);
  majTouches();
  lcd(EM.kb ? GAMMES[EM.pat.gamme||0].n : "---", EM.kb ? "KEYBOARD OCT "+EM.oct : "PATTERN", true);
  H.inter();
});

function majMotionLeds(){
  var m = EM.pat.mot[EM.sel];
  var mode = m ? m.mode||0 : 0;
  document.getElementById("em-smooth").classList.toggle("on", mode===1);
  document.getElementById("em-trig").classList.toggle("on", mode===2);
  document.getElementById("em-mseq").classList.toggle("on", mode!==0);
  var bs = document.querySelectorAll("#em-drums .btn,#em-synth .btn");
  for(var j=0;j<bs.length;j++){
    var mm = EM.pat.mot[+bs[j].dataset.k];
    bs[j].classList.toggle("mot", !!(mm && mm.mode));
  }
}
document.getElementById("em-mseq").addEventListener("click", function(){
  var k = EM.sel, m = EM.pat.mot[k];
  if(!m){ m = EM.pat.mot[k] = {mode:0, p:"lvl", v:null}; }
  m.mode = (m.mode+1)%3;
  if(m.mode && !m.v){
    m.v = [];
    for(var i=0;i<64;i++) m.v.push(valeurCourante(m.p));
  }
  majMotionLeds(); memEm(); H.inter();
  lcd(m.mode===0?"OFF":(m.mode===1?"SMTH":"HOLD"), "MOTION · "+m.p.toUpperCase(), true);
});
function valeurCourante(champ){
  if(champ==="lvl") return EM.pat.lvl[EM.sel];
  if(champ==="pan") return EM.pat.pan[EM.sel];
  if(champ==="pit") return EM.pat.pit[EM.sel];
  if(champ==="cut") return EM.cut;
  if(champ==="res") return EM.res;
  if(champ==="egi") return EM.egi;
  if(champ==="drv") return EM.drv;
  return EM.egT;
}

function allerMotifEm(i){
  memEm();
  EM.cur = i; EM.pat = EM.slots[i];
  majTouches(); majBascules(); majMotionLeds(); majKnobsPartie(); majLcd();
  lcd(("00"+(i+1)).slice(-3), "PATTERN", true); H.inter();
}
function basculeCoupeEm(quoi){
  var k = EM.sel;
  EM[quoi][k] = !EM[quoi][k];
  document.getElementById("em-"+(quoi==="mute"?"mute":"solo")).classList.toggle("on", !!EM[quoi][k]);
  majBascules();
  lcd(EM[quoi][k] ? (quoi==="mute"?"MUT":"SOL") : "ON", EM_PARTS[k].nom, true);
  H.inter();
}
document.getElementById("em-mute").addEventListener("click", function(){ basculeCoupeEm("mute"); });
document.getElementById("em-solo").addEventListener("click", function(){ basculeCoupeEm("solo"); });
document.getElementById("em-pset").addEventListener("click", function(){
  EM.pset = !EM.pset;
  this.classList.toggle("on", EM.pset);
  majTouches();
  lcd(EM.pset ? "SET" : "---", EM.pset ? "TOUCHE = MOTIF" : "PATTERN", true);
  H.inter();
});

document.getElementById("em-motion").addEventListener("click", function(){
  var p = EM.pat;
  if(!p.motFx) p.motFx = motFxVide();
  p.motFx.mode = p.motFx.mode ? 0 : 1;
  if(p.motFx.mode && !p.motFx.v){
    p.motFx.p = EM.delayEdit ? "dTime" : "e1";
    var d = EM.delayEdit ? EM.dTime : EM.e1;
    p.motFx.v = []; for(var i=0;i<64;i++) p.motFx.v.push(d);
  }
  this.classList.toggle("on", !!p.motFx.mode);
  memEm();
  lcd(p.motFx.mode ? "ON" : "OFF", "MOTION · EFFET", true);
  H.inter();
});

["em-lock"].forEach(function(id){
  document.getElementById(id).addEventListener("click", function(){
    lcd("---","À VENIR",true); H.cran();
  });
});
document.getElementById("em-shift").addEventListener("click", function(){
  EM.shift = !EM.shift;
  this.classList.toggle("on", EM.shift);
  lcd(EM.shift?"SHF":"---", EM.shift?"SHIFT":"PATTERN", true);
  H.cran();
});
document.getElementById("em-erase").addEventListener("click", function(){
  if(EM.protect){ protege(); return; }
  if(EM.mode === 2){
    editerSongEm("supprimer");
    return;
  }
  EM.pat.st[EM.sel] = ligneEmVide();
  majTouches(); memEm();
  lcd("CLR", EM_PARTS[EM.sel].nom, true);
  H.inter();
});
document.getElementById("em-write").addEventListener("click", function(){
  if(EM.protect){ protege(); return; }
  EM.slots[EM.cur] = EM.pat;
  memEm(); writeMem();
  lcd("SAVE", "PATTERN "+(EM.cur+1), true);
  H.inter();
});
var modeBtns = document.querySelectorAll("[data-mode]");
for(var mb=0;mb<modeBtns.length;mb++){
  modeBtns[mb].addEventListener("click", function(){
    var m = +this.dataset.mode;
    for(var j=0;j<modeBtns.length;j++) modeBtns[j].classList.toggle("on", +modeBtns[j].dataset.mode===m);
    EM.mode = m;
    if(m===1){ EM.pasSel=-1; majTouches(); lcd("STEP","TOUCHE = CHOISIR UN PAS",true); }
    else if(m===2){
      EM.spos = 0; EM.ssel = 0;
      if(EM.song.length){ EM.cur = EM.song[0]; EM.pat = EM.slots[EM.cur]; }
      majTouches(); majBascules(); majKnobsPartie(); majMotionLeds();
      lcd(EM.song.length ? ("00"+(EM.cur+1)).slice(-3) : "---", "SONG", true);
    } else if(m===0){
      majTouches(); majLcd();
    } else if(m===3){
      ouvrirNotice();
      lcd("MIDI","GLOBAL",true);
    } else {
      lcd("---","À VENIR",true);
    }
    H.cran();
  });
}

/* transport */
document.getElementById("em-play").addEventListener("click", function(){
  audioInit(); busEffets();
  if(S.run){ stop(); H.stop(); } else { start(); H.start(); }
  this.classList.toggle("on", S.run);
});
document.getElementById("em-stop").addEventListener("click", function(){
  stop(); step=0; H.stop();
  document.getElementById("em-play").classList.remove("on");
});
document.getElementById("em-rec").addEventListener("click", function(){
  EM.rec = !EM.rec;
  this.classList.toggle("on", EM.rec);
  lcd(EM.rec?"REC":"---", EM.rec?"TAP RECORD":"PATTERN", true);
  H.inter();
});
var emTaps = [];
document.getElementById("em-tap").addEventListener("click", function(){
  var now = Date.now();
  if(emTaps.length && now - emTaps[emTaps.length-1] > 2200) emTaps = [];
  emTaps.push(now);
  if(emTaps.length > 5) emTaps.shift();
  if(emTaps.length < 2){ lcd("TAP","TEMPO",true); H.cran(); return; }
  var s=0;
  for(var i=1;i<emTaps.length;i++) s += emTaps[i]-emTaps[i-1];
  var bpm = Math.round(60000/(s/(emTaps.length-1)));
  if(bpm>=40 && bpm<=220){ S.bpm = bpm; lcd(String(bpm),"TEMPO",true); saveSoon(); }
  H.cran();
});

/* enregistrement au vol : toucher une partie pendant la lecture écrit sur le pas courant */
document.getElementById("em-drums").addEventListener("pointerdown", function(e){
  var b=e.target.closest(".btn"); if(!b) return;
  ecrireVol(+b.dataset.k);
});
document.getElementById("em-synth").addEventListener("pointerdown", function(e){
  var b=e.target.closest(".btn"); if(!b) return;
  ecrireVol(+b.dataset.k);
});
function ecrireVol(k){
  if(!ctx) audioInit();
  busEffets();
  var part = EM_PARTS[k];
  if(!part.accent){
    if(part.synth) voixSynth(maintenantAudio()+0.01, k, EM.note, 1);
    else jouerTimbre(EM.pat.tim[k], maintenantAudio()+0.01, 1, sortiePartie(k, maintenantAudio()+0.01));
  }
  if(EM.rec && S.run && EM.pos >= 0){
    var i = (EM.pos + 1) % EM.pat.len;
    EM.pat.st[k][i] = 1;
    if(part.synth) EM.pat.nt[k][i] = EM.note;
    if(k === EM.sel) majTouches();
    memEm();
  }
}

document.getElementById("em-notice").addEventListener("click", function(){
  ouvrirNotice();
});

function boucleEm(){
  if(EM.mode !== 2 || !EM.song.length) return;
  EM.spos = (EM.spos+1) % EM.song.length;
  EM.cur = EM.song[EM.spos];
  EM.pat = EM.slots[EM.cur];
  majTouches(); majBascules(); majMotionLeds(); majKnobsPartie();
  lcd(("00"+(EM.cur+1)).slice(-3), "SONG "+(EM.spos+1), true);
}
var MACHINE_EM = {schedule:scheduleEm, beat:beatEm, arret:arretEm, boucle:boucleEm,
                  longueur:function(){ return EM.pat.len||16; }};
function activerEm(){
  stop();
  S.modele = "em1";
  MACHINE = MACHINE_EM;
  poserMachine("em1");
  chargerEm();
  construireFx();
  EM.choisirPartie(EM.sel);
  majTouches(); majBascules(); majKnobsPartie(); majLcd();
  kEmVol.maj(); kEmE1.maj(); kEmE2.maj();
  actif = unitEm;
  save(); fit(); setTimeout(fit,120);
}


/* v218 : pages d'édition indépendantes du transport commun. */
function majPagesEm(){
  EM.page = Math.max(0,Math.min(Math.ceil(EM.pat.len/16)-1,EM.page||0));
  var select = document.getElementById("em-page");
  select.value = String(EM.page);
  select.disabled = EM.kb || EM.pset || EM.mode === 2 || EM.shift;
  for(var i=0;i<4;i++) select.options[i].disabled = i*16 >= EM.pat.len;
  document.getElementById("em-longueur").value = String(EM.pat.len);
  document.getElementById("em-longueur").disabled = S.run || EM.protect;
  document.getElementById("em-position").textContent = EM.pos < 0 ? "À L’ARRÊT" : "LECTURE " + (EM.pos+1) + " / " + EM.pat.len;
}
function choisirLongueurEm(v){
  if(S.run || EM.protect || !Number.isInteger(v) || v < 1 || v > 64) return false;
  EM.pat.len = v; EM.pasSel = -1;
  majTouches(); memEm(); return true;
}
function choisirPageEm(v){
  if(!Number.isInteger(v) || v < 0 || v > 3 || v*16 >= EM.pat.len || EM.kb || EM.pset || EM.mode === 2 || EM.shift) return false;
  EM.page = v; EM.pasSel = -1; majTouches(); return true;
}
document.getElementById("em-page").addEventListener("change", function(){ choisirPageEm(+this.value); });
document.getElementById("em-longueur").addEventListener("change", function(){ choisirLongueurEm(+this.value); majPagesEm(); });

// Export indépendant de la page éditée et du nombre de répétitions du menu WAV.
document.getElementById("em-export-song").addEventListener("click", function(){ exporterWav(true); });

/* v220 : édition d'une occurrence de motif dans le Song. */
function editionSongPossibleEm(){
  return EM.mode === 2 && !S.run && !EM.protect && !WAVX.occupe &&
    Number.isInteger(EM.ssel) && EM.ssel >= 0 && EM.ssel < EM.song.length;
}
function editerSongEm(action){
  if(!editionSongPossibleEm()) return false;
  var i = EM.ssel, chaine = EM.song.slice(), cible;
  if(action === "gauche" || action === "droite"){
    cible = i + (action === "gauche" ? -1 : 1);
    if(cible < 0 || cible >= chaine.length) return false;
    var motif = chaine[i]; chaine[i] = chaine[cible]; chaine[cible] = motif;
    i = cible;
  }else if(action === "dupliquer"){
    if(chaine.length >= 16){ signal("SONG PLEIN · 16 POSITIONS"); return false; }
    chaine.splice(i+1,0,chaine[i]); i++;
  }else if(action === "supprimer"){
    if(!window.confirm("Retirer la position " + (i+1) + " du Song ? Le motif lui-même reste conservé.")) return false;
    chaine.splice(i,1); i = Math.max(0,Math.min(i,chaine.length-1));
  }else return false;
  EM.song = chaine; EM.ssel = i; EM.spos = 0;
  majTouches(); memEm(); H.inter();
  lcd(String(chaine.length), "SONG · POSITIONS", true); return true;
}
function majEditionSongEm(){
  document.getElementById("em-song-edition").hidden = EM.mode !== 2;
  var possible = editionSongPossibleEm();
  document.getElementById("em-song-selection").textContent = EM.song.length ?
    "POSITION " + (EM.ssel+1) + " / " + EM.song.length : "SONG VIDE · TOUCHE 1 POUR AJOUTER";
  document.getElementById("em-song-gauche").disabled = !possible || EM.ssel === 0;
  document.getElementById("em-song-droite").disabled = !possible || EM.ssel === EM.song.length-1;
  document.getElementById("em-song-dupliquer").disabled = !possible || EM.song.length >= 16;
  document.getElementById("em-song-supprimer").disabled = !possible;
}
["gauche","droite","dupliquer","supprimer"].forEach(function(action){
  document.getElementById("em-song-"+action).addEventListener("click",function(){editerSongEm(action);});
});

function preparerSongEm(){
  if(EM.mode !== 2) return true;
  if(!EM.song.length || EM.song.some(function(k){return !Number.isInteger(k) || k<0 || k>=16 || !EM.slots[k];})){
    signal("SONG VIDE OU INVALIDE"); return false;
  }
  EM.slots[EM.cur] = EM.pat;
  EM.spos = 0; EM.cur = EM.song[0]; EM.pat = EM.slots[EM.cur];
  majTouches(); majBascules(); majMotionLeds(); majKnobsPartie(); return true;
}

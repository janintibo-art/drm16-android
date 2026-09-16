/* ===================== BIBLIOTHÈQUE DE TIMBRES ===================== */
function tKick(t,v,f1,f2,dec,clic){
  var o=ctx.createOscillator(), g=ctx.createGain();
  o.type="sine";
  o.frequency.setValueAtTime(f1,t);
  o.frequency.exponentialRampToValueAtTime(f2,t+dec*0.28);
  env(g,t,0.82*v,dec,0.004);
  o.connect(g); g.connect(outMix); o.start(t); o.stop(t+dec+0.05);
  if(clic) noise(t,0.02,"highpass",2600,0,clic*v);
}
function tSnare(t,v,f,bruit,dec,bp){
  var o=ctx.createOscillator(), g=ctx.createGain();
  o.type="triangle"; o.frequency.setValueAtTime(f,t);
  o.frequency.exponentialRampToValueAtTime(f*0.82,t+dec*0.5);
  env(g,t,0.4*v,dec*0.8,0.002);
  o.connect(g); g.connect(outMix); o.start(t); o.stop(t+dec+0.05);
  var o2=ctx.createOscillator(), g2=ctx.createGain();
  o2.type="triangle"; o2.frequency.value=f*1.7; env(g2,t,0.22*v,dec*0.6,0.002);
  o2.connect(g2); g2.connect(outMix); o2.start(t); o2.stop(t+dec);
  noise(t,dec,"bandpass",bp,0.7,bruit*v);
  noise(t,0.03,"highpass",5200,0,0.28*v);
}
function tTom(t,v,f1,f2,dec,type){
  var o=ctx.createOscillator(), g=ctx.createGain();
  o.type=type||"sine";
  o.frequency.setValueAtTime(f1,t);
  o.frequency.exponentialRampToValueAtTime(f2,t+dec*0.6);
  env(g,t,0.6*v,dec,0.003);
  o.connect(g); g.connect(outMix); o.start(t); o.stop(t+dec+0.05);
  noise(t,0.025,"lowpass",1200,0,0.14*v);
}
function tRim(t,v){
  var o=ctx.createOscillator(), g=ctx.createGain();
  o.type="square"; o.frequency.setValueAtTime(1700,t);
  o.frequency.exponentialRampToValueAtTime(520,t+0.02);
  env(g,t,0.3*v,0.045,0.001);
  o.connect(g); g.connect(outMix); o.start(t); o.stop(t+0.06);
  noise(t,0.02,"bandpass",2600,2,0.4*v);
}
function tBell(t,v,f1,f2,dec){
  var g=ctx.createGain(), bp=ctx.createBiquadFilter();
  bp.type="bandpass"; bp.frequency.value=(f1+f2); bp.Q.value=2.2;
  [f1,f2].forEach(function(f){
    var o=ctx.createOscillator(); o.type="square"; o.frequency.value=f;
    o.connect(bp); o.start(t); o.stop(t+dec+0.05);
  });
  bp.connect(g); g.connect(outMix);
  env(g,t,0.32*v,dec,0.001);
}
function tBloc(t,v,f,dec){
  var o=ctx.createOscillator(), g=ctx.createGain();
  o.type="triangle"; o.frequency.setValueAtTime(f,t);
  o.frequency.exponentialRampToValueAtTime(f*0.82,t+dec*0.5);
  env(g,t,0.45*v,dec,0.001);
  o.connect(g); g.connect(outMix); o.start(t); o.stop(t+dec+0.03);
  noise(t,0.012,"bandpass",f*2.2,1.2,0.18*v);
}
function tSecoue(t,v,dec,hp){
  var s=ctx.createBufferSource(); s.buffer=noiseBuf; s.loop=true;
  s.playbackRate.value=0.8+Math.random()*0.4;
  var f=ctx.createBiquadFilter(); f.type="highpass"; f.frequency.value=hp;
  var g=ctx.createGain();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.linearRampToValueAtTime(0.5*v,t+dec*0.35);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dec);
  s.connect(f); f.connect(g); g.connect(outMix);
  s.start(t); s.stop(t+dec+0.03);
}
function tBruit(t,v,dec,f1,f2,q){
  var s=ctx.createBufferSource(); s.buffer=noiseBuf; s.loop=true;
  var f=ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.setValueAtTime(f1,t);
  f.frequency.exponentialRampToValueAtTime(f2,t+dec); f.Q.value=q;
  var g=ctx.createGain(); env(g,t,0.6*v,dec,0.002);
  s.connect(f); f.connect(g); g.connect(outMix);
  s.start(t); s.stop(t+dec+0.03);
}
function tZap(t,v,f1,f2,dec,type){
  var o=ctx.createOscillator(), g=ctx.createGain();
  o.type=type||"sawtooth";
  o.frequency.setValueAtTime(f1,t);
  o.frequency.exponentialRampToValueAtTime(f2,t+dec);
  env(g,t,0.42*v,dec,0.002);
  o.connect(g); g.connect(outMix); o.start(t); o.stop(t+dec+0.03);
}

var TIMBRES = [
  {n:"BD 1",    f:function(t,v){ tKick(t,v,148,46,0.42,0.2); }},
  {n:"BD 2",    f:function(t,v){ tKick(t,v,110,38,0.58,0.08); }},
  {n:"BD 3",    f:function(t,v){ tKick(t,v,210,58,0.24,0.35); }},
  {n:"BD SUB",  f:function(t,v){ tKick(t,v,90,30,0.85,0); }},
  {n:"SD 1",    f:function(t,v){ tSnare(t,v,196,0.62,0.17,1750); }},
  {n:"SD 2",    f:function(t,v){ tSnare(t,v,250,0.8,0.11,2500); }},
  {n:"SD FAT",  f:function(t,v){ tSnare(t,v,168,0.45,0.3,1150); }},
  {n:"RIM",     f:function(t,v){ tRim(t,v); }},
  {n:"CLAP",    f:function(t,v){ V.cp(t,v); }},
  {n:"TOM LO",  f:function(t,v){ tTom(t,v,150,74,0.38); }},
  {n:"TOM MID", f:function(t,v){ tTom(t,v,210,104,0.32); }},
  {n:"TOM HI",  f:function(t,v){ tTom(t,v,300,150,0.26); }},
  {n:"CONGA",   f:function(t,v){ tTom(t,v,270,215,0.3,"triangle"); }},
  {n:"CH 1",    f:function(t,v){ metal(t,0.055,7800,0.52*v,41); }},
  {n:"CH 2",    f:function(t,v){ metal(t,0.032,9200,0.5*v,53); }},
  {n:"OH 1",    f:function(t,v){ metal(t,0.34,7200,0.42*v,41); }},
  {n:"OH 2",    f:function(t,v){ metal(t,0.62,6000,0.38*v,37); }},
  {n:"CRASH",   f:function(t,v){ metal(t,0.95,5200,0.4*v,36); }},
  {n:"RIDE",    f:function(t,v){ metal(t,1.45,4700,0.3*v,34); }},
  {n:"COWBELL", f:function(t,v){ tBell(t,v,540,800,0.26); }},
  {n:"CLAVE",   f:function(t,v){ tBloc(t,v,2400,0.05); }},
  {n:"WOOD",    f:function(t,v){ tBloc(t,v,1080,0.075); }},
  {n:"SHAKER",  f:function(t,v){ tSecoue(t,v,0.07,6500); }},
  {n:"TAMB",    f:function(t,v){ tSecoue(t,v,0.14,4500); metal(t,0.1,8000,0.14*v,61); }},
  {n:"ZAP",     f:function(t,v){ tZap(t,v,1400,70,0.22,"sawtooth"); }},
  {n:"LASER",   f:function(t,v){ tZap(t,v,180,3000,0.18,"square"); }},
  {n:"NOISE",   f:function(t,v){ tBruit(t,v,0.3,6000,300,1.2); }},
  {n:"BLIP",    f:function(t,v){ tZap(t,v,1800,1800,0.07,"sine"); }},
  {n:"SPACE",   f:function(t,v){ V.sp(t,v); }}
];
function jouerTimbre(idx,t,vel,dest){
  var om=outMix, ob=outBd;
  outMix = outBd = pasVoie(dest);
  (TIMBRES[idx] || TIMBRES[0]).f(t,vel);
  outMix = om; outBd = ob;
}

/* ---- sons préréglés de l'ER-1 ---- */
var ER_SONS = [
  {n:"KICK 1",  s:{pitch:0.04,modD:0.6,modS:0.1,wave:0,modT:4,dec:0.4,boost:0.5}},
  {n:"KICK 2",  s:{pitch:0.02,modD:0.75,modS:0.05,wave:0,modT:4,dec:0.6,boost:0.7}},
  {n:"SNARE",   s:{pitch:0.3,modD:0.35,modS:0.55,wave:1,modT:5,dec:0.25,boost:0.1}},
  {n:"RIM",     s:{pitch:0.5,modD:0.8,modS:0.95,wave:1,modT:5,dec:0.06,boost:0}},
  {n:"TOM LO",  s:{pitch:0.18,modD:0.35,modS:0.2,wave:0,modT:4,dec:0.35,boost:0.3}},
  {n:"TOM HI",  s:{pitch:0.34,modD:0.35,modS:0.25,wave:0,modT:4,dec:0.28,boost:0.15}},
  {n:"CONGA",   s:{pitch:0.4,modD:0.12,modS:0.2,wave:1,modT:4,dec:0.3,boost:0.1}},
  {n:"BLIP",    s:{pitch:0.72,modD:0,modS:0.3,wave:0,modT:0,dec:0.08,boost:0}},
  {n:"METAL",   s:{pitch:0.62,modD:0.6,modS:0.9,wave:1,modT:1,dec:0.2,boost:0}},
  {n:"BELL",    s:{pitch:0.66,modD:0.3,modS:0.8,wave:0,modT:0,dec:0.55,boost:0}},
  {n:"ZAP",     s:{pitch:0.75,modD:0.85,modS:0.35,wave:0,modT:4,dec:0.18,boost:0}},
  {n:"LASER",   s:{pitch:0.2,modD:0.8,modS:0.4,wave:1,modT:3,dec:0.22,boost:0}},
  {n:"WOBBLE",  s:{pitch:0.28,modD:0.45,modS:0.12,wave:0,modT:0,dec:0.5,boost:0.2}},
  {n:"CLICK",   s:{pitch:0.55,modD:0.9,modS:0.6,wave:1,modT:5,dec:0.04,boost:0}},
  {n:"SUB",     s:{pitch:0.01,modD:0,modS:0.2,wave:0,modT:0,dec:0.8,boost:0.9}},
  {n:"NOISY",   s:{pitch:0.45,modD:0.95,modS:0.85,wave:1,modT:5,dec:0.3,boost:0.1}}
];
/* ---- sons préréglés de l'EA-1 ---- */
var EA_SONS = [
  {n:"BASS 1",  s:{w1:0,w2:0,bal:0.35,ofs:0,porta:0,mod:0,cut:0.42,res:0.3,egi:0.5,dec:0.3,dist:false}},
  {n:"BASS 2",  s:{w1:1,w2:0,bal:0.5,ofs:-1,porta:0,mod:0,cut:0.36,res:0.2,egi:0.4,dec:0.45,dist:false}},
  {n:"ACID",    s:{w1:0,w2:0,bal:0,ofs:0,porta:0.25,mod:0,cut:0.3,res:0.85,egi:0.8,dec:0.22,dist:true}},
  {n:"SUB",     s:{w1:2,w2:2,bal:0.5,ofs:-1,porta:0,mod:0,cut:0.25,res:0.1,egi:0.2,dec:0.6,dist:false}},
  {n:"LEAD 1",  s:{w1:0,w2:0,bal:0.45,ofs:0.08,porta:0.1,mod:0,cut:0.7,res:0.35,egi:0.4,dec:0.5,dist:false}},
  {n:"LEAD 2",  s:{w1:1,w2:0,bal:0.5,ofs:0.58,porta:0,mod:0,cut:0.62,res:0.45,egi:0.5,dec:0.4,dist:true}},
  {n:"SYNC",    s:{w1:0,w2:0,bal:0.7,ofs:0.35,porta:0,mod:2,cut:0.72,res:0.3,egi:0.55,dec:0.35,dist:false}},
  {n:"RING",    s:{w1:2,w2:0,bal:0.6,ofs:0.42,porta:0,mod:1,cut:0.8,res:0.2,egi:0.3,dec:0.4,dist:false}},
  {n:"DECI",    s:{w1:0,w2:1,bal:0.5,ofs:0,porta:0,mod:3,cut:0.75,res:0.25,egi:0.35,dec:0.3,dist:false}},
  {n:"PLUCK",   s:{w1:1,w2:2,bal:0.4,ofs:1,porta:0,mod:0,cut:0.55,res:0.55,egi:0.75,dec:0.12,dist:false}},
  {n:"PAD",     s:{w1:0,w2:0,bal:0.5,ofs:0.02,porta:0.5,mod:0,cut:0.5,res:0.15,egi:0.2,dec:0.9,dist:false}},
  {n:"BLEEP",   s:{w1:1,w2:1,bal:0.5,ofs:1,porta:0,mod:0,cut:0.9,res:0.1,egi:0.1,dec:0.1,dist:false}},
  {n:"GROWL",   s:{w1:0,w2:1,bal:0.55,ofs:-0.08,porta:0.15,mod:0,cut:0.32,res:0.7,egi:0.65,dec:0.5,dist:true}},
  {n:"HOOVER",  s:{w1:0,w2:0,bal:0.5,ofs:0.12,porta:0.35,mod:0,cut:0.45,res:0.6,egi:0.6,dec:0.7,dist:true}}
];
function appliquerSonEa(k, idx){
  var s = EA_SONS[idx].s, d = EA.pat.son[k];
  for(var c in s) d[c] = s[c];
}
function appliquerSonEr(k, idx){
  var s = ER_SONS[idx].s, d = ER.pat.son[k];
  for(var c in s) d[c] = s[c];
}


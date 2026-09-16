/* ================= moteur audio ================= */
/* ---------- quand le moteur audio meurt en silence ----------
   Android peut suspendre ou casser un AudioContext sans prévenir : un appel
   entrant, une autre application qui prend la main, l'écran éteint trop
   longtemps. Il arrive alors que le contexte se dise "running" alors que son
   horloge ne bouge plus : plus un son, et changer de machine n'y fait rien
   puisque le problème est en dessous. Seul un redémarrage rendait le son.

   On surveille donc l'horloge du contexte. Si elle est arrêtée alors que le
   séquenceur tourne, on refait tout le moteur et on recharge la machine. */
var VEILLE = {t:-1, fige:0};
/* Le relevé ne peut se lire que depuis le menu, et ouvrir le menu arrête le
   séquenceur : « à venir » y valait donc toujours zéro, et le nombre de sources
   n'était qu'un reliquat. On retient donc les MAXIMA vus pendant que ça joue,
   qui eux survivent à l'arrêt.

   `pause` mesure directement ce qui fabrique les grésillements : le plus long
   trou entre deux tours de l'ordonnanceur. Le fil principal bloqué, c'est le
   moteur audio qui s'assèche. */
var AUDIT = {decroche:0, quand:0, relances:0,
             pic:0, picAvenir:0, pause:0, trous:0, tours:0, tDernier:0, tJeu:0};
function reveillerAudio(){
  if(!ctx || ctx.startRendering) return;
  if(ctx.state !== "running"){ try{ ctx.resume(); }catch(e){} }
}
function surveillerAudio(){
  if(!ctx || ctx.startRendering || !S.run){ VEILLE.t = -1; VEILLE.fige = 0; return; }
  if(ctx.state !== "running"){ reveillerAudio(); VEILLE.fige = 0; VEILLE.t = -1; return; }
  var t = maintenantAudio();
  if(t === VEILLE.t){
    /* quatre tours sans que l'horloge avance : le contexte est mort */
    if(++VEILLE.fige >= 4){ VEILLE.fige = 0; VEILLE.t = -1; refaireAudio(); }
  } else { VEILLE.fige = 0; VEILLE.t = t; }
}
function refaireAudio(){
  var reprendre = S.run, m = S.modele;
  stop();
  try{ if(ctx && ctx.close) ctx.close(); }catch(e){}
  ctx = null; master = null; metalBuf = null;
  SOURCES = []; COLLECTE = null; queue = [];
  /* Ces deux machines gardent des nœuds que razNoeudsMachines ne touche pas :
     TD3.noeuds doit redevenir null et non {}, sinon batirTd3 croit son moteur
     déjà construit et ne refait rien. */
  try{ TD3.noeuds = null; }catch(e){}
  try{ EUR.bus = null; EUR.sources = null; EUR.noeuds = []; }catch(e){}
  audioInit();
  if(!ctx){ signal("AUDIO INDISPONIBLE"); return; }
  try{ allerMachine(m); }catch(e){}
  AUDIT.relances++;
  signal("MOTEUR AUDIO RELANCÉ");
  if(reprendre) start();
}

function audioInit(){
  /* un contexte de rendu n'a pas à être repris : il se déclenche tout seul */
  if(ctx) { if(ctx.state === "suspended" && !ctx.startRendering) ctx.resume(); return; }
  var AC = window.AudioContext || window.webkitAudioContext;
  try { ctx = new AC({latencyHint:latenceChoisie()}); } catch(e){ ctx = new AC(); }
  batirAudio();
}
/* Construit tous les nœuds communs dans le contexte courant. Appelée aussi par
   l'export, qui bascule sur un contexte de rendu : sans cela, le délai et les
   sorties resteraient dans l'ancien contexte et rien ne pourrait s'y brancher. */
var COMPENSATION_SORTIE_DB = 2.5;
function batirAudio(){
  razNoeudsMachines();
  master = ctx.createGain();
  master.gain.value = S.vol;
  /* limiteur de crêtes : il ne travaille qu'en haut, il ne colore pas le reste */
  var lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -1.2; lim.knee.value = 1.5; lim.ratio.value = 20;
  lim.attack.value = 0.001; lim.release.value = 0.09;
  /* écrêteur doux : parfaitement droit jusqu'à 0,84, il n'arrondit que le sommet */
  var sat = ctx.createWaveShaper();
  var n=2048, c=new Float32Array(n), seuil=0.84;
  for(var i=0;i<n;i++){
    var x=i*2/n-1, a=Math.abs(x);
    c[i] = (a<=seuil) ? x
         : Math.sign(x)*(seuil + (1-seuil)*Math.tanh((a-seuil)/(1-seuil)));
  }
  /* La courbe est parfaitement droite jusqu'à 0,84 : le suréchantillonnage ne
     sert qu'aux crêtes. Le passer de quatre à deux divise par deux le travail
     fait sur chaque échantillon du mélange, pour une différence inaudible.
     Le relevé montrait peu de décrochages mais des grésillements : le goulot
     est dans le fil audio, pas dans l'ordonnanceur. */
  sat.curve=c; sat.oversample="2x";
  var hp = ctx.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=26;
  /* Compensation de sortie (v149) : les voies ont été calibrées vers −8 dBFS,
     soit en moyenne 2,5 dB de moins qu'avant ; ce gain rend le volume perçu
     d'avant, et le limiteur ne sert plus que de filet de sécurité. */
  var comp = ctx.createGain(); comp.gain.value = Math.pow(10, COMPENSATION_SORTIE_DB / 20);
  master.connect(comp); comp.connect(lim); lim.connect(sat); sat.connect(hp); hp.connect(ctx.destination);
  outBd = ctx.createGain(); outMix = ctx.createGain();
  if(ctx.createStereoPanner){
    panBd = ctx.createStereoPanner(); panMix = ctx.createStereoPanner();
    outBd.connect(panBd); panBd.connect(busSet("ehx") || master);
    outMix.connect(panMix); panMix.connect(busSet("ehx") || master);
  } else {
    outBd.connect(busSet("ehx") || master); outMix.connect(busSet("ehx") || master);
  }
  applyBass();
  pisterSources();
  construireMetal();
  var len = Math.floor(ctx.sampleRate*2);
  noiseBuf = ctx.createBuffer(1,len,ctx.sampleRate);
  var d = noiseBuf.getChannelData(0);
  for(var j=0;j<len;j++) d[j]=Math.random()*2-1;
}
/* Les machines gardent leurs nœuds en cache et refusent de les rebâtir tant
   qu'ils existent. Quand on change de contexte audio — c'est le cas de l'export
   hors ligne — ces nœuds appartiennent à l'ancien et rien ne peut s'y brancher.
   On oublie donc tout avant de reconstruire. */
function razNoeudsMachines(){
  fxIn = null; fxOut = null; dlyIn = null; dlyNode = null; dlyFb = null; fxChaine = [];
  outBd = null; outMix = null; panBd = null; panMix = null;
  ["EM","ER","EA","ES","MX","SX","MPC","DMX","TR","VLC","CR5","DBI","T1K","ARCM"]
    .forEach(function(nom){
      var o;
      try{ o = window[nom]; }catch(e){ return; }
      if(!o || typeof o !== "object") return;
      /* tout champ qui contient un nœud audio est oublié, quel que soit son nom */
      ["noeuds","entrees","sorties","regFx","voix","dernier"].forEach(function(c){
        if(!(c in o)) return;
        o[c] = (Object.prototype.toString.call(o[c]) === "[object Array]") ? [] : {};
      });
      ["ohGain","reverb","distNode","tubeIn","tubeNode","tubeSortie"].forEach(function(c){
        if(c in o) o[c] = null;
      });
    });
}

/* toute source créée retient son heure de départ : Stop peut annuler celles à venir */
var SOURCES = [];
/* Quand ce panier n'est pas nul, toute source démarrée y tombe aussi. Il sert
   à l'Eurorack, seule machine dont les sources tournent en permanence et dont
   on ne peut pas retrouver la liste autrement : ses modules créent leurs
   oscillateurs dans leur propre fonction de construction, sans les exposer. */
var COLLECTE = null;
function pisterSources(){
  if(ctx.__piste) return;
  ctx.__piste = true;
  ["createOscillator","createBufferSource","createConstantSource"].forEach(function(nom){
    if(!ctx[nom]) return;
    var brut = ctx[nom].bind(ctx);
    ctx[nom] = function(){
      var n = brut();
      var depart = n.start.bind(n);
      n.start = function(t){
        SOURCES.push({n:n, t:(t === undefined ? maintenantAudio() : t)});
        if(COLLECTE) COLLECTE.push(n);
        return depart.apply(n, arguments);
      };
      return n;
    };
  });
}
function couperSourcesFutures(){
  if(!ctx) return;
  var now = maintenantAudio(), reste = [];
  for(var i=0;i<SOURCES.length;i++){
    var s = SOURCES[i];
    if(s.t > now + 0.002){ try{ s.n.stop(now); }catch(e){} }
    else if(s.t > now - 1.5) reste.push(s);
  }
  SOURCES = reste;
}
function purgerSources(){
  if(!ctx) return;
  /* Chaque entrée retient un nœud audio, donc empêche de le récupérer. On en
     gardait quatre secondes et seulement au-delà de quatre cents : un relevé
     sur l'appareil en a montré mille cent quatre-vingts vivantes à la fois.
     Le ramasse-miettes finit par passer, et son passage s'entend.

     Une seconde et demie suffit largement : l'anticipation de l'ordonnanceur
     est de 0,22 s en avant-plan, 1,2 s en arrière-plan. Tout ce qui est plus
     vieux ne sert plus à couper quoi que ce soit. */
  var now = maintenantAudio(), reste = [];
  for(var i=0;i<SOURCES.length;i++) if(SOURCES[i].t > now - 1.5) reste.push(SOURCES[i]);
  SOURCES = reste;
}

function env(g,t,peak,dec,atk){
  atk = atk||0.002;
  g.gain.setValueAtTime(0.0001,t);
  g.gain.linearRampToValueAtTime(peak,t+atk);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dec);
}
function noise(t,dur,type,freq,q,peak,out){
  var s=ctx.createBufferSource(); s.buffer=noiseBuf;
  s.loop=true; s.playbackRate.value=0.8+Math.random()*0.4;
  var f=ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq; if(q) f.Q.value=q;
  var g=ctx.createGain(); env(g,t,peak,dur);
  s.connect(f); f.connect(g); g.connect(out||outMix);
  s.start(t); s.stop(t+dur+0.02);
  return g;
}
function metal(t,dur,hpf,peak,base){
  var ratios=[2,3,4.16,5.43,6.79,8.21], g=ctx.createGain();
  var bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=hpf*1.25; bp.Q.value=0.6;
  var hp=ctx.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=hpf;
  for(var i=0;i<ratios.length;i++){
    var o=ctx.createOscillator(); o.type="square"; o.frequency.value=base*ratios[i];
    o.connect(bp); o.start(t); o.stop(t+dur+0.02);
  }
  bp.connect(hp); hp.connect(g); g.connect(outMix);
  env(g,t,peak,dur,0.001);
  noise(t,dur*0.55,"highpass",hpf*1.4,0,peak*0.35,outMix);
  return g;
}
var V = {
  bd:function(t,v){
    var o=ctx.createOscillator(), g=ctx.createGain();
    o.type="sine";
    o.frequency.setValueAtTime(148,t);
    o.frequency.exponentialRampToValueAtTime(46,t+0.11);
    env(g,t,0.82*v,0.42,0.004);
    o.connect(g); g.connect(outBd); o.start(t); o.stop(t+0.45);
    noise(t,0.022,"highpass",2600,0,0.20*v,outBd);
  },
  sd:function(t,v){
    var o=ctx.createOscillator(), g=ctx.createGain();
    o.type="triangle"; o.frequency.setValueAtTime(196,t);
    o.frequency.exponentialRampToValueAtTime(160,t+0.09);
    env(g,t,0.42*v,0.13,0.002);
    o.connect(g); g.connect(outMix); o.start(t); o.stop(t+0.16);
    var o2=ctx.createOscillator(), g2=ctx.createGain();
    o2.type="triangle"; o2.frequency.value=331; env(g2,t,0.26*v,0.1,0.002);
    o2.connect(g2); g2.connect(outMix); o2.start(t); o2.stop(t+0.13);
    noise(t,0.17*(0.6+0.4*v),"bandpass",1750,0.7,0.62*v);
    noise(t,0.03,"highpass",5200,0,0.30*v);
  },
  cp:function(t,v){
    var offs=[0,0.009,0.019,0.028];
    for(var i=0;i<offs.length;i++) noise(t+offs[i],0.032,"bandpass",1180,1.6,2.1*v);
    noise(t+0.03,0.16,"bandpass",980,1.1,0.95*v);
  },
  hh:function(t,v){ metal(t,0.055,7800,0.52*v,41); },
  oh:function(t,v){ metal(t,0.34,7200,0.42*v,41); },
  rd:function(t,v){ metal(t,1.45,4700,0.30*v,34); },
  cy:function(t,v){ metal(t,0.26,6000,0.46*v,37); },
  wb:function(t,v){
    var o=ctx.createOscillator(), g=ctx.createGain();
    o.type="triangle"; o.frequency.setValueAtTime(1080,t);
    o.frequency.exponentialRampToValueAtTime(880,t+0.04);
    env(g,t,0.44*v,0.075,0.001);
    o.connect(g); g.connect(outMix); o.start(t); o.stop(t+0.09);
    var o2=ctx.createOscillator(), g2=ctx.createGain();
    o2.type="sine"; o2.frequency.value=1680; env(g2,t,0.2*v,0.035,0.001);
    o2.connect(g2); g2.connect(outMix); o2.start(t); o2.stop(t+0.05);
    noise(t,0.012,"bandpass",2400,1.2,0.18*v);
  },
  sp:function(t,v){
    var o=ctx.createOscillator(), g=ctx.createGain();
    var f=ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=2400; f.Q.value=6;
    o.type="sine";
    o.frequency.setValueAtTime(920,t);
    o.frequency.exponentialRampToValueAtTime(62,t+0.55);
    env(g,t,0.46*v,0.7,0.003);
    o.connect(f); f.connect(g); g.connect(outMix); o.start(t); o.stop(t+0.75);
    var o2=ctx.createOscillator(), g2=ctx.createGain();
    o2.type="sine"; o2.frequency.setValueAtTime(1380,t);
    o2.frequency.exponentialRampToValueAtTime(93,t+0.5);
    env(g2,t,0.16*v,0.45,0.003);
    o2.connect(g2); g2.connect(outMix); o2.start(t); o2.stop(t+0.55);
  }
};



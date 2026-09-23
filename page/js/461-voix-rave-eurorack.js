/* ================= VOIX RAVE — v282 =================
   Trois outils spécialisés, sans remplacer RAM, TEK KICK ou les voix anciennes.
   Pas de fichier externe : le break est synthétisé ici, il ne contient ni Amen
   ni enregistrement commercial. Les sources transitoires sont fermées à STOP,
   au recâblage, à la suppression et au changement de rack par io.detruire. */
var EUR_RAVE = (function(){
  "use strict";
  function borne(v,a,b,d){return Number.isFinite(v)?Math.max(a,Math.min(b,v)):d;}
  function entier(v,a,b,d){return Math.round(borne(v,a,b,d));}
  function normaliser(m,kns){if(!m.p)m.p={};kns.forEach(function(k){m.p[k[0]]=borne(m.p[k[0]],k[2],k[3],k[4]);});}
  /* Un panier par instance. Le rendu hors ligne ne conserve pas un historique
     de toutes les notes. En direct on conserve aussi les voix du look-ahead. */
  function panier(){
    var voix=[],ferme=false;
    function nettoyer(t){var avant=typeof ctx.startRendering==="function"?t-.5:ctx.currentTime-.01;voix=voix.filter(function(v){return v.fin>avant;});}
    function couper(v,t){
      if(v.fin<=t)return;
      if(v.debut>=t){try{v.src.stop(t);}catch(e){}v.fin=t;return;}
      var p=v.g.gain;
      if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);
      else{p.cancelScheduledValues(t);p.setValueAtTime(0,t);}
      p.linearRampToValueAtTime(0,t+.003);
      try{v.src.stop(t+.004);}catch(e){}v.fin=Math.min(v.fin,t+.004);
    }
    return {
      actif:function(){return !ferme;},
      ajouter:function(src,g,debut,fin,noeuds){
        if(ferme){try{src.stop();}catch(e){}return;}
        nettoyer(debut);var v={src:src,g:g,debut:debut,fin:fin};voix.push(v);
        src.onended=function(){noeuds.forEach(function(n){try{n.disconnect();}catch(e){}});voix=voix.filter(function(x){return x!==v;});};
      },
      couper:function(t){voix.forEach(function(v){couper(v,t);});},
      detruire:function(){ferme=true;voix.forEach(function(v){try{v.src.stop();}catch(e){}});voix=[];},
      nombre:function(){return voix.length;}
    };
  }
  function enveloppe(p){
    var h=[];
    function valeur(t){
      var r=null;for(var i=h.length-1;i>=0;i--)if(h[i].t<=t){r=h[i];break;}
      if(!r)return .00001;
      if(t<r.a)return r.de+(r.pic-r.de)*(t-r.t)/(r.a-r.t);
      if(t>=r.fin)return .00001;
      if(r.stop)return .00001;
      if(t<r.coude)return r.pic*Math.pow(r.milieu/r.pic,(t-r.a)/(r.coude-r.a));
      return r.milieu*Math.pow(.00001/r.milieu,(t-r.coude)/(r.fin-r.coude));
    }
    function tenir(t){
      var v=valeur(t);
      if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else p.cancelScheduledValues(t);
      p.setValueAtTime(Math.max(.00001,v),t);h=h.filter(function(r){return r.t<t;});return v;
    }
    return {jouer:function(t,attaque,chute,pic){
      var v=tenir(t),coude=t+attaque+chute*.75,milieu=Math.max(.00001,pic*.15);
      /* Garder un corps audible, même pour 50 ms : une seule exponentielle
         vers -100 dB ferait surtout un clic et presque aucune basse. */
      p.linearRampToValueAtTime(pic,t+attaque);p.exponentialRampToValueAtTime(milieu,coude);
      p.exponentialRampToValueAtTime(.00001,t+attaque+chute);
      h.push({t:t,a:t+attaque,coude:coude,milieu:milieu,fin:t+attaque+chute,de:v,pic:pic});
      var avant=typeof ctx.startRendering==="function"?t:ctx.currentTime;
      while(h.length>1&&h[1].t<=avant)h.shift();
    },arreter:function(t){var v=tenir(t);p.linearRampToValueAtTime(.00001,t+.003);h.push({t:t,a:t+.003,fin:t+.004,de:v,pic:.00001,stop:true});},valeur:valeur};
  }
  var kickKns=[["tune","FOND Hz",32,90,49],["dec","QUEUE ms",40,600,180],["punch","ATTAQUE",0,1,.55],
    ["drive","DISTORSION",0,1,.65],["type","GABBER → UP",0,1,0],["tone","BRILLANCE",0,1,.45],["niv","NIVEAU",0,1,.65]];
  function creerKick(m){
    normaliser(m,kickKns);var out=eurGain(1),hp=ctx.createBiquadFilter();hp.type="highpass";hp.frequency.value=25;hp.Q.value=.7;hp.connect(out);
    var pool=panier(),dernier=null,barriere=0;
    m.raveVoix=pool;
    m.recevoir=function(t,e){
      if(!pool.actif()||!Number.isFinite(t)||t<barriere)return null;
      if(e==="rst"){pool.couper(t);barriere=t;dernier=null;return null;}
      if(e!=="trig"||t<0||(dernier!==null&&t<=dernier+.0000001))return null;dernier=t;
      var p=m.p,f=borne(p.tune,32,90,49),d=borne(p.dec,40,600,180)/1000,up=borne(p.type,0,1,0),a=borne(p.punch,0,1,.55);
      if(p.niv<=0)return null;
      /* Chopper la queue au prochain coup garde un kick propre dans un roulement. */
      pool.couper(t);
      var o=ctx.createOscillator(),pre=eurGain(1),sh=ctx.createWaveShaper(),lp=ctx.createBiquadFilter(),g=eurGain(0);
      o.type="sine";o.frequency.setValueAtTime(f*(3+14*a+up*6),t);o.frequency.exponentialRampToValueAtTime(f,t+.009+.035*(1-up));
      pre.gain.setValueAtTime(1.5+a*9,t);pre.gain.linearRampToValueAtTime(1+borne(p.drive,0,1,.65)*(12+up*22),t+.017);
      sh.curve=eurCourbe(function(x){return (1-up*.35)*Math.tanh(x*2.2)+up*.35*Math.sin(x*3.8);});sh.oversample="4x";
      lp.type="lowpass";lp.frequency.value=900*Math.pow(14,borne(p.tone,0,1,.45));lp.Q.value=.6;
      var niveau=borne(p.niv,0,1,.65)*.75;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(niveau,t+.0015);
      g.gain.setValueAtTime(niveau*.85,t+Math.min(.024,d*.25));g.gain.exponentialRampToValueAtTime(.00001,t+d);
      g.gain.setValueAtTime(0,t+d+.002);
      o.connect(pre);pre.connect(sh);sh.connect(lp);lp.connect(g);g.connect(hp);o.start(t);o.stop(t+d+.004);
      pool.ajouter(o,g,t,t+d+.004,[o,pre,sh,lp,g]);return null;
    };
    m.arreter=function(){var t=maintenantAudio();pool.couper(t);barriere=t;dernier=null;};
    return {e:{trig:eurGain(1),rst:eurGain(1)},s:{out:out},detruire:pool.detruire};
  }
  var bassKns=[["mode","PSY → REESE",0,1,0],["oct","OCTAVE",-1,1,0],["dec","CHUTE ms",20,750,85],
    ["cut","FILTRE",0,1,.24],["env","ENV FILTRE",0,1,.65],["det","DÉSACCORD",0,1,.35],
    ["sub","SUB",0,1,.35],["drive","DISTORSION",0,1,.2],["niv","NIVEAU",0,1,.6]];
  function creerBasse(m){
    normaliser(m,bassKns);
    var out=eurGain(1),voct=eurGain(1200),mix=eurGain(1),amp=eurGain(.00001),fil=ctx.createBiquadFilter(),fenv=eurConst(.00001);
    fil.type="lowpass";fil.Q.value=.65;fenv.connect(fil.frequency);
    var o1=ctx.createOscillator(),o2=ctx.createOscillator(),sub=ctx.createOscillator();o1.type=o2.type="sawtooth";sub.type="sine";
    var a1=eurGain(.2),a2=eurGain(.2),as=eurGain(.25),sh=ctx.createWaveShaper(),pre=eurGain(1),hp=ctx.createBiquadFilter();
    sh.curve=eurCourbe(function(x){return Math.tanh(x*2);});sh.oversample="2x";hp.type="highpass";hp.frequency.value=24;hp.Q.value=.7;
    o1.connect(a1);o2.connect(a2);a1.connect(mix);a2.connect(mix);mix.connect(pre);pre.connect(sh);sh.connect(fil);fil.connect(hp);
    /* Le coupe-DC précède le VCA : il ne peut pas résonner après STOP. */
    sub.connect(as);as.connect(hp);hp.connect(amp);amp.connect(out);
    [o1,o2,sub].forEach(function(o){voct.connect(o.detune);o.start();});
    var ea=enveloppe(amp.gain),ef=enveloppe(fenv.offset),dernier=null,barriere=0,ferme=false;
    m.maj=function(){var p=m.p,mode=borne(p.mode,0,1,0),det=borne(p.det,0,1,.35)*mode*22,base=55*Math.pow(2,entier(p.oct,-1,1,0));
      o1.frequency.value=base;o2.frequency.value=base;sub.frequency.value=base/2;o1.detune.value=-det;o2.detune.value=det;
      a1.gain.value=.30;a2.gain.value=.30*mode;as.gain.value=.45*borne(p.sub,0,1,.35);
      pre.gain.value=1+borne(p.drive,0,1,.2)*5;fil.frequency.value=65*Math.pow(45,borne(p.cut,0,1,.24));
    };m.maj();
    m.recevoir=function(t,e){
      if(ferme||!Number.isFinite(t)||t<barriere||t<0)return null;
      if(e==="rst"){ea.arreter(t);ef.arreter(t);dernier=null;barriere=t;return null;}
      if(e!=="trig"||(dernier!==null&&t<=dernier+.0000001))return null;dernier=t;
      var d=borne(m.p.dec,20,750,85)/1000;
      ea.jouer(t,.0015,d,Math.max(.00001,borne(m.p.niv,0,1,.6)*.72));ef.jouer(t,.001,Math.max(.012,d*.65),1+borne(m.p.env,0,1,.65)*4200);return null;
    };
    m.arreter=function(){var t=maintenantAudio();ea.arreter(t);ef.arreter(t);barriere=t;dernier=null;};
    return {e:{trig:eurGain(1),rst:eurGain(1),voct:voct},s:{out:out},detruire:function(){ferme=true;[o1,o2,sub,fenv].forEach(function(o){try{o.stop();}catch(e){}});}};
  }
  EUR_CAT.corekick={nom:"CORE KICK",hp:100,sombre:true,fam:"perc",res:"Kick hardcore : attaque séparée, queue distordue, gabber vers uptempo",kns:kickKns,
    jacks:[["trig","TRIG",0],["rst","RST",0],["out","OUT",1]],creer:creerKick};
  EUR_CAT.bassrave={nom:"BASS RAVE",hp:112,sombre:true,fam:"osc",res:"Voix de basse : psy courte ou deux dents de scie désaccordées, sub propre et enveloppe",kns:bassKns,
    jacks:[["trig","TRIG",0],["rst","RST",0],["voct","V/OCT",0],["out","OUT",1]],creer:creerBasse};
  EUR_ORDRE.push("corekick","bassrave");
  return {borne:borne,entier:entier,normaliser:normaliser,panier:panier};
})();

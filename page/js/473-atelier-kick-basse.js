/* ================= ATELIER KICK / BASSE — v286 =================
   Deux modules nouveaux : aucun remplacement de CORE KICK ou BASS RAVE.
   KICK LAB : oscillateur neuf par frappe, enveloppe de hauteur en deux segments,
   attaque bruitée distincte et sortie HIT. V/OCT est un vrai signal connecté au
   detune ; 0 V laisse FOND inchangé (55 Hz pour suivre les notes de MÉLO 32).
   DUCK TRIG : baisse de gain déclenchée par une porte, PAS un compresseur qui
   mesure le kick. Une enveloppe identique traite les deux canaux, sans sommation.
   Les paramètres persistants sont seulement numériques dans m.p. */
var EUR_KICKBASS=(function(){
  "use strict";
  var B=EUR_RAVE.borne;
  var kickKns=[["tune","FOND Hz",30,100,55],["dec","QUEUE ms",40,900,130],
    ["sweep","DÉPART demi-tons",0,48,24],["knee","COUDE demi-tons",-12,12,0],
    ["fall","DESCENTE ms",2,90,18],["settle","RETOUR FOND ms",2,300,45],
    ["drive","DISTORSION CORPS",0,1,.15],["tone","BRILLANCE CORPS",0,1,.40],
    ["click","ATTAQUE BRUITÉE",0,1,.20],["clickdec","DURÉE ATTAQUE ms",1,25,6],
    ["niv","NIVEAU",0,1,.65]];
  var duckKns=[["depth","RÉDUCTION dB",0,48,18],["attack","DESCENTE ms",1,20,3],
    ["hold","MAINTIEN ms",0,160,15],["release","RETOUR ms",10,800,110],
    ["shape","FORME RETOUR",.25,4,1.5]];
  function parametres(type){return type==="kicklab"?kickKns:type==="ducktrig"?duckKns:[];}
  function valeurs(type,raw){var p={};parametres(type).forEach(function(k){p[k[0]]=B(raw&&raw[k[0]],k[2],k[3],k[4]);});return p;}
  function normaliser(m){var p=valeurs(m.type,m.p);if(!m.p)m.p={};Object.keys(p).forEach(function(k){m.p[k]=p[k];});}
  function notifier(m){if(typeof EUR_KICKBASS_UI!=="undefined")EUR_KICKBASS_UI.rafraichir(m);}
  function profilKick(raw){
    var p=valeurs("kicklab",raw),d=p.dec/1000,a=Math.min(p.fall/1000,d*.45),b=Math.min(a+p.settle/1000,d*.85);
    return {duree:d,points:[[0,p.tune*Math.pow(2,p.sweep/12)],[a,p.tune*Math.pow(2,p.knee/12)],[b,p.tune],[d,p.tune]]};
  }
  /* Le graphe et le DSP emploient exactement les mêmes sommets de la courbe.
     Segments linéaires : annuler un roulement en plein retour reste possible
     même sans cancelAndHoldAtTime, sans faire sauter le gain avant son instant. */
  function profilDuck(raw,depart){
    var p=valeurs("ducktrig",raw),a=p.attack/1000,h=p.hold/1000,r=p.release/1000,g=Math.pow(10,-p.depth/20);
    var pts=[[0,B(depart,0,1,1)],[a,g]];
    if(h>0)pts.push([a+h,g]);
    for(var i=1;i<=32;i++)pts.push([a+h+r*i/32,g+(1-g)*Math.pow(i/32,p.shape)]);
    return {duree:a+h+r,points:pts};
  }
  function lirePoints(pts,t){
    if(t<=pts[0][0])return pts[0][1];
    for(var i=1;i<pts.length;i++)if(t<=pts[i][0]){
      var a=pts[i-1],b=pts[i];return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0]);
    }
    return pts[pts.length-1][1];
  }
  var bruits=new Map();
  function clic(){
    var sr=ctx.sampleRate;if(bruits.has(sr))return bruits.get(sr);
    var n=Math.ceil(sr*.025),b=ctx.createBuffer(1,n,sr),d=b.getChannelData(0),seed=286,avant=0;
    /* Petit bruit original déterministe. Aucun tirage Math.random : les
       probabilités des séquenceurs voisins restent rigoureusement inchangées. */
    for(var i=0;i<n;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;var x=seed/2147483648-1;d[i]=(x-avant)*.5;avant=x;}
    if(bruits.size>=4)bruits.delete(bruits.keys().next().value);bruits.set(sr,b);return b;
  }
  function creerKick(m){
    normaliser(m);var out=eurGain(1),voct=eurGain(1200),hit=eurConst(0),pool=EUR_RAVE.panier();
    var dernier=null,barriere=0,ferme=false;
    m.raveVoix=pool;
    m.maj=function(){normaliser(m);notifier(m);};
    function arreter(t){pool.couper(t);hit.offset.cancelScheduledValues(t);hit.offset.setValueAtTime(0,t);dernier=null;barriere=t;}
    m.arreter=function(){if(!ferme)arreter(maintenantAudio());};
    m.recevoir=function(t,e){
      if(ferme||!Number.isFinite(t)||t<0||t<barriere)return null;
      if(e==="rst"){arreter(t);return null;}
      if(e!=="trig"||(dernier!==null&&t<=dernier+.0000001))return null;
      dernier=t;var p=valeurs("kicklab",m.p);if(p.niv<=0)return null;
      pool.couper(t);
      var profil=profilKick(p),d=profil.duree,o=ctx.createOscillator(),pre=eurGain(1+p.drive*28),sh=ctx.createWaveShaper();
      var lp=ctx.createBiquadFilter(),body=eurGain(0),g=eurGain(0),attaque=ctx.createBufferSource(),ag=eurGain(0);
      o.type="sine";o.frequency.setValueAtTime(profil.points[0][1],t);
      for(var i=1;i<3;i++)o.frequency.exponentialRampToValueAtTime(profil.points[i][1],t+profil.points[i][0]);
      voct.connect(o.detune);
      sh.curve=eurCourbe(function(x){return Math.tanh(x*1.6)/Math.tanh(1.6);});sh.oversample="4x";
      lp.type="lowpass";lp.frequency.value=Math.min(ctx.sampleRate*.45,450*Math.pow(25,p.tone));lp.Q.value=.55;
      /* Corps et attaque ont des gains indépendants avant la fenêtre commune,
         utilisée uniquement pour couper proprement la frappe précédente. */
      body.gain.setValueAtTime(0,t);body.gain.linearRampToValueAtTime(.78,t+.0015);
      body.gain.setValueAtTime(.65,t+Math.min(.018,d*.25));body.gain.exponentialRampToValueAtTime(.00001,t+d);
      attaque.buffer=clic();var ad=p.clickdec/1000;
      ag.gain.setValueAtTime(0,t);ag.gain.linearRampToValueAtTime(p.click*.22,t+.0005);
      if(p.click>0)ag.gain.exponentialRampToValueAtTime(.00001,t+ad);ag.gain.setValueAtTime(0,t+ad+.001);
      o.connect(pre);pre.connect(sh);sh.connect(lp);lp.connect(body);body.connect(g);attaque.connect(ag);ag.connect(g);g.connect(out);
      g.gain.setValueAtTime(p.niv,t);g.gain.setValueAtTime(p.niv,t+d);g.gain.linearRampToValueAtTime(0,t+d+.002);
      o.start(t);attaque.start(t);o.stop(t+d+.004);attaque.stop(t+ad+.002);
      /* Le panier arrête LES DEUX sources, y compris une attaque programmée
         dans le futur au moment où STOP ou un recâblage arrive. */
      var source={stop:function(at){try{o.stop(at);}catch(ignore){}try{attaque.stop(at);}catch(ignore){}}};
      Object.defineProperty(source,"onended",{set:function(fn){o.onended=function(){try{voct.disconnect(o.detune);}catch(ignore){}fn();};}});
      pool.ajouter(source,g,t,t+d+.004,[o,pre,sh,lp,body,g,attaque,ag]);
      eurPorte(hit,t,.001);return ["hit"];
    };
    return {e:{trig:eurGain(1),rst:eurGain(1),voct:voct},s:{out:out,hit:hit},detruire:function(){
      ferme=true;pool.detruire();try{hit.stop();}catch(ignore){}try{voct.disconnect();}catch(ignore){}
    }};
  }
  function creerDuck(m){
    normaliser(m);var entree=eurGain(1),out=eurGain(0),cv=eurConst(1);entree.connect(out);cv.connect(out.gain);
    var historique=[],dernier=null,barriere=0,ferme=false;
    function valeur(t){for(var i=historique.length-1;i>=0;i--)if(historique[i].t<=t)return lirePoints(historique[i].pts,t-historique[i].t);return 1;}
    function retenir(t,pts){
      historique=historique.filter(function(x){return x.t<t;});historique.push({t:t,pts:pts});
      /* Garder deux secondes hors ligne couvre aussi les triggers du look-ahead
         annulés par STOP avant leur date, sans conserver tout le morceau. */
      var avant=typeof ctx.startRendering==="function"?t-2:ctx.currentTime;
      while(historique.length>1&&historique[1].t<=avant)historique.shift();
    }
    function programmer(t,pts){
      var v=valeur(t),p=cv.offset;
      if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);
      else{p.cancelScheduledValues(t);if(historique.length)p.linearRampToValueAtTime(v,t);}
      p.setValueAtTime(v,t);
      for(var i=1;i<pts.length;i++)p.linearRampToValueAtTime(pts[i][1],t+pts[i][0]);
      retenir(t,pts);
    }
    function arreter(t){programmer(t,[[0,valeur(t)],[.003,1]]);dernier=null;barriere=t;}
    m.maj=function(){normaliser(m);notifier(m);};
    m.arreter=function(){if(!ferme)arreter(maintenantAudio());};
    m.recevoir=function(t,e){
      if(ferme||!Number.isFinite(t)||t<0||t<barriere)return null;
      if(e==="rst"){arreter(t);return null;}
      if(e!=="trig"||(dernier!==null&&t<=dernier+.0000001))return null;
      dernier=t;programmer(t,profilDuck(m.p,valeur(t)).points);return null;
    };
    /* Lecture de la courbe programmée, jamais une prétendue mesure sonore. */
    m.kbDuck={valeur:valeur,historique:function(){return historique.length;}};
    return {e:{in:entree,trig:eurGain(1),rst:eurGain(1)},s:{out:out,env:cv},detruire:function(){
      ferme=true;historique=[];try{cv.stop();}catch(ignore){}try{cv.disconnect();out.disconnect();entree.disconnect();}catch(ignore){}
    }};
  }
  EUR_CAT.kicklab={nom:"KICK LAB",hp:132,sombre:true,fam:"perc",res:"Kick accordable, courbe de hauteur en deux segments et attaque séparée. HIT pilote DUCK TRIG.",
    kns:kickKns,jacks:[["trig","TRIG",0],["rst","RST",0],["voct","V/OCT",0],["out","OUT",1],["hit","HIT",1]],creer:creerKick};
  EUR_CAT.ducktrig={nom:"DUCK TRIG",hp:128,sombre:true,fam:"effet",res:"Baisse de volume stéréo au déclenchement du kick : profondeur, maintien et retour réglables. Pas de détection audio.",
    kns:duckKns,jacks:[["in","IN",0],["trig","TRIG",0],["rst","RST",0],["out","OUT",1],["env","GAIN CV",1]],creer:creerDuck};
  EUR_ORDRE.push("kicklab","ducktrig");
  return {parametres:parametres,valeurs:valeurs,profilKick:profilKick,profilDuck:profilDuck,lirePoints:lirePoints};
})();

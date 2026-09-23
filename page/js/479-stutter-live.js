/* ================= STUTTER LIVE — v288 =================
   Capture courte du signal entrant par une ligne de retard stéréo native.
   Au repos : IN -> OUT sans retard ; le retard mémorise le dernier fragment.
   Capture : écriture coupée / recirculation à UN, jamais au-dessus. Aucun son
   neuf ni fichier externe. Une fenêtre adoucit chaque joint de répétition.
   Un fragment reste de longueur fixe jusqu'au relâchement : ni étirement
   temporel, ni lecture inversée dans ce premier lot. Après libération, une
   durée de fragment est nécessaire pour retrouver uniquement le son actuel.
   Le graphe est synchrone : mêmes nœuds dans l'APK, WebView2 et les exports
   OfflineAudioContext, sans worker chargé tardivement ni timer audio JS. */
var EUR_STUTTER=(function(){
  "use strict";
  var divisions=[4,8,16,32,64],periodes=[0,2,4,8],FADE=.004;
  var kns=[["div","FRAGMENT",0,4,2],["span","DURÉE EN PAS",1,16,4],
    ["mix","DOSE",0,1,1],["auto","AUTO",0,3,0],["edge","JOINT ms",.5,5,1]];
  function borne(v,a,b,d){return typeof v==="number"&&Number.isFinite(v)?Math.max(a,Math.min(b,v)):d;}
  function valeurs(raw){var p={};kns.forEach(function(k){p[k[0]]=borne(raw&&raw[k[0]],k[2],k[3],k[4]);});
    ["div","span","auto"].forEach(function(k){p[k]=Math.round(p[k]);});return p;}
  function normaliser(m){var p=valeurs(m.p);if(!m.p)m.p={};Object.keys(p).forEach(function(k){m.p[k]=p[k];});return p;}
  function taille(p,sr,dt){
    dt=borne(dt,.02,1.5,.125);return Math.max(256,Math.round(sr*Math.min(2,dt*16/divisions[valeurs(p).div])))/sr;
  }
  function informer(m){if(typeof EUR_STUTTER_UI!=="undefined")EUR_STUTTER_UI.rafraichir(m);}
  function creer(m){
    normaliser(m);var contexte=ctx,sr=ctx.sampleRate,ferme=false;
    var quantum=Number.isInteger(contexte.renderQuantumSize)?contexte.renderQuantumSize:128;
    var entree=eurGain(1),out=eurGain(1),sec=eurGain(1),ecriture=eurGain(1),feedback=eurGain(0),humide=eurGain(0),joint=eurGain(0);
    /* Un cycle du graphe Chromium apporte un quantum de rétroaction. On le
       retire à la ligne interne et le remet APRÈS la boucle : son periodique
       ET capture des derniers échantillons restent alignés, au lieu d'ajouter
       128 échantillons à chaque répétition. Contrôlé par comparaison PCM,
       y compris aux limites de quantum et à 44,1/48/96 kHz. Le contexte de
       l'application utilise le quantum standard (128). */
    var apres=ctx.createDelay(.1);apres.delayTime.value=quantum/sr;var retard=ctx.createDelay(2.1),etat=eurConst(0),cvSec=eurGain(-m.p.mix),cvHumide=eurGain(m.p.mix);
    entree.connect(sec);sec.connect(out);entree.connect(ecriture);ecriture.connect(retard);
    retard.connect(feedback);feedback.connect(retard);retard.connect(apres);apres.connect(joint);joint.connect(humide);humide.connect(out);
    etat.connect(cvSec);cvSec.connect(sec.gain);etat.connect(cvHumide);cvHumide.connect(humide.gain);
    var longueur=taille(m.p,sr,stepDur()),pretA=contexte.currentTime+longueur,barriere=0,dernierClk=null,compteur=-1;
    var cycles=[],sources=new Set(),fenetres=new Map(),liberations=[],captures=0;
    retard.delayTime.value=longueur-quantum/sr;
    function temps(){return maintenantAudio();}
    function valide(t){return !ferme&&typeof t==="number"&&Number.isFinite(t)&&t>=0&&t>=barriere;}
    function enCours(t){for(var i=cycles.length-1;i>=0;i--){var c=cycles[i];if(t>=c.t&&t<c.fin)return c;}return null;}
    function enveloppe(t){
      for(var i=liberations.length-1;i>=0;i--)if(t>=liberations[i].t){var l=liberations[i];return l.v*Math.max(0,1-(t-l.t)/FADE);}
      for(var j=cycles.length-1;j>=0;j--){var c=cycles[j];if(t>=c.t)return Math.min(1,(t-c.t)/FADE)*Math.max(0,Math.min(1,1-(t-c.fin)/FADE));}
      return 0;
    }
    function nettoyer(t){
      /* Conserver les événements encore futurs et la valeur immédiatement
         antérieure pour un STOP pendant le look-ahead. L'export programme dans
         l'ordre : les événements AudioParam restent, pas les vues graphiques. */
      var limite=contexte.startRendering?t-2:contexte.currentTime-2;
      while(cycles.length>2&&cycles[1].fin<limite)cycles.shift();
      while(liberations.length>2&&liberations[1].t<limite)liberations.shift();
    }
    function configurer(t){
      if(cycles.some(function(c){return c.fin>t;}))return false;
      var l=taille(m.p,sr,stepDur());
      if(Math.abs(l-longueur)>1/sr/2){longueur=l;retard.delayTime.setValueAtTime(l-quantum/sr,t);pretA=Math.max(pretA,t+l);}
      return true;
    }
    function fenetre(l,edge){
      var n=Math.round(l*sr),bord=Math.max(1,Math.min(Math.round(edge*sr/1000),Math.floor(n/8))),key=n+":"+bord;
      if(fenetres.has(key))return fenetres.get(key);
      var b=contexte.createBuffer(1,n,sr),a=b.getChannelData(0);
      for(var i=0;i<n;i++)a[i]=Math.min(1,i/bord,(n-1-i)/bord);
      if(fenetres.size>=4)fenetres.delete(fenetres.keys().next().value);fenetres.set(key,b);return b;
    }
    function source(c,p){
      var o=contexte.createBufferSource();o.buffer=fenetre(c.longueur,p.edge);o.loop=true;o.connect(joint.gain);
      var s={o:o,t:c.t,fin:c.fin};sources.add(s);o.start(c.t);
      if(Number.isFinite(c.fin))o.stop(c.fin+FADE+1/sr);
      o.onended=function(){try{o.disconnect();}catch(ignore){}sources.delete(s);};return s;
    }
    function capturer(t,tenir){
      if(!valide(t)||cycles.some(function(c){return c.fin>t;}))return false;
      configurer(t);
      if(t+1e-7<pretA)return false;
      normaliser(m);var p=valeurs(m.p),dt=borne(stepDur(),.02,1.5,.125),fin=tenir?Infinity:t+p.span*dt;
      /* Le signal audio ne dépend jamais de la liste graphique ni d'une
         animation. Les trois commandes sont posées à l'horloge audio. */
      ecriture.gain.setValueAtTime(0,t);feedback.gain.setValueAtTime(1,t);
      etat.offset.setValueAtTime(0,t);etat.offset.linearRampToValueAtTime(1,t+FADE);
      if(Number.isFinite(fin)){
        ecriture.gain.setValueAtTime(1,fin);feedback.gain.setValueAtTime(0,fin);
        etat.offset.setValueAtTime(1,fin);etat.offset.linearRampToValueAtTime(0,fin+FADE);
      }
      var c={t:t,fin:fin,longueur:longueur,tenu:!!tenir};cycles.push(c);
      /* Une ancienne rampe de relâchement ne doit plus gouverner la lecture. */
      liberations=liberations.filter(function(l){return l.t>t;});
      source(c,p);captures++;pretA=fin+longueur;nettoyer(t);informer(m);return true;
    }
    function relacher(t,reset){
      if(!valide(t))return false;
      var v=enveloppe(t),courant=enCours(t);
      ecriture.gain.cancelScheduledValues(t);feedback.gain.cancelScheduledValues(t);
      ecriture.gain.setValueAtTime(1,t);feedback.gain.setValueAtTime(0,t);
      /* Ancrer aussi la pente précédente lorsque cancelAndHold est absent. */
      if(typeof etat.offset.cancelAndHoldAtTime==="function")etat.offset.cancelAndHoldAtTime(t);
      else {etat.offset.cancelScheduledValues(t);etat.offset.linearRampToValueAtTime(v,t);}
      etat.offset.setValueAtTime(v,t);etat.offset.linearRampToValueAtTime(0,t+FADE);
      cycles=cycles.filter(function(c){return c.t<t;});cycles.forEach(function(c){if(c.fin>t)c.fin=t;});
      liberations=liberations.filter(function(l){return l.t<t;});liberations.push({t:t,v:v});
      sources.forEach(function(s){if(s.fin+FADE>t){try{s.o.stop(t+FADE+1/sr);}catch(ignore){}s.fin=t;}});
      pretA=t+longueur;configurer(t);
      if(reset){compteur=-1;dernierClk=null;barriere=t;}
      nettoyer(t);informer(m);return !!courant;
    }
    function statut(t){
      var c=enCours(t),restant=Math.max(0,pretA-t);
      return {ferme:ferme,actif:!!c,tenu:!!(c&&c.tenu),pret:!ferme&&!c&&restant<=1e-7,
        attente:Number.isFinite(restant)?restant:0,longueur:c?c.longueur:longueur,
        restant:c?(Number.isFinite(c.fin)?c.fin-t:null):0,phase:c?((t-c.t)%c.longueur)/c.longueur:0,
        captures:captures,pas:compteur};
    }
    m.stutter={capturer:capturer,relacher:relacher,statut:statut,enveloppe:enveloppe,
      historique:function(){return cycles.map(function(c){return {t:c.t,fin:c.fin,longueur:c.longueur,tenu:c.tenu};});},
      sources:function(){return sources.size;},noeuds:{retard:retard,ecriture:ecriture,feedback:feedback,etat:etat}};
    m.maj=function(){if(ferme)return;normaliser(m);configurer(temps());
      /* La DOSE agit immédiatement ; longueur, joint et durée sont photographiés
         au départ d'une répétition. Les automations de fin restent intactes. */
      cvSec.gain.value=-m.p.mix;cvHumide.gain.value=m.p.mix;informer(m);};
    m.recevoir=function(t,e){
      if(!valide(t))return null;
      if(e==="rst"){relacher(t,true);return null;}
      if(e==="rel"){relacher(t,false);return null;}
      if(e==="trig"){capturer(t,false);return null;}
      if(e!=="clk"||(dernierClk!==null&&t<=dernierClk+1e-7))return null;
      dernierClk=t;compteur++;configurer(t);
      var p=valeurs(m.p),periode=periodes[p.auto];
      if(periode&&compteur%(periode*16)===periode*16-p.span)capturer(t,false);
      return null;
    };
    m.arreter=function(){if(!ferme)relacher(temps(),true);};
    return {e:{in:entree,clk:eurGain(1),trig:eurGain(1),rel:eurGain(1),rst:eurGain(1)},s:{out:out},detruire:function(){
      if(ferme)return;ferme=true;
      /* Briser explicitement la boucle et ses références. Un ancien rack ne
         doit pas continuer à calculer un retard auto-entretenu en silence. */
      sources.forEach(function(s){try{s.o.stop();s.o.disconnect();}catch(ignore){}});sources.clear();fenetres.clear();
      try{etat.stop();}catch(ignore){}
      [entree,out,sec,ecriture,feedback,humide,joint,retard,apres,etat,cvSec,cvHumide].forEach(function(n){try{n.disconnect();}catch(ignore){}});
      cycles=[];liberations=[];informer(m);
    }};
  }
  EUR_CAT.stutterlive={nom:"STUTTER LIVE",hp:192,sombre:true,fam:"effet",res:"Capture stéréo du dernier fragment, répétition au tempo et relâchement sans arrêter le rack",
    kns:kns,jacks:[["in","IN STÉRÉO",0],["clk","CLK",0],["trig","CAPTURE",0],["rel","LIBÉRER",0],["rst","RST",0],["out","OUT STÉRÉO",1]],creer:creer};
  EUR_ORDRE.push("stutterlive");
  return {valeurs:valeurs,normaliser:normaliser,divisions:divisions,periodes:periodes,taille:taille,fade:FADE};
})();

/* ================= POLY 4 — v295 =================
   Un synthé autonome à quatre voix, joué au doigt sur un clavier tactile
   d'une octave (DO à DO), avec quatre mémoires d'accord. Pas de câblage
   requis : seule la sortie OUT est nécessaire pour l'entendre, comme un
   instrument de scène plutôt qu'un module du rack.

   Quatre voix persistantes (VCO x2 légèrement désaccordées → filtre passe-
   bas → enveloppe tenue), allouées à la volée : une note déjà tenue est
   reprise, sinon une voix libre, sinon la plus ancienne est volée (vol de
   voix classique d'un synthé polyphonique). L'enveloppe (attaque/chute)
   suit le même principe d'historique que EUR_RAVE.enveloppe, mais tient le
   palier au lieu de redescendre seule : une touche pressée reste sonore
   jusqu'au relâchement, quelle que soit la durée.

   Les quatre pastilles MÉMOIRE capturent l'accord tenu au clavier (bouton
   MÉMORISER puis une pastille) et le rejouent ensuite d'une pression, sans
   toucher aux touches. Les mémoires ne sont pas enregistrées dans le projet :
   comme TENIR sur SCÈNES 8, c'est un geste de jeu, pas un réglage. */
var EUR_POLY4 = (function(){
  "use strict";
  var kns=[["osc","OSCILLATEUR",0,2,0],["det","DÉSACCORD",0,100,20],["cut","FILTRE",0,100,65],
    ["res","RÉSONANCE",0,100,20],["att","ATTAQUE ms",1,800,8],["chu","CHUTE ms",3,2000,220],["niv","NIVEAU",0,100,70]];
  function borne(v,a,b,d){return Number.isFinite(v)?Math.max(a,Math.min(b,v)):d;}
  function entier(v,a,b,d){return Math.round(borne(v,a,b,d));}
  function normaliser(m){if(!m.p)m.p={};kns.forEach(function(k){m.p[k[0]]=borne(m.p[k[0]],k[2],k[3],k[4]);});}

  /* Enveloppe tenue : attaque linéaire vers un palier conservé jusqu'au
     relâchement (linéaire aussi, vers -100 dB). Historique explicite comme
     EUR_RAVE.enveloppe : au rendu hors ligne, tout est programmé d'avance,
     .value ne reflète pas encore les rampes à venir. */
  function envTenue(p){
    var h=[];
    function valeur(t){
      var r=null;for(var i=h.length-1;i>=0;i--)if(h[i].t<=t){r=h[i];break;}
      if(!r)return .00001;
      if(t<r.a)return r.de+(r.pic-r.de)*(t-r.t)/(r.a-r.t);
      if(r.rel===undefined)return r.pic;
      if(t>=r.fin)return .00001;
      return r.pic+(.00001-r.pic)*(t-r.rel)/(r.fin-r.rel);
    }
    function tenir(t){
      var v=valeur(t);
      if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else p.cancelScheduledValues(t);
      p.setValueAtTime(Math.max(.00001,v),t);h=h.filter(function(r){return r.t<t;});return v;
    }
    return {
      presser:function(t,attaque,pic){
        var v=tenir(t);
        p.linearRampToValueAtTime(pic,t+attaque);
        h.push({t:t,a:t+attaque,de:v,pic:pic});
        var avant=typeof ctx.startRendering==="function"?t:ctx.currentTime;
        while(h.length>1&&h[1].t<=avant)h.shift();
      },
      relacher:function(t,chute){
        var v=tenir(t);
        p.linearRampToValueAtTime(.00001,t+chute);
        h.push({t:t,a:t,de:v,pic:Math.max(.00001,v),rel:t,fin:t+chute});
      },
      valeur:valeur
    };
  }

  var FORMES=["sawtooth","square","triangle"];
  function creerVoix(sortie){
    var o1=ctx.createOscillator(),o2=ctx.createOscillator();
    o1.type=o2.type="sawtooth";o1.start();o2.start();
    var mix=eurGain(.5);o1.connect(mix);o2.connect(mix);
    var fil=ctx.createBiquadFilter();fil.type="lowpass";mix.connect(fil);
    var amp=eurGain(.00001);fil.connect(amp);amp.connect(sortie);
    return {o1:o1,o2:o2,mix:mix,fil:fil,amp:amp,env:envTenue(amp.gain),note:null,actif:false,rang:0};
  }

  function creerPoly4(m){
    normaliser(m);
    var out=eurGain(borne(m.p.niv,0,100,70)/100);
    var voix=[creerVoix(out),creerVoix(out),creerVoix(out),creerVoix(out)];
    var compteur=0,ferme=false,notesTenues={};
    function trouverVoix(note){
      var i;
      for(i=0;i<4;i++)if(voix[i].actif&&voix[i].note===note)return voix[i];
      for(i=0;i<4;i++)if(!voix[i].actif)return voix[i];
      var v=voix[0];for(i=1;i<4;i++)if(voix[i].rang<v.rang)v=voix[i];return v;
    }
    m.poly4={
      presser:function(t,note){
        if(ferme||!Number.isFinite(t)||!Number.isFinite(note))return;
        var v=trouverVoix(note);v.note=note;v.actif=true;v.rang=++compteur;
        var f=440*Math.pow(2,(note-69)/12),det=(borne(m.p.det,0,100,20)/100)*24;
        v.o1.frequency.setValueAtTime(f,t);v.o2.frequency.setValueAtTime(f,t);
        v.o1.detune.setValueAtTime(-det,t);v.o2.detune.setValueAtTime(det,t);
        var att=Math.max(.001,borne(m.p.att,1,800,8)/1000);
        v.env.presser(t,att,.32);notesTenues[note]=true;
      },
      relacher:function(t,note){
        if(ferme||!Number.isFinite(t)||!Number.isFinite(note))return;
        delete notesTenues[note];
        var v=null;for(var i=0;i<4;i++)if(voix[i].actif&&voix[i].note===note){v=voix[i];break;}
        if(!v)return;
        v.actif=false;
        var chu=Math.max(.003,borne(m.p.chu,3,2000,220)/1000);
        v.env.relacher(t,chu);
      },
      tenues:function(){return Object.keys(notesTenues).map(Number);},
      voixActives:function(){return voix.filter(function(v){return v.actif;}).length;}
    };
    m.maj=function(){
      normaliser(m);
      var forme=FORMES[entier(m.p.osc,0,2,0)];
      var cut=80*Math.pow(90,borne(m.p.cut,0,100,65)/100),q=.4+(borne(m.p.res,0,100,20)/100)*13;
      voix.forEach(function(v){v.o1.type=forme;v.o2.type=forme;v.fil.frequency.value=cut;v.fil.Q.value=q;});
      out.gain.value=borne(m.p.niv,0,100,70)/100;
    };
    m.maj();
    m.arreter=function(){
      var t=maintenantAudio();
      voix.forEach(function(v){if(v.actif){v.actif=false;v.env.relacher(t,.05);}});
      notesTenues={};
    };
    return {e:{},s:{out:out},detruire:function(){
      ferme=true;
      voix.forEach(function(v){
        try{v.o1.stop();}catch(e){}try{v.o2.stop();}catch(e){}
        [v.o1,v.o2,v.mix,v.fil,v.amp].forEach(function(n){try{n.disconnect();}catch(e){}});
      });
    }};
  }

  /* ---------- Clavier tactile et mémoires d'accord (façade) ---------- */
  var NOMS=["DO","DO#","RÉ","RÉ#","MI","FA","FA#","SOL","SOL#","LA","LA#","SI","DO"];
  var NOIRES=[0,1,0,1,0,0,1,0,1,0,1,0,0];
  var FORMES_NOM=["DENT DE SCIE","CARRÉ","TRIANGLE"];
  var PRESETS_MS=[1,4,8,15,30,60,120,250,500,800],PRESETS_CHUTE=[3,20,60,120,220,400,700,1200,2000];
  function el(tag,classe,txt){var e=document.createElement(tag);if(classe)e.className=classe;if(txt!==undefined)e.textContent=txt;return e;}
  function bouton(p,t,cl){var b=el("button",cl,t);b.type="button";p.appendChild(b);return b;}
  function interfaceModule(parent,m,grand){
    var root=el("div","p4 "+(grand?"p4-editeur":"p4-mini"));parent.appendChild(root);root.dataset.module=m.id;
    function valide(){return EUR.mods.indexOf(m)>=0;}
    if(!grand){
      root.appendChild(el("p","p4-intro","CLAVIER"));
      var ouvrir=bouton(root,"OUVRIR LE CLAVIER","p4-ouvrir");
      ouvrir.addEventListener("click",function(e){e.stopPropagation();if(valide()&&typeof EUR_FOCUS!=="undefined")EUR_FOCUS.ouvrir(m.id);});
      return {rafraichir:function(){},detruire:function(){}};
    }
    if(m._p4oct===undefined)m._p4oct=0;
    if(!m._p4mem)m._p4mem=[null,null,null,null];
    var armer=false,etat=el("p","p4-etat"),pointeurs={},champs={};
    function modifier(k,v){if(!valide())return;m.p[k]=v;memEur();if(m.maj)m.maj();}
    function options(a,b,pas,fn){var r=[];for(var i=a;i<=b;i+=pas)r.push([i,fn?fn(i):String(i)]);return r;}
    function select(p,k,t,l){
      var lab=el("label",""),s=el("select","");lab.appendChild(el("span","",t));s.dataset.champ=k;s.setAttribute("aria-label",t);
      l.forEach(function(x){var o=el("option","",x[1]);o.value=x[0];s.appendChild(o);});
      s.addEventListener("change",function(){modifier(k,+s.value);});lab.appendChild(s);p.appendChild(lab);champs[k]=s;
    }
    root.appendChild(el("p","p4-intro","SYNTHÉ AUTONOME · QUATRE VOIX"));
    var reglages=el("div","p4-reglages");root.appendChild(reglages);
    select(reglages,"osc","OSCILLATEUR",FORMES_NOM.map(function(n,i){return [i,n];}));
    select(reglages,"det","DÉSACCORD",options(0,100,5,function(n){return n+" %";}));
    select(reglages,"cut","FILTRE",options(0,100,5,function(n){return n+" %";}));
    select(reglages,"res","RÉSONANCE",options(0,100,5,function(n){return n+" %";}));
    select(reglages,"att","ATTAQUE",PRESETS_MS.map(function(n){return [n,n+" ms"];}));
    select(reglages,"chu","CHUTE",PRESETS_CHUTE.map(function(n){return [n,n+" ms"];}));
    select(reglages,"niv","NIVEAU",options(0,100,5,function(n){return n+" %";}));
    Object.keys(champs).forEach(function(k){champs[k].value=m.p[k];});
    var octaves=el("div","p4-octaves");root.appendChild(octaves);
    var octBas=bouton(octaves,"OCTAVE −","p4-oct p4-oct-bas"),octLbl=el("span","p4-oct-val"),octHaut=bouton(octaves,"OCTAVE +","p4-oct p4-oct-haut");
    octaves.insertBefore(octLbl,octHaut);
    octBas.addEventListener("click",function(e){e.stopPropagation();m._p4oct=Math.max(-2,m._p4oct-1);majOct();});
    octHaut.addEventListener("click",function(e){e.stopPropagation();m._p4oct=Math.min(2,m._p4oct+1);majOct();});
    var clavier=el("div","p4-clavier");root.appendChild(clavier);
    var touches=[];
    for(var i=0;i<13;i++)(function(i){
      var b=bouton(clavier,"","p4-touche"+(NOIRES[i]?" p4-noire":""));
      b.dataset.rang=String(i);b.appendChild(el("span","p4-touche-nom",NOMS[i]));
      touches.push(b);
    })(i);
    function noteDe(i){return 60+m._p4oct*12+i;}
    function presserTouche(i,id){
      if(!valide())return;var note=noteDe(i);pointeurs[id]=note;
      touches[i].classList.add("tenue");m.poly4.presser(maintenantAudio(),note);majEtat();
    }
    function relacherTouche(id){
      if(pointeurs[id]===undefined)return;var note=pointeurs[id];delete pointeurs[id];
      if(valide())m.poly4.relacher(maintenantAudio(),note);
      touches.forEach(function(b,i){if(noteDe(i)===note && !Object.keys(pointeurs).some(function(k){return pointeurs[k]===note;}))b.classList.remove("tenue");});
      majEtat();
    }
    touches.forEach(function(b,i){
      b.addEventListener("pointerdown",function(e){e.preventDefault();e.stopPropagation();try{b.setPointerCapture(e.pointerId);}catch(x){}presserTouche(i,e.pointerId);});
      b.addEventListener("pointerup",function(e){e.stopPropagation();relacherTouche(e.pointerId);});
      b.addEventListener("pointercancel",function(e){e.stopPropagation();relacherTouche(e.pointerId);});
    });
    var memZone=el("div","p4-memzone");root.appendChild(memZone);
    var memoriser=bouton(memZone,"MÉMORISER","p4-memoriser");
    memoriser.addEventListener("click",function(e){e.stopPropagation();armer=!armer;memoriser.classList.toggle("arme",armer);memoriser.setAttribute("aria-pressed",String(armer));});
    var grille=el("div","p4-grille");root.appendChild(grille);
    var pads=[];
    for(var j=0;j<4;j++)(function(j){
      var p=bouton(grille,"","p4-mem");p.appendChild(el("span","p4-mem-num",String(j+1)));pads.push(p);
      p.addEventListener("pointerdown",function(e){
        e.preventDefault();e.stopPropagation();if(!valide())return;
        if(armer){
          var notes=m.poly4.tenues();
          m._p4mem[j]=notes.length?notes:null;armer=false;memoriser.classList.remove("arme");memoriser.setAttribute("aria-pressed","false");
          majPads();return;
        }
        var acc=m._p4mem[j];if(!acc||!acc.length)return;
        try{p.setPointerCapture(e.pointerId);}catch(x){}
        pointeurs["mem"+j]=acc;acc.forEach(function(n){m.poly4.presser(maintenantAudio(),n);});
        p.classList.add("tenue");majEtat();
      });
      function relacherPad(e){
        e.stopPropagation();var acc=pointeurs["mem"+j];if(!acc)return;delete pointeurs["mem"+j];
        if(valide())acc.forEach(function(n){m.poly4.relacher(maintenantAudio(),n);});
        p.classList.remove("tenue");majEtat();
      }
      p.addEventListener("pointerup",relacherPad);p.addEventListener("pointercancel",relacherPad);
    })(j);
    root.appendChild(etat);
    root.appendChild(el("p","p4-aide","Toucher une touche la fait sonner tant qu'elle est tenue, jusqu'à quatre notes à la fois : la cinquième vole la voix la plus ancienne. MÉMORISER puis une pastille capture l'accord tenu au clavier ; une pression sur la pastille le rejoue ensuite sans repasser par le clavier. OCTAVE − / + décale le clavier d'une octave, de −2 à +2."));
    function majOct(){octLbl.textContent="OCT "+(m._p4oct>0?"+":"")+m._p4oct;}
    function majPads(){pads.forEach(function(p,j){var acc=m._p4mem[j];p.classList.toggle("vide",!acc||!acc.length);p.querySelector(".p4-mem-num").textContent=acc&&acc.length?acc.length+" NOTE"+(acc.length>1?"S":""):String(j+1);});}
    function majEtat(){
      var n=m.poly4?m.poly4.tenues():[];
      etat.textContent=n.length?n.length+" note"+(n.length>1?"s":"")+" tenue"+(n.length>1?"s":"")+" · "+m.poly4.voixActives()+"/4 voix":"CLAVIER AU REPOS · 4 VOIX";
    }
    majOct();majPads();majEtat();
    var vue={el:root,m:m,maj:function(){majPads();majEtat();}};
    return {rafraichir:vue.maj,detruire:function(){Object.keys(pointeurs).forEach(function(){});}};
  }

  EUR_CAT.poly4={nom:"POLY 4",hp:224,sombre:false,fam:"seq",
    res:"Synthé autonome à quatre voix, joué au doigt sur un clavier tactile d'une octave, avec quatre mémoires d'accord.",
    kns:kns,jacks:[["out","OUT",1]],creer:creerPoly4,interface:interfaceModule,
    focusLabel:"JOUEZ AU DOIGT OU RAPPELEZ UN ACCORD",focusValeur:"CLAVIER"};
  EUR_ORDRE.push("poly4");
  return {normaliser:normaliser,envTenue:envTenue};
})();

/* ================= VOIX MUTANTES — v294 =================
   Deux modules qui se complètent, sans se dépendre l'un de l'autre :

   VOYELLE : un VCO classique (comme 390-oscillateurs.js), toujours actif,
   dont le timbre passe par deux filtres passe-bande accordés sur des
   formants de voyelle (table reprise du filtre FORMANT existant, 400-
   filtres.js : A, E, I, O, U). VOYELLE se pilote comme n'importe quel VCO —
   V/OCT en continu, à gater ensuite avec un VCA/ENV du rack, comme dans les
   montages ci-dessous. MUTATION ajoute un LFO lent qui fait glisser la
   voyelle toute seule ; VOYELLE CV permet de la piloter depuis un
   séquenceur ou une enveloppe, en plus du potard.

   VOCODEUR : un banc de 8 bandes fixe. MOD (l'analyse) et POR (la porteuse)
   sont deux entrées audio ordinaires ; sans rien câblé sur POR, un
   oscillateur interne (OSC INTERNE, NOTE) sert de porteuse, comme sur un
   vrai vocodeur de table. Chaque bande : un passe-bande sur MOD, un
   redressement (WaveShaper |x|) puis un lissage (passe-bas, VITESSE) qui
   pilote directement le gain d'un passe-bande jumeau sur la porteuse —
   aucun AudioWorklet, aucune analyse FFT : uniquement des BiquadFilterNode
   et un WaveShaperNode, dans le même style que les autres traitements
   (430-traitements.js). DÉCALAGE FORMANTS transpose les bandes de la
   porteuse par rapport à celles de l'analyse (effet de voix qui change de
   taille, classique sur un vocodeur). MIX mélange voix vocodée et MOD sec.

   Les deux se combinent naturellement : brancher OUT de VOYELLE sur MOD de
   VOCODEUR fait chanter des voyelles à travers le vocodeur, exactement le
   sujet de ce lot ("voyelles synthétiques puis vocodeur"). */
var EUR_VOIXMUT = (function(){
  "use strict";
  function borne(v,a,b,d){ return typeof v === "number" && Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d; }
  var voyelleKns = [["oct","OCTAVE",-2,2,0],["voy","VOYELLE",0,4,0],["timbre","TIMBRE",0,100,55],
    ["mut","MUTATION",0,100,20],["res","RÉSONANCE",0,100,45],["niv","NIVEAU",0,100,60]];
  var vocodeurKns = [["osc","OSC INTERNE",0,100,55],["note","NOTE",24,72,45],["decal","FORMANTS",-12,12,0],
    ["vit","VITESSE ms",5,80,20],["mix","MIX",0,100,100],["niv","NIVEAU",0,100,70]];
  function valeurs(kns,raw){
    var p={};kns.forEach(function(k){p[k[0]]=borne(raw&&raw[k[0]],k[2],k[3],k[4]);});return p;
  }
  function normaliserVoyelle(m){var p=valeurs(voyelleKns,m.p);if(!m.p)m.p={};Object.keys(p).forEach(function(k){m.p[k]=p[k];});}
  function normaliserVocodeur(m){var p=valeurs(vocodeurKns,m.p);if(!m.p)m.p={};Object.keys(p).forEach(function(k){m.p[k]=p[k];});}

  /* Table reprise telle quelle du filtre FORMANT (400-filtres.js) et du
     mode FORMANT de l'EMX-1 (290-electribe-emx-1.js) : A, E, I, O, U. */
  var voyelles=[[730,1090],[530,1840],[390,1990],[570,840],[300,870]];
  function formant(v){
    v=borne(v,0,4,0);var lo=Math.min(3,Math.floor(v)),hi=lo+1,frac=v-lo;
    return [voyelles[lo][0]+(voyelles[hi][0]-voyelles[lo][0])*frac,
            voyelles[lo][1]+(voyelles[hi][1]-voyelles[lo][1])*frac];
  }

  function creerVoyelle(m){
    normaliserVoyelle(m);
    var base=55,out=eurGain(m.p.niv/100);
    var src=ctx.createOscillator();src.type="sawtooth";src.frequency.value=base;src.start();
    var voct=eurGain(1200);voct.connect(src.detune);
    var pre=ctx.createBiquadFilter();pre.type="lowpass";pre.Q.value=.4;src.connect(pre);
    var f1=ctx.createBiquadFilter(),f2=ctx.createBiquadFilter();f1.type="bandpass";f2.type="bandpass";
    pre.connect(f1);pre.connect(f2);
    var mix=eurGain(.5);f1.connect(mix);f2.connect(mix);mix.connect(out);
    /* LFO de mutation + entrée CV externe, additionnés sur un même bus puis
       remis à l'échelle de chaque formant : même principe que voct sur les
       VCO existants (un gain fixe convertit un signal -1..1 en hertz). */
    var lfo=ctx.createOscillator();lfo.type="sine";lfo.frequency.value=.13;lfo.start();
    var lfoProf=eurGain(0);lfo.connect(lfoProf);
    var voyin=eurGain(1),morph=eurGain(1);lfoProf.connect(morph);voyin.connect(morph);
    var f1mod=eurGain(150),f2mod=eurGain(340);
    morph.connect(f1mod);morph.connect(f2mod);f1mod.connect(f1.frequency);f2mod.connect(f2.frequency);
    m.maj=function(){
      normaliserVoyelle(m);
      var demi=m.p.oct*12,fv=formant(m.p.voy);
      src.frequency.value=base*Math.pow(2,demi/12);
      f1.frequency.value=fv[0];f2.frequency.value=fv[1];
      var q=2+(m.p.res/100)*14;f1.Q.value=q;f2.Q.value=q;
      pre.frequency.value=300+(m.p.timbre/100)*4700;
      lfoProf.gain.value=(m.p.mut/100)*.8;
      out.gain.value=m.p.niv/100;
    };
    m.maj();
    return {e:{voct:voct,voyin:voyin},s:{out:out},
      detruire:function(){
        try{src.stop();}catch(ignore){}try{lfo.stop();}catch(ignore){}
        [src,lfo,voct,pre,f1,f2,mix,out,lfoProf,voyin,morph,f1mod,f2mod].forEach(function(n){try{n.disconnect();}catch(ignore){}});
      }};
  }

  var BANDES=[220,349,552,874,1384,2192,3472,5500];
  var COURBE_ABS=(function(){var n=1025,c=new Float32Array(n);for(var i=0;i<n;i++){var x=i*2/(n-1)-1;c[i]=Math.abs(x);}return c;})();
  function creerVocodeur(m){
    normaliserVocodeur(m);
    var modIn=eurGain(1),porIn=eurGain(1),out=eurGain(1);
    var sec=eurGain(0),hum=eurGain(0);modIn.connect(sec);sec.connect(out);hum.connect(out);
    var osc=ctx.createOscillator();osc.type="sawtooth";osc.start();
    var oscNiv=eurGain(0);osc.connect(oscNiv);
    var porteuse=eurGain(1);oscNiv.connect(porteuse);porIn.connect(porteuse);
    var bandes=BANDES.map(function(f){
      var mbp=ctx.createBiquadFilter();mbp.type="bandpass";mbp.frequency.value=f;mbp.Q.value=4;
      /* Redressement |x| d'une bande déjà étroite, puis lissé par un passe-bas
         à quelques dizaines de hertz au plus (VITESSE) : le repliement de ce
         redressement n'a pas le temps de survivre au lissage qui suit, donc
         pas de suréchantillonnage ici (repliement sans conséquence, comme les
         réductions de bits ailleurs dans l'application). */
      var rect=ctx.createWaveShaper();rect.curve=COURBE_ABS;rect.oversample="none";
      var lisse=ctx.createBiquadFilter();lisse.type="lowpass";lisse.Q.value=.5;
      var profondeur=eurGain(2.6);
      var cbp=ctx.createBiquadFilter();cbp.type="bandpass";cbp.Q.value=4;
      var cg=eurGain(0);
      modIn.connect(mbp);mbp.connect(rect);rect.connect(lisse);lisse.connect(profondeur);profondeur.connect(cg.gain);
      porteuse.connect(cbp);cbp.connect(cg);cg.connect(hum);
      return {freq:f,cbp:cbp,lisse:lisse};
    });
    m.maj=function(){
      normaliserVocodeur(m);
      var decal=Math.pow(2,m.p.decal/12),lpf=Math.max(3,Math.min(150,1000/m.p.vit));
      bandes.forEach(function(b){b.cbp.frequency.value=b.freq*decal;b.lisse.frequency.value=lpf;});
      osc.frequency.value=440*Math.pow(2,(m.p.note-69)/12);
      oscNiv.gain.value=m.p.osc/100;
      var niv=m.p.niv/100,wet=m.p.mix/100;
      sec.gain.value=(1-wet)*niv;hum.gain.value=wet*niv;
    };
    m.maj();
    return {e:{mod:modIn,por:porIn},s:{out:out},
      detruire:function(){
        try{osc.stop();}catch(ignore){}
        [modIn,porIn,out,sec,hum,oscNiv,porteuse].forEach(function(n){try{n.disconnect();}catch(ignore){}});
        bandes.forEach(function(b){try{b.cbp.disconnect();}catch(ignore){}});
      }};
  }

  EUR_CAT.voyelle={nom:"VOYELLE",hp:132,sombre:false,fam:"voix",
    res:"VCO toujours actif dont le timbre passe par deux formants de voyelle (A → E → I → O → U). MUTATION le fait dériver tout seul ; VOYELLE CV le pilote depuis le rack. À gater avec un VCA/ENV, comme les autres VCO.",
    kns:voyelleKns,jacks:[["voct","V/OCT",0],["voyin","VOYELLE CV",0],["out","OUT",1]],creer:creerVoyelle};
  EUR_CAT.vocodeur={nom:"VOCODEUR",hp:168,sombre:true,fam:"voix",
    res:"Vocodeur à huit bandes fixes : MOD analyse, POR sert de porteuse (sinon l'oscillateur interne s'en charge). FORMANTS décale les bandes de la porteuse, VITESSE règle la réactivité, MIX mélange voix vocodée et signal sec.",
    kns:vocodeurKns,jacks:[["mod","MOD",0],["por","POR",0],["out","OUT",1]],creer:creerVocodeur};
  EUR_ORDRE.push("voyelle","vocodeur");
  EUR_FAM.push(["voix","VOIX MUTANTES"]);
  return {valeurs:valeurs,normaliserVoyelle:normaliserVoyelle,normaliserVocodeur:normaliserVocodeur,
    formant:formant,voyelles:voyelles,bandes:BANDES,voyelleKns:voyelleKns,vocodeurKns:vocodeurKns};
})();

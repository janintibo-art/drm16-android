/* ================= LOOPER DE RACK — v296 =================
   Quatre pistes, chacune une phrase captée sur IN puis bouclée — les phrases
   restent en mémoire tant qu'on ne les efface pas (CLEAR), pas seulement le
   temps d'une lecture : on peut couper une piste (MUET) et la retrouver
   intacte en la rallumant. Comme FREEZE GRANULAIRE : aucun MediaRecorder,
   aucun AudioWorklet — la capture écrit directement dans un AudioBuffer via
   un ScriptProcessorNode, échantillon par échantillon, aux instants exacts
   de ev.playbackTime, correct en direct comme dans un rendu
   OfflineAudioContext (export WAV, figer une machine).

   RECORD arme la piste : l'enregistrement démarre au prochain temps fort
   (seizième CLK reçue, comme partout ailleurs) et dure le nombre de MESURES
   réglé, puis boucle automatiquement — pas de second geste pour arrêter,
   comme une prise à durée fixe plutôt qu'un pédalier à deux appuis. Un
   fondu (FONDU ms) est appliqué à l'entrée et à la sortie du fragment capté
   une fois qu'il est fini, pour que la boucle ne claque pas au raccord ;
   simplification délibérée (un fondu à chaque bord plutôt qu'un vrai
   recouvrement) dans le même esprit que les autres traitements légers de
   l'application. Chaque piste ne retient qu'une seule prise à la fois : ré-
   armer RECORD remplace la phrase en cours dès que la nouvelle est captée,
   sans mélanger les deux (pas d'overdub dans ce premier lot). Capacité fixe
   de 8 s par piste (mono) : au-delà, MESURES est simplement borné pour ne
   jamais dépasser le tampon. */
var EUR_LOOPER = (function(){
  "use strict";
  var MAXDUR = 8;
  var kns = [["mes","MESURES",1,4,2],["fondu","FONDU ms",1,60,10],["niv","NIVEAU",0,100,80],
    ["niv1","NIVEAU 1",0,100,80],["niv2","NIVEAU 2",0,100,80],["niv3","NIVEAU 3",0,100,80],["niv4","NIVEAU 4",0,100,80]];
  function borne(v,a,b,d){return Number.isFinite(v)?Math.max(a,Math.min(b,v)):d;}
  function entier(v,a,b,d){return Math.round(borne(v,a,b,d));}
  function normaliser(m){if(!m.p)m.p={};kns.forEach(function(k){m.p[k[0]]=borne(m.p[k[0]],k[2],k[3],k[4]);});}

  function fondre(chan,n,bordEchant){
    var b=Math.max(1,Math.min(bordEchant,Math.floor(n/2)));
    for(var i=0;i<b;i++){var g=i/b;chan[i]*=g;chan[n-1-i]*=g;}
  }

  function creer(m){
    normaliser(m);
    var sr=ctx.sampleRate,n=Math.ceil(MAXDUR*sr)+2048,ferme=false;
    var entree=eurGain(1),out=eurGain(1),mix=eurGain(1);mix.connect(out);
    var sp=ctx.createScriptProcessor(1024,1,1),zero=eurGain(0);
    entree.connect(sp);sp.connect(zero);zero.connect(ctx.destination);
    var pistes=[];
    for(var i=0;i<4;i++){
      var buf=ctx.createBuffer(1,n,sr),g=eurGain(borne(m.p["niv"+(i+1)],0,100,80)/100);g.connect(mix);
      pistes.push({buf:buf,chan:buf.getChannelData(0),gain:g,src:null,
        arme:false,enregistre:false,lecture:false,muet:false,
        debut:0,fin:0,longueur:0,nEch:0,bord:1});
    }
    var pasCompte=-1;
    /* L'écriture ne dépend que des bornes temporelles (debut/fin), jamais
       d'un drapeau mis à jour en code JS "logique" : scheduleEur appelle
       recevoir() par avance, avant que le moteur audio ait réellement rendu
       l'instant t (même principe que FREEZE GRANULAIRE, voir sa note d'en-
       tête) — dans un rendu OfflineAudioContext, tous les recevoir() d'une
       passe s'exécutent avant qu'un seul échantillon soit réellement rendu.
       Le fondu est calculé échantillon par échantillon pendant l'écriture,
       pas en une passe après coup sur tout le tampon : une passe après coup
       s'exécuterait elle aussi trop tôt, sur un tampon encore vide. */
    sp.onaudioprocess=function(ev){
      var t0=ev.playbackTime,ib=ev.inputBuffer,len=ib.length,l=ib.getChannelData(0);
      pistes.forEach(function(tr){
        if(tr.fin<=tr.debut)return;
        for(var i2=0;i2<len;i2++){
          var tt=t0+i2/sr;if(tt<tr.debut||tt>=tr.fin)continue;
          var idx=Math.round((tt-tr.debut)*sr);if(idx<0||idx>=tr.nEch)continue;
          var g=1;
          if(idx<tr.bord)g=idx/tr.bord;else if(idx>=tr.nEch-tr.bord)g=(tr.nEch-1-idx)/tr.bord;
          tr.chan[idx]=l[i2]*g;
        }
      });
    };
    function arreterSource(tr){if(tr.src){try{tr.src.stop();}catch(e){}try{tr.src.disconnect();}catch(e){}tr.src=null;}}
    function finaliser(tr,t){
      tr.enregistre=false;
      arreterSource(tr);
      var src=ctx.createBufferSource();src.buffer=tr.buf;src.loop=true;src.loopStart=0;src.loopEnd=tr.longueur;
      src.connect(tr.gain);src.start(t,0);tr.src=src;tr.lecture=true;tr.pret=true;
    }
    m.recevoir=function(t,e){
      if(ferme||!Number.isFinite(t)||t<0)return null;
      if(e==="rst"){pasCompte=-1;pistes.forEach(function(tr){tr.arme=false;});return null;}
      if(e!=="clk")return null;
      pasCompte++;if(pasCompte%16!==0)return null;
      normaliser(m);var mesures=entier(m.p.mes,1,4,2);
      pistes.forEach(function(tr){
        if(tr.arme&&!tr.enregistre){
          tr.arme=false;tr.enregistre=true;tr.debut=t;tr.pret=false;
          tr.longueur=Math.min(MAXDUR,mesures*16*stepDur());tr.fin=t+tr.longueur;
          tr.nEch=Math.max(1,Math.round(tr.longueur*sr));
          tr.bord=Math.max(1,Math.min(Math.round(borne(m.p.fondu,1,60,10)*sr/1000),Math.floor(tr.nEch/2)));
        }else if(tr.enregistre&&t+1e-7>=tr.fin){
          finaliser(tr,t);
        }
      });
      return null;
    };
    m.looper={
      armer:function(i){var tr=pistes[i];if(!tr||ferme)return;if(!tr.enregistre)tr.arme=true;},
      muet:function(i,v){var tr=pistes[i];if(!tr)return;tr.muet=!!v;m.maj();},
      effacer:function(i){
        var tr=pistes[i];if(!tr)return;tr.arme=false;tr.enregistre=false;tr.lecture=false;tr.pret=false;
        tr.longueur=0;tr.fin=tr.debut;arreterSource(tr);
      },
      etat:function(i){
        var tr=pistes[i];if(!tr)return null;
        return {arme:tr.arme,enregistre:tr.enregistre,lecture:tr.lecture,muet:tr.muet,longueur:tr.longueur};
      }
    };
    m.maj=function(){
      normaliser(m);
      pistes.forEach(function(tr,i){tr.gain.gain.value=tr.muet?0:borne(m.p["niv"+(i+1)],0,100,80)/100;});
      mix.gain.value=1;out.gain.value=borne(m.p.niv,0,100,80)/100;
    };
    m.maj();
    m.arreter=function(){pistes.forEach(function(tr){tr.arme=false;tr.enregistre=false;});};
    return {e:{in:entree,clk:eurGain(1),rst:eurGain(1)},s:{out:out},detruire:function(){
      ferme=true;
      pistes.forEach(function(tr){arreterSource(tr);try{tr.gain.disconnect();}catch(e){}});
      try{sp.disconnect();}catch(e){}try{zero.disconnect();}catch(e){}sp.onaudioprocess=null;
      [entree,out,mix].forEach(function(nd){try{nd.disconnect();}catch(e){}});
    }};
  }

  /* ---------- Façade : quatre pistes, RECORD/MUET/CLEAR ---------- */
  function el(tag,classe,txt){var e=document.createElement(tag);if(classe)e.className=classe;if(txt!==undefined)e.textContent=txt;return e;}
  function bouton(p,t,cl){var b=el("button",cl,t);b.type="button";p.appendChild(b);return b;}
  function interfaceModule(parent,m,grand){
    var root=el("div","lpr "+(grand?"lpr-editeur":"lpr-mini"));parent.appendChild(root);root.dataset.module=m.id;
    function valide(){return EUR.mods.indexOf(m)>=0;}
    if(!grand){
      root.appendChild(el("p","lpr-intro","LOOPER"));
      var ouvrir=bouton(root,"OUVRIR LE LOOPER","lpr-ouvrir");
      ouvrir.addEventListener("click",function(e){e.stopPropagation();if(valide()&&typeof EUR_FOCUS!=="undefined")EUR_FOCUS.ouvrir(m.id);});
      return {rafraichir:function(){},detruire:function(){}};
    }
    var champs={};
    function modifier(k,v){if(!valide())return;m.p[k]=v;memEur();if(m.maj)m.maj();}
    function options(a,b,pas,fn){var r=[];for(var i=a;i<=b;i+=pas)r.push([i,fn?fn(i):String(i)]);return r;}
    function select(p,k,t,l){
      var lab=el("label",""),s=el("select","");lab.appendChild(el("span","",t));s.dataset.champ=k;s.setAttribute("aria-label",t);
      l.forEach(function(x){var o=el("option","",x[1]);o.value=x[0];s.appendChild(o);});
      s.addEventListener("change",function(){modifier(k,+s.value);});lab.appendChild(s);p.appendChild(lab);champs[k]=s;
    }
    root.appendChild(el("p","lpr-intro","QUATRE PISTES · PHRASES CONSERVÉES"));
    var reglages=el("div","lpr-reglages");root.appendChild(reglages);
    select(reglages,"mes","MESURES",options(1,4,1,function(n){return n+" mesure"+(n>1?"s":"");}));
    select(reglages,"fondu","FONDU",options(1,60,1,function(n){return n+" ms";}));
    select(reglages,"niv","NIVEAU",options(0,100,5,function(n){return n+" %";}));
    select(reglages,"niv1","NIVEAU 1",options(0,100,5,function(n){return n+" %";}));
    select(reglages,"niv2","NIVEAU 2",options(0,100,5,function(n){return n+" %";}));
    select(reglages,"niv3","NIVEAU 3",options(0,100,5,function(n){return n+" %";}));
    select(reglages,"niv4","NIVEAU 4",options(0,100,5,function(n){return n+" %";}));
    Object.keys(champs).forEach(function(k){champs[k].value=m.p[k];});
    var pistesEl=[];
    var grille=el("div","lpr-pistes");root.appendChild(grille);
    for(var i=0;i<4;i++)(function(i){
      var piste=el("div","lpr-piste");grille.appendChild(piste);
      piste.appendChild(el("strong","lpr-num","PISTE "+(i+1)));
      var etat=el("p","lpr-etat");piste.appendChild(etat);
      var actions=el("div","lpr-actions");piste.appendChild(actions);
      var rec=bouton(actions,"RECORD","lpr-rec");
      rec.addEventListener("click",function(e){e.stopPropagation();if(valide())m.looper.armer(i);maj();});
      var muet=bouton(actions,"MUET","lpr-muet");
      muet.addEventListener("click",function(e){e.stopPropagation();if(!valide())return;var d=m.looper.etat(i);m.looper.muet(i,!d.muet);maj();});
      var clear=bouton(actions,"CLEAR","lpr-clear");
      clear.addEventListener("click",function(e){e.stopPropagation();if(!valide())return;if(!window.confirm("Effacer la phrase de la piste "+(i+1)+" ?"))return;m.looper.effacer(i);maj();});
      pistesEl.push({piste:piste,etat:etat,rec:rec,muet:muet});
    })(i);
    root.appendChild(el("p","lpr-aide","RECORD arme la piste : la capture démarre au prochain temps fort et dure le nombre de MESURES réglé, puis boucle toute seule. MUET coupe la piste sans effacer sa phrase ; CLEAR la vide pour de bon. IN reçoit le signal à capturer, CLK cadence les temps forts, RST désarme tout sans rien effacer."));
    function maj(){
      pistesEl.forEach(function(v,i){
        var d=m.looper?m.looper.etat(i):null;
        var txt=!d?"—":d.enregistre?"ENREGISTRE…":d.arme?"ARMÉE · PROCHAIN TEMPS FORT":d.lecture?(d.muet?"EN BOUCLE · MUET":"EN BOUCLE"):"VIDE";
        v.etat.textContent=txt;
        v.rec.classList.toggle("actif",!!(d&&(d.arme||d.enregistre)));
        v.muet.classList.toggle("actif",!!(d&&d.muet));
        v.muet.setAttribute("aria-pressed",String(!!(d&&d.muet)));
      });
    }
    maj();
    return {rafraichir:maj,detruire:function(){}};
  }

  EUR_CAT.looper={nom:"LOOPER DE RACK",hp:248,sombre:true,fam:"effet",
    res:"Quatre pistes qui captent une phrase sur IN puis la bouclent ; RECORD arme la piste, MUET la coupe sans l'effacer, CLEAR la vide.",
    kns:kns,jacks:[["in","IN",0],["clk","CLK",0],["rst","RST",0],["out","OUT",1]],creer:creer,interface:interfaceModule,
    focusLabel:"CAPTUREZ ET BOUCLEZ QUATRE PHRASES",focusValeur:"LOOPER"};
  EUR_ORDRE.push("looper");
  return {normaliser:normaliser,fondre:fondre,maxdur:MAXDUR};
})();

/* ================= MÉLO 32 — v280 =================
   Séquence mélodique indépendante, 32 notes MIDI, silences, accents, glissés.
   CV : 0 V = LA1 (55 Hz), 1 V = une octave ; l'accord final dépend du VCO.
   Tous les réglages persistants sont numériques dans m.p (format rack inchangé).
   Aucun analyseur ne sert à décider la note d'un événement préparé en avance. */
var EUR_MELO32 = (function(){
  "use strict";
  var gammes=[
    ["CHROMATIQUE",[0,1,2,3,4,5,6,7,8,9,10,11]],
    ["MINEURE",[0,2,3,5,7,8,10]], ["MAJEURE",[0,2,4,5,7,9,11]],
    ["DORIENNE",[0,2,3,5,7,9,10]], ["PENTA MINEURE",[0,3,5,7,10]]
  ];
  var noms=["DO","DO♯","RÉ","RÉ♯","MI","FA","FA♯","SOL","SOL♯","LA","LA♯","SI"];
  var directions=["AVANT","ARRIÈRE","ALLER-RETOUR","ALÉATOIRE"];
  var kns=[["len","LONGUEUR",1,32,32],["dir","SENS",0,3,0],["root","TONIQUE",0,11,9],
    ["scale","GAMME",0,4,1],["trans","TRANSPOSE",-24,24,0],["glide","GLISSÉ ms",0,250,60],["mute","MUET",0,1,0]];
  var motif=[33,33,40,33,36,40,43,40,38,38,45,38,36,43,40,36];
  for(var i=1;i<=32;i++) kns.push(["n"+i,"NOTE "+i,24,84,motif[(i-1)%16]],
    ["on"+i,"ACTIF "+i,0,1,1],["a"+i,"ACCENT "+i,0,1,i%4===1?1:0],
    ["s"+i,"GLISSÉ "+i,0,1,0],["p"+i,"CHANCE "+i,0,100,100]);
  function entier(v,min,max,def){return Number.isFinite(v)?Math.max(min,Math.min(max,Math.round(v))):def;}
  function normaliser(m){if(!m.p)m.p={};kns.forEach(function(k){m.p[k[0]]=entier(m.p[k[0]],k[2],k[3],k[4]);});}
  function quantifier(note,root,scale){
    note=entier(note,0,127,33); root=entier(root,0,11,9); scale=entier(scale,0,4,1);
    var g=gammes[scale][1];
    /* Recherche des deux côtés, y compris à la frontière d'octave. Égalité : note basse. */
    for(var d=0;d<=12;d++){
      if(note-d>=0 && g.indexOf(((note-d-root)%12+12)%12)>=0) return note-d;
      if(note+d<=127 && g.indexOf(((note+d-root)%12+12)%12)>=0) return note+d;
    }
    return note;
  }
  function noteJouee(m,i){return quantifier(entier(m.p["n"+i],24,84,33)+entier(m.p.trans,-24,24,0),m.p.root,m.p.scale);}
  function noteNom(n){return noms[((n%12)+12)%12]+(Math.floor(n/12)-1);}
  function creer(m){
    normaliser(m);
    var ports={cv:eurConst(0),gate:eurConst(0),acc:eurConst(0)};
    var d=m.melo32={pos:-1,sens:1,dernier:null,jouee:false,rampe:null,histoire:[],dates:[],entendu:null,mode:m.p.dir};
    function valeur(r,t){return !r?0:t>=r.fin?r.b:t<=r.t?r.a:r.a+(r.b-r.a)*(t-r.t)/(r.fin-r.t);}
    function hauteur(t){
      for(var i=d.histoire.length-1;i>=0;i--)if(d.histoire[i].t<=t)return valeur(d.histoire[i],t);
      return 0;
    }
    function fermer(t){
      [ports.gate,ports.acc].forEach(function(p){p.offset.cancelScheduledValues(t);p.offset.setValueAtTime(0,t);});
    }
    function annuler(t){
      var v=hauteur(t),r=null;
      for(var i=d.histoire.length-1;i>=0;i--)if(d.histoire[i].t<=t){r=d.histoire[i];break;}
      ports.cv.offset.cancelScheduledValues(t);
      /* Conserver la portion déjà programmée d'une rampe coupée par RST/STOP. */
      if(r && r.fin>t)ports.cv.offset.linearRampToValueAtTime(v,t);
      ports.cv.offset.setValueAtTime(v,t);
      d.histoire=d.histoire.filter(function(x){return x.t<t;});
      d.histoire.push({t:t,fin:t,a:v,b:v});d.rampe=d.histoire[d.histoire.length-1];
    }
    function reset(t){fermer(t);annuler(t);d.pos=-1;d.sens=1;d.dernier=null;d.jouee=false;d.mode=m.p.dir;}
    function historique(e){
      if(ctx && typeof ctx.startRendering==="function")return;
      d.dates.push(e);if(d.dates.length>128)d.dates.splice(0,d.dates.length-128);reveiller();
    }
    m.arreter=function(){
      reset(ctx?maintenantAudio():0);d.dates=[];d.entendu=null;reveiller();
    };
    m.recevoir=function(t,entree){
      if(!Number.isFinite(t)||t<0)return null;
      if(entree==="rst"){
        reset(t);d.dates=d.dates.filter(function(e){return e.t<t;});historique({t:t,pos:-1,note:null,actif:false});return null;
      }
      if(entree!=="clk" || (d.dernier!==null && t<=d.dernier+.0000001))return null;
      var intervalle=d.dernier===null?stepDur():t-d.dernier;
      intervalle=Math.max(.001,Math.min(60,intervalle));d.dernier=t;
      var L=entier(m.p.len,1,32,32),mode=entier(m.p.dir,0,3,0);
      if(mode!==d.mode){d.pos=-1;d.sens=1;d.mode=mode;}
      if(mode===3)d.pos=Math.min(L-1,Math.floor(Math.random()*L));
      else if(d.pos<0 || d.pos>=L)d.pos=mode===1?L-1:0;
      else if(mode===0)d.pos=(d.pos+1)%L;
      else if(mode===1)d.pos=(d.pos+L-1)%L;
      else if(L===1)d.pos=0;
      else{
        if(d.pos+d.sens>=L)d.sens=-1;else if(d.pos+d.sens<0)d.sens=1;
        d.pos+=d.sens;
      }
      var i=d.pos+1,chance=entier(m.p["p"+i],0,100,100);
      var actif=m.p.mute<.5 && m.p["on"+i]>=.5 && chance>0;
      if(actif && chance<100)actif=Math.random()*100<chance;
      var note=noteJouee(m,i),accent=actif && m.p["a"+i]>=.5,sorties=[];
      /* Un silence ne transpose pas la queue de la note précédente. */
      if(actif){
        var a=valeur(d.rampe,t),b=(note-33)/12;
        var glisse=d.jouee && m.p["s"+i]>=.5 ? Math.min(entier(m.p.glide,0,250,60)/1000,intervalle*.8):0;
        ports.cv.offset.cancelScheduledValues(t);
        if(d.rampe && d.rampe.fin>t)ports.cv.offset.linearRampToValueAtTime(a,t);
        ports.cv.offset.setValueAtTime(glisse?a:b,t);
        if(glisse)ports.cv.offset.linearRampToValueAtTime(b,t+glisse);
        d.rampe={t:t,fin:t+glisse,a:glisse?a:b,b:b};
        d.histoire.push(d.rampe);
        /* Hors ligne : seule la dernière rampe sert au prochain CLK. En direct,
           garder celle en cours et le look-ahead, pas toute la durée du morceau. */
        if(ctx && typeof ctx.startRendering==="function")d.histoire=[d.rampe];
        else{
          var now=ctx?maintenantAudio():t;
          while(d.histoire.length>1 && d.histoire[1].t<=now)d.histoire.shift();
        }
        fermer(t);
        if(accent){eurPorte(ports.acc,t,Math.min(.012,intervalle*.45));sorties.push("acc");}
        eurPorte(ports.gate,t,Math.min(.012,intervalle*.45));sorties.push("gate");
        d.jouee=true;
      }else{fermer(t);d.jouee=false;}
      historique({t:t,pos:d.pos,note:note,actif:actif,accent:accent,glisse:actif && !!glisse});
      /* ACC avant GATE : ACID doit recevoir l'accent avant son déclenchement. */
      return sorties;
    };
    return {e:{clk:eurGain(1),rst:eurGain(1)},s:ports};
  }
  var vues=[],raf=0;
  function visible(v){
    if(typeof document==="undefined"||document.hidden||!v.el.isConnected||EUR.mods.indexOf(v.m)<0)return false;
    if(document.body.classList.contains("menu-ouvert"))return false;
    if(v.grand){var f=v.el.closest("#eur-focus");return !!f && f.classList.contains("show");}
    return !panneauVisible() && v.el.getClientRects().length>0 && (S.modele==="eur" || (typeof ENS!=="undefined" && ENS.actif));
  }
  function dessinerTemps(){
    raf=0;vues=vues.filter(function(v){return v.el.isConnected && EUR.mods.indexOf(v.m)>=0;});
    var now=ctx?maintenantAudio():0,actifs=vues.filter(visible);
    actifs.forEach(function(v){var d=v.m.melo32;if(d)while(d.dates.length && d.dates[0].t<=now)d.entendu=d.dates.shift();
      v.temps(S.run && ctx && ctx.state==="running" && d?d.entendu:null);});
    if(actifs.length && S.run && ctx && ctx.state==="running")raf=requestAnimationFrame(dessinerTemps);
  }
  function reveiller(){if(typeof document!=="undefined" && typeof requestAnimationFrame==="function" && !raf && vues.some(visible))raf=requestAnimationFrame(dessinerTemps);}
  function rafraichir(m){vues=vues.filter(function(v){return v.el.isConnected && EUR.mods.indexOf(v.m)>=0;});vues.forEach(function(v){if(v.m===m)v.maj();});reveiller();}
  function el(tag,classe,txt){var e=document.createElement(tag);if(classe)e.className=classe;if(txt!==undefined)e.textContent=txt;return e;}
  function bouton(parent,txt,fn,classe){var b=el("button",classe,txt);b.type="button";b.addEventListener("click",function(e){e.stopPropagation();fn();});parent.appendChild(b);return b;}
  function interfaceModule(parent,m,grand){
    var root=el("div","ml32 "+(grand?"ml32-editeur":"ml32-mini"));parent.appendChild(root);root.dataset.module=m.id;
    var page=0,selection=0,cellules=[],champs={},etat=el("p","ml32-etat");
    function valide(){return EUR.mods.indexOf(m)>=0;}
    function modifier(k,v){if(!valide())return;m.p[k]=v;memEur();rafraichir(m);}
    function plage(a,b,f){var r=[];for(var i=a;i<=b;i++)r.push([i,f?f(i):String(i)]);return r;}
    function select(parent,cle,titre,options,fn){
      var l=el("label",""),s=el("select","");l.appendChild(el("span","",titre));s.dataset.champ=cle;s.setAttribute("aria-label",titre);
      options.forEach(function(x){var o=el("option","",x[1]);o.value=x[0];s.appendChild(o);});
      s.addEventListener("change",function(){if(valide())fn(+s.value);});l.appendChild(s);parent.appendChild(l);champs[cle]=s;
    }
    if(!grand){
      root.appendChild(el("p","ml32-intro","32 NOTES · GAMMES · ACCENTS"));
      var apercu=bouton(root,"",function(){if(valide() && typeof EUR_FOCUS!=="undefined")EUR_FOCUS.ouvrir(m.id);},"ml32-apercu");
      apercu.setAttribute("aria-label","Éditer les 32 notes dans Focus");
      for(var i=0;i<32;i++)apercu.appendChild(el("span","ml32-point"));
      root.appendChild(etat);
    }else{
      var pages=el("div","ml32-pages");root.appendChild(pages);
      [0,1].forEach(function(n){var b=bouton(pages,n?"PAS 17–32":"PAS 1–16",function(){page=n;selection=n*16;maj();reveiller();});b.dataset.page=n;});
      var grille=el("div","ml32-grille");root.appendChild(grille);
      for(var n=0;n<16;n++)(function(i){
        var b=bouton(grille,"",function(){selection=page*16+i;maj();reveiller();},"ml32-pas");
        b.appendChild(el("span","ml32-num"));b.appendChild(el("strong","ml32-note"));b.appendChild(el("small","ml32-flags"));cellules.push(b);
      })(n);
      var titre=el("h3","ml32-titre","PAS 1"),detail=el("div","ml32-detail");root.appendChild(titre);root.appendChild(detail);
      select(detail,"note","NOTE ÉCRITE",plage(24,84,noteNom),function(n){modifier("n"+(selection+1),n);});
      select(detail,"prob","PROBABILITÉ DU PAS",plage(0,100,function(n){return n+" %";}),function(n){modifier("p"+(selection+1),n);});
      [["on","NOTE ACTIVE","SILENCE"],["a","ACCENT OUI","ACCENT NON"],["s","GLISSÉ OUI","GLISSÉ NON"]].forEach(function(x){
        var b=bouton(detail,"",function(){var k=x[0]+(selection+1);modifier(k,m.p[k]?0:1);},"ml32-"+x[0]);b.dataset.champPas=x[0];
      });
      var calcule=el("output","ml32-calcule");detail.appendChild(calcule);
      root.appendChild(etat);
      var glob=el("div","ml32-global");root.appendChild(glob);
      select(glob,"len","LONGUEUR",plage(1,32,function(n){return n+" pas";}),function(n){modifier("len",n);});
      select(glob,"dir","SENS DE LECTURE",directions.map(function(x,i){return [i,x];}),function(n){modifier("dir",n);});
      select(glob,"root","TONIQUE",noms.map(function(x,i){return [i,x];}),function(n){modifier("root",n);});
      select(glob,"scale","GAMME",gammes.map(function(x,i){return [i,x[0]];}),function(n){modifier("scale",n);});
      select(glob,"trans","TRANSPOSITION",plage(-24,24,function(n){return (n>0?"+":"")+n+" demi-tons";}),function(n){modifier("trans",n);});
      select(glob,"glide","DURÉE DU GLISSÉ",plage(0,250,function(n){return n+" ms";}),function(n){modifier("glide",n);});
      bouton(root,"",function(){modifier("mute",m.p.mute?0:1);},"ml32-mute");
      var actions=el("div","ml32-actions");root.appendChild(actions);
      bouton(actions,"COPIER CETTE PAGE",function(){
        if(!valide()||!window.confirm("Copier les seize pas de cette page sur l'autre ? Ses notes, silences, accents, glissés et probabilités seront remplacés."))return;
        for(var i=1;i<=16;i++)["n","on","a","s","p"].forEach(function(k){m.p[k+((1-page)*16+i)]=m.p[k+(page*16+i)];});memEur();rafraichir(m);
      },"ml32-copier");
      bouton(actions,"TOUT EN SILENCE",function(){
        if(!valide()||!window.confirm("Mettre les 32 pas en silence ? Les notes et leurs réglages seront conservés."))return;
        for(var i=1;i<=32;i++)m.p["on"+i]=0;memEur();rafraichir(m);
      },"ml32-silences");
      root.appendChild(el("p","ml32-aide","Touchez un pas puis choisissez sa note. ACCENT émet une impulsion séparée avant GATE ; reliez ACC à un module compatible (ACID, par exemple). GLISSÉ rejoint cette note depuis la précédente, sans liaison de portes. Après un silence, la reprise est franche. Transposition puis gamme changent la note jouée sans effacer l'écriture. CV vers V/OCT, GATE vers une enveloppe, CLK vers l'horloge. L'affichage suppose un oscillateur accordé à 55 Hz pour 0 V ; son réglage OCT peut le décaler. Les queues des enveloppes restent naturelles pendant les silences."));
    }
    function maj(){
      if(!valide())return;
      if(!grand){
        root.querySelectorAll(".ml32-point").forEach(function(e,i){e.textContent=noteNom(noteJouee(m,i+1));e.classList.toggle("silence",!m.p["on"+(i+1)]);e.classList.toggle("hors",i>=m.p.len);e.classList.toggle("accent",!!m.p["a"+(i+1)]);});
        temps(null);return;
      }
      root.querySelectorAll("[data-page]").forEach(function(b){b.setAttribute("aria-pressed",String(+b.dataset.page===page));});
      cellules.forEach(function(b,i){var n=page*16+i+1;b.dataset.pas=n;b.querySelector(".ml32-num").textContent=String(n).padStart(2,"0");
        b.querySelector(".ml32-note").textContent=m.p["on"+n]?noteNom(noteJouee(m,n)):"—";
        b.querySelector(".ml32-flags").textContent=(m.p["a"+n]?"ACC ":"")+(m.p["s"+n]?"↗ ":"")+(m.p["p"+n]<100?m.p["p"+n]+"%":"");
        b.classList.toggle("hors",n>m.p.len);b.classList.toggle("silence",!m.p["on"+n]);b.setAttribute("aria-pressed",String(n===selection+1));
        b.setAttribute("aria-label","Pas "+n+", "+(m.p["on"+n]?noteNom(noteJouee(m,n)):"silence")+(n>m.p.len?", hors longueur":""));
      });
      var n=selection+1;root.querySelector(".ml32-titre").textContent="ÉDITER LE PAS "+n;
      champs.note.value=m.p["n"+n];champs.prob.value=m.p["p"+n];
      [["on","NOTE ACTIVE","SILENCE"],["a","ACCENT OUI","ACCENT NON"],["s","GLISSÉ OUI","GLISSÉ NON"]].forEach(function(x){var b=root.querySelector(".ml32-"+x[0]),v=!!m.p[x[0]+n];b.textContent=v?x[1]:x[2];b.setAttribute("aria-pressed",String(v));});
      ["len","dir","root","scale","trans","glide"].forEach(function(k){champs[k].value=m.p[k];});
      root.querySelector(".ml32-calcule").textContent=noteNom(m.p["n"+n])+" → "+noteNom(noteJouee(m,n))+" · "+((noteJouee(m,n)-33)/12).toFixed(3).replace(".",",")+" V";
      var mute=root.querySelector(".ml32-mute");mute.textContent=m.p.mute?"SÉQUENCE MUETTE":"SÉQUENCE ACTIVE";mute.setAttribute("aria-pressed",String(!!m.p.mute));temps(null);
    }
    function temps(d){
      var liste=grand?cellules:Array.from(root.querySelectorAll(".ml32-point"));
      liste.forEach(function(e,i){e.classList.toggle("courant",!!d && d.pos===(grand?page*16+i:i));});
      var txt=noms[m.p.root]+" "+gammes[m.p.scale][0]+" · "+m.p.len+" PAS";
      if(m.p.mute)txt+=" · MUETTE";
      else if(d && d.pos>=0)txt+=" · "+(d.pos+1)+" : "+(d.actif?noteNom(d.note)+(d.accent?" ACC":"")+(d.glisse?" ↗":""):"SILENCE");
      else txt+=S.run?" · ATTENTE CLK":" · ARRÊT";
      if(etat.textContent!==txt)etat.textContent=txt;
    }
    var vue={el:root,m:m,grand:grand,maj:maj,temps:temps};vues.push(vue);maj();reveiller();
    return {rafraichir:maj,detruire:function(){vues=vues.filter(function(v){return v!==vue;});}};
  }
  EUR_CAT.melo32={nom:"MÉLO 32",hp:268,sombre:true,fam:"seq",res:"32 notes, silences, accents, glissés, gammes et quatre sens de lecture",
    kns:kns,jacks:[["clk","CLK",0],["rst","RST",0],["cv","CV",1],["gate","GATE",1],["acc","ACC",1]],
    creer:creer,interface:interfaceModule,focusLabel:"CHOISISSEZ UN PAS PUIS SA NOTE",focusValeur:"32 NOTES"};
  EUR_ORDRE.push("melo32");
  if(typeof document!=="undefined"){
    new MutationObserver(reveiller).observe(document.body,{attributes:true,attributeFilter:["class"]});
    new MutationObserver(reveiller).observe(document.getElementById("eur-play"),{attributes:true,attributeFilter:["class"]});
    document.addEventListener("visibilitychange",reveiller);
  }
  return {normaliser:normaliser,quantifier:quantifier,noteJouee:noteJouee,noteNom:noteNom,rafraichir:rafraichir,reveiller:reveiller};
})();

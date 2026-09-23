/* ================= SCÈNES 8 — v281, cycle réglable v291 =================
   Huit scènes de niveaux CV pour organiser quatre parties sans arrêter leurs
   séquenceurs. 16 impulsions CLK = une mesure par défaut ; PAS/MESURE (v291,
   voir CYCLES LIBRES) permet de choisir un autre cycle (7/8, 9/8, 5/4 ou un
   compte libre de 4 à 32) pour que les changements de scène le suivent. Ce
   n'est pas un lecteur audio. Le changement est programmé à la date audio,
   jamais par un timer graphique. Paramètres numériques dans m.p ; pas de
   modification du format des racks. */
var EUR_SCENES8 = (function(){
  "use strict";
  var voies=["a","b","c","d"],noms=["INTRO","MONTÉE","PLEIN","BREAK","REPRISE","SORTIE","LIBRE"];
  var kns=[["len","SCÈNES",1,8,8],["pasmes","PAS/MESURE",4,32,16],["fade","FONDU ms",0,1000,80],["hold","TENIR",0,1,0]];
  var niveaux=[[65,0,0,70],[80,100,0,50],[100,100,65,40],[100,100,100,60],
               [0,0,80,100],[100,100,100,70],[100,100,45,20],[0,0,0,90]];
  for(var i=1;i<=8;i++){
    kns.push(["bars"+i,"MESURES "+i,1,16,1],["nom"+i,"RÔLE "+i,0,6,[0,1,1,2,3,4,2,5][i-1]]);
    voies.forEach(function(k,j){kns.push([k+i,k.toUpperCase()+" "+i,0,100,niveaux[i-1][j]]);});
  }
  function entier(v,min,max,def){return Number.isFinite(v)?Math.max(min,Math.min(max,Math.round(v))):def;}
  function normaliser(m){if(!m.p)m.p={};kns.forEach(function(k){m.p[k[0]]=entier(m.p[k[0]],k[2],k[3],k[4]);});}
  function duree(m,i){return entier(m.p["bars"+(i+1)],1,16,1);}
  function longueur(m){var s=0;for(var i=0;i<entier(m.p.len,1,8,8);i++)s+=duree(m,i);return s;}
  function valeur(r,t){return !r?0:t>=r.fin?r.b:t<=r.t?r.a:r.a+(r.b-r.a)*(t-r.t)/(r.fin-r.t);}
  function creer(m){
    normaliser(m);
    var ports={a:eurConst(0),b:eurConst(0),c:eurConst(0),d:eurConst(0),clk:eurConst(0),bar:eurConst(0),change:eurConst(0)};
    var d=m.scenes8={scene:-1,pas:-1,dernier:null,reset:0,bars:1,nom:0,tenue:false,
      niveaux:[0,0,0,0],hist:{a:[],b:[],c:[],d:[]},dates:[],entendu:null};
    function rampe(k,t,b,ms,force){
      var l=d.hist[k],r=null;
      for(var i=l.length-1;i>=0;i--)if(l[i].t<=t){r=l[i];break;}
      if(!force && r && r.b===b && l[l.length-1]===r)return;
      var a=valeur(r,t),p=ports[k].offset;
      p.cancelScheduledValues(t);
      /* Couper une rampe conserve la partie qui précède t, même si une autre
         scène avait déjà été préparée dans le look-ahead. */
      if(r && r.fin>t)p.linearRampToValueAtTime(a,t);
      p.setValueAtTime(ms?a:b,t);
      if(ms)p.linearRampToValueAtTime(b,t+ms/1000);
      var n={t:t,fin:t+ms/1000,a:ms?a:b,b:b};
      if(ctx && typeof ctx.startRendering==="function")d.hist[k]=[n];
      else{
        l=d.hist[k]=l.filter(function(x){return x.t<t;});l.push(n);
        var now=ctx?maintenantAudio():t;
        while(l.length>1 && l[1].t<=now)l.shift();
      }
    }
    function historique(e){
      if(ctx && typeof ctx.startRendering==="function")return;
      d.dates.push(e);if(d.dates.length>128)d.dates.splice(0,d.dates.length-128);reveiller();
    }
    function reset(t){
      ["clk","bar","change"].forEach(function(k){ports[k].offset.cancelScheduledValues(t);ports[k].offset.setValueAtTime(0,t);});
      voies.forEach(function(k){rampe(k,t,0,5,true);});
      d.scene=-1;d.pas=-1;d.dernier=null;d.reset=t;d.niveaux=[0,0,0,0];d.tenue=false;
      d.dates=d.dates.filter(function(x){return x.t<t;});
    }
    m.arreter=function(){reset(ctx?maintenantAudio():0);d.dates=[];d.entendu=null;reveiller();};
    m.recevoir=function(t,entree){
      if(!Number.isFinite(t)||t<0)return null;
      if(entree==="rst"){reset(t);historique({t:t,scene:-1});return null;}
      if(entree!=="in" || t<d.reset || (d.dernier!==null && t<=d.dernier+.0000001))return null;
      var intervalle=d.dernier===null?stepDur():t-d.dernier;
      intervalle=Math.max(.001,Math.min(60,intervalle));d.dernier=t;
      var nouvelle=false,L=entier(m.p.len,1,8,8),cycle=EUR_CYCLE.val(m.p.pasmes);
      if(d.scene<0){d.scene=0;d.pas=0;nouvelle=true;}else d.pas++;
      var mesure=d.pas%cycle===0;
      if(mesure){
        if(d.scene>=L){d.scene=0;d.pas=0;nouvelle=true;}
        else if(!nouvelle && d.pas>=duree(m,d.scene)*cycle){
          if(m.p.hold>=.5)d.pas=duree(m,d.scene)*cycle-cycle; // répéter la dernière mesure
          else{d.scene=(d.scene+1)%L;d.pas=0;nouvelle=true;}
        }
        d.bars=duree(m,d.scene);d.nom=entier(m.p["nom"+(d.scene+1)],0,6,6);d.tenue=m.p.hold>=.5;
        voies.forEach(function(k,j){
          var n=entier(m.p[k+(d.scene+1)],0,100,0);d.niveaux[j]=n;
          rampe(k,t,n/100,entier(m.p.fade,0,1000,80),false);
        });
      }
      /* Les sorties d'événements ne contiennent pas les CV continus A–D.
         SCÈNE puis MESURE puis CLK : câblés directement, RST précède CLK. */
      var f=[],lg=Math.min(.012,intervalle*.45);
      if(nouvelle){eurPorte(ports.change,t,lg);f.push("change");}
      if(mesure){eurPorte(ports.bar,t,lg);f.push("bar");}
      eurPorte(ports.clk,t,lg);f.push("clk");
      historique({t:t,scene:d.scene,pas:d.pas,bars:d.bars,nom:d.nom,tenue:d.tenue,cycle:cycle,niveaux:d.niveaux.slice()});
      return f;
    };
    return {e:{in:eurGain(1),rst:eurGain(1)},s:ports};
  }
  var vues=[],raf=0,dernierDessin=-Infinity;
  function visible(v){
    if(typeof document==="undefined"||document.hidden||!v.el.isConnected||EUR.mods.indexOf(v.m)<0)return false;
    if(document.body.classList.contains("menu-ouvert"))return false;
    if(v.grand){var f=v.el.closest("#eur-focus");return !!f&&f.classList.contains("show");}
    return !panneauVisible() && v.el.getClientRects().length>0 && (S.modele==="eur"||(typeof ENS!=="undefined"&&ENS.actif));
  }
  function dessinerTemps(ms){
    raf=0;vues=vues.filter(function(v){return v.el.isConnected&&EUR.mods.indexOf(v.m)>=0;});
    var actifs=vues.filter(visible),now=ctx?maintenantAudio():0;
    if(ms-dernierDessin>=45 || !S.run){
      dernierDessin=ms;
      actifs.forEach(function(v){var d=v.m.scenes8;if(d)while(d.dates.length&&d.dates[0].t<=now)d.entendu=d.dates.shift();
        v.temps(S.run&&ctx&&ctx.state==="running"&&d?d.entendu:null);});
    }
    if(actifs.length&&S.run&&ctx&&ctx.state==="running")raf=requestAnimationFrame(dessinerTemps);
  }
  function reveiller(){if(typeof document!=="undefined"&&typeof requestAnimationFrame==="function"&&!raf&&vues.some(visible)){dernierDessin=-Infinity;raf=requestAnimationFrame(dessinerTemps);}}
  function rafraichir(m){vues=vues.filter(function(v){return v.el.isConnected&&EUR.mods.indexOf(v.m)>=0;});vues.forEach(function(v){if(v.m===m)v.maj();});reveiller();}
  function el(tag,classe,txt){var e=document.createElement(tag);if(classe)e.className=classe;if(txt!==undefined)e.textContent=txt;return e;}
  function bouton(p,t,fn,cl){var b=el("button",cl,t);b.type="button";b.addEventListener("click",function(e){e.stopPropagation();fn();});p.appendChild(b);return b;}
  function interfaceModule(parent,m,grand){
    var root=el("div","sc8 "+(grand?"sc8-editeur":"sc8-mini"));parent.appendChild(root);root.dataset.module=m.id;
    var selection=entier(m._sc8edit,0,7,0),cellules=[],champs={},etat=el("p","sc8-etat");
    function valide(){return EUR.mods.indexOf(m)>=0;}
    function modifier(k,v){if(!valide())return;m.p[k]=v;memEur();rafraichir(m);}
    function options(a,b,fn){var r=[];for(var i=a;i<=b;i++)r.push([i,fn?fn(i):String(i)]);return r;}
    function select(p,k,t,l,fn){
      var lab=el("label",""),s=el("select","");lab.appendChild(el("span","",t));s.dataset.champ=k;s.setAttribute("aria-label",t);
      l.forEach(function(x){var o=el("option","",x[1]);o.value=x[0];s.appendChild(o);});
      s.addEventListener("change",function(){if(valide())fn(+s.value);});lab.appendChild(s);p.appendChild(lab);champs[k]=s;
    }
    root.appendChild(el("p","sc8-intro","8 SCÈNES · 4 NIVEAUX CV"));
    var grille=el("div","sc8-grille");root.appendChild(grille);
    for(var i=0;i<8;i++)(function(i){
      var b=bouton(grille,"",function(){
        if(!valide())return;
        if(!grand){m._sc8edit=i;if(typeof EUR_FOCUS!=="undefined")EUR_FOCUS.ouvrir(m.id);}
        else{selection=i;m._sc8edit=i;maj();reveiller();}
      },"sc8-scene");b.dataset.scene=i;
      b.appendChild(el("span","sc8-num",String(i+1)));b.appendChild(el("strong","sc8-nom"));b.appendChild(el("small","sc8-duree"));cellules.push(b);
    })(i);
    root.appendChild(etat);
    if(grand){
      root.appendChild(el("h3","sc8-titre"));
      var detail=el("div","sc8-detail");root.appendChild(detail);
      select(detail,"nom","RÔLE DE LA SCÈNE",noms.map(function(n,i){return [i,n];}),function(n){modifier("nom"+(selection+1),n);});
      select(detail,"bars","DURÉE DE LA SCÈNE",options(1,16,function(n){return n+" mesure"+(n>1?"s":"");}),function(n){modifier("bars"+(selection+1),n);});
      var niveaux=el("div","sc8-niveaux");root.appendChild(niveaux);
      voies.forEach(function(k){select(niveaux,k,"SORTIE "+k.toUpperCase(),options(0,100,function(n){return n+" % · "+(n/100).toFixed(2).replace(".",",")+" V";}),function(n){modifier(k+(selection+1),n);});});
      var glob=el("div","sc8-global");root.appendChild(glob);
      select(glob,"len","SCÈNES DANS LA BOUCLE",options(1,8),function(n){modifier("len",n);});
      select(glob,"pasmes","PAS PAR MESURE (CYCLES LIBRES)",EUR_CYCLE.presets,function(n){modifier("pasmes",n);});
      select(glob,"fade","FONDU DES NIVEAUX",[0,5,20,40,80,150,250,500,750,1000].map(function(n){return [n,n+" ms"]; }),function(n){modifier("fade",n);});
      bouton(root,"",function(){modifier("hold",m.p.hold?0:1);},"sc8-hold");
      var actions=el("div","sc8-actions");root.appendChild(actions);
      bouton(actions,"COPIER VERS LA SUIVANTE",function(){
        if(!valide())return;var a=selection+1,b=a%8+1;
        if(!window.confirm("Remplacer les réglages de la scène "+b+" par ceux de la scène "+a+" ?"))return;
        ["bars","nom","a","b","c","d"].forEach(function(k){m.p[k+b]=m.p[k+a];});memEur();rafraichir(m);
      },"sc8-copier");
      bouton(actions,"SCÈNE À ZÉRO",function(){
        if(!valide()||!window.confirm("Mettre les quatre niveaux de cette scène à zéro ? Sa durée sera conservée."))return;
        voies.forEach(function(k){m.p[k+(selection+1)]=0;});memEur();rafraichir(m);
      },"sc8-zero");
      root.appendChild(el("p","sc8-aide","Sélectionner une scène l'édite, sans y sauter. Les changements de niveaux et de durée sont pris en compte au prochain début de mesure. 16 CLK = une mesure par défaut : utilisez OUT de CLOCK. PAS PAR MESURE choisit un autre cycle (7/8, 9/8, 5/4 ou un compte libre de 4 à 32) pour que les changements de scène le suivent ; laisser à 16 pas ne change rien aux anciens montages. A–D émettent des tensions de 0 à 1 V ; reliez-les aux CV de VCA réglés à GAIN 0. Dans les deux exemples : A batterie, B basse, C mélodie, D nappe. Les séquenceurs continuent sous les parties coupées, les effets finissent leurs échos. TENIR répète la dernière mesure de la scène ; relâcher laisse ensuite avancer. RST/STOP repartent de la première scène au prochain CLK. SCÈNE et MESURE sont des impulsions, pas des niveaux audio."));
    }
    function maj(){
      if(!valide())return;
      cellules.forEach(function(b,i){
        var n=i+1,lab=noms[entier(m.p["nom"+n],0,6,6)],nb=duree(m,i);b.querySelector(".sc8-nom").textContent=lab;
        b.querySelector(".sc8-duree").textContent=nb+" MES.";b.classList.toggle("hors",i>=m.p.len);
        b.setAttribute("aria-pressed",String(grand&&i===selection));b.setAttribute("aria-label","Scène "+n+" : "+lab+", "+nb+" mesures"+(i>=m.p.len?", hors boucle":""));
      });
      if(grand){
        var n=selection+1;root.querySelector(".sc8-titre").textContent="ÉDITER LA SCÈNE "+n+(n>m.p.len?" · HORS BOUCLE":"");
        ["bars","nom","a","b","c","d"].forEach(function(k){champs[k].value=m.p[k+n];});
        champs.len.value=m.p.len;
        /* Les projets peuvent contenir un fondu entier entre deux presets. */
        if(!Array.from(champs.fade.options).some(function(o){return +o.value===m.p.fade;})){var o=el("option","",m.p.fade+" ms");o.value=m.p.fade;champs.fade.appendChild(o);}
        champs.fade.value=m.p.fade;
        /* Le cycle peut être une métrique nommée ou un compte libre (4 à 32). */
        if(!Array.from(champs.pasmes.options).some(function(o){return +o.value===m.p.pasmes;})){var oc=el("option","",m.p.pasmes+" pas · LIBRE");oc.value=m.p.pasmes;champs.pasmes.appendChild(oc);}
        champs.pasmes.value=m.p.pasmes;var hold=root.querySelector(".sc8-hold");hold.textContent=m.p.hold?"TENIR ACTIVÉ · RELÂCHER":"TENIR LA SCÈNE";hold.setAttribute("aria-pressed",String(!!m.p.hold));
      }
      temps(null);
    }
    function temps(e){
      cellules.forEach(function(b,i){b.classList.toggle("courante",!!e&&e.scene===i);});
      var txt=longueur(m)+" MESURES · BOUCLE";
      if(e&&e.scene>=0){var c=e.cycle||16;txt="LECTURE "+(e.scene+1)+" · "+noms[e.nom]+" · MESURE "+(Math.floor(e.pas/c)+1)+"/"+e.bars+" · PAS "+(e.pas%c+1)+"/"+c+(e.tenue?" · TENIR":"");}
      else txt+=S.run?" · ATTENTE CLK":" · ARRÊT";
      if(etat.textContent!==txt)etat.textContent=txt;
    }
    var vue={el:root,m:m,grand:grand,maj:maj,temps:temps};vues.push(vue);maj();reveiller();
    return {rafraichir:maj,detruire:function(){vues=vues.filter(function(v){return v!==vue;});}};
  }
  EUR_CAT.scenes8={nom:"SCÈNES 8",hp:268,sombre:true,fam:"seq",res:"Huit scènes de niveaux CV, quatre parties, durées en mesures et fondus",
    kns:kns,jacks:[["in","CLK",0],["rst","RST",0],["a","A",1],["b","B",1],["c","C",1],["d","D",1],["clk","CLK OUT",1],["bar","MESURE",1],["change","SCÈNE",1]],
    creer:creer,interface:interfaceModule,focusLabel:"ORGANISEZ L'ENTRÉE DES QUATRE PARTIES",focusValeur:"8 SCÈNES"};
  EUR_ORDRE.push("scenes8");
  if(typeof document!=="undefined"){
    new MutationObserver(reveiller).observe(document.body,{attributes:true,attributeFilter:["class"]});
    new MutationObserver(reveiller).observe(document.getElementById("eur-play"),{attributes:true,attributeFilter:["class"]});
    document.addEventListener("visibilitychange",reveiller);
  }
  return {normaliser:normaliser,longueur:longueur,rafraichir:rafraichir,reveiller:reveiller};
})();

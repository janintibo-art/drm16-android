/* ================= BREAK 32 — v282 =================
   32 pas d'édition, 16 tranches d'un break ORIGINAL synthétisé à 136 BPM.
   Les tranches sont rejouées dans l'ordre écrit : découpe, roulements, inverse,
   silences et probabilité. Aucun Amen, aucun téléchargement, aucun sample tiers.
   Le CLK règle le rythme. La transposition change aussi la durée de la tranche,
   sans time-stretch. Un nouveau pas/roulement coupe le précédent avec 3 ms de fondu. */
var EUR_BREAK32=(function(){
  "use strict";
  var I=EUR_RAVE.entier,B=EUR_RAVE.borne,cache=[],pasOrigine=60/136/4;
  var kns=[["len","LONGUEUR",1,32,32],["pitch","TRANSPOSE",-12,12,0],["tone","BRILLANCE",0,1,.8],
    ["niv","NIVEAU",0,1,.65],["mute","MUET",0,1,0]];
  for(var i=1;i<=32;i++)kns.push(["n"+i,"TRANCHE "+i,0,32,(i-1)%16+1],["r"+i,"RÉPÉTITIONS "+i,1,4,1],
    ["v"+i,"INVERSE "+i,0,1,0],["p"+i,"CHANCE "+i,0,100,100]);
  function banque(){
    var sr=ctx.sampleRate,c=cache.find(function(c){return c.sr===sr;});if(c)return c;
    var N=Math.round(sr*pasOrigine),total=N*16,d=new Float32Array(total),seed=282;
    function bruit(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;}
    function frappe(s,type,vel){
      var duree=type===0?.26:type===1?.19:.065,n=Math.ceil(duree*sr),avant=0;
      for(var j=0;j<n;j++){
        var t=j/sr,x=0;
        if(type===0){var ph=2*Math.PI*(52*t+95*.018*(1-Math.exp(-t/.018)));x=Math.sin(ph)*Math.exp(-t/.070)*.8;}
        else{var b=bruit(),h=b-avant*.88;avant=b;
          if(type===1)x=(h*.48+Math.sin(2*Math.PI*185*t)*.34)*Math.exp(-t/.037);
          else x=h*.20*Math.exp(-t/.012);
        }
        x*=Math.min(1,j/(sr*.0007));d[(s*N+j)%total]+=x*vel;
      }
    }
    [0,7,10].forEach(function(s){frappe(s,0,s===0?1:.8);});
    [4,12].forEach(function(s){frappe(s,1,1);});
    [3,6,11,15].forEach(function(s){frappe(s,1,.23);});
    for(var s=0;s<16;s++)frappe(s,2,s%2===0?.95:.50);
    var max=0,moy=0;for(var j=0;j<d.length;j++){moy+=d[j];}moy/=d.length;
    for(var j=0;j<d.length;j++){d[j]-=moy;max=Math.max(max,Math.abs(d[j]));}
    c={sr:sr,avant:[],inverse:[],duree:N/sr};
    for(var s=0;s<16;s++){
      var a=ctx.createBuffer(1,N,sr),b=ctx.createBuffer(1,N,sr),aa=a.getChannelData(0),bb=b.getChannelData(0);
      for(var j=0;j<N;j++){aa[j]=d[s*N+j]*.8/Math.max(.001,max);bb[N-1-j]=aa[j];}
      c.avant.push(a);c.inverse.push(b);
    }
    cache.push(c);if(cache.length>2)cache.shift();return c;
  }
  function normaliser(m){EUR_RAVE.normaliser(m,kns);}
  function creer(m){
    normaliser(m);if(typeof EUR_VARIATIONS!=="undefined")EUR_VARIATIONS.initialiser(m);var bank=banque(),out=eurGain(1),fil=ctx.createBiquadFilter(),pool=EUR_RAVE.panier();
    fil.type="lowpass";fil.Q.value=.6;fil.connect(out);
    var d=m.break32={pos:-1,dernier:null,barriere:0,dates:[],entendu:null};m.raveVoix=pool;
    m.maj=function(){fil.frequency.value=800*Math.pow(20,B(m.p.tone,0,1,.8));};m.maj();
    function historique(e){if(typeof ctx.startRendering==="function")return;d.dates.push(e);if(d.dates.length>128)d.dates.shift();reveiller();}
    function reset(t){if(typeof EUR_VARIATIONS!=="undefined")EUR_VARIATIONS.reset(m,t,false);pool.couper(t);d.pos=-1;d.dernier=null;d.barriere=t;d.dates=d.dates.filter(function(e){return e.t<t;});}
    m.arreter=function(){if(typeof EUR_BREAK_SAMPLES!=="undefined")EUR_BREAK_SAMPLES.arreter(m);reset(maintenantAudio());if(typeof EUR_VARIATIONS!=="undefined")EUR_VARIATIONS.reset(m,maintenantAudio(),true);d.dates=[];d.entendu=null;reveiller();};
    m.recevoir=function(t,e){
      if(!pool.actif()||!Number.isFinite(t)||t<0||t<d.barriere)return null;
      if(e==="rst"){reset(t);historique({t:t,pos:-1,n:0,r:0,v:0});return null;}
      if(e!=="clk"||(d.dernier!==null&&t<=d.dernier+.0000001))return null;
      var intervalle=B(d.dernier===null?stepDur():t-d.dernier,.002,60,.125);d.dernier=t;
      var phrase=typeof EUR_VARIATIONS!=="undefined"?EUR_VARIATIONS.debut(m,t):m.p;
      d.pos=(d.pos+1)%I(m.p.len,1,32,32);var k=d.pos+1,n=I(phrase["n"+k],0,32,0),r=I(phrase["r"+k],1,4,1),inv=phrase["v"+k]>=.5,prob=I(phrase["p"+k],0,100,100);
      if(m.p.mute>=.5||prob===0||(n&&prob<100&&Math.random()*100>=prob)||m.p.niv<=0)n=0;
      pool.couper(t);
      if(n>(m.breakSample?m.breakSample.nb:16))n=0;
      var morceau=n&&m.breakSample&&typeof EUR_BREAK_SAMPLES!=="undefined"?EUR_BREAK_SAMPLES.tranche(m,n,inv):null;
      if(n&&m.breakSample&&!morceau)n=0;
      if(n){
        var rate=Math.pow(2,I(m.p.pitch,-12,12,0)/12),buf=morceau?morceau.buffer:(inv?bank.inverse:bank.avant)[n-1];
        for(var j=0;j<r;j++){
          var depart=t+j*intervalle/r,duree=Math.min(intervalle/r,(morceau?morceau.duree:buf.duration)/rate),fin=depart+duree,fade=Math.min(.002,duree*.2);
          var src=ctx.createBufferSource(),g=eurGain(0);src.buffer=buf;src.playbackRate.value=rate;
          g.gain.setValueAtTime(0,depart);g.gain.linearRampToValueAtTime(B(m.p.niv,0,1,.65),depart+fade);
          g.gain.setValueAtTime(B(m.p.niv,0,1,.65),fin-fade);g.gain.linearRampToValueAtTime(0,fin);
          src.connect(g);g.connect(fil);if(morceau)src.start(depart,morceau.offset,morceau.duree);else src.start(depart);src.stop(fin+.0005);pool.ajouter(src,g,depart,fin+.0005,[src,g]);
        }
      }
      historique({t:t,pos:d.pos,n:n,r:n?r:0,v:inv});return null;
    };
    return {e:{clk:eurGain(1),rst:eurGain(1)},s:{out:out},detruire:function(){if(typeof EUR_BREAK_SAMPLES!=="undefined")EUR_BREAK_SAMPLES.arreter(m);pool.detruire();}};
  }
  var vues=[],raf=0;
  function visible(v){
    if(typeof document==="undefined"||document.hidden||!v.el.isConnected||EUR.mods.indexOf(v.m)<0||document.body.classList.contains("menu-ouvert"))return false;
    if(v.grand){var f=v.el.closest("#eur-focus");return !!f&&f.classList.contains("show");}
    return !panneauVisible()&&v.el.getClientRects().length>0&&(S.modele==="eur"||(typeof ENS!=="undefined"&&ENS.actif));
  }
  function temps(){
    raf=0;vues=vues.filter(function(v){return v.el.isConnected&&EUR.mods.indexOf(v.m)>=0;});var act=vues.filter(visible),now=ctx?maintenantAudio():0;
    act.forEach(function(v){var d=v.m.break32;if(d)while(d.dates.length&&d.dates[0].t<=now)d.entendu=d.dates.shift();v.temps(S.run&&ctx&&ctx.state==="running"&&d?d.entendu:null);});
    if(act.length&&S.run&&ctx&&ctx.state==="running")raf=requestAnimationFrame(temps);
  }
  function reveiller(){if(typeof requestAnimationFrame==="function"&&!raf&&vues.some(visible))raf=requestAnimationFrame(temps);}
  function rafraichir(m){vues=vues.filter(function(v){return v.el.isConnected&&EUR.mods.indexOf(v.m)>=0;});vues.forEach(function(v){if(v.m===m)v.maj();});reveiller();}
  function el(tag,cl,txt){var e=document.createElement(tag);if(cl)e.className=cl;if(txt!==undefined)e.textContent=txt;return e;}
  function bouton(p,t,fn,cl){var b=el("button",cl,t);b.type="button";b.addEventListener("click",function(e){e.stopPropagation();fn();});p.appendChild(b);return b;}
  function interfaceModule(parent,m,grand){
    var root=el("div","br32 "+(grand?"br32-editeur":"br32-mini")),sel=I(m._br32sel,0,31,0),page=Math.floor(sel/16),cases=[],champs={};
    parent.appendChild(root);root.dataset.module=m.id;
    function valide(){return EUR.mods.indexOf(m)>=0;}
    function lire(k){return typeof EUR_VARIATIONS!=="undefined"?EUR_VARIATIONS.lire(m,k):m.p[k];}
    function ecrire(k,v){if(typeof EUR_VARIATIONS!=="undefined")EUR_VARIATIONS.ecrire(m,k,v);else m.p[k]=v;}
    var variationUI=typeof EUR_VAR_UI!=="undefined"?EUR_VAR_UI.interface(root,m,grand):null;
    function mod(k,v){if(!valide())return;ecrire(k,v);if(m.maj)m.maj();memEur();rafraichir(m);}
    function options(a,b,suffixe){var r=[];for(var n=a;n<=b;n++)r.push([n,n+(suffixe||"")]);return r;}
    function select(p,k,nom,opts,fn){var lab=el("label",""),s=el("select","");lab.appendChild(el("span","",nom));s.dataset.champ=k;s.setAttribute("aria-label",nom);
      opts.forEach(function(x){var o=el("option","",x[1]);o.value=x[0];s.appendChild(o);});s.addEventListener("change",function(){if(valide())fn(+s.value);});lab.appendChild(s);p.appendChild(lab);champs[k]=s;
    }
    root.appendChild(el("p","br32-intro","BREAK ORIGINAL · 16 TRANCHES · 32 PAS"));
    var sourceUI=grand&&typeof EUR_BREAK_SAMPLES!=="undefined"?EUR_BREAK_SAMPLES.interface(root,m):null;
    var nav=el("div","br32-pages");root.appendChild(nav);
    [0,1].forEach(function(n){var b=bouton(nav,n?"PAS 17–32":"PAS 1–16",function(){page=n;sel=n*16;m._br32sel=sel;maj();reveiller();});b.dataset.page=n;});
    var grille=el("div","br32-grille");root.appendChild(grille);
    for(var i=0;i<16;i++)(function(i){var b=bouton(grille,"",function(){if(!valide())return;sel=page*16+i;m._br32sel=sel;if(!grand)EUR_FOCUS.ouvrir(m.id);else{maj();reveiller();}},"br32-pas");
      b.appendChild(el("small","br32-num"));b.appendChild(el("strong","br32-slice"));b.appendChild(el("small","br32-rep"));cases.push(b);
    })(i);
    var etat=el("p","br32-etat");root.appendChild(etat);
    if(grand){
      root.appendChild(el("h3","br32-titre"));var detail=el("div","br32-detail");root.appendChild(detail);
      select(detail,"n","TRANCHE",[[0,"SILENCE"]].concat(options(1,32)),function(n){mod("n"+(sel+1),n);});
      select(detail,"r","FRAPPES PAR PAS",options(1,4," coup(s)"),function(n){mod("r"+(sel+1),n);});
      select(detail,"v","SENS",[[0,"NORMAL"],[1,"INVERSÉ"]],function(n){mod("v"+(sel+1),n);});
      select(detail,"p","PROBABILITÉ",options(0,100," %"),function(n){mod("p"+(sel+1),n);});
      var glob=el("div","br32-global");root.appendChild(glob);
      select(glob,"len","LONGUEUR",options(1,32," pas"),function(n){mod("len",n);});
      select(glob,"pitch","TRANSPOSITION",options(-12,12," demi-ton(s)"),function(n){mod("pitch",n);});
      select(glob,"tone","BRILLANCE",options(0,100," %"),function(n){mod("tone",n/100);});
      select(glob,"niv","NIVEAU",options(0,100," %"),function(n){mod("niv",n/100);});
      bouton(root,"",function(){mod("mute",m.p.mute?0:1);},"br32-mute");
      var ac=el("div","br32-actions");root.appendChild(ac);
      bouton(ac,"COPIER CETTE PAGE",function(){if(!valide()||!window.confirm("Remplacer les 16 pas de l'autre page ?"))return;for(var i=1;i<=16;i++)["n","r","v","p"].forEach(function(k){ecrire(k+(i+(1-page)*16),lire(k+(i+page*16)));});memEur();rafraichir(m);},"br32-copier");
      bouton(ac,"VIDER CETTE PAGE",function(){if(!valide()||!window.confirm("Mettre les 16 pas de cette page en silence ?"))return;for(var i=1;i<=16;i++)ecrire("n"+(page*16+i),0);memEur();rafraichir(m);},"br32-vider");
      root.appendChild(el("p","br32-aide","CLK : une double-croche, par exemple OUT de CLOCK. Les tranches 1, 8 et 11 contiennent les kicks, 5 et 13 les caisses claires ; les autres apportent charleys, ghosts et queues. ×2 à ×4 répètent le début de la tranche dans le pas. INVERSÉ retourne sa lecture. Transposer change la vitesse et la durée, sans time-stretch ; CLK conserve le tempo. MUET et les silences gardent l'avancement. RST/STOP repartent du premier pas. BOUCLE & DÉCOUPAGE permet de charger vos sons. Sans source personnelle, le break synthétisé original reste disponible. Les numéros au-delà du nombre de tranches sont silencieux."));
    }
    function maj(){
      if(variationUI)variationUI.maj();
      var nb=m.breakSample?m.breakSample.nb:16;
      root.querySelector(".br32-intro").textContent=typeof EUR_BREAK_SAMPLES!=="undefined"?EUR_BREAK_SAMPLES.etat(m)+" · 32 PAS":"BREAK ORIGINAL · 16 TRANCHES · 32 PAS";
      if(sourceUI)sourceUI.maj();
      if(grand)Array.from(champs.n.options).forEach(function(o){o.textContent=+o.value===0?"SILENCE":o.value+(+o.value>nb?" · HORS DÉCOUPE (SILENCE)":"");});
      cases.forEach(function(b,i){var s=page*16+i+1,n=I(lire("n"+s),0,32,0),r=I(lire("r"+s),1,4,1);
        b.dataset.pas=s;b.querySelector(".br32-num").textContent=s;b.querySelector(".br32-slice").textContent=n?String(n).padStart(2,"0"):"—";
        b.querySelector(".br32-rep").textContent=n?"×"+r+(lire("v"+s)?" ↶":""):"PAUSE";
        b.classList.toggle("hors",s>m.p.len);b.setAttribute("aria-pressed",String(grand&&s===sel+1));b.setAttribute("aria-label","Pas "+s+" : "+(n?"tranche "+n+", "+r+" frappe(s)"+(lire("v"+s)?", inversée":""):"silence"));
      });
      Array.from(nav.children).forEach(function(b,i){b.setAttribute("aria-pressed",String(i===page));});
      if(grand){root.querySelector(".br32-titre").textContent="ÉDITER LE PAS "+(sel+1)+(sel>=m.p.len?" · HORS BOUCLE":"");
        ["n","r","v","p"].forEach(function(k){champs[k].value=Math.round(lire(k+(sel+1)));});champs.len.value=Math.round(m.p.len);champs.pitch.value=Math.round(m.p.pitch);
        champs.tone.value=Math.round(m.p.tone*100);champs.niv.value=Math.round(m.p.niv*100);
        var b=root.querySelector(".br32-mute");b.textContent=m.p.mute?"BREAK MUET · RÉACTIVER":"COUPER LE BREAK";b.setAttribute("aria-pressed",String(!!m.p.mute));
      }afficherTemps(null);
    }
    function afficherTemps(e){cases.forEach(function(b,i){b.classList.toggle("courant",!!e&&e.pos===page*16+i);});
      var t=e&&e.pos>=0?"PAS "+(e.pos+1)+" · "+(e.n?"TRANCHE "+e.n+" ×"+e.r+(e.v?" · INVERSÉE":""):"SILENCE"):"32 PAS · "+(S.run?"ATTENTE CLK":"ARRÊT");
      if(etat.textContent!==t)etat.textContent=t;
    }
    var vue={el:root,m:m,grand:grand,maj:maj,temps:afficherTemps};vues.push(vue);maj();reveiller();return {rafraichir:maj,detruire:function(){if(variationUI)variationUI.detruire();if(sourceUI)sourceUI.detruire();vues=vues.filter(function(v){return v!==vue;});}};
  }
  EUR_CAT.break32={nom:"BREAK 32",hp:276,sombre:true,fam:"seq",res:"Break original ou boucle personnelle : découpage visuel, 32 pas, roulements et inversions",kns:kns,
    jacks:[["clk","CLK",0],["rst","RST",0],["out","OUT",1]],creer:creer,interface:interfaceModule,focusLabel:"DÉCOUPEZ LE BREAK, PAS PAR PAS",focusValeur:"16 → 32"};
  EUR_ORDRE.push("break32");
  if(typeof document!=="undefined"){
    new MutationObserver(reveiller).observe(document.body,{attributes:true,attributeFilter:["class"]});
    new MutationObserver(reveiller).observe(document.getElementById("eur-play"),{attributes:true,attributeFilter:["class"]});document.addEventListener("visibilitychange",reveiller);
  }
  return {normaliser:normaliser,banque:banque,rafraichir:rafraichir,reveiller:reveiller};
})();

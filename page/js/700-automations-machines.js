/* v267 — Lecture VISUELLE des données programmées, sans écrire dans les machines.
   Ni schedule(), ni AudioParam, ni sauvegarde, ni horloge ne sont remplacés.
   Une image sur événement/beat ; pas de minuterie, de polling ou d'interpolation.
   Les probabilités/décalages audio ne sont PAS simulés : le repère décrit un pas,
   pas une mesure sonore. T1K utilise entendu.positions, jamais tour/departs. */
var AUTOMATIONS_VISUELLES=(function(){
  "use strict";
  var raf=null,frames=0,horsPage=false,actuelle=null,dernierResume=null,contexte=null;
  var reduire=window.matchMedia("(prefers-reduced-motion: reduce)");
  var panneaux=["menu","note","bib","enr","pr","table","syro","studio","nexus","audio-diagnostic"]
    .map(function(id){return document.getElementById(id);}).filter(Boolean);
  function el(id){return document.getElementById(id);}
  function texte(e,v){if(e && e.textContent!==v)e.textContent=v;}
  function attr(e,k,v){v=String(v);if(e.getAttribute(k)!==v)e.setAttribute(k,v);}
  function nombre(v){return typeof v==="number" && Number.isFinite(v);}
  function limite(v,a,b){return Math.max(a,Math.min(b,v));}
  function param(nom,id,label,min,max){return {nom:nom,id:id,label:label,min:min===undefined?0:min,max:max===undefined?1:max};}
  function defs(prefixe,tab){return tab.map(function(x){return param(x[0],prefixe+x[1],x[2],x[3],x[4]);});}
  var commun=[["pan","pan","PAN",-1,1],["lvl","lvl","LEVEL"]];
  var familles=[
    {id:"em",modeles:["em1"],unit:"unit-em1",etat:EM,machine:MACHINE_EM,acc:[10,11],params:defs("em-k-",[
      ["pit","pit","PITCH",-1,1],["pan","pan","PAN",-1,1],["lvl","lvl","LEVEL"],["egT","eg","EG TIME"],
      ["cut","cut","CUTOFF"],["res","res","RESONANCE"],["egi","egi","EG INT"],["drv","drv","DRIVE"]]),fx:true},
    {id:"er",modeles:["er1","er2"],unit:"unit-er1",etat:ER,machine:MACHINE_ER,acc:[10],params:defs("er-k-",[
      ["pitch","pitch","PITCH"],["modD","modd","MOD DEPTH"],["modS","mods","MOD SPEED"],["dec","dec","DECAY"],
      ["boost","boost","LOW BOOST"]].concat(commun)),fx:true},
    {id:"ea",modeles:["ea1","ea2"],unit:"unit-ea1",etat:EA,machine:MACHINE_EA,acc:[],params:defs("ea-k-",[
      ["porta","porta","PORTAMENTO"],["bal","bal","OSC BALANCE"],["ofs","ofs","OSC2 PITCH",-1,1],
      ["cut","cut","CUTOFF"],["res","res","RESONANCE"],["egi","egi","EG INT"],["dec","dec","DECAY"],["lvl","lvl","LEVEL"]])},
    {id:"es",modeles:["es1","es2"],unit:"unit-es1",etat:ES,machine:MACHINE_ES,acc:[9],params:defs("es-k-",[
      ["pitch","pitch","PITCH/SPEED",-1,1],["filt","filt","FILTER"]].concat(commun))},
    {id:"mx",modeles:["emx"],unit:"unit-emx",etat:MX,machine:MACHINE_MX,acc:[9,15],params:defs("mx-k-",[
      ["pitch","pitch","PITCH",-1,1],["eg","eg","EG TIME"],["o1","o1","OSC EDIT 1"],["o2","o2","OSC EDIT 2"],
      ["cut","cut","CUTOFF"],["res","res","RESONANCE"],["egi","egi","EG INT"],["drv","drv","DRIVE"],
      ["mspeed","mspeed","MOD SPEED"],["mdepth","mdepth","MOD DEPTH"]].concat(commun)),fx:true},
    {id:"sx",modeles:["esx"],unit:"unit-esx",etat:SX,machine:MACHINE_SX,acc:[9],params:defs("sx-k-",[
      ["pitch","pitch","PITCH",-1,1],["start","start","START POINT"],["eg","eg","EG TIME"],
      ["cut","cut","CUTOFF"],["res","res","RESONANCE"],["egi","egi","EG INT"],
      ["mspeed","mspeed","MOD SPEED"],["mdepth","mdepth","MOD DEPTH"]].concat(commun)),fx:true},
    {id:"t1k",modeles:["t1k"],unit:"unit-t1k",etat:T1K,machine:MACHINE_T1K,params:[]}
  ];
  function masque(){
    if(horsPage || document.hidden || document.body.inert || document.body.classList.contains("ensemble"))return true;
    if(typeof PROJET_DEMARRAGE!=="undefined" && PROJET_DEMARRAGE.bloque)return true;
    if(typeof PROJET_EN_COURS!=="undefined" && PROJET_EN_COURS)return true;
    if(typeof WAVX!=="undefined" && WAVX.occupe)return true;
    if(typeof ENR!=="undefined" && ENR.ondesOccupe)return true;
    if(typeof ctx!=="undefined" && ctx && ctx.startRendering)return true;
    return panneaux.some(function(e){return e.id==="menu"?!e.classList.contains("hide"):e.classList.contains("show");});
  }
  function enVue(e){
    if(!e || !e.getClientRects().length || e.closest("[inert]"))return false;
    var r=e.getBoundingClientRect();return r.width>0 && r.height>0 && r.bottom>0 && r.top<innerHeight && r.right>0 && r.left<innerWidth;
  }
  function lecture(){return !!(S.run && contexte && contexte.state==="running");}
  function suivreContexte(){
    var c=typeof ctx!=="undefined" && ctx && !ctx.startRendering?ctx:null;
    if(c===contexte)return;
    if(contexte)contexte.removeEventListener("statechange",reveiller);
    contexte=c;if(c)c.addEventListener("statechange",reveiller);
  }
  function creerLigne(info,id){
    var d=document.createElement("div");d.className="av-ligne";d.id=id;
    d.innerHTML='<span class="av-titre"><span class="av-nom"></span><span class="av-detail"></span></span>'+
      '<svg viewBox="0 0 256 26" preserveAspectRatio="none" aria-hidden="true" focusable="false">'+
      '<path class="av-fond" d="M0 25H256 M0 13H256 M0 1H256"/>'+ 
      '<path class="av-courbe"/><path class="av-curseur"/></svg><span class="av-valeur"></span>';
    info.appendChild(d);
    return {el:d,nom:d.querySelector(".av-nom"),detail:d.querySelector(".av-detail"),courbe:d.querySelector(".av-courbe"),
      curseur:d.querySelector(".av-curseur"),valeur:d.querySelector(".av-valeur")};
  }
  function creerRepere(f,p,k){
    var e=p.rail||el(p.id),bt=e && (p.rail?e:e.querySelector(".bt"));if(!bt)return null;
    var r=document.createElement("span");r.className="av-repere"+(p.rail?" av-fader":"");r.hidden=true;r.setAttribute("aria-hidden","true");
    if(p.rail)r.innerHTML='<span class="av-trait"></span>';
    else r.innerHTML='<svg viewBox="0 0 100 100" focusable="false"><path class="av-piste" d="M21.1 84.5A45 45 0 1 1 78.9 84.5"/>'+
      '<path class="av-arc" pathLength="100" d="M21.1 84.5A45 45 0 1 1 78.9 84.5"/><g class="av-point"><circle cx="50" cy="5" r="4.5"/></g></svg>';
    bt.appendChild(r);
    var d=document.createElement("span");d.className="av-description";d.id="av-desc-"+f.id+"-"+(k===undefined?"part":k)+"-"+p.nom;
    e.appendChild(d);var ids=(e.getAttribute("aria-describedby")||"").split(/\s+/).filter(Boolean);ids.push(d.id);attr(e,"aria-describedby",ids.join(" "));
    e.addEventListener("pointerdown",function(){f.dernier=p.nom;f.dernierK=k;reveiller();},{passive:true});
    e.addEventListener("pointermove",function(ev){if(ev.buttons || ev.pressure>0)reveiller();},{passive:true});
    return {p:p,k:k,el:e,bt:bt,r:r,description:d,arc:r.querySelector(".av-arc"),trait:r.querySelector(".av-trait")};
  }
  function normalise(v,p){return limite((v-p.min)/(p.max-p.min),0,1);}
  function formatter(v,p){return (p.min<0 && v>0?"+":"")+Math.round(limite(v,p.min,p.max)*100)+" %";}
  function peindreRepere(a,stocke,v,etat,arme){
    a.r.hidden=!stocke && !arme;attr(a.r,"data-etat",etat);
    if(nombre(v)){
      var n=normalise(v,a.p);attr(a.r,"data-valeur",v);
      if(a.trait)a.trait.style.top=((1-n)*Math.max(0,a.bt.clientHeight-13)+6.5).toFixed(2)+"px";
      else{a.r.style.setProperty("--av-angle",(-140+280*n).toFixed(2)+"deg");attr(a.arc,"stroke-dasharray",(n*100).toFixed(2)+" 100");}
    }else if(a.r.hasAttribute("data-valeur"))a.r.removeAttribute("data-valeur");
    texte(a.description,(stocke?"Variation mémorisée. ":"")+(arme?"Enregistrement armé. ":"")+
      (nombre(v)?"Valeur programmée "+formatter(v,a.p)+". ":"")+"État : "+etat+". Réglage manuel inchangé par cet affichage.");
  }
  function peindreLigne(l,titre,detail,vs,p,pas,etat,v,actif){
    attr(l.el,"data-etat",etat);texte(l.nom,titre);texte(l.detail,detail);
    var d="",L=Math.max(1,vs.length),dx=256/L;
    for(var i=0;i<L;i++)if(nombre(vs[i])){
      var x=(i+.5)*dx,y=24-normalise(vs[i],p)*22;
      d+="M"+x.toFixed(2)+" 25V"+y.toFixed(2);
    }
    attr(l.courbe,"d",d);
    attr(l.curseur,"d",actif && pas>=0 && pas<L?"M"+((pas+.5)*dx).toFixed(2)+" 0V26":"");
    texte(l.valeur,(nombre(v)?formatter(v,p):"—")+"\n"+(actif && pas>=0?"PAS "+String(pas+1).padStart(2,"0"):actif?"ATTENTE":etat==="arme"?"ARMÉ":"STOP"));
  }
  function valeurs(m,L){return Array.from({length:L},function(_,i){return m && Array.isArray(m.v) && nombre(m.v[i])?m.v[i]:null;});}
  function stock(vs){return vs.some(nombre);}
  function etatPart(f,joue,pas,m){
    var s=f.etat,k=s.sel,muet=!!(s.mute && s.mute[k]) || !!(s.solo && s.solo.some(Boolean) && !s.solo[k]);
    if(f.acc.indexOf(k)>=0)return "accent";
    if(muet)return "muet";
    if(!m || !m.mode)return "off";
    if(s.rec)return joue && pas>=0?"rec":"arme";
    return joue && pas>=0?"lecture":"stop";
  }
  function fxParam(f,m){
    if(!m)return null;
    var autorises=f.id==="em"?["e1","e2","dTime","dDep"]:f.id==="er"?["dTime","dDep"]:["e1","e2"];
    if(autorises.indexOf(m.p)<0)return null;
    if(f.id==="em")return param(m.p,"em-k-"+(m.p==="e2"||m.p==="dDep"?"e2":"e1"),
      ({e1:"EDIT 1",e2:"EDIT 2",dTime:"DELAY TIME",dDep:"DELAY DEPTH"})[m.p]||m.p);
    if(f.id==="er")return param(m.p,"er-k-"+(m.p==="dDep"?"ddep":"dtime"),m.p==="dDep"?"DELAY DEPTH":"DELAY TIME");
    return param(m.p,f.id+"-k-fx"+(m.p==="e2"?"2":"1"),"EDIT "+(m.p==="e2"?"2":"1"));
  }
  function fxCorrespond(f,m){
    if(f.id==="em")return !!f.etat.delayEdit===(m.p==="dTime" || m.p==="dDep");
    if(f.id==="mx" || f.id==="sx")return f.etat.slot===(m.slot||0);
    return true;
  }
  function peindreElectribe(f,joue){
    var s=f.etat,L=limite(Math.floor(s.pat.len||16),1,f.id==="em"?64:16),pas=joue && Number.isInteger(s.pos) && s.pos>=0 && s.pos<L?s.pos:-1;
    var m=s.pat.mot[s.sel],vs=valeurs(m,L),p=f.params.find(function(a){return m && a.nom===m.p;});
    var etat=etatPart(f,joue,pas,m),v=pas>=0 && m && m.mode?vs[pas]:null,stocke=stock(vs),support=!!p;
    if(etat==="muet" || etat==="accent" || !support)v=null;
    f.reperes.forEach(function(a){var choisi=support && a.p.nom===p.nom;
      peindreRepere(a,choisi && stocke,choisi?v:null,etat,choisi && !!s.rec && !!m.mode);});
    var mode=m && m.mode===1?"SMOOTH":m && m.mode===2?"TRIG HOLD":"OFF";
    var detail=!support?(stocke?"PARAMÈTRE SANS COMMANDE VISUELLE":"AUCUN MOUVEMENT"):p.label+" · "+mode;
    if(etat==="muet")detail+=" · MUTE / SOLO";
    else if(etat==="accent")detail="PARTIE ACCENT · PAS DE MOTION SONORE";
    else if(s.rec && m && m.mode)detail+=" · "+(etat==="rec"?"REC":"REC ARMÉ");
    if(pas>=0 && support && v===null && etat==="lecture")detail+=" · BASE";
    peindreLigne(f.part,"MOTION · PARTIE "+(s.sel+1),detail,vs,p||param("","",""),pas,etat,v,joue);
    var fxResume=null;
    if(f.fx){
      var mf=s.pat.motFx,fp=fxParam(f,mf),vf=valeurs(mf,L),st=stock(vf),ok=!!(mf && mf.mode),fxv=pas>=0 && ok?vf[pas]:null;
      var ef=!ok?"off":s.rec?(joue && pas>=0?"rec":"arme"):joue && pas>=0?"lecture":"stop";
      var correspond=!!mf && fxCorrespond(f,mf),slot=(f.id==="mx" || f.id==="sx")?" "+((mf && mf.slot||0)+1):"";
      f.fxReperes.forEach(function(a){var choisi=!!fp && a.p.id===fp.id && correspond;
        peindreRepere(a,choisi && st,choisi?fxv:null,ef,choisi && ok && !!s.rec);});
      peindreLigne(f.effet,"MOTION · FX"+slot,fp?fp.label+" · "+(ok?"ON":"OFF")+(!correspond?" · AUTRE ÉDITION":"")+(s.rec && ok?" · REC":""):
        "AUCUN MOUVEMENT D’EFFET",vf,fp||param("","",""),pas,ef,fxv,joue);
      fxResume={valeur:fxv,etat:ef,correspond:correspond,slot:mf && mf.slot||0};
    }
    return {famille:f.id,partie:s.sel,parametre:p?p.nom:null,pas:pas,etat:etat,stocke:stocke,valeur:v,longueur:L,fx:fxResume};
  }
  function peindreT1k(f,joue){
    var s=T1K,m=motifT1kCur(),e=joue?s.entendu:null,rec=!!s.motionRec,active=m.motionActive!==false;
    var fill=!!(s.fill || e && e.fill),res=[];
    f.reperes.forEach(function(a){
      var k=a.k,L=limite(m.longueurs[k]||m.last||16,1,16),ligne=m.reglages[k]||[];
      var vs=Array.from({length:L},function(_,i){return ligne[i] && nombre(ligne[i][a.p.nom])?ligne[i][a.p.nom]:null;});
      var stocke=stock(vs),pas=e && e.positions && Number.isInteger(e.positions[k]) && e.positions[k]>=0 && e.positions[k]<L?e.positions[k]:-1;
      var muet=m.solo>=0?k!==m.solo:!!m.muet[k];
      var etat=fill?"fill":!active?"off":muet?"muet":rec?(joue && pas>=0?"rec":"arme"):joue && pas>=0?"lecture":"stop";
      var v=active && !fill && !muet && pas>=0?vs[pas]:null;
      peindreRepere(a,stocke,v,etat,rec);
      if(k===s.sel)res.push({a:a,vs:vs,pas:pas,valeur:v,etat:etat,stocke:stocke,L:L});
    });
    var choisi=s.params?s.paramNom:f.dernierK===s.sel?f.dernier:null;
    var r=res.find(function(q){return q.a.p.nom===choisi;}) || res.find(function(q){return q.stocke;}) || res[0];
    if(!r)return null;
    var nb=res.filter(function(q){return q.stocke;}).length;
    var etatTxt={fill:"FILL · BASE",off:"MOTION OFF",muet:"MUTE / SOLO",rec:"REC",arme:"REC ARMÉ",lecture:"VALEUR PROGRAMMÉE",stop:"STOP"};
    var detail=r.a.p.label+" · "+etatTxt[r.etat]+(rec && r.etat!=="rec" && r.etat!=="arme"?" · REC ARMÉ":"")+" · "+nb+" PARAM.";
    peindreLigne(f.part,"MOTION · "+T1K_INSTR[s.sel].nom,detail,r.vs,r.a.p,r.pas,r.etat,r.valeur,joue);
    return {famille:f.id,partie:s.sel,parametre:r.a.p.nom,pas:r.pas,etat:r.etat,stocke:r.stocke,valeur:r.valeur,longueur:r.L,
      instruments:f.reperes.length/6};
  }
  function arreter(){if(raf!==null)cancelAnimationFrame(raf);raf=null;}
  function reveiller(){
    suivreContexte();
    actuelle=familles.find(function(f){return f.modeles.indexOf(S.modele)>=0;})||null;
    if(masque() || !actuelle){arreter();return;}
    if(raf===null)raf=requestAnimationFrame(tour);
  }
  function tour(){
    raf=null;
    if(masque() || !actuelle || !enVue(actuelle.racine))return;
    frames++;
    dernierResume=actuelle.id==="t1k"?peindreT1k(actuelle,lecture()):peindreElectribe(actuelle,lecture());
  }
  var obs=new MutationObserver(reveiller);
  familles.forEach(function(f){
    f.racine=el(f.unit);f.reperes=[];f.fxReperes=[];f.dernier=null;f.dernierK=null;
    var info=document.createElement("div");info.className="av-info";info.id="av-info-"+f.id;info.setAttribute("aria-live","off");
    var avant=f.racine.querySelector(".em-bas,.mx-bas,.sx-bas,#t1k-instr");
    f.racine.insertBefore(info,avant && avant.parentNode===f.racine?avant:null);
    f.part=creerLigne(info,"av-part-"+f.id);if(f.fx)f.effet=creerLigne(info,"av-fx-"+f.id);
    var leg=document.createElement("div");leg.className="av-legende";
    leg.textContent="Bague / trait : variation programmée · aiguille / curseur : réglage manuel";info.appendChild(leg);
    if(f.id==="t1k"){
      T1K_INSTR.forEach(function(V,k){
        var ps=defs("t1k-k-"+k+"-",[["tune","tune","TUNE"],["dec","dec","DECAY"],["c1","c1",V.c1],["c2","c2",V.c2],["mix","mix","A/B"]]);
        var niveau=param("niv","","LEVEL");niveau.rail=f.racine.querySelector('.t1k-f[data-f="'+k+'"]');ps.push(niveau);
        ps.forEach(function(p){var a=creerRepere(f,p,k);if(a)f.reperes.push(a);});
      });
    }else{
      f.params.forEach(function(p){var a=creerRepere(f,p);if(a)f.reperes.push(a);});
      if(f.fx){
        var noms=f.id==="em"?["e1","e2"]:f.id==="er"?["dTime","dDep"]:["e1","e2"];
        noms.forEach(function(n){var p=fxParam(f,{p:n}),a=creerRepere(f,p,"fx");if(a)f.fxReperes.push(a);});
      }
    }
    /* Seul beat() (affichage) est enveloppé. Les arguments, this et retour restent natifs. */
    var avantBeat=f.machine.beat;
    f.machine.beat=function(){var resultat=avantBeat.apply(this,arguments);reveiller();return resultat;};
    /* On observe UNIQUEMENT le DOM natif, jamais nos propres repères. */
    f.racine.querySelectorAll("button,.bt>i,.t1k-f>b").forEach(function(e){
      obs.observe(e,{attributes:true,attributeFilter:["class","style","aria-pressed"]});
    });
    [f.id+"-val",f.id+"-lab",f.id==="t1k"?"t1k-edition-instrument":""].forEach(function(id){
      var e=el(id);if(e)obs.observe(e,{childList:true,characterData:true,subtree:true});
    });
  });
  obs.observe(document.body,{attributes:true,attributeFilter:["class","inert"]});
  panneaux.forEach(function(e){obs.observe(e,{attributes:true,attributeFilter:["class","hidden"]});});
  ["click","pointerup","pointercancel","input","change","keyup","wheel"].forEach(function(n){document.addEventListener(n,reveiller,{passive:true});});
  document.addEventListener("scroll",reveiller,{passive:true,capture:true});window.addEventListener("resize",reveiller,{passive:true});
  document.addEventListener("visibilitychange",function(){arreter();reveiller();});
  window.addEventListener("pagehide",function(){horsPage=true;arreter();});
  window.addEventListener("pageshow",function(){horsPage=false;reveiller();});
  if(reduire.addEventListener)reduire.addEventListener("change",reveiller);else reduire.addListener(reveiller);
  reveiller();
  return {reveiller:reveiller,inspecter:function(){return {version:267,frames:frames,anime:raf!==null,reduit:reduire.matches,
    visible:!!(actuelle && !masque() && enVue(actuelle.racine)),resume:dernierResume?Object.assign({},dernierResume):null,
    reperes:familles.reduce(function(n,f){return n+f.reperes.length+f.fxReperes.length;},0)};}};
})();

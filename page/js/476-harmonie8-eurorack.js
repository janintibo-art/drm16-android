/* ================= HARMONIE 8 — v287 =================
   Progression de huit accords. Sorties CV, pas un générateur audio : 0 V =
   LA1/55 Hz pour les VCO accordés à 55 Hz. Quatre voix de nappe, fondamentale,
   et intervalle de transposition depuis une note de référence indépendante.
   MESURES : 16 CLK par mesure. SCÈNES : chaque impulsion avance d'un accord.
   Tous les choix persistants sont dans m.p. Aucun ancien module n'est modifié. */
var EUR_HARMONIE8=(function(){
  "use strict";
  var types=[
    ["MAJEUR","maj",[0,4,7,12]], ["MINEUR","min",[0,3,7,12]],
    ["MINEUR 7","m7",[0,3,7,10]], ["MAJEUR 7","maj7",[0,4,7,11]],
    ["SEPTIÈME","7",[0,4,7,10]], ["SUS 2","sus2",[0,2,7,12]],
    ["SUS 4","sus4",[0,5,7,12]], ["DIMINUÉ 7","dim7",[0,3,6,9]]
  ];
  var kns=[["len","ACCORDS",1,8,8],["sync","SUIVI",0,1,0],["hold","TENIR",0,1,0],
    ["ref","NOTE RÉFÉRENCE",24,60,33],["trans","TRANSPOSE",-12,12,0],
    ["oct","OCTAVE NAPPE",0,2,1],["glide","GLISSÉ NAPPE ms",0,250,40]];
  for(var i=1;i<=8;i++)kns.push(["root"+i,"FONDAMENTALE "+i,24,60,[33,29,36,31][(i-1)%4]],
    ["type"+i,"ACCORD "+i,0,7,[2,3,0,4][(i-1)%4]],
    ["inv"+i,"RENVERSEMENT "+i,0,3,0],["bars"+i,"MESURES "+i,1,16,1]);
  function entier(v,a,b,d){return Number.isFinite(v)?Math.max(a,Math.min(b,Math.round(v))):d;}
  function normaliser(m){if(!m.p)m.p={};kns.forEach(function(k){m.p[k[0]]=entier(m.p[k[0]],k[2],k[3],k[4]);});}
  function nomNote(n){return ["DO","DO♯","RÉ","RÉ♯","MI","FA","FA♯","SOL","SOL♯","LA","LA♯","SI"][((n%12)+12)%12]+(Math.floor(n/12)-1);}
  function accord(p,i){
    var n=entier(i,0,7,0)+1,fond=entier(p["root"+n],24,60,33)+entier(p.trans,-12,12,0),
      type=entier(p["type"+n],0,7,0),inv=entier(p["inv"+n],0,3,0),oct=entier(p.oct,0,2,1);
    var notes=types[type][2].map(function(x){return fond+x+12*oct;});
    for(var j=0;j<inv;j++){var basse=notes.shift()+12;while(basse<=notes[notes.length-1])basse+=12;notes.push(basse);}
    return {fond:fond,type:type,inv:inv,notes:notes,root:(fond-33)/12,
      shift:(fond-entier(p.ref,24,60,33))/12,bars:entier(p["bars"+n],1,16,1)};
  }
  function longueur(m){var n=0;for(var i=0;i<entier(m.p.len,1,8,8);i++)n+=accord(m.p,i).bars;return n;}
  function lire(r,t){return t<=r.t?r.a:t>=r.fin?r.b:r.a+(r.b-r.a)*(t-r.t)/(r.fin-r.t);}
  function creer(m){
    normaliser(m);
    var init=accord(m.p,0),s={},h={},clefs=["v1","v2","v3","v4","root","shift"],ferme=false;
    clefs.forEach(function(k,i){var v=i<4?(init.notes[i]-33)/12:init[k];s[k]=eurConst(v);h[k]=[{t:0,fin:0,a:v,b:v}];});
    ["change","cycle","clk"].forEach(function(k){s[k]=eurConst(0);});
    var d=m.harmonie8={pos:-1,pas:-1,dernier:null,barriere:0,mode:m.p.sync,dates:[],entendu:null,accord:null};
    function rampeA(k,t){var l=h[k],r=l[0];for(var i=l.length-1;i>=0;i--)if(l[i].t<=t){r=l[i];break;}return r;}
    function valeur(k,t){return h[k]?lire(rampeA(k,t),t):0;}
    function poser(k,b,t,ms){
      var r=rampeA(k,t),a=lire(r,t),p=s[k].offset;
      p.cancelScheduledValues(t);
      /* Garder la pente antérieure si une rampe est interrompue. */
      if(r.fin>t&&r.t<t)p.linearRampToValueAtTime(a,t);
      p.setValueAtTime(ms?a:b,t);if(ms)p.linearRampToValueAtTime(b,t+ms/1000);
      var l=h[k]=h[k].filter(function(r){return r.t<t;});l.push({t:t,fin:t+ms/1000,a:ms?a:b,b:b});
      var avant=ctx&&typeof ctx.startRendering==="function"?t:maintenantAudio();
      while(l.length>1&&l[1].t<=avant)l.shift();
    }
    function noter(e){
      if(ctx&&typeof ctx.startRendering==="function")return;
      d.dates.push(e);if(d.dates.length>128)d.dates.splice(0,d.dates.length-128);reveiller();
    }
    function reset(t){
      clefs.forEach(function(k){poser(k,valeur(k,t),t,0);});
      ["change","cycle","clk"].forEach(function(k){s[k].offset.cancelScheduledValues(t);s[k].offset.setValueAtTime(0,t);});
      d.pos=-1;d.pas=-1;d.dernier=null;d.barriere=t;d.mode=m.p.sync;d.accord=null;
      d.dates=d.dates.filter(function(e){return e.t<t;});
    }
    m.maj=function(){normaliser(m);rafraichir(m);};
    m.arreter=function(){if(ferme)return;reset(maintenantAudio());d.dates=[];d.entendu=null;reveiller();};
    m.recevoir=function(t,e){
      if(ferme||!Number.isFinite(t)||t<0||t<d.barriere)return null;
      if(e==="rst"){reset(t);noter({t:t,pos:-1});return null;}
      if(e!=="in"||(d.dernier!==null&&t<=d.dernier+.0000001))return null;
      var intervalle=d.dernier===null?stepDur():t-d.dernier;d.dernier=t;
      var mode=entier(m.p.sync,0,1,0),L=entier(m.p.len,1,8,8),nouveau=false;
      if(mode!==d.mode){d.pos=-1;d.pas=-1;d.mode=mode;}
      if(d.pos<0){d.pos=0;d.pas=0;nouveau=true;}
      else{
        d.pas++;
        if(mode||d.pas%16===0){
          if(d.pos>=L){d.pos=0;d.pas=0;nouveau=true;}
          else if(mode||d.pas>=accord(m.p,d.pos).bars*16){
            if(m.p.hold>=.5)d.pas=mode?0:accord(m.p,d.pos).bars*16-16;
            else{d.pos=(d.pos+1)%L;d.pas=0;nouveau=true;}
          }
        }
      }
      var sorties=[],front=nouveau||mode||d.pas%16===0;
      if(front){
        var a=accord(m.p,d.pos);d.accord=a;
        a.notes.forEach(function(n,i){poser("v"+(i+1),(n-33)/12,t,entier(m.p.glide,0,250,40));});
        /* La transposition reste franche, indépendante de l'octave et du
           renversement de la nappe : ne pas décaler la basse de deux octaves. */
        poser("root",a.root,t,0);poser("shift",a.shift,t,0);
      }
      var lg=Math.max(.001,Math.min(.012,intervalle*.45));
      if(nouveau){
        if(d.pos===0){eurPorte(s.cycle,t,lg);sorties.push("cycle");}
        eurPorte(s.change,t,lg);sorties.push("change");
      }
      eurPorte(s.clk,t,lg);sorties.push("clk");
      noter({t:t,pos:d.pos,pas:d.pas,mode:mode,accord:d.accord,hold:m.p.hold>=.5});return sorties;
    };
    d.valeur=valeur;d.historique=function(){return Object.keys(h).reduce(function(n,k){return n+h[k].length;},0);};
    return {e:{in:eurGain(1),rst:eurGain(1)},s:s,detruire:function(){ferme=true;d.dates=[];d.entendu=null;
      Object.keys(s).forEach(function(k){try{s[k].stop();s[k].disconnect();}catch(e){}});h={};}};
  }
  var vues=[],raf=0,derniere=-Infinity;
  function visible(v){
    if(typeof document==="undefined"||document.hidden||!v.el.isConnected||EUR.mods.indexOf(v.m)<0)return false;
    if(document.body.classList.contains("menu-ouvert"))return false;
    if(v.grand){var f=v.el.closest("#eur-focus");return !!f&&f.classList.contains("show");}
    return !panneauVisible()&&v.el.getClientRects().length>0&&(S.modele==="eur"||(typeof ENS!=="undefined"&&ENS.actif));
  }
  function dessiner(ms){
    raf=0;vues=vues.filter(function(v){return v.el.isConnected&&EUR.mods.indexOf(v.m)>=0;});
    var l=vues.filter(visible),now=ctx?maintenantAudio():0;
    if(ms-derniere>=50||!S.run){derniere=ms;l.forEach(function(v){var d=v.m.harmonie8;
      if(d)while(d.dates.length&&d.dates[0].t<=now)d.entendu=d.dates.shift();
      v.temps(S.run&&ctx&&ctx.state==="running"&&d?d.entendu:null);});}
    if(l.length&&S.run&&ctx&&ctx.state==="running")raf=requestAnimationFrame(dessiner);
  }
  function reveiller(){if(typeof document!=="undefined"&&typeof requestAnimationFrame==="function"&&!raf&&vues.some(visible)){derniere=-Infinity;raf=requestAnimationFrame(dessiner);}}
  function rafraichir(m){vues=vues.filter(function(v){return v.el.isConnected&&EUR.mods.indexOf(v.m)>=0;});vues.forEach(function(v){if(v.m===m)v.maj();});reveiller();}
  function enregistrerVue(v){vues.push(v);reveiller();return function(){vues=vues.filter(function(x){return x!==v;});};}
  EUR_CAT.harmonie8={nom:"HARMONIE 8",hp:280,sombre:true,fam:"seq",res:"Huit accords, quatre hauteurs CV, transposition des séquences et suivi des scènes",
    kns:kns,jacks:[["in","CLK / SCÈNE",0],["rst","RST",0],["v1","VOIX 1",1],["v2","VOIX 2",1],["v3","VOIX 3",1],["v4","VOIX 4",1],
      ["root","FOND",1],["shift","TRANS",1],["change","ACCORD",1],["cycle","CYCLE",1],["clk","CLK OUT",1]],creer:creer};
  EUR_ORDRE.push("harmonie8");
  if(typeof document!=="undefined"){
    new MutationObserver(reveiller).observe(document.body,{attributes:true,attributeFilter:["class"]});
    var play=document.getElementById("eur-play");if(play)new MutationObserver(reveiller).observe(play,{attributes:true,attributeFilter:["class"]});
    document.addEventListener("visibilitychange",reveiller);
  }
  return {normaliser:normaliser,accord:accord,types:types,nomNote:nomNote,longueur:longueur,rafraichir:rafraichir,vue:enregistrerVue,reveiller:reveiller};
})();

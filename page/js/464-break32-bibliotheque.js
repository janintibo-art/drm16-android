/* v283 — sources personnelles de BREAK 32.
   Le rack ne garde que l'identifiant de bibliothèque et des repères 0..1.
   Aucun WAV en localStorage, aucune modification du son source. Les tranches
   normales lisent le tampon partagé ; les inversées sont mises en cache à la
   demande. Changer de tampon ou de repères invalide ce cache par identité.
   Une source manquante reste silencieuse : jamais de substitution par le break
   d'usine. L'import WAV est borné AVANT décodage et n'affecte aucun autre module. */
var EUR_BREAK_SAMPLES = (function(){
  "use strict";
  var MAX_SECONDES=30, MAX_OCTETS=20*1024*1024, MAX_FRAMES=5760000, vues=[];
  function idValide(id){return typeof id==="string" && /^[A-Za-z0-9_-]{1,64}$/.test(id) && id!=="__proto__" && id!=="constructor" && id!=="prototype";}
  function nombre(n){return n===8||n===16||n===32;}
  function egales(n){n=nombre(n)?n:16;var r=[];for(var i=0;i<=n;i++)r.push(i/n);return r;}
  function copie(o){
    if(!o)return null;
    var n=nombre(o.nb)?o.nb:16, val=idValide(o.ech), cuts=o.coupes;
    if(!Array.isArray(cuts)||cuts.length!==n+1||!cuts.every(function(x,i){return Number.isFinite(x)&&x>=0&&x<=1&&(!i||x>cuts[i-1]);})) cuts=egales(n);
    return {v:1,ech:val?o.ech:"source_invalide",nom:typeof o.nom==="string"?o.nom.slice(0,80):"Source personnelle",
      nb:n,coupes:cuts.slice(),duree:Number.isFinite(o.duree)&&o.duree>0?Math.min(MAX_SECONDES,o.duree):0};
  }
  function tamponValide(b){return !!b&&Number.isFinite(b.duration)&&b.duration>0&&b.duration<=MAX_SECONDES+.001&&
    Number.isInteger(b.length)&&b.length>=32&&b.length<=MAX_FRAMES&&b.numberOfChannels>=1&&b.numberOfChannels<=2;}
  function tampon(m){var s=m.breakSample;return s&&typeof ES!=="undefined"&&Object.prototype.hasOwnProperty.call(ES.buf,s.ech)?ES.buf[s.ech]:null;}
  function compte(m){return m.breakSample?m.breakSample.nb:16;}
  function etat(m){
    var s=m.breakSample;if(!s)return "BREAK ORIGINAL · 16 TRANCHES";
    var b=tampon(m),nom=typeof nomBib==="function"&&b?nomBib(s.ech):(s.nom||s.ech);
    if(!b)return (typeof ES_CHARGES!=="undefined"&&ES_CHARGES[s.ech]?"CHARGEMENT · ":"SON MANQUANT · ")+nom;
    if(!tamponValide(b))return "SOURCE NON COMPATIBLE · 30 S MAXIMUM · "+nom;
    return nom+" · "+b.duration.toFixed(2)+" s · "+s.nb+" TRANCHES";
  }
  function bornes(m,n){
    var b=tampon(m),s=m.breakSample;if(!s||!tamponValide(b)||n<1||n>s.nb)return null;
    var a=Math.round(s.coupes[n-1]*b.length),z=Math.round(s.coupes[n]*b.length);
    return z>a?{buffer:b,a:a,b:z,offset:a/b.sampleRate,duree:(z-a)/b.sampleRate}:null;
  }
  function tranche(m,n,inverse){
    var d=bornes(m,n);if(!d)return null;if(!inverse)return d;
    var c=m._breakCache,s=m.breakSample;
    if(!c||c.source!==s||c.buffer!==d.buffer)c=m._breakCache={source:s,buffer:d.buffer,inverse:[]};
    if(!c.inverse[n]){
      var b=ctx.createBuffer(d.buffer.numberOfChannels,d.b-d.a,d.buffer.sampleRate);
      for(var k=0;k<b.numberOfChannels;k++){var src=d.buffer.getChannelData(k),dst=b.getChannelData(k);for(var i=0;i<dst.length;i++)dst[i]=src[d.b-1-i];}
      c.inverse[n]=b;
    }
    return {buffer:c.inverse[n],offset:0,duree:d.duree,a:d.a,b:d.b};
  }
  function vivant(m){return typeof EUR!=="undefined"&&EUR.mods.indexOf(m)>=0 && !(typeof PROJET_EN_COURS!=="undefined"&&PROJET_EN_COURS);}
  function arreterEcoutes(m){vues.forEach(function(v){if(!m||v.m===m)v.arreter();});}
  function interrompre(m){arreterEcoutes(m);if(m.raveVoix&&ctx)m.raveVoix.couper(maintenantAudio());}
  function rafraichir(m){if(typeof EUR_BREAK32!=="undefined")EUR_BREAK32.rafraichir(m);}
  function affecter(m,id){
    if(!vivant(m)||!idValide(id)||typeof bibEnCorbeille==="function"&&bibEnCorbeille(id))return false;
    var b=ES.buf[id];if(!tamponValide(b))return false;
    interrompre(m);m.breakSample={v:1,ech:id,nom:nomBib(id),nb:16,coupes:egales(16),duree:b.duration};m._breakCache=null;
    memEur();rafraichir(m);return true;
  }
  function appliquer(m,cuts,n,garder){
    if(!vivant(m)||!m.breakSample||!nombre(n)||!Array.isArray(cuts)||cuts.length!==n+1)return false;
    var b=tampon(m);if(!tamponValide(b))return false;
    for(var i=0;i<cuts.length;i++)if(!Number.isFinite(cuts[i])||cuts[i]<0||cuts[i]>1||(i&&Math.round(cuts[i]*b.length)<=Math.round(cuts[i-1]*b.length)))return false;
    interrompre(m);var s=copie(m.breakSample);s.nb=n;s.coupes=cuts.slice();m.breakSample=s;m._breakCache=null;
    if(garder!==false)memEur();rafraichir(m);return true;
  }
  /* Détection simple d'attaques : énergie de crête sur fenêtres de 3 ms,
     nouveauté par rapport à une enveloppe lente, puis pics espacés. Les
     intervalles encore vides sont partagés ; sur du silence, découpe égale.
     Ceci n'est ni une détection de BPM, ni une reconnaissance de kick/snare. */
  function attaques(b,n){
    if(!tamponValide(b)||!nombre(n))return egales(nombre(n)?n:16);
    var hop=Math.max(1,Math.round(b.sampleRate*.003)),N=Math.ceil(b.length/hop),ener=new Float32Array(N),score=new Float32Array(N),fond=0;
    for(var ch=0;ch<b.numberOfChannels;ch++){
      var d=b.getChannelData(ch);for(var i=0;i<N;i++){var pic=0;for(var j=i*hop;j<Math.min(d.length,(i+1)*hop);j++)pic=Math.max(pic,Math.abs(d[j]));ener[i]=Math.max(ener[i],pic);}
    }
    var max=0;for(var i=0;i<N;i++){score[i]=Math.max(0,ener[i]-fond);max=Math.max(max,score[i]);fond=Math.max(ener[i]*.7,fond*.92);}
    if(max<.0001)return egales(n);
    var pics=[];for(var i=1;i<N-1;i++)if(score[i]>max*.08&&score[i]>=score[i-1]&&score[i]>score[i+1])pics.push({x:i*hop/b.length,v:score[i]});
    pics.sort(function(a,b){return b.v-a.v;});var r=[0,1],gap=.18/n;
    for(var i=0;i<pics.length&&r.length<n+1;i++)if(r.every(function(x){return Math.abs(x-pics[i].x)>=gap;}))r.push(pics[i].x);
    while(r.length<n+1){r.sort(function(a,b){return a-b;});var k=0;for(var j=1;j<r.length-1;j++)if(r[j+1]-r[j]>r[k+1]-r[k])k=j;r.push((r[k]+r[k+1])/2);}
    return r.sort(function(a,b){return a-b;});
  }
  /* Contrôle du conteneur PCM/float, mono/stéréo, avant decodeAudioData.
     Les codecs WAV compressés et RF64 ne sont pas proposés dans ce premier lot. */
  function verifierWav(ab){
    if(!(ab instanceof ArrayBuffer)||ab.byteLength<44||ab.byteLength>MAX_OCTETS)throw new Error("WAV : 20 Mo maximum");
    var v=new DataView(ab);function texte(p,n){var s="";for(var i=0;i<n;i++)s+=String.fromCharCode(v.getUint8(p+i));return s;}
    if(texte(0,4)!=="RIFF"||texte(8,4)!=="WAVE"||v.getUint32(4,true)+8!==ab.byteLength)throw new Error("Fichier WAV RIFF incomplet ou non reconnu");
    var fmt=null,taille=0,vu=false;
    for(var p=12;p<ab.byteLength;){
      if(p+8>ab.byteLength)throw new Error("WAV tronqué");var type=texte(p,4),n=v.getUint32(p+4,true),a=p+8;
      if(n>ab.byteLength-a)throw new Error("WAV tronqué");
      if(type==="fmt "){
        if(fmt||n<16)throw new Error("Format WAV invalide");
        var codec=v.getUint16(a,true),ch=v.getUint16(a+2,true),sr=v.getUint32(a+4,true),align=v.getUint16(a+12,true),bits=v.getUint16(a+14,true);
        if(!((codec===1&&[8,16,24,32].indexOf(bits)>=0)||(codec===3&&bits===32))||ch<1||ch>2||sr<8000||sr>192000||align!==ch*bits/8||v.getUint32(a+8,true)!==sr*align)throw new Error("WAV PCM 8/16/24/32 bits ou float 32, mono/stéréo requis");
        fmt={sr:sr,ch:ch,align:align};
      }
      if(type==="data"){if(vu||!n)throw new Error("Données WAV invalides");taille=n;vu=true;}
      p=a+n+(n%2);if(p>ab.byteLength)throw new Error("WAV tronqué");
    }
    if(!fmt||!taille||taille%fmt.align)throw new Error("Données WAV absentes ou incomplètes");
    var frames=taille/fmt.align,duree=frames/fmt.sr;
    if(duree>MAX_SECONDES||frames<32)throw new Error("Boucle trop courte ou supérieure à 30 secondes");
    return {duree:duree,canaux:fmt.ch,taux:fmt.sr};
  }
  function decoder(ab,contexte){return new Promise(function(resolve,reject){var p;try{p=contexte.decodeAudioData(ab,resolve,reject);if(p&&p.catch)p.catch(reject);}catch(e){reject(e);}});}
  function importer(m,fichier,encore){
    var c=ctx;if(!c||!fichier||fichier.size>MAX_OCTETS)return Promise.reject(new Error("WAV : 20 Mo maximum"));
    function actif(){return ctx===c&&vivant(m)&&(!encore||encore());}
    return fichier.arrayBuffer().then(function(ab){if(!actif())throw new Error("Import annulé");verifierWav(ab);return decoder(ab,c);}).then(function(b){
      if(!actif())throw new Error("Import annulé");if(!tamponValide(b))throw new Error("Boucle trop longue ou non compatible");
      /* La bibliothèque écrit actuellement en mono. Le mélange est explicite,
         sans normalisation ; on garde ainsi le même son après redémarrage. */
      var mono=c.createBuffer(1,b.length,b.sampleRate),d=mono.getChannelData(0),g=b.getChannelData(0),dr=b.numberOfChannels>1?b.getChannelData(1):null;
      for(var i=0;i<d.length;i++){var x=dr?(g[i]+dr[i])*.5:g[i];if(!Number.isFinite(x))throw new Error("Le WAV contient des valeurs audio invalides");x=Math.max(-1,Math.min(1,x));d[i]=Math.round(x*(x<0?32768:32767))/(x<0?32768:32767);}
      var id="ubr"+Date.now().toString(36),numero=0;while(ES.buf[id])id="ubr"+Date.now().toString(36)+"_"+(++numero);
      var nom=String(fichier.name||"Boucle importée").replace(/\.wav$/i,"").replace(/[\u0000-\u001f]/g," ").slice(0,80)||"Boucle importée";
      var garde=sauverEch(id,mono); // signale l'échec, sans jamais écraser un son existant
      if(!actif())return {annule:true};
      ES.buf[id]=mono;ES.noms[id]="fichier";BIB.noms[id]=nom;bibEcrire();affecter(m,id);
      return {id:id,garde:garde,mono:!!dr};
    });
  }
  function usages(id){
    function compter(mods){return (mods||[]).filter(function(m){return m&&m.type==="break32"&&m.breakSample&&m.breakSample.ech===id;}).length;}
    var r=typeof memLire==="function"?memLire("eur"):null,racks=r&&(r.racks||[r])||[],actif=EUR.mods.length>0;
    var n=actif?compter(EUR.mods):0;racks.forEach(function(r,i){if(!(actif&&i===EUR.cur)&&r)n+=compter(r.mods);});return n;
  }
  function actualiser(){
    if(typeof EUR==="undefined")return;EUR.mods.forEach(function(m){if(m.type!=="break32"||!m.breakSample)return;
      if(m._breakBuffer!==tampon(m)){interrompre(m);m._breakCache=null;m._breakBuffer=tampon(m);}rafraichir(m);
    });
  }
  function el(tag,cl,texte){var e=document.createElement(tag);if(cl)e.className=cl;if(texte!==undefined)e.textContent=texte;return e;}
  function bouton(p,texte,fn,cl){var b=el("button",cl,texte);b.type="button";b.addEventListener("click",function(e){e.stopPropagation();fn();});p.appendChild(b);return b;}
  function interfaceSource(parent,m){
    var root=el("section","brs-source"),ferme=false,token=0,choisi=1,zoom=1,debut=0,pile=[],lecture=null,drag=null,peaks=null,traceToken=0;
    parent.appendChild(root);root.appendChild(el("h3","","BOUCLE & DÉCOUPAGE"));
    var statut=el("p","brs-statut"),message=el("p","brs-message","");message.setAttribute("role","status");root.appendChild(statut);
    var actions=el("div","brs-actions");root.appendChild(actions);
    var bibli=el("div","brs-bibli");bibli.hidden=true;root.appendChild(bibli);
    var recherche=el("input","");recherche.type="search";recherche.placeholder="Rechercher dans la bibliothèque";recherche.setAttribute("aria-label","Rechercher une boucle");bibli.appendChild(recherche);
    var liste=el("select","brs-liste");liste.setAttribute("aria-label","Son de la bibliothèque");bibli.appendChild(liste);
    var noticeBib=el("p","brs-aide","Les sons disponibles de la bibliothèque sont proposés ici. Le son source n'est pas modifié.");bibli.appendChild(noticeBib);
    function dispo(){return !ferme&&root.isConnected&&vivant(m);}
    function dire(s){message.textContent=s;}
    function arreter(){if(lecture){try{lecture.s.stop();}catch(e){}try{lecture.g.disconnect();}catch(e){}lecture=null;}}
    function listeSons(){if(!dispo())return;var avant=liste.value,q=recherche.value.toLocaleLowerCase();liste.textContent="";
      var sons=bibSons().filter(function(s){return tamponValide(ES.buf[s.id])&&(!q||(s.nom+" "+s.id).toLocaleLowerCase().indexOf(q)>=0);});
      sons.forEach(function(s){var o=el("option","",s.nom+" · "+s.duree.toFixed(2)+" s"+(s.propre?"":" · banque"));o.value=s.id;liste.appendChild(o);});
      if(sons.some(function(s){return s.id===avant;}))liste.value=avant;
      noticeBib.textContent=sons.length+" son(s) compatibles · 30 s maximum. CHARGER remplace seulement la source de ce BREAK 32.";
      charger.disabled=!sons.length;
    }
    function confirmerSource(){return !m.breakSample||window.confirm("Remplacer la boucle et ses repères ? Les 32 pas et le son de la bibliothèque sont conservés.");}
    bouton(actions,"BIBLIOTHÈQUE",function(){if(!dispo())return;bibli.hidden=!bibli.hidden;if(!bibli.hidden){audioInit();banqueEs();chargerEchs();listeSons();}});
    var fichier=el("input","");fichier.type="file";fichier.accept=".wav,audio/wav,audio/x-wav";fichier.hidden=true;root.appendChild(fichier);
    bouton(actions,"IMPORTER WAV",function(){if(!dispo()||!confirmerSource())return;audioInit();fichier.value="";fichier.click();});
    var charger=bouton(bibli,"CHARGER CE SON",function(){if(!dispo()||!confirmerSource())return;arreter();if(!affecter(m,liste.value)){dire("Son absent, trop long ou à la corbeille.");return;}pile=[];choisi=1;zoom=1;debut=0;token++;bibli.hidden=true;maj();dire("Boucle chargée · découpage en 16 tranches. Le rythme de 32 pas est conservé.");},"brs-charger");
    bouton(bibli,"ACTUALISER LA LISTE",function(){chargerEchs();listeSons();});recherche.addEventListener("input",listeSons);
    fichier.addEventListener("change",function(){var f=fichier.files&&fichier.files[0];if(!f||!dispo())return;var mien=++token;
      dire("Lecture du WAV…");arreter();importer(m,f,function(){return dispo()&&mien===token;}).then(function(r){
        if(!dispo()||mien!==token)return;pile=[];choisi=1;zoom=1;debut=0;maj();dire(r.garde?"WAV ajouté à la bibliothèque"+(r.mono?" · stéréo mélangée en mono":"")+" · 16 tranches.":"SESSION SEULEMENT : le son n'a pas pu être enregistré sur disque. Ne fermez pas l'application avant de le sauvegarder.");
      }).catch(function(e){if(dispo()&&mien===token)dire(String(e.message||e));});
    });
    bouton(actions,"BREAK ORIGINAL",function(){if(!dispo()||!m.breakSample||!window.confirm("Revenir au break synthétisé d'origine ? La boucle reste dans la bibliothèque ; vos pas sont conservés."))return;
      token++;arreter();interrompre(m);delete m.breakSample;m._breakCache=null;pile=[];memEur();rafraichir(m);dire("Break original rétabli. Les pas pointant au-delà de 16 sont silencieux.");});
    var atelier=el("div","brs-atelier");root.appendChild(atelier);
    var outils=el("div","brs-actions");atelier.appendChild(outils);
    var dec=el("select","brs-nombre");dec.setAttribute("aria-label","Nombre de tranches");[8,16,32].forEach(function(n){var o=el("option","",n+" TRANCHES");o.value=n;dec.appendChild(o);});outils.appendChild(dec);
    function memoriser(){pile.push(copie(m.breakSample));if(pile.length>12)pile.shift();}
    bouton(outils,"DÉCOUPE ÉGALE",function(){decouper(false);},"brs-egales");
    bouton(outils,"DÉTECTER ATTAQUES",function(){decouper(true);},"brs-attaques");
    var annuler=bouton(outils,"ANNULER DÉCOUPE",function(){if(!dispo()||!pile.length)return;arreter();interrompre(m);m.breakSample=pile.pop();m._breakCache=null;choisi=Math.min(choisi,compte(m));memEur();rafraichir(m);},"brs-annuler");
    function decouper(auto){if(!dispo()||!m.breakSample||!tamponValide(tampon(m)))return;var n=+dec.value;
      if(!window.confirm("Remplacer les repères par "+n+" tranches "+(auto?"sur les attaques détectées":"égales")+" ? Les pas sont conservés ; les tranches hors plage restent silencieuses."))return;
      arreter();memoriser();choisi=1;appliquer(m,auto?attaques(tampon(m),n):egales(n),n);dire(auto?"Attaques proposées : écoutez puis ajustez les repères si nécessaire.":"Découpe égale appliquée.");}
    var vue=el("div","brs-vue");atelier.appendChild(vue);var canvas=el("canvas","brs-onde");canvas.height=140;canvas.setAttribute("aria-label","Forme d'onde : toucher une tranche, glisser son début ou sa fin");vue.appendChild(canvas);
    var nav=el("div","brs-actions");atelier.appendChild(nav);
    var trancheChoix=el("select","brs-tranche");trancheChoix.setAttribute("aria-label","Tranche à régler");nav.appendChild(trancheChoix);
    trancheChoix.addEventListener("change",function(){choisi=+trancheChoix.value;maj();});
    bouton(nav,"ÉCOUTER TRANCHE",function(){ecouter(false);},"brs-ecouter");bouton(nav,"ÉCOUTER INVERSÉE",function(){ecouter(true);});bouton(nav,"STOP ÉCOUTE",arreter,"brs-stop");
    var znav=el("div","brs-actions");atelier.appendChild(znav);
    bouton(znav,"ZOOM +",function(){zoomer(2);});bouton(znav,"ZOOM −",function(){zoomer(.5);});bouton(znav,"TOUT VOIR",function(){zoom=1;debut=0;dessiner();});
    bouton(znav,"VOIR TRANCHE",function(){if(!m.breakSample)return;var cuts=m.breakSample.coupes,a=cuts[choisi-1],b=cuts[choisi];zoom=Math.min(32,Math.max(1,.8/(b-a)));debut=Math.max(0,Math.min(1-1/zoom,(a+b)/2-.5/zoom));dessiner();});
    var pan=el("input","brs-pan");pan.type="range";pan.min=0;pan.max=1;pan.step=.00001;pan.setAttribute("aria-label","Déplacer la vue de l'onde");atelier.appendChild(pan);pan.addEventListener("input",function(){debut=(1-1/zoom)*Number(pan.value);dessiner();});
    var valeurs=el("div","brs-bornes");atelier.appendChild(valeurs);var inputs=[],ranges=[];
    ["DÉBUT (ms)","FIN (ms)"].forEach(function(t,i){var l=el("label",""),input=el("input","");l.appendChild(el("span","",t));input.type="text";input.inputMode="decimal";input.dataset.borne=i;input.setAttribute("aria-label",t);l.appendChild(input);valeurs.appendChild(l);inputs.push(input);
      input.addEventListener("change",function(){var texte=input.value.trim().replace(",","."),v=/^\d+(\.\d+)?$/.test(texte)?Number(texte):NaN,b=tampon(m);
        if(!dispo()||!b||!Number.isFinite(v)||!editer(choisi-1+i,v/1000/b.duration,true)){input.setAttribute("aria-invalid","true");dire("Borne refusée : saisissez une durée entre les repères voisins (point ou virgule).");return;}input.removeAttribute("aria-invalid");});
      var slider=el("input","brs-borne");slider.type="range";slider.min=0;slider.max=1;slider.setAttribute("aria-label",t+" — curseur");l.appendChild(slider);ranges.push(slider);
      slider.addEventListener("change",function(){editer(choisi-1+i,+slider.value,true);});
    });
    atelier.appendChild(el("p","brs-aide","Les repères voisins sont partagés. Glissez une borne de la tranche sélectionnée, ou réglez DÉBUT / FIN. Le zoom ne change pas le découpage. Les écoutes sont indépendantes des scènes, à niveau réduit. CLK conserve le tempo ; transposer change la vitesse, sans étirement temporel."));
    root.appendChild(message);
    root.appendChild(el("p","brs-aide","Import : WAV PCM/float mono ou stéréo, 20 Mo et 30 s maximum. Les nouveaux imports sont enregistrés en mono dans la bibliothèque. Le rack et le projet .drm16 gardent les repères ; gardez aussi le son associé."));
    function editer(index,x,garder){
      if(!dispo()||!m.breakSample||!tamponValide(tampon(m)))return false;var b=tampon(m),cuts=m.breakSample.coupes.slice();
      var frame=Math.round(x*b.length),lo=index?Math.round(cuts[index-1]*b.length)+1:0,hi=index<cuts.length-1?Math.round(cuts[index+1]*b.length)-1:b.length;
      if(!Number.isFinite(frame)||frame<lo||frame>hi)return false;cuts[index]=frame/b.length;if(garder)memoriser();arreter();return appliquer(m,cuts,m.breakSample.nb,garder);
    }
    function ecouter(inv){if(!dispo())return;arreter();var b=tranche(m,choisi,inv);if(!b){dire("Cette tranche ne peut pas être lue : vérifiez la source.");return;}
      var s=ctx.createBufferSource(),g=eurGain(0),t=ctx.currentTime+.01,d=b.duree,fade=Math.min(.003,d/4);s.buffer=b.buffer;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.35,t+fade);g.gain.setValueAtTime(.35,t+d-fade);g.gain.linearRampToValueAtTime(0,t+d);
      s.connect(g);g.connect(EUR.bus||busSet("eur")||master);lecture={s:s,g:g};s.onended=function(){s.disconnect();g.disconnect();if(lecture&&lecture.s===s)lecture=null;};
      if(ctx.resume)ctx.resume().catch(function(){});s.start(t,b.offset,d);s.stop(t+d+.001);dire("Écoute "+(inv?"inversée · ":"· ")+"tranche "+choisi+" · "+Math.round(d*1000)+" ms");
    }
    function zoomer(f){var centre=debut+.5/zoom;zoom=Math.max(1,Math.min(32,zoom*f));debut=Math.max(0,Math.min(1-1/zoom,centre-.5/zoom));dessiner();}
    function dessiner(){
      if(!dispo()||atelier.hidden)return;var b=tampon(m);if(!tamponValide(b))return;var w=Math.floor(canvas.getBoundingClientRect().width);if(w<1)return;
      var h=140,dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);var c=canvas.getContext("2d");c.scale(dpr,dpr);
      if(!peaks||peaks.b!==b){var data=new Float32Array(4096);for(var ch=0;ch<b.numberOfChannels;ch++){var a=b.getChannelData(ch);for(var j=0;j<data.length;j++){var lo=Math.floor(j*a.length/data.length),hi=Math.max(lo+1,Math.floor((j+1)*a.length/data.length)),v=0;for(var i=lo;i<hi&&i<a.length;i++)v=Math.max(v,Math.abs(a[i]));data[j]=Math.max(data[j],v);}}peaks={b:b,data:data};}
      c.fillStyle="#0b1725";c.fillRect(0,0,w,h);var cuts=m.breakSample.coupes;function px(x){return (x-debut)*zoom*w;}
      c.fillStyle="#ba86383b";c.fillRect(px(cuts[choisi-1]),0,Math.max(1,px(cuts[choisi])-px(cuts[choisi-1])),h);
      c.strokeStyle="#88cddb";c.beginPath();for(var x=0;x<w;x++){var a=Math.max(0,Math.floor((debut+x/w/zoom)*4096)),z=Math.min(4096,Math.max(a+1,Math.ceil((debut+(x+1)/w/zoom)*4096))),v=0;for(var j=a;j<z;j++)v=Math.max(v,peaks.data[j]||0);var y=Math.min(1,v)*46;c.moveTo(x,76-y);c.lineTo(x,76+y);}c.stroke();
      c.font="11px system-ui";cuts.forEach(function(v,i){var x=px(v);if(x<-1||x>w+1)return;c.strokeStyle=i===choisi-1||i===choisi?"#ffd589":"#77869b";c.lineWidth=i===choisi-1||i===choisi?3:1;c.beginPath();c.moveTo(x,24);c.lineTo(x,h);c.stroke();if(i<cuts.length-1&&px(cuts[i+1])-x>19){c.fillStyle="#e8eff9";c.fillText(String(i+1),x+4,18);}});
      pan.disabled=zoom===1;pan.value=zoom===1?0:debut/(1-1/zoom);canvas.setAttribute("aria-label","Forme d'onde · tranche "+choisi+" · zoom ×"+Math.round(zoom*10)/10);
    }
    function point(e){var r=canvas.getBoundingClientRect();return Math.max(0,Math.min(1,debut+(e.clientX-r.left)/r.width/zoom));}
    canvas.addEventListener("pointerdown",function(e){if(drag||e.button>0||!dispo()||!m.breakSample||!tamponValide(tampon(m)))return;e.preventDefault();e.stopPropagation();
      var x=point(e),cuts=m.breakSample.coupes,r=canvas.getBoundingClientRect(),seuil=14/r.width/zoom,index=-1;
      [choisi-1,choisi].forEach(function(i){if(Math.abs(cuts[i]-x)<=seuil)index=i;});
      if(index<0){for(var i=0;i<cuts.length-1;i++)if(x>=cuts[i]&&x<=cuts[i+1]){choisi=i+1;break;}maj();return;}
      drag={index:index,avant:copie(m.breakSample),pid:e.pointerId};canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove",function(e){if(!drag||drag.pid!==e.pointerId)return;e.preventDefault();e.stopPropagation();editer(drag.index,point(e),false);});
    function finir(e,cancel){if(!drag||drag.pid!==e.pointerId)return;var old=drag;drag=null;if(cancel){m.breakSample=old.avant;m._breakCache=null;rafraichir(m);}else{pile.push(old.avant);if(pile.length>12)pile.shift();memEur();maj();}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
    canvas.addEventListener("pointerup",function(e){finir(e,false);});canvas.addEventListener("pointercancel",function(e){finir(e,true);});canvas.addEventListener("lostpointercapture",function(e){finir(e,true);});
    function maj(){
      if(ferme)return;statut.textContent=etat(m);atelier.hidden=!m.breakSample||!tamponValide(tampon(m));if(!bibli.hidden)listeSons();
      if(atelier.hidden){arreter();return;}var s=m.breakSample,b=tampon(m);choisi=Math.min(choisi,s.nb);dec.value=s.nb;annuler.disabled=!pile.length;
      if(trancheChoix.options.length!==s.nb){trancheChoix.textContent="";for(var i=1;i<=s.nb;i++){var o=el("option","","TRANCHE "+i);o.value=i;trancheChoix.appendChild(o);}}
      trancheChoix.value=choisi;[choisi-1,choisi].forEach(function(index,j){if(document.activeElement!==inputs[j])inputs[j].value=(s.coupes[index]*b.duration*1000).toFixed(2);ranges[j].step=1/b.length;ranges[j].min=index?s.coupes[index-1]+1/b.length:0;ranges[j].max=index<s.nb?s.coupes[index+1]-1/b.length:1;ranges[j].value=s.coupes[index];});dessiner();
    }
    function cacher(){if(document.hidden||!root.closest("#eur-focus.show"))arreter();}
    var ro=typeof ResizeObserver!=="undefined"?new ResizeObserver(function(){if(!traceToken)traceToken=requestAnimationFrame(function(){traceToken=0;dessiner();});}):null;if(ro)ro.observe(canvas);
    document.addEventListener("visibilitychange",cacher);var mo=new MutationObserver(cacher);mo.observe(document.getElementById("eur-focus"),{attributes:true,attributeFilter:["class"]});
    var api={m:m,arreter:arreter,maj:maj,detruire:function(){if(ferme)return;ferme=true;token++;arreter();if(drag){m.breakSample=drag.avant;m._breakCache=null;drag=null;}if(ro)ro.disconnect();mo.disconnect();document.removeEventListener("visibilitychange",cacher);if(traceToken)cancelAnimationFrame(traceToken);vues=vues.filter(function(v){return v!==api;});}};vues.push(api);maj();return api;
  }
  return {MAX_SECONDES:MAX_SECONDES,egales:egales,copie:copie,compte:compte,etat:etat,tampon:tampon,tamponValide:tamponValide,
    bornes:bornes,tranche:tranche,affecter:affecter,appliquer:appliquer,attaques:attaques,verifierWav:verifierWav,importer:importer,
    usages:usages,actualiser:actualiser,arreter:arreterEcoutes,interface:interfaceSource};
})();

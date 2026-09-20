/* ================= PO-33 K.O! : échantillonnage au micro (v259) =================
   Comme sur la vraie machine (bouton SAMPLING), on peut enregistrer directement
   au micro dans l'emplacement choisi en mode SOUND, mélodique ou percussion.
   À la différence de la TR-1000, le K.O! ne garde qu'un identifiant de son par
   emplacement (KO.sons[k]) : la prise remplace simplement ce son dans la
   bibliothèque, sans portion ni étirement à régler. */
var KO_ECH = {prise:null};

function samplingKo(){
  if(KO_ECH.prise){ try{ KO_ECH.prise.stop(); }catch(e){} return; }
  audioInit(); banqueEs();
  var p = HOST;
  if(p && p.micro){
    var permis = false;
    try{ permis = !!p.micro(); }catch(e){}
    if(!permis){ signal("AUTORISEZ LE MICRO PUIS RECOMMENCEZ"); return; }
  }
  if(!navigator.mediaDevices || !window.MediaRecorder){ signal("MICRO INDISPONIBLE"); return; }
  var k = Math.max(0, Math.min(15, KO.sel|0));   /* la destination est figée au départ */
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(flux){
    var morceaux = [], mr = new MediaRecorder(flux), minuteur = null;
    KO_ECH.prise = mr;
    if(typeof majKo === "function") majKo();
    signal("SAMPLING EMPLACEMENT " + (k + 1) + " · RETOUCHEZ POUR ARRÊTER · 8 S AU PLUS");
    mr.ondataavailable = function(e){ if(e.data && e.data.size) morceaux.push(e.data); };
    mr.onstop = function(){
      clearTimeout(minuteur);
      flux.getTracks().forEach(function(t){ t.stop(); });
      if(KO_ECH.prise === mr) KO_ECH.prise = null;
      if(typeof majKo === "function") majKo();
      new Blob(morceaux).arrayBuffer().then(function(ab){
        return new Promise(function(res, rej){
          var r = ctx.decodeAudioData(ab, res, rej);
          if(r && r.catch) r.catch(rej);
        });
      }).then(function(buf){
        if(typeof PROJET_EN_COURS !== "undefined" && PROJET_EN_COURS) return;
        var court = reduireEch(buf, 32000, 8);
        var id = "u" + Date.now().toString(36), n = 1;
        while(ES.buf[id]) id = "u" + Date.now().toString(36) + (n++);
        ES.buf[id] = court; ES.noms[id] = "mic";
        BIB.noms[id] = ("K.O! " + (k + 1)).slice(0, 28); bibEcrire();
        var garde = sauverEch(id, court);
        KO.sons[k] = id; memKo();
        if(S.modele === "ko" && typeof majKo === "function") majKo();
        signal(garde ? "ÉCHANTILLON POSÉ SUR L'EMPLACEMENT " + (k + 1)
                     : "ÉCHANTILLON POUR CETTE SESSION SEULEMENT · ÉCHEC D'ÉCRITURE");
      }).catch(function(){ signal("DÉCODAGE IMPOSSIBLE"); });
    };
    mr.start();
    minuteur = setTimeout(function(){ if(KO_ECH.prise === mr) try{ mr.stop(); }catch(e){} }, 8000);
  }).catch(function(){ signal("MICRO REFUSÉ"); });
}
/* Rupture propre si l'on quitte la machine ou change d'emplacement pendant la
   prise : le flux micro est libéré sans jamais poser le son (contrairement à
   mr.stop(), qui déclenche onstop et écrirait quand même l'échantillon). */
function annulerSamplingKo(){
  var mr = KO_ECH.prise;
  if(!mr) return;
  KO_ECH.prise = null;
  mr.ondataavailable = null;
  mr.onstop = function(){ try{ mr.stream.getTracks().forEach(function(t){ t.stop(); }); }catch(e){} };
  try{ mr.stop(); }catch(e){}
}

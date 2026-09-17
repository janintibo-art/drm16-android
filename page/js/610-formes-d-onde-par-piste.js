/* ================= formes d'onde par piste =================
   Pour dessiner une piste comme dans un séquenceur, il faut son SON, pas ses
   notes. On rend donc chaque piste séparément hors ligne et on garde l'enveloppe.

   Le calcul est lourd — un rendu par piste — mais il y a une économie
   décisive : une forme d'onde n'a besoin que de quelques centaines de colonnes.
   On rend donc en MONO à 8000 Hz au lieu de 44100 en stéréo, soit onze fois
   moins d'échantillons, pour un dessin rigoureusement identique. */
var ONDE_TAUX = 8000, ONDE_COLS = 600;

function ondesEnr(){
  var A = ENR.affiche;
  if(!A){ signal("CHOISISSEZ D'ABORD UNE PRISE"); return; }
  if(ENR.ondesOccupe || WAVX.occupe){ signal("UN CALCUL EST DÉJÀ EN COURS"); return; }
  var pistes = pistesDe(A.evts);
  if(!pistes.length){ signal("PRISE VIDE"); return; }
  if(pistes.length > 16){ signal("TROP DE PISTES POUR LES ONDES"); return; }

  ENR.ondesOccupe = true;
  signal("CALCUL DES FORMES D'ONDE…");
  var modele = S.modele;
  var total = A.duree / 1000 + 2;
  var ctxVrai = ctx, masterVrai = master, bruitVrai = noiseBuf, cacheVrai = cache;
  var sortiesVraies = {outBd:outBd, outMix:outMix, panBd:panBd, panMix:panMix};
  var busVrais = SET.bus;
  var resultat = {};

  function remettre(){
    ENR.ondesOccupe = false;
    ctx = ctxVrai; master = masterVrai; noiseBuf = bruitVrai; cache = cacheVrai;
    SET.bus = busVrais;
    razNoeudsMachines();
    outBd = sortiesVraies.outBd; outMix = sortiesVraies.outMix;
    panBd = sortiesVraies.panBd; panMix = sortiesVraies.panMix;
    try{ allerMachine(modele); }catch(e){}
  }

  /* Une piste à la fois, en chaîne : deux contextes hors ligne en parallèle se
     disputeraient les mêmes variables globales de machine. */
  function suivante(k){
    if(k >= pistes.length){
      remettre();
      ENR.ondes = resultat; ENR.ondesPour = A.nom + "/" + ENR.decoupe;
      signal("FORMES D'ONDE PRÊTES");
      return;
    }
    var p = pistes[k];
    var off;
    try{ off = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, Math.ceil(ONDE_TAUX * total), ONDE_TAUX); }
    catch(e){ remettre(); signal("CALCUL IMPOSSIBLE ICI"); return; }
    ctx = off; SET.bus = {}; batirAudio(); cache = true;
    RENDU_MACHINE = "";
    try{
      A.evts.forEach(function(e){
        if((e[1] & 0xF0) !== 0x90 || e[3] === 0) return;
        var canal = e[1] & 0x0F;
        if(p.c !== canal) return;
        if(p.n >= 0 && p.n !== e[2]) return;
        OFF_T = 0.02 + e[0] / 1000;
        try{
          allerMachineRendu(ENR.canaux[canal] || modele);
          entreeNote(e[2], e[3] / 127, canal);
        }catch(err){}
      });
    }catch(e){}
    OFF_T = -1;
    off.startRendering().then(function(rendu){
      resultat[p.cle] = enveloppe(rendu.getChannelData(0));
      suivante(k + 1);
    }, function(){ resultat[p.cle] = null; suivante(k + 1); });
  }
  suivante(0);
}

/* L'enveloppe : la crête de chaque tranche. C'est ce qu'on dessine, pas les
   échantillons — à six cents colonnes pour une minute, chaque colonne couvre
   huit cents échantillons. */
function enveloppe(data){
  var n = data.length, e = new Float32Array(ONDE_COLS);
  var par = n / ONDE_COLS;
  for(var i=0;i<ONDE_COLS;i++){
    var a = Math.floor(i * par), b = Math.min(n, Math.floor((i + 1) * par)), m = 0;
    for(var j=a;j<b;j++){ var v = data[j] < 0 ? -data[j] : data[j]; if(v > m) m = v; }
    e[i] = m;
  }
  return e;
}

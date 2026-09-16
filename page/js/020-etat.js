/* ================= état ================= */
var BIB = {noms:{}, onglet:0, cible:{machine:"es1", partie:0}, preset:"punch"};
/* Réglages lus par charger() au démarrage : ils doivent exister avant lui.
   Quatre fois j'ai déclaré un objet après le code qui s'en sert, et quatre fois
   le script s'est arrêté net au chargement. */
var HUM = {temps:0};
var WAVX = {occupe:false, mesures:2};
/* déclarés dès le début : le câblage de l'interface s'en sert bien avant
   d'arriver aux modules qui les remplissent */
var PR = {prise:-1, notes:[], pistes:[], sel:-1, grille:4, zoom:0.10, defil:0,
          lecture:false, tmr:[], t0:0, anim:null, cv:null, ct:null, hauteurPiste:26, selMachine:null};
var ENR = {actif:false, depart:0, evts:[], prises:[], lecture:null, tmr:[], compteur:0,
           canaux:{},        /* canal MIDI -> machine qui le joue            */
           vus:{},           /* "canal:note" -> nombre de coups reçus         */
           canauxVus:{},     /* canal -> nombre de coups, pour l'aiguillage   */
           decoupe:"son",    /* pistes par SON ou par CANAL                   */
           tics:[], tempo:0,  /* horloge reçue -> tempo réel de la machine      */
           attente:true, vierge:false,   /* départ à la première note           */
           solo:"", muet:{}, boucle:false,
           affiche:null,     /* la prise montrée dans la vue quand rien n'enregistre */
           ondes:null, ondesPour:"", ondesOccupe:false,
           t0vue:0, dessin:null};

var S = {
  modele:"16", power:false, run:false,
  space:false, bank:0, bass:false, haptic:true, bg:true,
  style:0, col:0, del:0, vol:0.85, bpm:120
};
var ctx=null, master=null, noiseBuf=null, outBd=null, outMix=null, panBd=null, panMix=null;
var MODELE = null;


/* ================= notices ================= */
var noteEl = document.getElementById("note");
var noteNav = document.getElementById("note-nav");
var docCourantId = "note-general";
function docDeLaMachine(){
  var m = S.modele;
  if(m === "16" || m === "32") return "note-ehx";
  if(m === "em1") return "note-em";
  if(m === "er1" || m === "er2") return "note-er";
  if(m === "ea1" || m === "ea2") return "note-ea";
  if(m === "es1" || m === "es2") return "note-es";
  if(m === "emx") return "note-mx";
  if(m === "esx") return "note-sx";
  if(m === "mpc3000" || m === "mpc2000") return "note-mpc";
  if(m === "tr808" || m === "tr909" || m === "tr707" || m === "rd6") return "note-808";
  if(m === "dmx") return "note-dmx";
  if(m === "vlc") return "note-vlc";
  if(m === "td3") return "note-td3";
  if(m === "eur") return "note-eur";
  if(m === "cr5") return "note-cr5";
  if(m === "dbi") return "note-dbi";
  if(m === "t1k") return "note-t1k";
  if(m === "arcm") return "note-arcm";
  if(m === "ko") return "note-ko";
  if(m === "stk") return "note-stk";
  if(m === "mc") return "note-mc";
  if(m === "kp") return "note-kp";
  return "note-general";
}
function montrerDoc(id){
  /* Portée limitée au panneau de la notice. La bibliothèque a elle aussi un
     corps de classe « doc » : une recherche à l'échelle du document lui
     retirait sa classe « vu » et la laissait vide jusqu'au redémarrage. */
  var docs = noteEl.querySelectorAll(".doc"), i;
  for(i=0;i<docs.length;i++) docs[i].classList.toggle("vu", docs[i].id === id);
  var bs = noteNav.querySelectorAll("button");
  for(i=0;i<bs.length;i++) bs[i].classList.toggle("on", bs[i].dataset.d === id);
  var d = document.getElementById(id);
  noteTitre.textContent = d ? ("NOTICE · " + d.dataset.titre) : "NOTICE";
  var corpsNotice = noteEl.querySelector(".note-corps");
  if(corpsNotice) corpsNotice.scrollTop = 0;
  docCourantId = id;
}
function ouvrirNotice(id){
  fermerAutresPanneaux("note");
  noteEl.classList.add("show");
  majNoteOuverte();
  montrerDoc(id || docDeLaMachine());
}
function fermerNotice(){
  noteEl.classList.remove("show");
  majNoteOuverte();
}
(function construireNav(){
  var docs = noteEl.querySelectorAll(".doc");
  for(var i=0;i<docs.length;i++){
    (function(d){
      var b = document.createElement("button");
      b.textContent = d.dataset.titre;
      b.dataset.d = d.id;
      b.addEventListener("click", function(){ montrerDoc(d.id); H.cran(); });
      noteNav.appendChild(b);
    })(docs[i]);
  }
})();
document.getElementById("note-fermer").addEventListener("click", function(){ fermerNotice(); H.cran(); });
document.getElementById("aide").addEventListener("click", function(){ ouvrirNotice(); H.inter(); });

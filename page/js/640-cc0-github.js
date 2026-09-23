/* ================= packs CC0 sur GitHub (v299) =================
   Trois kits d'un dépôt public, tous les fichiers sous licence Creative
   Commons Zéro (CC0 1.0) : libres d'usage, de modification et de
   redistribution, sans attribution requise. Source : github.com/Boochi44/
   free-drum-samples (fichier beatpacks-config.ts, lu et recopié ici le
   23/09/2026 — quarante-huit sons, seize par kit, servis un par un depuis
   raw.githubusercontent.com, jamais téléchargés en bloc). */
var CC0G = {kit:null, occupe:false};

var CC0G_KITS = [
  {id:"hard-trap", nom:"HARD TRAP", res:"Metro Boomin / 808 Mafia : 808 distordus, caisses claires nettes, ambiance sombre.",
   sons:[
    {nom:"Hard Kick 1", type:"kick", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/kicks/hard-kick-01.wav"},
    {nom:"Hard Kick 2", type:"kick", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/kicks/hard-kick-02.wav"},
    {nom:"Hard Kick 3", type:"kick", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/kicks/hard-kick-03.wav"},
    {nom:"808 Distorted", type:"808", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/808s/808-bass-dist.wav"},
    {nom:"808 Sub", type:"808", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/808s/808-bass-sub.wav"},
    {nom:"Hard Snare 1", type:"snare", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/snares/hard-snare-01.wav"},
    {nom:"Hard Snare 2", type:"snare", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/snares/hard-snare-02.wav"},
    {nom:"Hard Snare 3", type:"snare", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/snares/hard-snare-03.wav"},
    {nom:"Trap Clap 1", type:"clap", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/claps/clap-01.wav"},
    {nom:"Trap Clap 2", type:"clap", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/claps/cl.wav"},
    {nom:"Closed Hat 1", type:"hi-hat", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/hi-hats/hi-hat-closed-01.wav"},
    {nom:"Closed Hat 2", type:"hi-hat", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/hi-hats/ch.wav"},
    {nom:"Open Hat", type:"open-hat", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/open-hats/open-hat-01.wav"},
    {nom:"Perc Cowbell", type:"perc", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/percs/perc-cowbell.wav"},
    {nom:"Perc Rimshot", type:"perc", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/percs/perc-rimshot.wav"},
    {nom:"Trap FX", type:"fx", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/01-hard-trap/fx/fx-cymbal.wav"}
   ]},
  {id:"bounce", nom:"BOUNCE", res:"Mustard / West Coast : 808 propres, kicks ronds, claps qui claquent.",
   sons:[
    {nom:"Bounce Kick 1", type:"kick", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/kicks/bounce-kick-01.wav"},
    {nom:"Bounce Kick 2", type:"kick", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/kicks/bounce-kick-02.wav"},
    {nom:"Bounce Kick 3", type:"kick", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/kicks/bounce-kick-03.wav"},
    {nom:"808 Long", type:"808", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/808s/808-bass-long.wav"},
    {nom:"808 Punch", type:"808", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/808s/808-bass-punch.wav"},
    {nom:"Bounce Snare 1", type:"snare", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/snares/bounce-snare-01.wav"},
    {nom:"Bounce Snare 2", type:"snare", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/snares/bounce-snare-02.wav"},
    {nom:"Bounce Snare 3", type:"snare", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/snares/bounce-snare-03.wav"},
    {nom:"Bounce Clap 1", type:"clap", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/claps/clap-01.wav"},
    {nom:"Bounce Clap 2", type:"clap", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/claps/cp.wav"},
    {nom:"Closed Hat", type:"hi-hat", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/hi-hats/hi-hat-closed-01.wav"},
    {nom:"Open Hat", type:"open-hat", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/open-hats/open-hat-01.wav"},
    {nom:"Perc High Tom", type:"perc", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/percs/perc-high-tom.wav"},
    {nom:"Perc Low Tom", type:"perc", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/percs/perc-low-tom.wav"},
    {nom:"808 Round", type:"808", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/808s/808-round-long.wav"},
    {nom:"Bounce FX", type:"fx", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/02-bounce/fx/fx-cymbal.wav"}
   ]},
  {id:"soulful-vintage", nom:"SOULFUL VINTAGE", res:"Alchemist / boom-bap : sons lofi, kicks chaleureux, percussions inhabituelles.",
   sons:[
    {nom:"Vintage Kick 1", type:"kick", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/kicks/vintage-kick-01.wav"},
    {nom:"Vintage Kick 2", type:"kick", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/kicks/vintage-kick-02.wav"},
    {nom:"Vintage Kick 3", type:"kick", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/kicks/vintage-kick-03.wav"},
    {nom:"808 Bass Lofi", type:"808", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/808s/808-bass-lofi.wav"},
    {nom:"808 Lofi", type:"808", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/808s/808-lofi.wav"},
    {nom:"Vintage Snare 1", type:"snare", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/snares/vintage-snare-01.wav"},
    {nom:"Vintage Snare 2", type:"snare", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/snares/vintage-snare-02.wav"},
    {nom:"Vintage Snare 3", type:"snare", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/snares/vintage-snare-03.wav"},
    {nom:"Vintage Clap", type:"clap", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/claps/vintage-clap-01.wav"},
    {nom:"Clap Lofi", type:"clap", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/claps/cl-lofi.wav"},
    {nom:"Closed Hat Lofi", type:"hi-hat", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/hi-hats/ch-lofi.wav"},
    {nom:"Open Hat Lofi", type:"open-hat", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/open-hats/oh00-lofi.wav"},
    {nom:"Open Hat", type:"open-hat", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/open-hats/open-hat-01.wav"},
    {nom:"Perc Maraca", type:"perc", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/percs/perc-maraca.wav"},
    {nom:"Perc Lofi Tom", type:"perc", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/percs/ht00-lofi.wav"},
    {nom:"Vintage FX", type:"fx", url:"https://raw.githubusercontent.com/Boochi44/free-drum-samples/main/drum-samples/03-soulful-vintage/fx/cy0000-lofi.wav"}
   ]}
];

/* type de sample → catégorie de la bibliothèque, pour un classement immédiat
   sans attendre l'analyse par le nom ou par l'écoute */
var CC0G_CATEGORIE = {kick:"kick", "808":"basse", snare:"caisse", clap:"clap",
  "hi-hat":"charley", "open-hat":"charley", perc:"percu", fx:"fx"};

/* ---------- écoute et import d'un son ---------- */
function cc0gSon(kit, s, importer){
  if(CC0G.occupe) return;
  CC0G.occupe = true;
  majCc0gUI();
  audioInit(); banqueEs();
  netCharger(s.url, 3 * 1024 * 1024).then(function(b64){
    var o = b64VersOctets(b64);
    return new Promise(function(ok, rej){
      ctx.decodeAudioData(o.buffer.slice(0), ok, function(){ rej("format refusé"); });
    });
  }).then(function(buf){
    CC0G.occupe = false;
    if(PROJET_EN_COURS) return;
    if(!importer){
      var src = ctx.createBufferSource(); src.buffer = buf;
      var g = ctx.createGain(); g.gain.value = 0.85;
      src.connect(g); g.connect(master); src.start();
      majCc0gUI();
      signal(s.nom + " · " + buf.duration.toFixed(2) + " s · " + Math.round(buf.sampleRate/1000) + " kHz");
      return;
    }
    var court = reduireEch(buf, 32000, 8);
    var r = traiterSon(court, BIB.preset || "aucun", 0);
    court = r.buffer;
    var id = "u" + Date.now().toString(36);
    ES.buf[id] = court;
    ES.noms[id] = "cc0github";
    BIB.noms[id] = (kit.nom + " " + s.nom).slice(0, 28);
    if(CC0G_CATEGORIE[s.type]) bibMeta(id).c = CC0G_CATEGORIE[s.type];
    bibEcrire();
    sauverEch(id, court);
    majCc0gUI();
    signal("IMPORTÉ : " + BIB.noms[id]);
    H.inter();
  }).catch(function(e){
    CC0G.occupe = false;
    majCc0gUI();
    signal("SON INDISPONIBLE · " + String(e).toUpperCase());
  });
}
function majCc0gUI(){ if(BIB.onglet === 6) majBibUI(); }

/* ---------- interface ---------- */
function bibRendreCc0Github(corps){
  var p1 = document.createElement("p");
  p1.innerHTML = "Trois kits d'un dépôt GitHub, tous en licence <b>CC0</b> (domaine public assimilé) : " +
    "libres d'usage, de modification et de redistribution, sans attribution obligatoire. Quarante-huit " +
    "sons au total, servis un par un — rien n'est téléchargé en bloc.";
  corps.appendChild(p1);

  if(CC0G.kit){
    var h0 = document.createElement("h3");
    h0.textContent = CC0G.kit.nom;
    corps.appendChild(h0);
    var pk = document.createElement("p"); pk.style.opacity = ".75";
    pk.textContent = CC0G.kit.res;
    corps.appendChild(pk);
    var a1 = document.createElement("div"); a1.className = "bib-actions";
    boutonBib(a1, "◀ LES TROIS KITS", function(){ CC0G.kit = null; majCc0gUI(); });
    corps.appendChild(a1);
    CC0G.kit.sons.forEach(function(s){
      var l = ligneBib(s.nom, s.type.toUpperCase());
      var a = document.createElement("div"); a.className = "bib-actions";
      boutonBib(a, "ÉCOUTER", function(){ cc0gSon(CC0G.kit, s, false); });
      boutonBib(a, "IMPORTER", function(){ cc0gSon(CC0G.kit, s, true); });
      l.appendChild(a);
      corps.appendChild(l);
    });
    return;
  }

  CC0G_KITS.forEach(function(k){
    var l = ligneBib(k.nom, k.res + " · " + k.sons.length + " sons");
    var a = document.createElement("div"); a.className = "bib-actions";
    boutonBib(a, "OUVRIR", function(){ CC0G.kit = k; majCc0gUI(); }, false);
    l.appendChild(a);
    corps.appendChild(l);
  });

  var p2 = document.createElement("p"); p2.style.opacity = ".6"; p2.style.fontSize = "12.5px";
  p2.textContent = "Source : github.com/Boochi44/free-drum-samples (licence CC0 1.0).";
  corps.appendChild(p2);
}

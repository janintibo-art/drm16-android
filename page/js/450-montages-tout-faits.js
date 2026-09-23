/* ================= montages tout faits =================
   Un rack vide décourage : il faut connaître cent trois modules et savoir
   lesquels vont ensemble avant d'entendre quoi que ce soit. Ces montages
   donnent un point de départ qui sonne, à défaire ensuite câble par câble —
   c'est la façon la plus rapide d'apprendre ce que fait chaque module.

   Format : mods est une liste de [type, réglages], cables une liste de
   [rang de départ, prise de sortie, rang d'arrivée, prise d'entrée]. Les rangs
   renvoient aux positions dans mods. bpm est facultatif.
   v276 : rangees peut préciser la rangée (0 ou 1) de chaque module ; les
   anciens montages sans ce champ gardent leur répartition habituelle. */
var EUR_MONT_FAM = [["rythme","RYTHMES"],["basse","BASSES"],["nappe","AMBIANCES"],
                    ["etrange","TEXTURES"],["style","STYLES"]];
var EUR_MONTAGES = [

/* ---------- rythmes ---------- */
{id:"kick4", nom:"KICK 4 AU SOL", fam:"rythme", bpm:126,
 res:"Grosse caisse sur chaque temps, charley à contretemps, clap en réponse",
 mods:[["clock"], ["clkdiv"], ["euclid",{pas:1,coups:0.28,dec:0}],
       ["kick",{tune:0.3,dec:0.45,niv:0.95}], ["hat",{tune:0.5,dec:0.12,niv:0.55}],
       ["clap",{tune:0.5,dec:0.4,niv:0.6}],
       ["mix4",{a:0.9,b:0.5,c:0.5,d:0}], ["dist",{drv:0.3,mix:0.5}], ["limit",{seuil:0.6,rap:0.5}], ["out",{niv:0.75}]],
 cables:[[0,"out",1,"in"], [1,"d4",3,"trig"], [0,"out2",4,"trig"],
         [0,"out",2,"in"], [2,"out",5,"trig"],
         [3,"out",6,"a"], [4,"out",6,"b"], [5,"out",6,"c"],
         [6,"out",7,"in"], [7,"out",8,"in"], [8,"out",9,"in"]]},

{id:"euclide", nom:"POLYRYTHME EUCLIDIEN", fam:"rythme", bpm:118,
 res:"Trois générateurs euclidiens de densités différentes, qui se recroisent lentement",
 mods:[["clock"], ["euclid",{pas:1,coups:0.3,dec:0}], ["euclid",{pas:0.8,coups:0.45,dec:0.3}],
       ["euclid",{pas:0.6,coups:0.6,dec:0.6}],
       ["kick",{tune:0.32,dec:0.4,niv:0.9}], ["rim",{tune:0.55,dec:0.3,niv:0.6}],
       ["shaker",{tune:0.6,dec:0.2,niv:0.45}],
       ["mix4",{a:0.85,b:0.6,c:0.5,d:0}], ["verb",{taille:0.4,mix:0.22}], ["out",{niv:0.75}]],
 cables:[[0,"out",1,"in"], [0,"out",2,"in"], [0,"out",3,"in"],
         [1,"out",4,"trig"], [2,"out",5,"trig"], [3,"out",6,"trig"],
         [4,"out",7,"a"], [5,"out",7,"b"], [6,"out",7,"c"],
         [7,"out",8,"in"], [8,"out",9,"in"]]},

{id:"breakbeat", nom:"ROULEMENTS", fam:"rythme", bpm:172,
 res:"Caisse claire qui part en roulement une fois sur trois, tapis de triolets",
 mods:[["clock"], ["clkdiv"], ["chance",{p:0.32}], ["burst",{n:0.6,esp:0.1}], ["clkmul"],
       ["kick",{tune:0.28,dec:0.35,niv:0.9}], ["snare",{tune:0.5,dec:0.35,niv:0.75}],
       ["claves",{tune:0.5,dec:0.2,niv:0.5}], ["shaker",{tune:0.7,dec:0.1,niv:0.4}],
       ["mix4",{a:0.85,b:0.65,c:0.4,d:0.35}], ["limit",{seuil:0.55,rap:0.6}], ["out",{niv:0.75}]],
 cables:[[0,"out",1,"in"], [1,"d4",5,"trig"], [1,"d2",2,"in"],
         [2,"out",3,"in"], [3,"out",6,"trig"], [2,"alt",7,"trig"],
         [0,"out",4,"in"], [4,"m3",8,"trig"],
         [5,"out",9,"a"], [6,"out",9,"b"], [7,"out",9,"c"], [8,"out",9,"d"],
         [9,"out",10,"in"], [10,"out",11,"in"]]},

/* ---------- basses et lignes ---------- */
{id:"acide", nom:"BASSE ACIDE", fam:"basse", bpm:130,
 res:"Filtre résonant balayé par l'enveloppe, glissando entre les notes",
 mods:[["clock"], ["seq16",{lg:0.45,n1:0.1,n2:0.1,n3:0.35,n4:0.1,n5:0.5,n6:0.1,n7:0.25,n8:0.1}],
       ["slew",{t:0.18}], ["vco",{oct:0.15,fin:0.5,fm:0}],
       ["vcf",{cut:0.18,q:0.72,mod:0.85}], ["adsr",{a:0,d:0.3,s:0.15,r:0.2}],
       ["vca",{gain:0}], ["dist",{drv:0.4,mix:0.6}], ["delay",{time:0.28,fb:0.35,mix:0.25}],
       ["out",{niv:0.75}]],
 cables:[[0,"out",1,"clk"], [1,"cv",2,"in"], [2,"out",3,"voct"], [1,"gate",5,"gate"],
         [3,"saw",4,"in"], [5,"out",4,"cv"], [4,"out",6,"in"], [5,"out",6,"cv"],
         [6,"out",7,"in"], [7,"out",8,"in"], [8,"out",9,"in"]]},

{id:"generatif", nom:"MÉLODIE SANS FIN", fam:"basse", bpm:104,
 res:"Registre à décalage remis en gamme : une suite qui dérive sans jamais fausser",
 mods:[["clock"], ["turing",{hasard:0.12,lg:0.5,amp:0.45}], ["quant",{gamme:0.5,oct:0.5}],
       ["wave",{oct:0.4,modele:0.3,harm:0.35}], ["ad",{a:0.02,d:0.35}], ["vca",{gain:0}],
       ["pingpong",{time:0.3,fb:0.45,mix:0.4}], ["out",{niv:0.7}]],
 cables:[[0,"out",1,"clk"], [1,"cv",2,"in"], [1,"gate",2,"clk"], [2,"out",3,"voct"],
         [1,"gate",4,"trig"], [3,"out",5,"in"], [4,"out",5,"cv"],
         [5,"out",6,"in"], [6,"out",7,"in"]]},

{id:"cloche", nom:"CLOCHES FM", fam:"basse", bpm:92,
 res:"L'enveloppe ouvre le timbre et non le volume : attaque brillante, queue sombre",
 mods:[["clock"], ["euclid",{pas:0.9,coups:0.3,dec:0.2}], ["ad",{a:0,d:0.6}],
       ["fm2",{oct:0.55,rap:0.4,idx:0.12}], ["vca",{gain:0}],
       ["verb",{taille:0.85,mix:0.5}], ["out",{niv:0.7}]],
 cables:[[0,"out",1,"in"], [1,"out",2,"trig"], [2,"out",3,"idxin"], [2,"out",4,"cv"],
         [3,"out",4,"in"], [4,"out",5,"in"], [5,"out",6,"in"]]},

/* ---------- ambiances ---------- */
{id:"ambiant", nom:"NAPPE AMBIANTE", fam:"nappe", bpm:70,
 res:"Bourdon d'accord qui respire, sans horloge : il sonne même à l'arrêt",
 mods:[["chord",{oct:0.35,type:0.25,det:0.35}], ["svf",{cut:0.4,q:0.25,mod:0.6}],
       ["lfo",{rate:0.02,amt:0.4}], ["vca",{gain:0.55}],
       ["chorus",{rate:0.15,prof:0.5}], ["verb",{taille:1,mix:0.62}], ["out",{niv:0.62}]],
 cables:[[0,"out",1,"in"], [2,"sine",1,"cv"], [1,"lp",3,"in"],
         [3,"out",4,"in"], [4,"out",5,"in"], [5,"out",6,"in"]]},

{id:"derive", nom:"ÎLE FLOTTANTE", fam:"nappe", bpm:64,
 res:"Deux tensions qui errent sans se répéter, l'une sur la hauteur, l'autre sur le filtre",
 mods:[["drift",{rate:0.1,amt:0.3}], ["super",{oct:0.3,det:0.55}], ["svf",{cut:0.32,q:0.3,mod:0.7}],
       ["vca",{gain:0.5}], ["grain",{taille:0.5,dens:0.4,mix:0.4}],
       ["verb",{taille:1,mix:0.55}], ["out",{niv:0.6}]],
 cables:[[0,"out",1,"voct"], [0,"out2",2,"cv"], [1,"out",2,"in"],
         [2,"lp",3,"in"], [3,"out",4,"in"], [4,"out",5,"in"], [5,"out",6,"in"]]},

{id:"souffle", nom:"VENT ET MÉTAL", fam:"nappe", bpm:60,
 res:"Du bruit passé dans un peigne accordé : une nappe sans le moindre oscillateur",
 mods:[["noise"], ["comb",{f:0.62,fb:0.8}], ["bpf",{cut:0.45,q:0.55,mod:0.6}],
       ["clklfo",{div:0.8,amt:0.5}], ["vca",{gain:0.45}],
       ["verb",{taille:1,mix:0.6}], ["out",{niv:0.6}]],
 cables:[[0,"rose",1,"in"], [1,"out",2,"in"], [3,"tri",2,"cv"],
         [2,"out",4,"in"], [4,"out",5,"in"], [5,"out",6,"in"]]},

/* ---------- textures ---------- */
{id:"voix", nom:"LE RACK QUI PARLE", fam:"etrange", bpm:96,
 res:"Deux résonances de voix humaine posées sur une dent de scie large",
 mods:[["clock"], ["seq8",{n1:0.2,n2:0.4,n3:0.2,n4:0.55,n5:0.3,n6:0.45,n7:0.2,n8:0.6}],
       ["super",{oct:0.4,det:0.3}], ["formant",{v:0.2,q:0.7}],
       ["adsr",{a:0.15,d:0.3,s:0.5,r:0.35}], ["vca",{gain:0}],
       ["delay",{time:0.4,fb:0.4,mix:0.3}], ["out",{niv:0.7}]],
 cables:[[0,"out",1,"clk"], [1,"cv",2,"voct"], [1,"gate",4,"gate"],
         [2,"out",3,"in"], [3,"out",5,"in"], [4,"out",5,"cv"],
         [5,"out",6,"in"], [6,"out",7,"in"]]},

{id:"ducking", nom:"NAPPE QUI S'ÉCARTE", fam:"etrange", bpm:124,
 res:"La grosse caisse creuse la nappe à chaque frappe, par suiveur d'enveloppe",
 mods:[["clock"], ["clkdiv"], ["kick",{tune:0.3,dec:0.45,niv:0.95}],
       ["chord",{oct:0.3,type:0.5,det:0.3}], ["envfol",{gain:0.7,lag:0.45}],
       ["atten",{amt:0.1,off:1}], ["vca",{gain:0}],
       ["mix4",{a:0.9,b:0.7,c:0,d:0}], ["verb",{taille:0.7,mix:0.3}], ["out",{niv:0.7}]],
 cables:[[0,"out",1,"in"], [1,"d4",2,"trig"], [2,"out",4,"in"],
         [4,"out",5,"in"], [3,"out",6,"in"], [5,"out",6,"cv"],
         [2,"out",7,"a"], [6,"out",7,"b"], [7,"out",8,"in"], [8,"out",9,"in"]]},

{id:"casse", nom:"MACHINE CASSÉE", fam:"etrange", bpm:88,
 res:"Modulation en anneau, repli d'onde et réduction de définition : rien n'est accordé",
 mods:[["clock"], ["trig4",{a:0.2,b:0.5,c:0.75,d:0.1}], ["drum",{tune:0.6,dec:0.3,drive:0.7,bruit:0.4}],
       ["ring",{f:0.35,mix:0.7}], ["fold",{amt:0.5,sym:0.6}], ["bits",{b:0.65}],
       ["sh",{amt:0.6,lisse:0.1}], ["mix4",{a:0.8,b:0.6,c:0,d:0}],
       ["pingpong",{time:0.22,fb:0.55,mix:0.45}], ["out",{niv:0.68}]],
 cables:[[0,"out",1,"clk"], [1,"ta",2,"trig"], [1,"tb",6,"trig"],
         [2,"out",3,"in"], [6,"out",3,"mod"], [3,"out",4,"in"], [4,"out",5,"in"],
         [5,"out",7,"a"], [2,"out",7,"b"], [7,"out",8,"in"], [8,"out",9,"in"]]},

/* ---------- styles ---------- */
{id:"dub", nom:"DUB", fam:"style", bpm:74,
 res:"Un accord lancé dans un écho qui n'en finit pas, coupé du grave",
 mods:[["clock"], ["clkdiv"], ["euclid",{pas:0.7,coups:0.2,dec:0.5}],
       ["kick",{tune:0.25,dec:0.55,niv:0.95}], ["rim",{tune:0.5,dec:0.25,niv:0.55}],
       ["chord",{oct:0.45,type:0.25,det:0.2}], ["ad",{a:0,d:0.25}], ["vca",{gain:0}],
       ["hpf",{cut:0.35,q:0.3,mod:0}], ["delay",{time:0.55,fb:0.72,mix:0.6}],
       ["mix4",{a:0.9,b:0.5,c:0.65,d:0}], ["verb",{taille:0.8,mix:0.3}], ["out",{niv:0.72}]],
 cables:[[0,"out",1,"in"], [1,"d4",3,"trig"], [0,"out",2,"in"],
         [2,"out",4,"trig"], [2,"inv",6,"trig"],
         [5,"out",7,"in"], [6,"out",7,"cv"], [7,"out",8,"in"], [8,"out",9,"in"],
         [3,"out",10,"a"], [4,"out",10,"b"], [9,"out",10,"c"],
         [10,"out",11,"in"], [11,"out",12,"in"]]},

{id:"detroit", nom:"TECHNO DE DÉTROIT", fam:"style", bpm:132,
 res:"Grosse caisse droite, charley à contretemps, accords balayés au tempo",
 mods:[["clock"], ["clkdiv"], ["kick",{tune:0.3,dec:0.4,niv:0.95}],
       ["hat",{tune:0.55,dec:0.1,niv:0.5}], ["clap",{tune:0.5,dec:0.35,niv:0.55}],
       ["euclid",{pas:0.8,coups:0.35,dec:0.4}], ["chord",{oct:0.4,type:0.15,det:0.25}],
       ["svf",{cut:0.35,q:0.45,mod:0.7}], ["clklfo",{div:0.6,amt:0.45}], ["ad",{a:0.01,d:0.3}],
       ["vca",{gain:0}], ["mix4",{a:0.9,b:0.5,c:0.5,d:0.6}], ["dist",{drv:0.25,mix:0.4}],
       ["out",{niv:0.72}]],
 cables:[[0,"out",1,"in"], [1,"d4",2,"trig"], [0,"out2",3,"trig"], [1,"d8",4,"trig"],
         [0,"out",5,"in"], [5,"out",9,"trig"],
         [6,"out",7,"in"], [8,"sine",7,"cv"], [7,"bp",10,"in"], [9,"out",10,"cv"],
         [2,"out",11,"a"], [3,"out",11,"b"], [4,"out",11,"c"], [10,"out",11,"d"],
         [11,"out",12,"in"], [12,"out",13,"in"]]},

{id:"jungle", nom:"JUNGLE", fam:"style", bpm:168,
 res:"Quatre pistes décalées les unes des autres, sous une basse profonde",
 mods:[["clock"], ["trig4",{a:0.1,b:0.42,c:0.68,d:0.25}], ["kick",{tune:0.28,dec:0.3,niv:0.9}],
       ["snare",{tune:0.5,dec:0.3,niv:0.75}], ["rim",{tune:0.6,dec:0.2,niv:0.55}],
       ["shaker",{tune:0.65,dec:0.12,niv:0.45}],
       ["vco",{oct:0.05,fin:0.5,fm:0}], ["seq8",{n1:0.1,n2:0.1,n3:0.22,n4:0.1,n5:0.1,n6:0.35,n7:0.1,n8:0.18}],
       ["vca",{gain:0}], ["ad",{a:0.01,d:0.55}], ["clkdiv"],
       ["mix4",{a:0.85,b:0.7,c:0.5,d:0.4}], ["limit",{seuil:0.5,rap:0.7}], ["out",{niv:0.72}]],
 cables:[[0,"out",1,"clk"],
         [1,"ta",2,"trig"], [1,"tb",3,"trig"], [1,"tc",4,"trig"], [1,"td",5,"trig"],
         [2,"out",11,"a"], [3,"out",11,"b"], [4,"out",11,"c"], [5,"out",11,"d"],
         [11,"out",12,"in"], [12,"out",13,"in"],
         [0,"out",10,"in"], [10,"d4",7,"clk"], [7,"cv",6,"voct"], [7,"gate",9,"trig"],
         [6,"sub",8,"in"], [9,"out",8,"cv"], [8,"out",13,"in2"]]},

{id:"drone", nom:"DRONE", fam:"style", bpm:60,
 res:"Aucune horloge, aucune note : deux oscillateurs qui se frottent dans un peigne",
 mods:[["vco",{oct:0.2,fin:0.48,fm:0}], ["super",{oct:0.2,det:0.15}],
       ["drift",{rate:0.05,amt:0.12}], ["mix4",{a:0.6,b:0.6,c:0,d:0}],
       ["comb",{f:0.5,fb:0.6}], ["vcf",{cut:0.4,q:0.2,mod:0.35}], ["lfo",{rate:0.02,amt:0.3}],
       ["verb",{taille:1,mix:0.7}], ["out",{niv:0.58}]],
 cables:[[2,"out",0,"voct"], [2,"out2",1,"voct"],
         [0,"tri",3,"a"], [1,"out",3,"b"], [3,"out",4,"in"], [4,"out",5,"in"],
         [6,"sine",5,"cv"], [5,"out",7,"in"], [7,"out",8,"in"]]},

{id:"berlin", nom:"ÉCOLE DE BERLIN", fam:"style", bpm:112,
 res:"Séquence de seize pas, filtre qui s'ouvre sur plusieurs mesures, écho long",
 mods:[["clock"], ["seq16",{lg:1,n1:0.1,n2:0.3,n3:0.1,n4:0.45,n5:0.2,n6:0.55,n7:0.1,n8:0.3,
                            n9:0.15,n10:0.4,n11:0.1,n12:0.5,n13:0.25,n14:0.6,n15:0.1,n16:0.35}],
       ["vco",{oct:0.35,fin:0.5,fm:0}], ["vcf",{cut:0.22,q:0.6,mod:0.75}],
       ["adsr",{a:0.02,d:0.35,s:0.3,r:0.25}], ["vca",{gain:0}],
       ["clklfo",{div:0.85,amt:0.55}], ["delay",{time:0.45,fb:0.5,mix:0.38}],
       ["verb",{taille:0.9,mix:0.3}], ["out",{niv:0.7}]],
 cables:[[0,"out",1,"clk"], [1,"cv",2,"voct"], [1,"gate",4,"gate"],
         [2,"saw",3,"in"], [6,"tri",3,"cv"], [3,"out",5,"in"], [4,"out",5,"cv"],
         [5,"out",7,"in"], [7,"out",8,"in"], [8,"out",9,"in"]]},

{id:"industriel", nom:"INDUSTRIEL", fam:"style", bpm:106,
 res:"Une frappe passée dans un peigne métallique, saturée puis réduite en morceaux",
 mods:[["clock"], ["trig4",{a:0.15,b:0.5,c:0.7,d:0.3}],
       ["drum",{tune:0.4,dec:0.5,drive:0.9,bruit:0.6}], ["snare",{tune:0.45,dec:0.4,niv:0.7}],
       ["comb",{f:0.75,fb:0.85}], ["dist",{drv:0.7,mix:0.8}], ["bits",{b:0.5}],
       ["mix4",{a:0.8,b:0.6,c:0,d:0}], ["limit",{seuil:0.5,rap:0.75}], ["out",{niv:0.7}]],
 cables:[[0,"out",1,"clk"], [1,"ta",2,"trig"], [1,"tc",3,"trig"],
         [2,"out",4,"in"], [4,"out",5,"in"], [5,"out",6,"in"],
         [6,"out",7,"a"], [3,"out",7,"b"], [7,"out",8,"in"], [8,"out",9,"in"]]},

{id:"lofi", nom:"LO-FI", fam:"style", bpm:84,
 res:"Une corde pincée dont la hauteur flotte : le MIX 4 additionne deux tensions",
 mods:[["clock"], ["seq8",{n1:0.3,n2:0.45,n3:0.3,n4:0.6,n5:0.4,n6:0.3,n7:0.5,n8:0.35}],
       ["drift",{rate:0.2,amt:0.06}], ["mix4",{a:0.9,b:0.25,c:0,d:0}],
       ["pluck",{oct:0.45,ton:0.6,dec:0.5}], ["bits",{b:0.4}],
       ["chorus",{rate:0.1,prof:0.55}], ["eq3",{bas:0.6,mil:0.45,haut:0.3}],
       ["verb",{taille:0.6,mix:0.3}], ["out",{niv:0.7}]],
 cables:[[0,"out",1,"clk"], [1,"cv",3,"a"], [2,"out",3,"b"], [3,"out",4,"voct"],
         [1,"gate",4,"trig"], [4,"out",5,"in"], [5,"out",6,"in"], [6,"out",7,"in"],
         [7,"out",8,"in"], [8,"out",9,"in"]]},

{id:"phases", nom:"PHASES", fam:"style", bpm:118,
 res:"Deux séquences de longueurs différentes sur la même horloge, séparées à l'oreille",
 mods:[["clock"], ["seq16",{lg:1,n1:0.2,n2:0.35,n3:0.5,n4:0.25,n5:0.4,n6:0.6,n7:0.3,n8:0.45}],
       ["seq16",{lg:0.4,n1:0.5,n2:0.3,n3:0.45,n4:0.6,n5:0.35,n6:0.25,n7:0.55}],
       ["pluck",{oct:0.5,ton:0.5,dec:0.45}], ["pluck",{oct:0.6,ton:0.65,dec:0.4}],
       ["pan",{p:0.15}], ["pan",{p:0.85}], ["mix4",{a:0.7,b:0.7,c:0,d:0}],
       ["verb",{taille:0.85,mix:0.4}], ["out",{niv:0.7}]],
 cables:[[0,"out",1,"clk"], [0,"out",2,"clk"],
         [1,"cv",3,"voct"], [1,"gate",3,"trig"], [2,"cv",4,"voct"], [2,"gate",4,"trig"],
         [3,"out",5,"in"], [4,"out",6,"in"], [5,"out",7,"a"], [6,"out",7,"b"],
         [7,"out",8,"in"], [8,"out",9,"in"]]},

{id:"acide303", nom:"ACIDE 303", fam:"style", bpm:138,
 res:"Le filtre, son enveloppe et l'accent en un seul circuit, comme sur la vraie",
 mods:[["clock"], ["seq16",{lg:0.45,n1:0.1,n2:0.1,n3:0.3,n4:0.1,n5:0.45,n6:0.1,n7:0.2,n8:0.1}],
       ["euclid",{pas:0.9,coups:0.22,dec:0.4}], ["slew",{t:0.16}],
       ["vco",{oct:0.12,fin:0.5,fm:0}], ["acid",{cut:0.14,q:0.78,env:0.7,dec:0.28}],
       ["clip",{drive:0.35,ton:0.3}], ["delay",{time:0.26,fb:0.42,mix:0.28}], ["out",{niv:0.72}]],
 cables:[[0,"out",1,"clk"], [1,"cv",3,"in"], [3,"out",4,"voct"],
         [1,"gate",5,"trig"], [0,"out",2,"in"], [2,"out",5,"acc"],
         [4,"saw",5,"in"], [5,"out",6,"in"], [6,"out",7,"in"], [7,"out",8,"in"]]},

{id:"hardtek", nom:"HARDTEK", fam:"style", bpm:180,
 res:"Grosse caisse saturée jusqu'à devenir une note, et une nappe qui plonge",
 mods:[["clock"], ["clkdiv"], ["tekkick",{tune:0.3,dec:0.55,drive:0.8,niv:0.9}],
       ["euclid",{pas:0.85,coups:0.3,dec:0.5}], ["hoover",{oct:0.4,sweep:0.6,det:0.45}],
       ["ad",{a:0.01,d:0.4}], ["vca",{gain:0}], ["hat",{tune:0.6,dec:0.1,niv:0.45}],
       ["mix4",{a:0.9,b:0.6,c:0.5,d:0}], ["clip",{drive:0.45,ton:0.35}],
       ["limit",{seuil:0.45,rap:0.8}], ["out",{niv:0.7}]],
 cables:[[0,"out",1,"in"], [1,"d4",2,"trig"], [0,"out2",7,"trig"],
         [0,"out",3,"in"], [3,"out",4,"trig"], [3,"out",5,"trig"],
         [4,"out",6,"in"], [5,"out",6,"cv"],
         [2,"out",8,"a"], [6,"out",8,"b"], [7,"out",8,"c"],
         [8,"out",9,"in"], [9,"out",10,"in"], [10,"out",11,"in"]]},

{id:"tribe", nom:"TRIBE", fam:"style", bpm:150,
 res:"Trois peaux sur des densités euclidiennes qui ne retombent jamais ensemble",
 mods:[["clock"], ["clkdiv"], ["euclid",{pas:1,coups:0.35,dec:0}],
       ["euclid",{pas:0.75,coups:0.5,dec:0.35}], ["euclid",{pas:0.6,coups:0.6,dec:0.7}],
       ["tekkick",{tune:0.25,dec:0.4,drive:0.45,niv:0.85}],
       ["tribal",{type:0,tune:0.45,dec:0.5,niv:0.8}],
       ["tribal",{type:0.35,tune:0.7,dec:0.3,niv:0.7}],
       ["tribal",{type:0.7,tune:0.35,dec:0.55,niv:0.75}],
       ["mix4",{a:0.9,b:0.7,c:0.6,d:0.6}], ["verb",{taille:0.5,mix:0.22}], ["out",{niv:0.72}]],
 cables:[[0,"out",1,"in"], [1,"d4",5,"trig"],
         [0,"out",2,"in"], [0,"out",3,"in"], [0,"out",4,"in"],
         [2,"out",6,"trig"], [3,"out",7,"trig"], [4,"out",8,"trig"],
         [5,"out",9,"a"], [6,"out",9,"b"], [7,"out",9,"c"], [8,"out",9,"d"],
         [9,"out",10,"in"], [10,"out",11,"in"]]},

{id:"psy", nom:"PSYCHÉDÉLIQUE", fam:"style", bpm:145,
 res:"Nappe hachée en doubles-croches, zaps sur les contretemps, montée sur quatre mesures",
 mods:[["clock"], ["clkdiv"], ["chord",{oct:0.35,type:0.15,det:0.3}],
       ["svf",{cut:0.38,q:0.5,mod:0.7}], ["clklfo",{div:0.55,amt:0.5}],
       ["tgate",{mot:0.43,prof:0.9,forme:0.2}],
       ["euclid",{pas:0.7,coups:0.25,dec:0.6}], ["zap",{tune:0.65,dec:0.3,fm:0.5,niv:0.6}],
       ["riser",{mes:0.45,etendue:0.7,niv:0.5}],
       ["mix4",{a:0.8,b:0.6,c:0.5,d:0}], ["pingpong",{time:0.28,fb:0.5,mix:0.4}], ["out",{niv:0.7}]],
 cables:[[0,"out",1,"in"], [2,"out",3,"in"], [4,"sine",3,"cv"],
         [3,"bp",5,"in"], [0,"out",5,"clk"],
         [0,"out",6,"in"], [6,"out",7,"trig"], [1,"d16",8,"trig"],
         [5,"out",9,"a"], [7,"out",9,"b"], [8,"out",9,"c"],
         [9,"out",10,"in"], [10,"out",11,"in"]]}
];

/* Au-delà de huit modules, une seule rangée oblige à défiler sans arrêt : on
   coupe en deux en gardant l'ordre, si bien que le signal continue de se lire
   de gauche à droite puis en dessous. */
function repartirRangees(seuil){
  var n = EUR.mods.length;
  if(n <= (seuil || 8)){ EUR.mods.forEach(function(m){ m.r = 0; }); return; }
  var moitie = Math.ceil(n / 2);
  EUR.mods.forEach(function(m, i){ m.r = (i < moitie) ? 0 : 1; });
}

/* Monte un patch complet d'un coup. On garde la même mécanique que partout :
   tout est reconstruit, ce qui est plus court et plus sûr que de rapiécer. */
function eurMonter(P){
  if(typeof EUR_PERF_UI!=="undefined")EUR_PERF_UI.fermer(false);
  EUR.performance=null;
  /* Un ensemble neuf repart au premier temps au prochain START, jamais au
     milieu de l'ancienne phrase. Les anciens montages gardent leur conduite. */
  if(P.fam === "ensemble" || P.fam === "avance" || P.fam === "rave" || P.fam === "performance") stop();
  EUR.mods = []; EUR.cables = []; EUR.prochain = 1; EUR.sel = -1; EUR.attente = null;
  var rangs = P.mods.map(function(x){
    var m = eurAjouter(x[0], true);
    if(m && x[1]) for(var k in x[1]) if(m.p[k] !== undefined) m.p[k] = x[1][k];
    return m ? m.id : -1;
  });
  P.cables.forEach(function(c){
    if(rangs[c[0]] < 0 || rangs[c[2]] < 0) return;
    EUR.cables.push({de:[rangs[c[0]], c[1]], vers:[rangs[c[2]], c[3]]});
  });
  if(P.bpm){ S.bpm = P.bpm; kEurTempo.maj(); saveSoon(); }
  EUR.nom = P.nom;                    /* le rack prend le nom du montage */
  if(P.rangees && P.rangees.length === EUR.mods.length){
    EUR.mods.forEach(function(m, i){ m.r = P.rangees[i] === 1 ? 1 : 0; });
  } else repartirRangees();
  if(typeof EUR_PERFORMANCE!=="undefined")EUR_PERFORMANCE.depuisMontage(P.performance,rangs);
  eurBatir(); eurDessiner(); memEur(); majRackEur();
  lcdEur(P.nom, EUR.mods.length + " MODULES · RACK " + (EUR.cur + 1), true);
  signal(P.nom + " · " + P.res);
}
function eurMontages(){
  var c = document.getElementById("eur-cat");
  if(c.style.display !== "none" && c.dataset.vue === "mont"){ montrerCat(c, false); return; }
  c.innerHTML = ""; c.dataset.vue = "mont";
  var onglets = document.createElement("div");
  onglets.className = "eur-fam";
  EUR_MONT_FAM.forEach(function(f){
    var b = document.createElement("button");
    b.textContent = f[1];
    b.className = (EUR.montFam === f[0] || (!EUR.montFam && f === EUR_MONT_FAM[0])) ? "on" : "";
    b.addEventListener("click", function(){
      EUR.montFam = f[0]; montrerCat(c, false); eurMontages();
    });
    onglets.appendChild(b);
  });
  c.appendChild(onglets);
  var fam = EUR.montFam || EUR_MONT_FAM[0][0];
  if(fam === "ensemble"){
    var aide = document.createElement("p");
    aide.className = "eur-ensembles-aide";
    aide.textContent = "Kick + percussion + charley + basse + mélodie. Choisissez un montage, puis START. " +
      "MIX 4 du bas : A batterie · B basse · C mélodie. FOCUS agrandit ses réglages. " +
      "Le rack courant sera remplacé après confirmation ; les sept autres restent intacts.";
    c.appendChild(aide);
  }
  if(fam === "avance"){
    var aideAv = document.createElement("p");
    aideAv.className = "eur-ensembles-aide";
    aideAv.textContent = "DRUM 32 : A kick · B caisse claire · C charley · D percussion. " +
      "Touchez une piste pour programmer les pas dans FOCUS. Basse et mélodie ont leurs séquenceurs séparés. " +
      "Choisissez un rack vide pour conserver votre montage actuel.";
    c.appendChild(aideAv);
  }
  if(fam === "performance"){
    var aidePerf=document.createElement("p");aidePerf.className="eur-ensembles-aide";
    aidePerf.textContent="Montages déjà affectés aux huit commandes PERFORMANCE : niveaux des quatre parties, couleurs et échos. START, puis PERFORMANCE. MÉMORISER garde un point de retour sans changer le son.";
    c.appendChild(aidePerf);
  }
  if(fam === "rave"){
    var aideRave = document.createElement("p");
    aideRave.className = "eur-ensembles-aide";
    aideRave.textContent = "6 styles, kick + basse + mélodie + effets. BREAK 32 découpe un break original ; CORE KICK sculpte le kick hardcore. " +
      "MIX 4 général : A batterie · B basse · C mélodie · D effets. SCÈNES 8 organise les entrées et les breaks sur 12 mesures. " +
      "Utilisez un rack vide pour conserver votre montage actuel, puis START.";
    c.appendChild(aideRave);
  }
  EUR_MONTAGES.forEach(function(P){
    if(P.fam !== fam) return;
    var b = document.createElement("button");
    b.dataset.montage = P.id;
    b.dataset.famille = P.fam;
    b.textContent = P.nom;
    if(P.fam === "ensemble" || P.fam === "avance" || P.fam === "rave" || P.fam === "performance"){
      var meta = document.createElement("span");
      meta.className = "eur-ensemble-meta";
      meta.textContent = P.bpm + " BPM · " + P.tonalite + " · " + P.mods.length + " MODULES";
      b.appendChild(meta);
    }
    var res = document.createElement("span");
    res.textContent = P.res;
    b.appendChild(res);
    b.addEventListener("click", function(){
      if(EUR.mods.length &&
         !window.confirm("Monter « " + P.nom + " » à la place de « " +
                         (EUR.nom || ("RACK " + (EUR.cur + 1))) + " » ?\n\n" +
                         "Ce rack sera remplacé. Les sept autres ne sont pas touchés."))
        return;
      montrerCat(c, false);
      eurMonter(P);
      H.inter();
    });
    c.appendChild(b);
  });
  montrerCat(c, true);
}

function eurHasard(){
  if(typeof EUR_PERF_UI!=="undefined")EUR_PERF_UI.fermer(false);
  EUR.performance=null;
  function tire(l){ return l[Math.floor(Math.random() * l.length)]; }
  EUR.mods = []; EUR.cables = []; EUR.prochain = 1; EUR.sel = -1;
  var h = eurAjouter("clock", true);
  var rythme = eurAjouter(tire(["euclid","trig4","seq8","seq16","turing"]), true);
  var voix = [];
  var nv = 2 + Math.floor(Math.random() * 2);
  for(var i=0;i<nv;i++) voix.push(eurAjouter(tire(["kick","snare","hat","clap","tom","rim","cym","drum","pluck"]), true));
  var eff = eurAjouter(tire(["delay","verb","dist","fold","bits","chorus","phaser","grain","comb"]), true);
  var mix = eurAjouter("mix4", true);
  var so = eurAjouter("out", true);
  EUR.cables.push({de:[h.id,"out"], vers:[rythme.id, rythme.type === "trig4" ? "clk" : "clk"]});
  var sorties = (rythme.type === "trig4") ? ["ta","tb","tc","td"] : ["gate","gate","gate","gate"];
  voix.forEach(function(v, i){
    EUR.cables.push({de:[rythme.id, sorties[i % sorties.length]], vers:[v.id,"trig"]});
    EUR.cables.push({de:[v.id,"out"], vers:[mix.id, ["a","b","c","d"][i]]});
  });
  EUR.cables.push({de:[mix.id,"out"], vers:[eff.id,"in"]});
  EUR.cables.push({de:[eff.id,"out"], vers:[so.id,"in"]});
  repartirRangees();
  eurBatir(); eurDessiner(); memEur();
  signal(EUR.mods.length + " MODULES TIRÉS AU SORT");
}
document.getElementById("eur-vider").addEventListener("click", function(){
  if(!window.confirm("Vider « " + (EUR.nom || ("RACK " + (EUR.cur + 1))) +
                     " » ?\n\nLes sept autres racks ne sont pas touchés.")) return;
  if(typeof EUR_PERF_UI!=="undefined")EUR_PERF_UI.fermer(false);
  EUR.performance=null;
  EUR.mods = []; EUR.cables = []; EUR.sel = -1; EUR.attente = null; EUR.nom = "";
  eurBatir(); eurDessiner(); memEur(); majRackEur(); H.inter();
});
/* Le plein écran est général, pas propre au rack : toutes les façades y
   gagnent. On refait la mise à l'échelle, la hauteur disponible ayant changé. */
function pleinEcran(oui){
  document.body.classList.toggle("plein", oui);
  if(oui) fermerTiroirsEur();
  var c = document.getElementById("eur-cat");
  if(c) montrerCat(c, false);
  setTimeout(function(){ fit(); if(S.modele === "eur") eurCables(); }, 60);
}
document.getElementById("eur-plein").addEventListener("click", function(){
  pleinEcran(true); H.inter();
  signal("TOUCHEZ EN HAUT À DROITE POUR REVENIR");
});
document.getElementById("sortir-plein").addEventListener("click", function(){
  pleinEcran(false); H.cran();
});
/* ---------- la barre de défilement du rack ----------
   Le rack défile déjà au doigt, mais il faut pour cela tomber entre deux
   modules. Cette poignée fait toute la largeur : on l'attrape sans viser, et
   elle dit du même coup où l'on se trouve dans le rack. Elle ne se montre que
   s'il y a quelque chose à faire défiler. */
(function barreRack(){
  var rack = document.getElementById("eur-rack");
  var barre = document.getElementById("eur-barre-h");
  var pouce = barre.querySelector("i");
  var prise = null;
  function trop(){ return rack.scrollWidth - rack.clientWidth; }
  window.eurMajBarre = function(){
    var d = trop();
    barre.classList.toggle("vu", d > 8);
    if(d <= 8) return;
    var l = Math.max(44, barre.clientWidth * rack.clientWidth / rack.scrollWidth);
    pouce.style.width = Math.round(l) + "px";
    pouce.style.left = Math.round((barre.clientWidth - l) * rack.scrollLeft / d) + "px";
  };
  function viser(x){
    var r = barre.getBoundingClientRect();
    var l = pouce.offsetWidth;
    var p = (x - r.left - l / 2) / Math.max(1, r.width - l);
    rack.scrollLeft = Math.max(0, Math.min(1, p)) * trop();
    eurMajBarre();
  }
  barre.addEventListener("pointerdown", function(e){
    if(trop() <= 8) return;
    prise = e.pointerId;
    barre.setPointerCapture(e.pointerId);
    barre.classList.add("prise");
    viser(e.clientX);
    e.preventDefault(); e.stopPropagation();
  });
  barre.addEventListener("pointermove", function(e){
    if(prise !== e.pointerId) return;
    viser(e.clientX);
    e.preventDefault(); e.stopPropagation();
  });
  function lacher(e){
    if(prise !== e.pointerId) return;
    prise = null; barre.classList.remove("prise");
  }
  barre.addEventListener("pointerup", lacher);
  barre.addEventListener("pointercancel", lacher);
  /* le rack peut aussi défiler au doigt : la poignée suit */
  rack.addEventListener("scroll", function(){ if(prise === null) eurMajBarre(); });
})();

/* Un seul tiroir ouvert à la fois : deux ouverts, et on retombe dans le
   fouillis qu'on vient d'enlever. Rouvrir le même le referme. */
/* Depuis que le catalogue est AU-DESSUS du rack, l'ouvrir ou le fermer décale
   tout ce qui suit : la façade change de hauteur et les câbles ne sont plus en
   face de leurs prises. On passe donc toujours par ici. */
function montrerCat(c, vu){
  if(!c) return;
  c.style.display = vu ? "grid" : "none";
  setTimeout(function(){
    fit(); eurCables();
    if(window.eurMajBarre) window.eurMajBarre();
  }, 40);
}
function fermerTiroirsEur(){
  ["rack","patch"].forEach(function(n){
    var g = document.getElementById("eur-grp-" + n), t = document.getElementById("eur-t-" + n);
    if(g) g.classList.remove("vu");
    if(t) t.classList.remove("on");
  });
}
function tiroirEur(nom){
  var ouvert = false;
  ["rack","patch"].forEach(function(n){
    var g = document.getElementById("eur-grp-" + n);
    var t = document.getElementById("eur-t-" + n);
    var vu = (n === nom) && !g.classList.contains("vu");
    g.classList.toggle("vu", vu);
    t.classList.toggle("on", vu);
    if(vu) ouvert = true;
  });
  /* le catalogue appartient au tiroir PATCH : il se referme avec lui */
  var c = document.getElementById("eur-cat");
  if(c && !ouvert) montrerCat(c, false);
  /* la hauteur de la barre a changé : la façade et les câbles suivent */
  setTimeout(function(){ fit(); eurCables(); if(window.eurMajBarre) window.eurMajBarre(); }, 40);
}
document.getElementById("eur-t-rack").addEventListener("click", function(){ tiroirEur("rack"); H.cran(); });
document.getElementById("eur-t-patch").addEventListener("click", function(){ tiroirEur("patch"); H.cran(); });

document.getElementById("eur-mont").addEventListener("click", function(){ eurMontages(); H.cran(); });
/* Le bouton ouvre la liste des huit. Passer au suivant reste possible d'un
   seul geste depuis la liste, mais choisir directement vaut mieux quand ils
   portent des noms. */
document.getElementById("eur-ptn").addEventListener("click", function(){
  listeRacks(); H.cran();
});
document.getElementById("eur-nom").addEventListener("click", function(){
  nommerRack(); H.cran();
});

var kEurTempo = knobEm("eur-k-tempo", {min:0, max:1,
  get:function(){ return (S.bpm - 40) / 180; },
  set:function(v){
    S.bpm = Math.round(40 + v * 180);
    lcdEur(S.bpm + " BPM", "TEMPO", true);
    saveSoon();
  },
  tap:function(){ lcdEur(S.bpm + " BPM", "TEMPO", true); H.cran(); }});

var unitEur = document.getElementById("unit-eur");
function activerEur(){
  stop();
  S.modele = "eur";
  MACHINE = MACHINE_EUR;
  poserMachine("eur");
  audioInit();
  chargerEur();
  chargerEchs();  /* v283 : sources personnelles de BREAK 32, chargement asynchrone */
  /* Le patch d'exemple ne se pose qu'à la toute première visite. Depuis qu'il y
     a huit racks, un rack vide est un choix : le remplir d'office effacerait ce
     que l'on vient délibérément de vider. */
  if(!EUR.mods.length && !memEurNormalise().racks.some(function(r){ return r && r.mods && r.mods.length; }))
    eurExemple();
  else { eurBatir(); eurDessiner(); }
  kEurTempo.maj();
  fermerTiroirsEur();          /* on revient toujours sur la ligne de jeu */
  actif = unitEur;
  save(); fit();
  setTimeout(function(){ fit(); eurCables(); }, 150);
}


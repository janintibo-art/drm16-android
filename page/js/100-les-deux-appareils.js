/* ================= les deux appareils ================= */
var MODELES = {
  "16":{
    logo:"DRM16", numero:"01", out2:"OUTPUT 2",
    droite:"SPACE DRUM · ON", modeDroite:"space",
    misc4:"SHUFFLE",
    del:["STANDARD MODE","WOOD BLOCK","LONG CYMBAL","SHORT CYMBAL"],
    coupe:[[], ["wb"], ["rd"], ["cy"]],
    frappe:[null,"wb","rd","cy"],
    banques:1,
    note:"Sur la DRM16, l'interrupteur SPACE DRUM ajoute ou retire les accents de space drum, et DELETE retire le wood block, la cymbale longue ou la cymbale courte. Seize rythmes."
  },
  "32":{
    logo:"DRM32", numero:"03", out2:"CLOCK OUT",
    droite:"SELECTION", modeDroite:"bank",
    misc4:"SWING",
    del:["STANDARD","SPACE DRUM","WOOD BLOCK","CYMBALS"],
    coupe:[[], ["sp"], ["wb"], ["rd","cy"]],
    frappe:[null,"sp","wb","cy"],
    banques:2,
    note:"Sur la DRM32, l'interrupteur SELECTION passe d'une sélection à l'autre : chaque case de la matrice porte deux rythmes, le vert et le jaune, soit trente-deux en tout. La moitié allumée de la case indique la sélection en cours. DELETE retire ici le space drum, le wood block ou les deux cymbales."
  }
};


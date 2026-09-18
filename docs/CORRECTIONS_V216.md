# v216 — Panneau d'édition TR-1000 repliable

Les sept commandes de séquence (copier, coller, doubler, inverser, décaler à gauche/droite et effacer) sont regroupées dans un panneau natif repliable sous les instruments. Le titre indique l'instrument sélectionné. Le panneau démarre fermé au chargement et peut être ouvert au toucher ou au clavier.

ANNULER reste dans la barre principale. Les boutons de copie du motif sont explicitement nommés COPIER MOTIF et COLLER MOTIF. Les commandes regroupées utilisent une grille adaptable avec des boutons de 44 px de hauteur avant mise à l'échelle globale. L'ouverture et la fermeture recalculent la mise à l'échelle de la façade active.

Les actions d'édition, leurs confirmations, leur protection pendant PLAY et les données sauvegardées sont inchangées.

## Validation

- Contrôles communs 0 à 7 réussis : assemblage et structure HTML, syntaxe JavaScript, régressions des séquenceurs, compilation/tests Java, préparation et archive PC.
- Test navigateur existant adapté pour ouvrir le panneau avant les éditions et vérifier visibilité, nom de l'instrument et accès à ANNULER. Non exécuté localement, Chromium étant bloqué par le sandbox ; rendu sur téléphone à vérifier.
- Rust non vérifié localement : rustc absent.
- APK non compilé localement ; compilation à suivre dans GitHub Actions.

Patch à appliquer après la v215. Attendre que toute compilation précédente soit terminée avant l'envoi pour éviter son annulation.

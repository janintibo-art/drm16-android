# v226 — Parameter Locks du PO-33 K.O!

Le PO-33 K.O! reçoit un panneau PARAMETER LOCK. Chaque motif peut mémoriser, pour chacun de ses 16 pas, plusieurs variations indépendantes : PITCH, START, LENGTH et TONE. PITCH transpose la frappe, START déplace le début de l'échantillon, LENGTH raccourcit sa durée et TONE applique un passe-bas. Les valeurs sont appliquées à toutes les frappes du pas, y compris les quatre coups d'un ROULEMENT.

Le pas à modifier se choisit dans le panneau. ÉCRIRE ajoute ou remplace seulement le paramètre sélectionné ; EFFACER le retire sans toucher aux autres. Les commandes sont désactivées pendant PLAY ou dans les modes PATTERN/FX. Les anciens motifs restent compatibles et commencent sans verrou. WRITE efface également les verrous du motif après confirmation.

La documentation EM-1 est mise à jour pour refléter les 64 pas et les 64 positions Song.

## Fichiers

Moteur PO-33, façade, CSS et notice ; documentation EM-1/README ; tests Node et navigateur ; contrôles ; HTML assemblé et versions Android/bureau.

## Validation

- Test Node réussi : quatre paramètres, bornes MIDI, sauvegarde, migration sans verrous, lecture du pas et ROULEMENT.
- Syntaxe JavaScript et Python vérifiée, HTML assemblé puis contrôlé.
- Contrôles communs 0 à 7 à relancer dans le nouveau worktree ; l'étape MIDI bureau reste dépendante de `rustc`, absent de l'environnement local.
- Test navigateur ajouté pour l'écriture, la combinaison, l'effacement et le verrouillage pendant PLAY ; son exécution dépend de Chromium dans GitHub Actions.

Appliquer après la v225 et attendre que sa compilation soit verte avant l'envoi.

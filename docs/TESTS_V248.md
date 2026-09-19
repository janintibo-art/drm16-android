# Vérifications v248 — Freesound

## Résultat

**24 tests unitaires Node réussis ; 13 scénarios navigateur réussis.**
La syntaxe des trois blocs de script de la page assemblée a également été
vérifiée avec `node --check`. La syntaxe de `outils/controles.sh` est vérifiée
avec `bash -n`. Le fichier de contrôles de base a été comparé à son empreinte
Git ; seul le lancement du nouveau test Freesound a été ajouté.

## Essais navigateur

Chromium en mode sans interface, page complète chargée directement en mémoire.
L'API, le stockage natif et le localStorage ont été simulés. Le décodage audio,
l'interface et les fonctions de bibliothèque et d'export de projet étaient
ceux de l'application. Le fichier audio de test était un WAV synthétique,
transmis sous une adresse d'aperçu simulée : aucun son réel n'a été téléchargé.

- Application complete et nouvel onglet ouverts sans requete automatique.
- Saisie de la cle, stockage optionnel separe des projets.
- Recherche et affichage texte des noms, auteurs et licences sans injection HTML.
- Trois formats sans debordement horizontal du contenu : 393x851, 880x400, 360x640.
- Preecoute avec vrai decodage Web Audio du fichier audio de test puis arret.
- Import audio sauvegarde via pont simule, mono32kHz, credits et protection du doublon.
- Son retrouve dans SONS et credits relus depuis le stockage.
- Son WAV relu et decode par le chargeur existant ; export reel de projet sans la cle API.
- Erreurs 403 et JSON : message utile sans afficher la cle, interface debloquee.
- Fermeture pendant un import : resultat tardif ignore, aucun son importe a l'insu de l'utilisateur.
- Changer de rayon interrompt la preecoute Freesound seulement.
- 29 machines existantes ouvertes sans erreur (test de demarrage, pas analyse audio complete).
- Aucune erreur JavaScript de page pendant les essais.

Les captures ont été inspectées aux formats 393 × 851, 880 × 400 et 360 × 640.
Aucun débordement horizontal du contenu Freesound ; la barre des rayons défile
horizontalement volontairement. Les 29 entrées de machines du menu ont été
ouvertes sans erreur JavaScript ; cela ne remplace pas un audit audio de chacune.

## Tests unitaires reproductibles

Le test couvre l'adresse officielle, les paramètres, les filtres, les hôtes
d'aperçus, la clé, la séparation des projets, les licences, les erreurs réseau,
le refus de suivre une adresse de pagination arbitraire, l'annulation, la
concurrence, les échecs de sauvegarde, les crédits corrompus et les doublons.

```bash
node outils/test-freesound.cjs
```

Ce test est également appelé par `outils/controles.sh` avant la compilation
GitHub habituelle.

## Non vérifié dans cet environnement

Aucun appel Freesound authentifié : aucune clé personnelle n'était disponible.
Aucun test du réseau réel Android, du codec MP3 sur le téléphone, du presse-papiers
Android ou de la coque Windows. Pas de compilation APK v248 réalisée ici, ni
d'exécution de l'ensemble des contrôles historiques du dépôt. Seule la compilation
v247 déjà réalisée sur GitHub a été consultée et confirmée verte.

La validation finale nécessite une compilation v248 sur GitHub puis, dans l'APK,
une recherche avec une vraie clé, une écoute, un import et une vérification
de présence du son et des crédits après fermeture et réouverture de l'application.

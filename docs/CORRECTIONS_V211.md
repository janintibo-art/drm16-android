# v211 — Décalage des séquences TR-1000

Deux boutons, « ← PAS » et « PAS → », décalent d'un pas la grille de l'instrument sélectionné, à l'arrêt. La rotation suit sa longueur propre (ou LAST), avec retour à l'autre extrémité. Les pas au-delà de cette longueur et les autres instruments sont préservés.

Notes, accents, sous-pas, probabilités, cycles, retards et variations de paramètres se déplacent ensemble, même sur les cellules sans note. Le sens de lecture et le kit restent inchangés. MOTION REC est désarmé. ANNULER restaure le motif complet précédent, avec la confirmation habituelle ; un seul état temporaire est conservé.

## Vérifications

- Régressions Node TR-1000 réussies, dont rotations inverses, métadonnées, limites de longueur 1/3/16, sauvegarde, annulation et refus pendant PLAY.
- Contrôles communs 0 à 7 réussis : assemblage, HTML/JavaScript, tests JavaScript et Java, préparation et archive PC.
- Contrôle Rust non exécuté : rustc absent de l'environnement.
- Test navigateur enrichi pour les boutons, l'annulation et la protection PLAY ; non exécuté localement, Chromium étant bloqué par le sandbox.
- Compilation APK à vérifier dans GitHub Actions ; non réalisée localement.

## Livraison

Patch limité aux fichiers modifiés, sous drm16_android/. Versions Android et bureau : 211. Edition Rust conservée à 2021.

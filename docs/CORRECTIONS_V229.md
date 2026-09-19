# v229 — Les 16 effets du PO-33 K.O!

La palette générique de la v228 est remplacée par les seize positions du
PO-33, dans le même ordre que les pads physiques :

1. boucle 1/16 ;
2. boucle 1/12 ;
3. boucle courte ;
4. boucle très courte ;
5. unison ;
6. unison grave ;
7. octave supérieure ;
8. octave inférieure ;
9. stutter ×4 ;
10. stutter ×3 ;
11. scratch ;
12. scratch rapide ;
13. quantification 6/8 ;
14. redémarrage du motif ;
15. reverse ;
16. sans effet.

## Comportement

Les effets restent momentanés : on choisit un pad en mode FX, puis on maintient
le bouton FX pendant PLAY. Le relâchement revient immédiatement au son normal.
Le pas courant est capturé à l'enfoncement afin que les boucles et le
redémarrage gardent une origine stable.

Les traitements sont réalisés au niveau du séquenceur et des voix :

- les boucles figent le pas capturé et le répètent sur une grille binaire ou
  ternaire ;
- l'unison crée deux vraies voix, avec désaccord ou octave grave ;
- les octaves transposent sans modifier les notes CHROMA sauvegardées ;
- les stutters raccourcissent les voix pour limiter les chevauchements ;
- les scratchs alternent des tampons avant/arrière ;
- le 6/8 répartit trois impulsions sur quatre doubles croches ;
- REVERSE utilise un tampon inversé mis en cache une seule fois par sample.

La protection de charge audio compte toutes les voix réellement produites.
Les Parameter Locks restent appliqués au pas source, y compris quand celui-ci
est répété ou relu.

## Compatibilité

Aucun projet n'est modifié : la sélection d'effet n'était pas sauvegardée. La
position par défaut devient le pad 16, SANS EFFET. SWING, CHROMA, notes,
Parameter Locks et motifs conservent le même format qu'en v228.

Cette étape concerne le jeu direct. L'enregistrement des effets dans le motif,
présent sur la machine physique lorsque WRITE est actif, reste le prochain bloc
du PO-33.

## Validation locale

- test Node : ordre exact des 16 positions, boucles, unison, octaves, stutters,
  scratchs, 6/8, redémarrage, reverse et position neutre ;
- compatibilité SWING, CHROMA, Parameter Locks et anciennes sauvegardes ;
- syntaxe JavaScript des deux sources modifiées ;
- cohérence exacte entre les sources `page/` et le HTML Android assemblé ;
- vérifications ciblées de la façade PO-33 dans le test navigateur.

Le contrôle navigateur complet et la compilation APK restent exécutés par
GitHub Actions après application de l'archive.

Appliquer après validation verte de la v228.

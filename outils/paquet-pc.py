#!/usr/bin/env python3
"""Archive navigateur complete : conserve les chemins des modules et de leurs sons."""

import argparse
from pathlib import Path
import tempfile
import zipfile


ASSETS = Path(__file__).resolve().parents[1] / "app/src/main/assets"
RACINE = "drm16-pc/"
NOTICE = """DRM16 — version pour navigateur

1. Decompressez TOUT le dossier drm16-pc.
2. Ouvrez drm16.html. Gardez les sous-dossiers studio, nexus et syro a leur place.

Studio et Nexus ont leurs propres fichiers et echantillons. Certains navigateurs
bloquent les chargements de sons depuis une page ouverte directement du disque.
Dans ce cas, avec Python 3 installe, ouvrez un terminal dans ce dossier et lancez :
python3 -m http.server 8000 --bind 127.0.0.1
Puis ouvrez http://127.0.0.1:8000/drm16.html et gardez le terminal ouvert.

L'archive fonctionne hors ligne. Le dossier syro est present uniquement si le
transfert volca a ete compile pour cette version.

Le navigateur n'a pas le pont natif : pas de MIDI externe, de bibliotheque native
de fichiers ni de telechargement archive.org. L'export WAV utilise les
telechargements du navigateur. La memoire locale depend des regles du navigateur ;
gardez la meme adresse pour retrouver vos motifs.

L'installeur Windows, propose separement, offre le MIDI externe et la bibliotheque
native de fichiers. L'APK Android reste le choix pour le telephone.
"""


def fichiers():
    for nom in ("drm16.html", "studio/index.html", "nexus/index.html"):
        if not (ASSETS / nom).is_file():
            raise ValueError("Asset indispensable absent : " + nom)
    return sorted(p for p in ASSETS.rglob("*") if p.is_file())


def verifier(archive, sources):
    attendus = {RACINE + p.relative_to(ASSETS).as_posix(): p for p in sources}
    with zipfile.ZipFile(archive) as z:
        noms = z.namelist()
        if len(noms) != len(set(noms)) or set(noms) != set(attendus) | {RACINE + "LIRE-MOI-PC.txt"}:
            raise ValueError("Archive PC incomplete ou entrees inattendues")
        for nom, source in attendus.items():
            if z.read(nom) != source.read_bytes():
                raise ValueError("Asset different dans l'archive : " + nom)
        if z.read(RACINE + "LIRE-MOI-PC.txt") != NOTICE.encode("utf-8"):
            raise ValueError("Notice PC incorrecte")


def fabriquer(sortie):
    sources = fichiers()
    sortie = Path(sortie).resolve()
    if sortie.is_relative_to(ASSETS):
        raise ValueError("L'archive doit etre creee hors du dossier des assets")
    sortie.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=sortie.parent) as d:
        temporaire = Path(d) / "drm16-pc.zip"
        with zipfile.ZipFile(temporaire, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
            for source in sources:
                z.write(source, RACINE + source.relative_to(ASSETS).as_posix())
            z.writestr(RACINE + "LIRE-MOI-PC.txt", NOTICE)
        verifier(temporaire, sources)
        temporaire.replace(sortie)
    print("Archive PC verifiee : %s (%d assets et notice)" % (sortie.name, len(sources)))


def controle():
    with tempfile.TemporaryDirectory() as d:
        fabriquer(Path(d) / "drm16-pc.zip")
        # L'ancien telechargement ne contenait que la page : il doit etre refuse.
        tronquee = Path(d) / "incomplete.zip"
        with zipfile.ZipFile(tronquee, "w") as z:
            z.write(ASSETS / "drm16.html", RACINE + "drm16.html")
            z.writestr(RACINE + "LIRE-MOI-PC.txt", NOTICE)
        try:
            verifier(tronquee, fichiers())
        except ValueError:
            print("Archive sans Studio/Nexus : refus confirme")
        else:
            raise AssertionError("Une archive PC incomplete a ete acceptee")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sortie", nargs="?", type=Path)
    parser.add_argument("--verifier", action="store_true", help="controle temporaire, sans livrable conserve")
    args = parser.parse_args()
    if args.verifier:
        controle()
    elif args.sortie:
        fabriquer(args.sortie)
    else:
        parser.error("indiquer le chemin du ZIP ou --verifier")

#!/usr/bin/env python3
"""Compile et teste le MIDI Rust sans Tauri ni appareil, sous Linux/Windows.

Le binaire inclut la file et midi.rs de production, avec les ports et la fenêtre
simulés. Cela ne compile pas les pilotes Windows.
"""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def main():
    racine = Path(__file__).resolve().parents[1]
    rustc = shutil.which("rustc")
    if not rustc:
        raise SystemExit("rustc absent : installer Rust avant le contrôle MIDI bureau.")
    subprocess.run([rustc, "--version"], check=True)
    source = racine / "outils/rust/test-midi-bureau.rs"
    with tempfile.TemporaryDirectory(prefix="drm16-midi-") as dossier:
        print(f"\nMIDI bureau : {source.relative_to(racine)}", flush=True)
        # Compiler aussi sans cfg(test), pour contrôler le chemin de production
        # avec les mêmes interfaces de pilotes simulées.
        subprocess.run(
            [rustc, "--edition=2021", "--crate-type=lib", str(source),
             "-o", str(Path(dossier) / "libmidi-controle.rlib")],
            cwd=racine, check=True, timeout=120,
        )
        binaire = Path(dossier) / ("test-midi" + (".exe" if os.name == "nt" else ""))
        subprocess.run(
            [rustc, "--edition=2021", "--test", str(source), "-o", str(binaire)],
            cwd=racine, check=True, timeout=120,
        )
        # L'intégration simule une seule instance de l'application native.
        subprocess.run(
            [str(binaire), "--test-threads=1", "--nocapture"],
            cwd=racine, check=True, timeout=60,
        )
    print("MIDI bureau : tous les tests sont passés.", flush=True)


if __name__ == "__main__":
    main()

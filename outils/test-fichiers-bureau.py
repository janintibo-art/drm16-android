#!/usr/bin/env python3
"""Teste le vrai fichiers.rs sur disque, sans Tauri ni accès aux dossiers usuels.

Les dépendances dirs et Base64 sont simulées dans le banc Rust ; les appels
std::fs/std::io et les permissions sont réels. Ce contrôle ne remplace pas
une compilation Tauri/Windows ni un essai du stockage sous Windows.
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
        raise SystemExit("rustc absent : installer Rust avant le contrôle fichiers bureau.")
    subprocess.run([rustc, "--version"], check=True)
    source = racine / "outils/rust/test-fichiers-bureau.rs"
    def reduire_privileges():
        os.setgroups([])
        os.setgid(65534)
        os.setuid(65534)

    with tempfile.TemporaryDirectory(prefix="drm16-fichiers-banc-") as dossier:
        # Certains conteneurs ont l'identifiant root mais aucun privilège DAC.
        # Changer d'identité n'est nécessaire que si chmod est vraiment contourné.
        sans_privileges = False
        if os.name == "posix" and os.geteuid() == 0:
            sonde = Path(dossier) / "sonde-permissions"
            sonde.write_bytes(b"sonde")
            sonde.chmod(0)
            try:
                sonde.read_bytes()
                sans_privileges = True
            except PermissionError:
                pass
            finally:
                sonde.chmod(0o600)
                sonde.unlink()
        print(f"\nFichiers bureau : {source.relative_to(racine)}", flush=True)
        subprocess.run(
            [rustc, "--edition=2021", "--crate-type=lib", str(source),
             "-o", str(Path(dossier) / "libfichiers-controle.rlib")],
            cwd=racine, check=True, timeout=120,
        )
        binaire = Path(dossier) / ("test-fichiers" + (".exe" if os.name == "nt" else ""))
        subprocess.run(
            [rustc, "--edition=2021", "--test", str(source), "-o", str(binaire)],
            cwd=racine, check=True, timeout=120,
        )
        arguments = {}
        if sans_privileges:
            Path(dossier).chmod(0o755)
            arguments["preexec_fn"] = reduire_privileges
        # DRM16_DOSSIER est global au processus, donc tests séquentiels.
        subprocess.run(
            [str(binaire), "--test-threads=1", "--nocapture"],
            cwd=dossier, check=True, timeout=60, **arguments,
        )
    print("Fichiers bureau : tous les tests sont passés.", flush=True)


if __name__ == "__main__":
    main()

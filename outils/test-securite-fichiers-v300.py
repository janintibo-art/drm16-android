#!/usr/bin/env python3
"""v300 : noms dangereux, suppression sûre et absence de repli vers TEMP sous Windows."""
from pathlib import Path
import shutil
import subprocess
import tempfile


def main():
    racine = Path(__file__).resolve().parents[1]
    rustc = shutil.which("rustc")
    if not rustc:
        raise SystemExit("rustc absent : installer Rust avant le contrôle sécurité fichiers v300.")
    source = racine / "outils/rust/test-securite-fichiers-v300.rs"
    with tempfile.TemporaryDirectory(prefix="drm16-v300-banc-") as dossier:
        binaire = Path(dossier) / "test-securite-v300"
        subprocess.run(
            [rustc, "--edition=2021", "--test", str(source), "-o", str(binaire)],
            cwd=racine, check=True, timeout=120,
        )
        subprocess.run(
            [str(binaire), "--test-threads=1", "--nocapture"],
            cwd=dossier, check=True, timeout=60,
        )
    print("Sécurité fichiers v300 : tous les tests sont passés.")


if __name__ == "__main__":
    main()

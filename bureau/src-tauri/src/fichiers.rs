//! Fichiers et échantillons (W3, v139) : la traduction fidèle de
//! MainActivity.java et Fichiers.java — mêmes noms, mêmes plafonds, mêmes
//! formats de liste, même remplacement sans perte possible.
//!
//! Emplacements :
//!   documents   : Documents\DRM16          (visibles de l'utilisateur)
//!   échantillons: %APPDATA%\DRM16\ech      (propres à l'application)
//! La variable DRM16_DOSSIER remplace les deux par un dossier d'essai.

use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use base64::{engine::general_purpose::STANDARD, Engine as _};

const MAX_DOCUMENT: u64 = 8 * 1024 * 1024;
const MAX_EXPORT_AUDIO: u64 = 64 * 1024 * 1024;
const MAX_SAMPLE: u64 = 32 * 1024 * 1024;
const MAX_MORCEAU_B64: usize = 1_100_000;
const MAX_ECRITURES: usize = 4;

// ---------- emplacements ----------

fn racine_essai() -> Option<PathBuf> {
    std::env::var_os("DRM16_DOSSIER").map(PathBuf::from)
}

pub fn dossier_doc() -> PathBuf {
    let d = match racine_essai() {
        Some(r) => r.join("documents"),
        None => dirs::document_dir().unwrap_or_else(std::env::temp_dir).join("DRM16"),
    };
    let _ = fs::create_dir_all(&d);
    d
}

pub fn dossier_ech() -> PathBuf {
    let d = match racine_essai() {
        Some(r) => r.join("ech"),
        None => dirs::data_dir().unwrap_or_else(std::env::temp_dir).join("DRM16").join("ech"),
    };
    let _ = fs::create_dir_all(&d);
    d
}

// ---------- noms ----------

/// Comme propre() en Java : tout ce qui n'est pas lettre ASCII, chiffre, _ . -
/// devient _. En plus : « . » et « .. » sont refusés (ils désignent un dossier).
fn propre(n: &str) -> String {
    let p: String = n
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '.' || c == '-' { c } else { '_' })
        .collect();
    if p.is_empty() || p == "." || p == ".." { "x".to_string() } else { p }
}

fn plafond_document(nom: &str) -> u64 {
    if nom.to_ascii_lowercase().ends_with(".wav") { MAX_EXPORT_AUDIO } else { MAX_DOCUMENT }
}

fn nom_technique(n: &str) -> bool {
    n.contains(".part-") || n.ends_with(".bak")
}

fn avec_suffixe(p: &Path, suffixe: &str) -> PathBuf {
    let mut s = p.as_os_str().to_os_string();
    s.push(suffixe);
    PathBuf::from(s)
}

fn sauvegarde(cible: &Path) -> PathBuf {
    avec_suffixe(cible, ".bak")
}

fn jeton_unique() -> String {
    static COMPTEUR: OnceLock<Mutex<u64>> = OnceLock::new();
    let mut c = COMPTEUR.get_or_init(|| Mutex::new(0)).lock().unwrap_or_else(|e| e.into_inner());
    *c += 1;
    let t = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
    format!("{:x}-{}", t, *c)
}

// ---------- remplacement sans perte (Fichiers.java) ----------

fn remplacer(tmp: &Path, cible: &Path) -> bool {
    if !tmp.is_file() {
        return false;
    }
    let bak = sauvegarde(cible);
    // Sous Windows, rename remplace la cible (MoveFileEx avec REPLACE_EXISTING).
    if fs::rename(tmp, cible).is_ok() {
        let _ = fs::remove_file(&bak);
        return true;
    }
    // Repli : l'ancien est mis de côté, jamais supprimé avant que le nouveau soit en place.
    if cible.exists() {
        if bak.exists() && fs::remove_file(&bak).is_err() {
            return false;
        }
        if fs::rename(cible, &bak).is_err() {
            return false;
        }
    }
    if fs::rename(tmp, cible).is_ok() {
        let _ = fs::remove_file(&bak);
        return true;
    }
    if bak.exists() && !cible.exists() {
        let _ = fs::rename(&bak, cible);
    }
    false
}

fn lisible(cible: &Path) -> PathBuf {
    if !cible.exists() {
        let bak = sauvegarde(cible);
        if bak.is_file() {
            let _ = fs::rename(&bak, cible);
        }
    }
    cible.to_path_buf()
}

fn recuperer_dossier(d: &Path) {
    let Ok(l) = fs::read_dir(d) else { return };
    for e in l.flatten() {
        let n = e.file_name().to_string_lossy().to_string();
        if let Some(base) = n.strip_suffix(".bak") {
            let cible = d.join(base);
            if !cible.exists() {
                let _ = fs::rename(e.path(), cible);
            } else {
                let _ = fs::remove_file(e.path());
            }
        }
    }
}

fn ecrire_atomique(cible: &Path, octets: &[u8]) -> bool {
    let tmp = avec_suffixe(cible, &format!(".part-{}", jeton_unique()));
    let ok = (|| -> std::io::Result<()> {
        let mut f = File::create(&tmp)?;
        f.write_all(octets)?;
        f.sync_all()?;
        Ok(())
    })()
    .is_ok()
        && remplacer(&tmp, cible);
    if tmp.exists() {
        let _ = fs::remove_file(&tmp);
    }
    ok
}

fn lire_complet(f: &Path, max: u64) -> Option<Vec<u8>> {
    let m = fs::metadata(f).ok()?;
    if !m.is_file() || m.len() > max {
        return None;
    }
    let mut o = Vec::with_capacity(m.len() as usize);
    File::open(f).ok()?.read_to_end(&mut o).ok()?;
    if (o.len() as u64) > max {
        return None;
    }
    Some(o)
}

fn depasse_base64(b64: &str, max: u64) -> bool {
    (b64.len() as u64) > (max + 2) / 3 * 4 + 4
}

fn decoder(b64: &str) -> Option<Vec<u8>> {
    let propre: String = b64.chars().filter(|c| !c.is_ascii_whitespace()).collect();
    STANDARD.decode(propre).ok()
}

fn trier(l: &mut [String]) {
    l.sort_by_key(|n| n.to_lowercase());
}

// ---------- documents ----------

pub fn sauver(nom: &str, b64: &str) -> String {
    let p = propre(nom);
    let max = plafond_document(&p);
    if depasse_base64(b64, max) {
        return String::new();
    }
    let Some(o) = decoder(b64) else { return String::new() };
    let cible = dossier_doc().join(&p);
    if (o.len() as u64) > max || !ecrire_atomique(&cible, &o) {
        return String::new();
    }
    cible.to_string_lossy().to_string()
}

struct Ecriture {
    cible: PathBuf,
    tmp: PathBuf,
    flux: File,
    total: u64,
    max: u64,
}

fn ecritures() -> std::sync::MutexGuard<'static, HashMap<String, Ecriture>> {
    static E: OnceLock<Mutex<HashMap<String, Ecriture>>> = OnceLock::new();
    E.get_or_init(|| Mutex::new(HashMap::new())).lock().unwrap_or_else(|e| e.into_inner())
}

pub fn ouvrir(nom: &str) -> String {
    let p = propre(nom);
    let cible = dossier_doc().join(&p);
    let mut table = ecritures();
    if table.len() >= MAX_ECRITURES {
        return String::new();
    }
    let jeton = jeton_unique();
    let tmp = avec_suffixe(&cible, &format!(".part-{}", jeton));
    let Ok(flux) = File::create(&tmp) else { return String::new() };
    table.insert(jeton.clone(), Ecriture { cible, tmp, flux, total: 0, max: plafond_document(&p) });
    jeton
}

fn abandonner(jeton: &str) {
    if let Some(e) = ecritures().remove(jeton) {
        drop(e.flux);
        let _ = fs::remove_file(&e.tmp);
    }
}

pub fn ajouter(jeton: &str, b64: &str) -> bool {
    let ok = {
        let mut table = ecritures();
        match table.get_mut(jeton) {
            None => return false,
            Some(e) => {
                if b64.len() > MAX_MORCEAU_B64 {
                    false
                } else {
                    match decoder(b64) {
                        Some(o) if e.total + (o.len() as u64) <= e.max => {
                            let ecrit = e.flux.write_all(&o).is_ok();
                            if ecrit {
                                e.total += o.len() as u64;
                            }
                            ecrit
                        }
                        _ => false,
                    }
                }
            }
        }
    };
    if !ok {
        abandonner(jeton);
    }
    ok
}

pub fn fermer(jeton: &str, valider: bool) -> String {
    let Some(e) = ecritures().remove(jeton) else { return String::new() };
    let Ecriture { cible, tmp, mut flux, .. } = e;
    let ok = flux.flush().is_ok() && flux.sync_all().is_ok();
    drop(flux);
    let ok = ok && valider && remplacer(&tmp, &cible);
    if tmp.exists() {
        let _ = fs::remove_file(&tmp);
    }
    if ok { cible.to_string_lossy().to_string() } else { String::new() }
}

pub fn liste(ext: &str) -> String {
    let d = dossier_doc();
    recuperer_dossier(&d);
    let Ok(l) = fs::read_dir(&d) else { return String::new() };
    let mut noms: Vec<String> = l.flatten().map(|e| e.file_name().to_string_lossy().to_string()).collect();
    trier(&mut noms);
    let mut lignes = Vec::new();
    for n in noms {
        if nom_technique(&n) || (!ext.is_empty() && !n.ends_with(ext)) {
            continue;
        }
        let m = fs::metadata(d.join(&n)).ok();
        let taille = m.as_ref().map(|m| m.len()).unwrap_or(0);
        let date = m
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis())
            .unwrap_or(0);
        lignes.push(format!("{}\t{}\t{}", n, taille, date));
    }
    lignes.join("\n")
}

pub fn charger(nom: &str) -> String {
    let f = lisible(&dossier_doc().join(propre(nom)));
    lire_complet(&f, MAX_DOCUMENT).map(|o| STANDARD.encode(o)).unwrap_or_default()
}

pub fn supprimer(nom: &str) -> bool {
    let f = dossier_doc().join(propre(nom));
    let _ = fs::remove_file(sauvegarde(&f));
    f.is_file() && fs::remove_file(&f).is_ok()
}

// ---------- échantillons ----------

fn fichier_ech(nom: &str) -> PathBuf {
    dossier_ech().join(format!("{}.wav", propre(nom)))
}

pub fn ech_sauver(nom: &str, b64: &str) -> bool {
    if depasse_base64(b64, MAX_SAMPLE) {
        return false;
    }
    match decoder(b64) {
        Some(o) if (o.len() as u64) <= MAX_SAMPLE => ecrire_atomique(&fichier_ech(nom), &o),
        _ => false,
    }
}

pub fn ech_charger(nom: &str) -> String {
    let f = lisible(&fichier_ech(nom));
    lire_complet(&f, MAX_SAMPLE).map(|o| STANDARD.encode(o)).unwrap_or_default()
}

pub fn ech_liste() -> String {
    let d = dossier_ech();
    recuperer_dossier(&d);
    let Ok(l) = fs::read_dir(&d) else { return String::new() };
    let mut noms: Vec<String> = l
        .flatten()
        .map(|e| e.file_name().to_string_lossy().to_string())
        .filter_map(|n| n.strip_suffix(".wav").map(|s| s.to_string()))
        .collect();
    trier(&mut noms);
    noms.join("\n")
}

pub fn ech_supprimer(nom: &str) {
    let f = fichier_ech(nom);
    let _ = fs::remove_file(sauvegarde(&f));
    let _ = fs::remove_file(&f);
}

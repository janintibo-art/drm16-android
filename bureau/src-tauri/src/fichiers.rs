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
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use base64::{engine::general_purpose::STANDARD, Engine as _};

const MAX_DOCUMENT: u64 = 8 * 1024 * 1024;
const MAX_EXPORT_AUDIO: u64 = 64 * 1024 * 1024;
const MAX_SAMPLE: u64 = 32 * 1024 * 1024;
const MAX_PROJET: u64 = 16 * 1024 * 1024; // v145 : projet .drm16, écrit et relu
const MAX_MORCEAU_B64: usize = 1_100_000;
const MAX_ECRITURES: usize = 4;

// ---------- emplacements ----------

fn racine_essai() -> Option<PathBuf> {
    std::env::var_os("DRM16_DOSSIER")
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
}

/** v300 : si Windows ne fournit pas son dossier Documents, on renvoie un
    chemin vide et les opérations échouent proprement. Surtout aucun repli vers
    TEMP : un projet ne doit jamais sembler sauvé dans un emplacement jetable. */
pub fn dossier_doc() -> PathBuf {
    let d = match racine_essai() {
        Some(r) => r.join("documents"),
        None => match dirs::document_dir() {
            Some(r) => r.join("DRM16"),
            None => return PathBuf::new(),
        },
    };
    if fs::create_dir_all(&d).is_err() || !d.is_dir() { PathBuf::new() } else { d }
}

/** Même règle pour les échantillons : pas de repli silencieux vers TEMP. */
pub fn dossier_ech() -> PathBuf {
    let d = match racine_essai() {
        Some(r) => r.join("ech"),
        None => match dirs::data_dir() {
            Some(r) => r.join("DRM16").join("ech"),
            None => return PathBuf::new(),
        },
    };
    if fs::create_dir_all(&d).is_err() || !d.is_dir() { PathBuf::new() } else { d }
}

fn dossier_pret(d: &Path) -> bool {
    !d.as_os_str().is_empty() && d.is_dir()
}

// ---------- noms ----------

/// Comme propre() en Java : tout ce qui n'est pas lettre ASCII, chiffre, _ . -
/// devient _. v300 : « », « . » et « .. » sont refusés au lieu de devenir « x ».
fn propre(n: &str) -> Option<String> {
    let p: String = n
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '.' || c == '-' { c } else { '_' })
        .collect();
    if p.is_empty() || p == "." || p == ".." { None } else { Some(p) }
}

fn plafond_document(nom: &str) -> u64 {
    let n = nom.to_ascii_lowercase();
    if n.ends_with(".wav") {
        MAX_EXPORT_AUDIO
    } else if n.ends_with(".drm16") || n.ends_with(".drmpack") {
        MAX_PROJET
    } else {
        MAX_DOCUMENT
    }
}

fn plafond_lecture(nom: &str) -> u64 {
    // v257 : un pack .drmpack emporte des sons comme un projet : même plafond, écrit et relu
    let n = nom.to_ascii_lowercase();
    if n.ends_with(".drm16") || n.ends_with(".drmpack") { MAX_PROJET } else { MAX_DOCUMENT }
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

fn erreur_fichier() -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, "fichier ou sauvegarde illisible")
}

// exists()/is_file() rabattent aussi les erreurs sur false. Une ouverture de
// projet doit pouvoir distinguer une vraie absence d'une lecture refusée.
fn present(p: &Path) -> io::Result<bool> {
    match fs::symlink_metadata(p) {
        Ok(_) => Ok(true),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(e),
    }
}

fn lisible(cible: &Path) -> io::Result<Option<PathBuf>> {
    let parent = cible.parent().ok_or_else(erreur_fichier)?;
    if !fs::metadata(parent)?.is_dir() {
        return Err(erreur_fichier());
    }
    if !present(cible)? {
        let bak = sauvegarde(cible);
        if !present(&bak)? {
            return Ok(None);
        }
        if !fs::metadata(&bak)?.is_file() {
            return Err(erreur_fichier());
        }
        fs::rename(&bak, cible)?;
    }
    if !fs::metadata(cible)?.is_file() {
        return Err(erreur_fichier());
    }
    Ok(Some(cible.to_path_buf()))
}

fn recuperer_dossier(d: &Path) -> io::Result<()> {
    // Une erreur d'itération ne doit jamais produire une liste partielle.
    let entrees: Vec<_> = fs::read_dir(d)?.collect::<io::Result<_>>()?;
    for e in entrees {
        let nom = e.file_name();
        let n = nom.to_str().ok_or_else(erreur_fichier)?;
        if let Some(base) = n.strip_suffix(".bak") {
            if !fs::metadata(e.path())?.is_file() {
                return Err(erreur_fichier());
            }
            let cible = d.join(base);
            if !present(&cible)? {
                fs::rename(e.path(), cible)?;
            } else {
                if !fs::metadata(&cible)?.is_file() {
                    return Err(erreur_fichier());
                }
                fs::remove_file(e.path())?;
            }
        }
    }
    Ok(())
}

/** v300 : effacer le secours avant la cible. Si le .bak ne peut pas être
    supprimé, la cible reste présente et aucune restauration fantôme n'est
    possible au prochain démarrage. */
fn supprimer_fichier(cible: &Path) -> bool {
    let bak = sauvegarde(cible);
    match present(&bak) {
        Ok(true) => {
            match fs::symlink_metadata(&bak) {
                Ok(m) if m.is_file() => {}
                _ => return false,
            }
            if fs::remove_file(&bak).is_err() { return false; }
        }
        Ok(false) => {}
        Err(_) => return false,
    }
    match present(cible) {
        Ok(true) => {
            match fs::symlink_metadata(cible) {
                Ok(m) if m.is_file() => fs::remove_file(cible).is_ok(),
                _ => false,
            }
        }
        _ => false,
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
    let fichier = File::open(f).ok()?;
    let m = fichier.metadata().ok()?;
    if !m.is_file() || m.len() > max {
        return None;
    }
    let mut o = Vec::with_capacity(m.len() as usize);
    // Le plafond reste effectif si le fichier grossit après metadata(). Une
    // troncature pendant la lecture ne doit pas devenir une absence réussie.
    let mut lecture = fichier.take(max + 1);
    lecture.read_to_end(&mut o).ok()?;
    if (o.len() as u64) != m.len() || lecture.get_ref().metadata().ok()?.len() != m.len() {
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
    let Some(p) = propre(nom) else { return String::new() };
    let max = plafond_document(&p);
    if depasse_base64(b64, max) {
        return String::new();
    }
    let d = dossier_doc();
    if !dossier_pret(&d) { return String::new(); }
    let Some(o) = decoder(b64) else { return String::new() };
    let cible = d.join(&p);
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
    let Some(p) = propre(nom) else { return String::new() };
    let d = dossier_doc();
    if !dossier_pret(&d) { return String::new(); }
    let cible = d.join(&p);
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

pub fn liste(ext: &str) -> Option<String> {
    let d = dossier_doc();
    if !dossier_pret(&d) { return None; }
    recuperer_dossier(&d).ok()?;
    let entrees: Vec<_> = fs::read_dir(&d).ok()?.collect::<io::Result<_>>().ok()?;
    let mut noms: Vec<String> = entrees.iter()
        .map(|e| e.file_name().into_string().ok()).collect::<Option<_>>()?;
    trier(&mut noms);
    let mut lignes = Vec::new();
    for n in noms {
        if nom_technique(&n) || (!ext.is_empty() && !n.ends_with(ext)) {
            continue;
        }
        let m = fs::metadata(d.join(&n)).ok()?;
        if !m.is_file() && !m.is_dir() { return None; }
        let taille = m.len();
        let date = m.modified().ok()?.duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis()).unwrap_or(0);
        lignes.push(format!("{}\t{}\t{}", n, taille, date));
    }
    Some(lignes.join("\n"))
}

pub fn charger(nom: &str) -> Option<String> {
    let Some(p) = propre(nom) else { return Some(String::new()) };
    let d = dossier_doc();
    if !dossier_pret(&d) { return None; }
    match lisible(&d.join(&p)).ok()? {
        None => Some(String::new()),
        Some(f) => lire_complet(&f, plafond_lecture(&p)).map(|o| STANDARD.encode(o)),
    }
}

pub fn supprimer(nom: &str) -> bool {
    let Some(p) = propre(nom) else { return false };
    let d = dossier_doc();
    if !dossier_pret(&d) { return false; }
    supprimer_fichier(&d.join(p))
}

// ---------- échantillons ----------

pub fn ech_sauver(nom: &str, b64: &str) -> bool {
    let Some(p) = propre(nom) else { return false };
    if depasse_base64(b64, MAX_SAMPLE) {
        return false;
    }
    let d = dossier_ech();
    if !dossier_pret(&d) { return false; }
    match decoder(b64) {
        Some(o) if (o.len() as u64) <= MAX_SAMPLE => ecrire_atomique(&d.join(format!("{}.wav", p)), &o),
        _ => false,
    }
}

pub fn ech_charger(nom: &str) -> Option<String> {
    let Some(p) = propre(nom) else { return Some(String::new()) };
    let d = dossier_ech();
    if !dossier_pret(&d) { return None; }
    match lisible(&d.join(format!("{}.wav", p))).ok()? {
        None => Some(String::new()),
        Some(f) => lire_complet(&f, MAX_SAMPLE).map(|o| STANDARD.encode(o)),
    }
}

pub fn ech_liste() -> Option<String> {
    let d = dossier_ech();
    if !dossier_pret(&d) { return None; }
    recuperer_dossier(&d).ok()?;
    let entrees: Vec<_> = fs::read_dir(&d).ok()?.collect::<io::Result<_>>().ok()?;
    let mut noms = Vec::new();
    for e in entrees {
        let nom = e.file_name();
        let n = nom.to_str()?;
        if nom_technique(n) { continue; }
        if let Some(base) = n.strip_suffix(".wav") {
            if !fs::metadata(e.path()).ok()?.is_file() { return None; }
            noms.push(base.to_string());
        }
    }
    trier(&mut noms);
    Some(noms.join("\n"))
}

pub fn ech_supprimer(nom: &str) {
    let Some(p) = propre(nom) else { return };
    let d = dossier_ech();
    if !dossier_pret(&d) { return; }
    let _ = supprimer_fichier(&d.join(format!("{}.wav", p)));
}

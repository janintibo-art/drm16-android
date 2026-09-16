//! MIDI de la version de bureau (W5, v141) : la traduction de Midi.java,
//! MidiOctets.java et des fonctions midi* de MainActivity.java.
//!
//! Sous Windows, un « appareil » est un NOM de port : une interface USB offre en
//! général une entrée et une sortie du même nom. La liste est l'union des deux ;
//! chaque nom reçoit un identifiant stable pour toute la session (comme les
//! identifiants Android), et ouvrir un appareil ouvre l'entrée ET la sortie qui
//! portent ce nom, s'il y en a.
//!
//! Windows ne prévient pas des branchements : un fil relit la liste toutes les
//! 1,5 s et envoie à la page les mêmes événements qu'Android (__midiEtat) :
//! ajout, retrait, perdu (l'appareil ouvert a disparu), ouvert, echec, ferme.

use std::collections::BTreeSet;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Mutex, MutexGuard, OnceLock};
use std::thread;
use std::time::{Duration, Instant};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use midir::{Ignore, MidiInput, MidiInputConnection, MidiOutput, MidiOutputConnection};

use crate::fenetre::{chaine_js, executer};

const SYSEX_MAX: usize = 262_144;

// ---------- règles d'envoi (MidiOctets.java) ----------

/// Longueur du message commençant par ce statut, ou None s'il ne doit pas
/// partir par l'envoi simple (F0, F7, statuts non définis, octets de données).
pub fn longueur(statut: u8) -> Option<usize> {
    match statut {
        0x80..=0xEF => Some(if matches!(statut & 0xF0, 0xC0 | 0xD0) { 2 } else { 3 }),
        0xF1 | 0xF3 => Some(2),
        0xF2 => Some(3),
        0xF6 | 0xF8 | 0xFA | 0xFB | 0xFC | 0xFE | 0xFF => Some(1),
        _ => None,
    }
}

/// Une suite d'un ou plusieurs messages exclusifs complets : F0, données sur
/// 7 bits (au moins une), F7 — rien d'autre entre eux.
pub fn sysex_complet(m: &[u8]) -> bool {
    if m.len() < 3 {
        return false;
    }
    let mut i = 0;
    while i < m.len() {
        if m[i] != 0xF0 {
            return false;
        }
        let mut j = i + 1;
        while j < m.len() && m[j] & 0x80 == 0 {
            j += 1;
        }
        if j >= m.len() || m[j] != 0xF7 || j == i + 1 {
            return false;
        }
        i = j + 1;
    }
    true
}

// ---------- état ----------

struct Etat {
    /// Tous les noms vus pendant la session ; l'identifiant est la position + 1.
    noms: Vec<String>,
    /// Noms présents au dernier relevé.
    presents: BTreeSet<String>,
    sortie: Option<MidiOutputConnection>,
    entree: Option<MidiInputConnection<()>>,
    ouvert: i64,
    /// Ce que Windows a répondu au dernier échec d'ouverture (v143).
    erreur: String,
}

fn etat() -> MutexGuard<'static, Etat> {
    static E: OnceLock<Mutex<Etat>> = OnceLock::new();
    E.get_or_init(|| {
        Mutex::new(Etat {
            noms: Vec::new(),
            presents: BTreeSet::new(),
            sortie: None,
            entree: None,
            ouvert: -1,
            erreur: String::new(),
        })
    })
    .lock()
    .unwrap_or_else(|e| e.into_inner())
}

/// Les noms actuellement branchés, dans l'ordre : entrées puis sorties.
fn noms_branches() -> Vec<String> {
    let mut l: Vec<String> = Vec::new();
    if let Ok(mi) = MidiInput::new("DRM16 liste") {
        for p in mi.ports() {
            if let Ok(n) = mi.port_name(&p) {
                if !l.contains(&n) {
                    l.push(n);
                }
            }
        }
    }
    if let Ok(mo) = MidiOutput::new("DRM16 liste") {
        for p in mo.ports() {
            if let Ok(n) = mo.port_name(&p) {
                if !l.contains(&n) {
                    l.push(n);
                }
            }
        }
    }
    l
}

/// (nom, identifiant) des appareils branchés ; met à jour la table des noms.
fn releve() -> Vec<(String, i64)> {
    let branches = noms_branches();
    let mut e = etat();
    let mut l = Vec::new();
    for n in branches {
        let id = match e.noms.iter().position(|x| *x == n) {
            Some(i) => i + 1,
            None => {
                e.noms.push(n.clone());
                e.noms.len()
            }
        };
        l.push((n, id as i64));
    }
    e.presents = l.iter().map(|(n, _)| n.clone()).collect();
    l
}

fn signaler(evt: &str, nom: &str) {
    let l = releve();
    let (ouvert, erreur) = {
        let e = etat();
        (e.ouvert, if evt == "echec" { e.erreur.clone() } else { String::new() })
    };
    let appareils: Vec<String> = l
        .iter()
        .map(|(n, id)| format!("{{\"nom\":{},\"id\":{}}}", chaine_js(n), id))
        .collect();
    executer(&format!(
        "window.__midiEtat&&__midiEtat({{\"evt\":{},\"nom\":{},\"ouvert\":{},\"erreur\":{},\"appareils\":[{}]}})",
        chaine_js(evt),
        chaine_js(nom),
        ouvert,
        chaine_js(&erreur),
        appareils.join(",")
    ));
}

// ---------- fonctions du pont ----------

pub fn dispo() -> bool {
    MidiOutput::new("DRM16 essai").is_ok()
}

pub fn liste() -> String {
    releve().into_iter().map(|(n, _)| n).collect::<Vec<_>>().join("\n")
}

pub fn appareils() -> String {
    releve()
        .into_iter()
        .map(|(n, id)| format!("{}\t{}", n.replace(|c: char| c == '\t' || c == '\n', " "), id))
        .collect::<Vec<_>>()
        .join("\n")
}

pub fn ouvert_id() -> i64 {
    etat().ouvert
}

pub fn ouvrir(index: i64) {
    let l = releve();
    if index >= 0 && (index as usize) < l.len() {
        ouvrir_id(l[index as usize].1);
    }
}

pub fn ouvrir_id(id: i64) {
    let nom = {
        let e = etat();
        if id < 1 || id as usize > e.noms.len() {
            None
        } else {
            Some(e.noms[id as usize - 1].clone())
        }
    };
    let Some(nom) = nom else {
        etat().erreur = format!("identifiant inconnu : {}", id);
        signaler("echec", "");
        return;
    };
    fermer();
    let mut sortie = None;
    let mut entree = None;
    // chaque refus est noté mot pour mot : c'est lui qui s'affiche à l'utilisateur
    let mut erreurs: Vec<String> = Vec::new();
    match MidiOutput::new("DRM16") {
        Ok(mo) => {
            let port = mo.ports().into_iter().find(|p| mo.port_name(p).map(|n| n == nom).unwrap_or(false));
            if let Some(p) = port {
                match mo.connect(&p, "DRM16 sortie") {
                    Ok(c) => sortie = Some(c),
                    Err(e) => erreurs.push(format!("sortie : {}", e)),
                }
            }
        }
        Err(e) => erreurs.push(format!("sortie : {}", e)),
    }
    match MidiInput::new("DRM16") {
        Ok(mut mi) => {
            mi.ignore(Ignore::None);
            let port = mi.ports().into_iter().find(|p| mi.port_name(p).map(|n| n == nom).unwrap_or(false));
            if let Some(p) = port {
                match mi.connect(&p, "DRM16 entree", |_instant, message, _| livrer(message), ()) {
                    Ok(c) => entree = Some(c),
                    Err(e) => erreurs.push(format!("entrée : {}", e)),
                }
            }
        }
        Err(e) => erreurs.push(format!("entrée : {}", e)),
    }
    if sortie.is_none() && entree.is_none() {
        etat().erreur = if erreurs.is_empty() {
            "appareil débranché".to_string()
        } else {
            erreurs.join(" · ")
        };
        signaler("echec", &nom);
        return;
    }
    {
        let mut e = etat();
        e.sortie = sortie;
        e.entree = entree;
        e.ouvert = id;
    }
    signaler("ouvert", &nom);
}

pub fn fermer() {
    horloge_arret();
    let (sortie, entree) = {
        let mut e = etat();
        e.ouvert = -1;
        (e.sortie.take(), e.entree.take())
    };
    // fermés hors du verrou : la fermeture de l'entrée attend la fin de son rappel
    if let Some(s) = sortie {
        s.close();
    }
    if let Some(en) = entree {
        en.close();
    }
}

pub fn fermer_signale() {
    let etait = etat().ouvert >= 0;
    fermer();
    if etait {
        signaler("ferme", "");
    }
}

fn envoyer_octets(m: &[u8]) -> bool {
    match etat().sortie.as_mut() {
        Some(s) => s.send(m).is_ok(),
        None => false,
    }
}

pub fn envoyer(a: i64, b: i64, c: i64) {
    let statut = (a & 0xFF) as u8;
    let Some(n) = longueur(statut) else { return };
    let m = [statut, (b & 0x7F) as u8, (c & 0x7F) as u8];
    envoyer_octets(&m[..n]);
}

pub fn sysex(b64: &str) -> bool {
    match STANDARD.decode(b64.trim()) {
        Ok(m) if sysex_complet(&m) => {
            // un message à la fois : c'est ce qu'attend le pilote Windows
            let mut i = 0;
            while i < m.len() {
                let j = i + m[i..].iter().position(|&o| o == 0xF7).unwrap_or(0);
                if !envoyer_octets(&m[i..=j]) {
                    return false;
                }
                i = j + 1;
            }
            true
        }
        _ => false,
    }
}

// ---------- réception ----------

fn livrer(message: &[u8]) {
    let Some(&premier) = message.first() else { return };
    if premier == 0xF0 {
        if message.len() <= SYSEX_MAX && message.last() == Some(&0xF7) {
            executer(&format!("window.__midiSysex&&__midiSysex('{}')", STANDARD.encode(message)));
        }
        return;
    }
    let b = message.get(1).copied().unwrap_or(0);
    let c = message.get(2).copied().unwrap_or(0);
    executer(&format!("window.__midi&&__midi({},{},{})", premier, b, c));
}

// ---------- horloge ----------

static TEMPO: AtomicU64 = AtomicU64::new(0);
static HORLOGE: AtomicBool = AtomicBool::new(false);
static GENERATION: AtomicU64 = AtomicU64::new(0);

pub fn tempo(bpm: f64) {
    if bpm > 20.0 && bpm < 400.0 {
        TEMPO.store(bpm.to_bits(), Ordering::Relaxed);
    }
}

fn bpm() -> f64 {
    let b = f64::from_bits(TEMPO.load(Ordering::Relaxed));
    if b > 20.0 && b < 400.0 { b } else { 120.0 }
}

#[cfg(windows)]
#[link(name = "winmm")]
extern "system" {
    fn timeBeginPeriod(periode: u32) -> u32;
}

/// Minuterie système à 1 ms : sans cela, Windows ne réveille un fil que toutes
/// les 15,6 ms, et l'horloge MIDI (une impulsion toutes les 20 ms à 125 BPM)
/// serait inutilisable.
fn minuterie_fine() {
    static FAIT: OnceLock<()> = OnceLock::new();
    FAIT.get_or_init(|| {
        #[cfg(windows)]
        unsafe {
            timeBeginPeriod(1);
        }
    });
}

pub fn horloge_depart(b: f64) {
    tempo(b);
    minuterie_fine();
    let mien = GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    HORLOGE.store(true, Ordering::SeqCst);
    envoyer_octets(&[0xFA]);
    thread::spawn(move || {
        let mut prochain = Instant::now();
        while HORLOGE.load(Ordering::SeqCst) && GENERATION.load(Ordering::SeqCst) == mien {
            envoyer_octets(&[0xF8]);
            prochain += Duration::from_secs_f64(60.0 / (bpm() * 24.0));
            loop {
                let maintenant = Instant::now();
                if maintenant >= prochain {
                    break;
                }
                let reste = prochain - maintenant;
                if reste > Duration::from_millis(3) {
                    thread::sleep(reste - Duration::from_millis(2));
                } else {
                    thread::yield_now();
                }
            }
            // en retard de plus d'une impulsion (fil endormi) : on repart d'ici
            if Instant::now() > prochain + Duration::from_millis(50) {
                prochain = Instant::now();
            }
        }
    });
}

pub fn horloge_arret() {
    let tournait = HORLOGE.swap(false, Ordering::SeqCst);
    GENERATION.fetch_add(1, Ordering::SeqCst);
    if tournait {
        envoyer_octets(&[0xFC]);
    }
}

// ---------- surveillance des branchements ----------

pub fn surveiller() {
    thread::spawn(|| {
        let mut avant: BTreeSet<String> = releve().into_iter().map(|(n, _)| n).collect();
        loop {
            thread::sleep(Duration::from_millis(1500));
            let apres: BTreeSet<String> = releve().into_iter().map(|(n, _)| n).collect();
            if apres == avant {
                continue;
            }
            for n in apres.difference(&avant) {
                signaler("ajout", n);
            }
            for n in avant.difference(&apres) {
                let ouvert_disparu = {
                    let e = etat();
                    e.ouvert >= 1 && e.noms.get(e.ouvert as usize - 1) == Some(n)
                };
                if ouvert_disparu {
                    fermer();
                    signaler("perdu", n);
                } else {
                    signaler("retrait", n);
                }
            }
            avant = apres;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn regles_d_envoi() {
        assert_eq!(longueur(0x90), Some(3));
        assert_eq!(longueur(0xC5), Some(2));
        assert_eq!(longueur(0xF8), Some(1));
        for s in [0xF0u8, 0xF4, 0xF5, 0xF7, 0xF9, 0xFD, 0x42] {
            assert_eq!(longueur(s), None);
        }
        assert!(sysex_complet(&[0xF0, 0x42, 0x30, 0xF7]));
        assert!(sysex_complet(&[0xF0, 0x01, 0xF7, 0xF0, 0x02, 0xF7]));
        assert!(!sysex_complet(&[0xF0]));
        assert!(!sysex_complet(&[0xF0, 0xF7]));
        assert!(!sysex_complet(&[0xF0, 0x42, 0x90, 0xF7]));
        assert!(!sysex_complet(&[0xF0, 0x01, 0xF7, 0x00]));
    }
}

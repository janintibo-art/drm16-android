//! Compilation du vrai MIDI de bureau contre des pilotes simulés.
//!
//! Ce banc ne remplace ni la compilation Tauri/Windows ni un essai USB réel.
//! Les canaux fixent l'ordre des courses : les délais ne sont que des bornes
//! d'échec en cas de blocage, jamais le moyen de provoquer une intercalation.
#![allow(dead_code)]

extern crate self as base64;
extern crate self as midir;

use std::collections::BTreeSet;
use std::fmt;
use std::sync::{mpsc, Mutex, OnceLock};
use std::time::Duration;

#[path = "../../bureau/src-tauri/src/midi_commandes.rs"]
mod midi_commandes;
#[path = "../../bureau/src-tauri/src/midi.rs"]
mod midi;

const BORNE: Duration = Duration::from_secs(5);

// Base64 n'intervient pas dans les scénarios de connexion. Toute utilisation
// imprévue échoue explicitement : ce stub ne prétend pas tester son encodage.
pub mod engine {
    pub mod general_purpose {
        pub struct Standard;
        pub const STANDARD: Standard = Standard;
    }
}
pub trait Engine {
    fn encode(&self, _octets: &[u8]) -> String {
        panic!("Base64 hors périmètre de ce banc de connexion")
    }
    fn decode(&self, _texte: &str) -> Result<Vec<u8>, Erreur> {
        panic!("Base64 hors périmètre de ce banc de connexion")
    }
}
impl Engine for engine::general_purpose::Standard {}

#[derive(Debug)]
pub struct Erreur;
impl fmt::Display for Erreur {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("refus du pilote simulé")
    }
}

struct Blocage {
    nom: String,
    entre: mpsc::Sender<()>,
    liberer: mpsc::Receiver<()>,
}
#[derive(Default)]
struct Pilote {
    presents: Vec<String>,
    refus: BTreeSet<String>,
    blocage: Option<Blocage>,
    sorties: BTreeSet<String>,
    entrees: BTreeSet<String>,
    fermetures: Vec<String>,
    messages: Vec<(String, Vec<u8>)>,
    rappels_fermeture: Vec<i64>,
}
fn pilote() -> std::sync::MutexGuard<'static, Pilote> {
    static P: OnceLock<Mutex<Pilote>> = OnceLock::new();
    P.get_or_init(|| Mutex::new(Pilote::default())).lock().unwrap()
}
fn bloquer(nom: &str) -> (mpsc::Receiver<()>, mpsc::Sender<()>) {
    let (entre_tx, entre_rx) = mpsc::channel();
    let (liberer_tx, liberer_rx) = mpsc::channel();
    pilote().blocage = Some(Blocage {
        nom: nom.to_owned(), entre: entre_tx, liberer: liberer_rx,
    });
    (entre_rx, liberer_tx)
}
fn attendre<T>(r: &mpsc::Receiver<T>, etape: &str) -> T {
    r.recv_timeout(BORNE).unwrap_or_else(|e| panic!("{etape} : {e}"))
}

#[derive(Clone)]
pub struct Port(String);
pub struct MidiOutput;
pub struct MidiInput;
pub enum Ignore { None }
pub struct MidiOutputConnection { nom: String }
type Rappel<T> = Box<dyn FnMut(u64, &[u8], &mut T) + Send>;
pub struct MidiInputConnection<T> { nom: String, rappel: Rappel<T>, donnees: T }

impl MidiOutput {
    pub fn new(_nom: &str) -> Result<Self, Erreur> { Ok(Self) }
    pub fn ports(&self) -> Vec<Port> { pilote().presents.iter().cloned().map(Port).collect() }
    pub fn port_name(&self, p: &Port) -> Result<String, Erreur> { Ok(p.0.clone()) }
    pub fn connect(self, port: &Port, _nom: &str) -> Result<MidiOutputConnection, Erreur> {
        let blocage = {
            let mut p = pilote();
            if p.blocage.as_ref().map(|b| b.nom == port.0).unwrap_or(false) {
                p.blocage.take()
            } else { None }
        };
        if let Some(b) = blocage {
            b.entre.send(()).unwrap();
            attendre(&b.liberer, "libération de l'ouverture bloquée");
        }
        let mut p = pilote();
        if p.refus.contains(&port.0) { return Err(Erreur); }
        assert!(p.sorties.insert(port.0.clone()), "sortie ouverte deux fois");
        Ok(MidiOutputConnection { nom: port.0.clone() })
    }
}
impl MidiOutputConnection {
    pub fn send(&mut self, octets: &[u8]) -> Result<(), Erreur> {
        pilote().messages.push((self.nom.clone(), octets.to_vec()));
        Ok(())
    }
    pub fn close(self) -> MidiOutput {
        let mut p = pilote();
        assert!(p.sorties.remove(&self.nom));
        p.fermetures.push(format!("sortie {}", self.nom));
        MidiOutput
    }
}
impl MidiInput {
    pub fn new(_nom: &str) -> Result<Self, Erreur> { Ok(Self) }
    pub fn ports(&self) -> Vec<Port> { pilote().presents.iter().cloned().map(Port).collect() }
    pub fn port_name(&self, p: &Port) -> Result<String, Erreur> { Ok(p.0.clone()) }
    pub fn ignore(&mut self, _ignore: Ignore) {}
    pub fn connect<T: Send + 'static, F: FnMut(u64, &[u8], &mut T) + Send + 'static>(
        self, port: &Port, _nom: &str, rappel: F, donnees: T,
    ) -> Result<MidiInputConnection<T>, Erreur> {
        let mut p = pilote();
        if p.refus.contains(&port.0) { return Err(Erreur); }
        assert!(p.entrees.insert(port.0.clone()), "entrée ouverte deux fois");
        Ok(MidiInputConnection { nom: port.0.clone(), rappel: Box::new(rappel), donnees })
    }
}
impl<T: Send + 'static> MidiInputConnection<T> {
    pub fn close(self) -> (MidiInput, T) {
        // Un pilote attend le retour de son rappel avant de fermer. Le rappel
        // réel livrer() traverse fenetre::executer(), qui relit l'état MIDI.
        // Tenir le verrou Etat pendant close() produirait un interblocage.
        let (fini_tx, fini_rx) = mpsc::channel();
        let mut rappel = self.rappel;
        let mut donnees = self.donnees;
        let fil = std::thread::spawn(move || {
            rappel(0, &[0x90, 60, 100], &mut donnees);
            fini_tx.send(donnees).unwrap();
        });
        let donnees = attendre(&fini_rx, "le rappel doit finir hors du verrou MIDI");
        fil.join().unwrap();
        let mut p = pilote();
        assert!(p.entrees.remove(&self.nom));
        p.fermetures.push(format!("entrée {}", self.nom));
        (MidiInput, donnees)
    }
}

static EVENEMENTS: OnceLock<mpsc::Sender<String>> = OnceLock::new();
mod fenetre {
    pub fn chaine_js(texte: &str) -> String {
        format!("\"{}\"", texte.replace('\\', "\\\\").replace('"', "\\\"").replace('\n', "\\n"))
    }
    pub fn executer(js: &str) {
        if js.starts_with("window.__midiEtat") {
            crate::EVENEMENTS.get().unwrap().send(js.to_owned()).unwrap();
        } else if js.starts_with("window.__midi&&") {
            let ouvert = crate::midi::ouvert_id();
            crate::pilote().rappels_fermeture.push(ouvert);
        } else {
            panic!("appel de page inattendu : {js}");
        }
    }
}
fn evenement(r: &mpsc::Receiver<String>, evt: &str, nom: &str, ouvert: i64) {
    let js = attendre(r, "notification MIDI");
    assert!(js.contains(&format!("\"evt\":\"{evt}\"")), "événement attendu {evt}, reçu {js}");
    assert!(js.contains(&format!("\"nom\":\"{nom}\"")), "nom attendu {nom}, reçu {js}");
    assert!(js.contains(&format!("\"ouvert\":{ouvert},")), "ouverture attendue {ouvert}, reçu {js}");
}
fn actifs(noms: &[&str]) {
    let attendu: BTreeSet<String> = noms.iter().map(|n| (*n).to_owned()).collect();
    let p = pilote();
    assert_eq!(p.sorties, attendu, "sorties restées ouvertes");
    assert_eq!(p.entrees, attendu, "entrées restées ouvertes");
}

#[test]
fn connexions_reelles_avec_pilotes_simules() {
    let (tx, rx) = mpsc::channel();
    EVENEMENTS.set(tx).unwrap();
    pilote().presents = vec!["A".into(), "B".into()];
    assert_eq!(midi::appareils(), "A\t1\nB\t2");

    // L'API d'enfilement doit répondre pendant que le pilote est bloqué.
    let (entre, liberer) = bloquer("A");
    midi::ouvrir_id(1);
    attendre(&entre, "entrée dans le pilote A");
    midi::fermer_signale();
    liberer.send(()).unwrap();
    evenement(&rx, "ouvert", "A", 1);
    evenement(&rx, "ferme", "", -1);
    assert_eq!(midi::ouvert_id(), -1);
    actifs(&[]);
    println!("ok : ouverture A bloquée puis fermeture, état final fermé");

    let (entre, liberer) = bloquer("A");
    midi::ouvrir_id(1);
    attendre(&entre, "entrée dans le pilote A");
    midi::ouvrir_id(2);
    liberer.send(()).unwrap();
    evenement(&rx, "ouvert", "A", 1);
    evenement(&rx, "ouvert", "B", 2);
    assert_eq!(midi::ouvert_id(), 2);
    actifs(&["B"]);
    println!("ok : ouverture A bloquée puis B, état final B");

    let (entre, liberer) = bloquer("A");
    midi::ouvrir_id(1);
    attendre(&entre, "entrée dans le pilote A");
    midi::fermer_signale();
    midi::ouvrir_id(2);
    liberer.send(()).unwrap();
    evenement(&rx, "ouvert", "A", 1);
    evenement(&rx, "ferme", "", -1);
    evenement(&rx, "ouvert", "B", 2);
    assert_eq!(midi::ouvert_id(), 2);
    actifs(&["B"]);
    println!("ok : A puis fermeture puis B, ordre conservé");

    pilote().refus.insert("A".into());
    let (entre, liberer) = bloquer("A");
    midi::ouvrir_id(1);
    attendre(&entre, "entrée dans le pilote A refusé");
    midi::ouvrir_id(2);
    liberer.send(()).unwrap();
    evenement(&rx, "echec", "A", -1);
    evenement(&rx, "ouvert", "B", 2);
    assert_eq!(midi::ouvert_id(), 2);
    actifs(&["B"]);
    pilote().refus.clear();
    println!("ok : échec du pilote A puis ouverture B, la file continue");

    pilote().presents = vec!["B".into()];
    midi::test_relever();
    evenement(&rx, "retrait", "A", 2);
    assert_eq!(midi::ouvert_id(), 2);
    actifs(&["B"]);
    println!("ok : retrait de A pendant que B est ouvert, B reste ouvert");

    pilote().presents.clear();
    midi::test_relever();
    evenement(&rx, "perdu", "B", -1);
    assert_eq!(midi::ouvert_id(), -1);
    actifs(&[]);
    println!("ok : retrait de B ouvert, ses deux ports sont fermés");

    // B peut apparaître dans la liste demandée par la page, être ouvert puis
    // disparaître avant le relevé suivant du surveillant. Il n'appartient alors
    // ni à l'ancien inventaire (A seul), ni au nouveau (A seul également).
    pilote().presents = vec!["A".into()];
    midi::test_relever();
    evenement(&rx, "ajout", "A", -1);
    pilote().presents = vec!["A".into(), "B".into()];
    assert_eq!(midi::appareils(), "A\t1\nB\t2");
    midi::ouvrir_id(2);
    evenement(&rx, "ouvert", "B", 2);
    pilote().presents = vec!["A".into()];
    midi::test_relever();
    evenement(&rx, "perdu", "B", -1);
    assert!(rx.try_recv().is_err(), "un seul événement perdu doit être émis");
    assert_eq!(midi::ouvert_id(), -1);
    actifs(&[]);
    println!("ok : B branché, ouvert et retiré entre deux relevés, fermeture et perte uniques");

    pilote().presents = vec!["A".into(), "B".into()];
    midi::test_relever();
    evenement(&rx, "ajout", "B", -1);
    assert_eq!(midi::appareils(), "A\t1\nB\t2", "identifiants conservés au rebranchement");

    midi::ouvrir(0);
    evenement(&rx, "ouvert", "A", 1);
    midi::horloge_depart(125.0);
    midi::test_synchroniser();
    assert!(midi::test_horloge_active());
    let generation_a = midi::test_generation();
    midi::fermer_signale();
    midi::horloge_depart(140.0); // rappel tardif de la page après la fermeture
    midi::test_synchroniser();
    evenement(&rx, "ferme", "", -1);
    assert_eq!(midi::ouvert_id(), -1);
    assert!(!midi::test_horloge_active());
    assert!(!midi::test_impulsion(generation_a));
    actifs(&[]);
    {
        let p = pilote();
        assert_eq!(p.messages.iter().filter(|(_, m)| m == &[0xFA]).count(), 1);
        assert_eq!(p.messages.iter().filter(|(_, m)| m == &[0xFC]).count(), 1);
    }
    println!("ok : START puis fermeture puis START tardif, horloge arrêtée");

    midi::ouvrir_id(2);
    evenement(&rx, "ouvert", "B", 2);
    midi::horloge_depart(150.0);
    midi::test_synchroniser();
    assert!(midi::test_horloge_active());
    assert_ne!(midi::test_generation(), generation_a);
    assert!(!midi::test_impulsion(generation_a), "l'ancien fil ne doit pas envoyer F8 sur B");
    midi::horloge_arret();
    midi::test_synchroniser();
    assert!(!midi::test_horloge_active());
    midi::fermer_signale();
    evenement(&rx, "ferme", "", -1);
    actifs(&[]);
    {
        let p = pilote();
        assert_eq!(p.messages.iter().filter(|(n, m)| n == "B" && m == &[0xFA]).count(), 1);
        assert_eq!(p.messages.iter().filter(|(n, m)| n == "B" && m == &[0xFC]).count(), 1);
    }
    println!("ok : ancien fil d'horloge rejeté après ouverture et nouveau START sur B");

    let (entre, liberer) = bloquer("A");
    midi::ouvrir_id(1);
    attendre(&entre, "entrée dans le pilote A avant changement de tempo");
    midi::horloge_depart(125.0);
    midi::tempo(150.0);
    liberer.send(()).unwrap();
    evenement(&rx, "ouvert", "A", 1);
    midi::test_synchroniser();
    assert!(midi::test_horloge_active());
    assert_eq!(midi::test_bpm(), 150.0, "le START en attente ne doit pas restaurer son ancien tempo");
    midi::horloge_arret();
    midi::fermer_signale();
    midi::test_synchroniser();
    evenement(&rx, "ferme", "", -1);
    assert!(!midi::test_horloge_active());
    actifs(&[]);
    println!("ok : tempo modifié pendant l'ouverture lente conservé au START");

    let p = pilote();
    assert!(!p.rappels_fermeture.is_empty());
    assert!(p.rappels_fermeture.iter().all(|&id| id == -1));
    println!("ok : fermeture des entrées attend un vrai rappel sans garder le verrou d'état");
}

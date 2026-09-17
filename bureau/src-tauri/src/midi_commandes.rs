//! Une seule file pour les changements de connexion MIDI (v178).
//!
//! Ce module n'utilise que std : ses tests s'exécutent sans Tauri ni appareil.
//! Un pilote peut bloquer dans une ouverture native ; les demandes suivantes
//! restent ordonnées et leur enfilage ne bloque pas le pont de la page.

use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

#[derive(Debug)]
pub enum Commande {
    OuvrirIndex(i64),
    OuvrirId(i64),
    Fermer,
    Horloge(bool),
    #[cfg(test)]
    Relever,
    #[cfg(test)]
    Synchroniser(Sender<()>),
}

pub trait Pilote: Send + 'static {
    fn ouvrir_index(&mut self, index: i64);
    fn ouvrir_id(&mut self, id: i64);
    fn fermer(&mut self);
    fn connexion_ouverte(&self) -> bool;
    fn horloge_depart(&mut self);
    fn horloge_arret(&mut self);
    fn relever(&mut self);
}

pub struct File {
    expediteur: Sender<Commande>,
    // Détenir le JoinHandle n'attend pas le fil. Les tests le joignent après
    // fermeture du canal pour vérifier aussi l'état final du pilote.
    _fil: JoinHandle<()>,
}

impl File {
    pub fn demarrer<P: Pilote>(pilote: P) -> Self {
        Self::avec_periode(pilote, Duration::from_millis(1500))
    }

    // Les essais de vrais ports simulés commandent les relevés explicitement,
    // indépendamment de la vitesse de la machine qui exécute les tests.
    #[cfg(test)]
    pub fn demarrer_pour_test<P: Pilote>(pilote: P) -> Self {
        Self::avec_periode(pilote, Duration::from_secs(3600))
    }

    fn avec_periode<P: Pilote>(pilote: P, periode: Duration) -> Self {
        let (expediteur, recepteur) = mpsc::channel();
        let fil = thread::Builder::new()
            .name("DRM16 MIDI connexions".into())
            .spawn(move || travailler(pilote, recepteur, periode))
            .expect("impossible de démarrer le fil MIDI");
        Self { expediteur, _fil: fil }
    }

    pub fn envoyer(&self, commande: Commande) {
        // Un échec indique que le worker a quitté à la suite d'une panique,
        // pas un refus du port ; ne pas annoncer une connexion inexistante.
        if self.expediteur.send(commande).is_err() {
            eprintln!("DRM16 : le fil MIDI ne répond plus");
        }
    }

    #[cfg(test)]
    fn terminer(self) {
        drop(self.expediteur);
        self._fil.join().expect("le fil MIDI a paniqué");
    }
}

fn travailler<P: Pilote>(mut pilote: P, recepteur: Receiver<Commande>, periode: Duration) {
    // Premier inventaire sur ce même fil : aucun relevé extérieur ne peut
    // décider de fermer un port pendant une autre ouverture.
    pilote.relever();
    let mut prochain = Instant::now() + periode;
    loop {
        match recepteur.recv_timeout(prochain.saturating_duration_since(Instant::now())) {
            Ok(Commande::OuvrirIndex(i)) => pilote.ouvrir_index(i),
            Ok(Commande::OuvrirId(id)) => pilote.ouvrir_id(id),
            Ok(Commande::Fermer) => pilote.fermer(),
            Ok(Commande::Horloge(true)) => {
                // Un événement « ouvert » peut arriver alors qu'une fermeture
                // est déjà en attente. Ce départ tardif ne ressuscite rien.
                if pilote.connexion_ouverte() {
                    pilote.horloge_depart();
                }
            }
            Ok(Commande::Horloge(false)) => pilote.horloge_arret(),
            #[cfg(test)]
            Ok(Commande::Relever) => pilote.relever(),
            #[cfg(test)]
            Ok(Commande::Synchroniser(fin)) => { let _ = fin.send(()); }
            Err(RecvTimeoutError::Timeout) => (),
            Err(RecvTimeoutError::Disconnected) => break,
        }
        // Une file constamment alimentée ne repousse pas indéfiniment le
        // contrôle des branchements. Il attend seulement l'opération native
        // en cours, qui n'est pas annulable par midir.
        if Instant::now() >= prochain {
            pilote.relever();
            prochain = Instant::now() + periode;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[derive(Default, Debug)]
    struct Observation {
        ouvert: Option<i64>,
        horloge: bool,
        journal: Vec<String>,
        branches: Vec<i64>,
    }

    struct PortsSimules {
        observation: Arc<Mutex<Observation>>,
        commence: Sender<()>,
        continuer: Receiver<()>,
        signal_releve: Sender<()>,
        premiere_ouverture: bool,
        inventaire: Vec<i64>,
    }

    impl Pilote for PortsSimules {
        fn ouvrir_index(&mut self, index: i64) { self.ouvrir_id(index + 1); }

        fn ouvrir_id(&mut self, id: i64) {
            if self.premiere_ouverture {
                self.premiere_ouverture = false;
                self.commence.send(()).unwrap();
                self.continuer.recv().unwrap();
            }
            let mut o = self.observation.lock().unwrap();
            o.horloge = false;
            o.ouvert = if id > 0 { Some(id) } else { None };
            o.journal.push(format!("{}{}", if id > 0 { "ouvert " } else { "échec " }, id));
        }

        fn fermer(&mut self) {
            let mut o = self.observation.lock().unwrap();
            o.ouvert = None;
            o.horloge = false;
            o.journal.push("fermé".into());
        }

        fn connexion_ouverte(&self) -> bool { self.observation.lock().unwrap().ouvert.is_some() }

        fn horloge_depart(&mut self) {
            let mut o = self.observation.lock().unwrap();
            o.horloge = true;
            o.journal.push("horloge démarrée".into());
        }

        fn horloge_arret(&mut self) {
            let mut o = self.observation.lock().unwrap();
            o.horloge = false;
            o.journal.push("horloge arrêtée".into());
        }

        fn relever(&mut self) {
            let mut o = self.observation.lock().unwrap();
            let retires: Vec<_> = self.inventaire.iter().filter(|id| !o.branches.contains(id)).copied().collect();
            if o.ouvert.map(|id| retires.contains(&id)).unwrap_or(false) {
                o.ouvert = None;
                o.horloge = false;
                o.journal.push("perdu".into());
            }
            self.inventaire = o.branches.clone();
            drop(o);
            let _ = self.signal_releve.send(());
        }
    }

    struct Essai {
        file: File,
        observation: Arc<Mutex<Observation>>,
        commence: Receiver<()>,
        continuer: Sender<()>,
        releve: Receiver<()>,
    }

    fn essai(periode: Duration) -> Essai {
        let observation = Arc::new(Mutex::new(Observation { branches: vec![1, 2], ..Observation::default() }));
        let (debut, commence) = mpsc::channel();
        let (continuer, suite) = mpsc::channel();
        let (signal_releve, releve) = mpsc::channel();
        let ports = PortsSimules {
            observation: observation.clone(), commence: debut, continuer: suite,
            signal_releve, premiere_ouverture: true, inventaire: Vec::new(),
        };
        let file = File::avec_periode(ports, periode);
        // La borne ne pilote pas l'ordonnancement : elle évite seulement qu'un
        // test cassé reste suspendu pour toujours.
        releve.recv_timeout(Duration::from_secs(5)).unwrap();
        Essai { file, observation, commence, continuer, releve }
    }

    fn bloquer_a(e: &Essai, id: i64) {
        e.file.envoyer(Commande::OuvrirId(id));
        e.commence.recv_timeout(Duration::from_secs(5)).unwrap();
    }

    fn finir(e: Essai) -> Observation {
        e.continuer.send(()).unwrap();
        e.file.terminer();
        Arc::try_unwrap(e.observation).unwrap().into_inner().unwrap()
    }

    #[test]
    fn ouverture_lente_puis_fermeture_ne_ressuscite_pas() {
        let e = essai(Duration::from_secs(3600));
        bloquer_a(&e, 1);
        // Ces envois reviennent alors que A attend encore continuer : le
        // même fil de test pourra ensuite la débloquer.
        e.file.envoyer(Commande::Fermer);
        assert_eq!(e.observation.lock().unwrap().ouvert, None);
        let o = finir(e);
        assert_eq!(o.ouvert, None);
        assert_eq!(o.journal, ["ouvert 1", "fermé"]);
    }

    #[test]
    fn ouverture_lente_a_puis_b_garde_b() {
        let e = essai(Duration::from_secs(3600));
        bloquer_a(&e, 1);
        e.file.envoyer(Commande::OuvrirId(2));
        let o = finir(e);
        assert_eq!(o.ouvert, Some(2));
        assert_eq!(o.journal, ["ouvert 1", "ouvert 2"]);
    }

    #[test]
    fn ouvrir_fermer_rouvrir_respecte_ordre_du_pont() {
        let e = essai(Duration::from_secs(3600));
        bloquer_a(&e, 1);
        e.file.envoyer(Commande::Fermer);
        e.file.envoyer(Commande::OuvrirIndex(1));
        let o = finir(e);
        assert_eq!(o.ouvert, Some(2));
        assert_eq!(o.journal, ["ouvert 1", "fermé", "ouvert 2"]);
    }

    #[test]
    fn erreur_a_ne_remplace_pas_le_succes_b() {
        let e = essai(Duration::from_secs(3600));
        bloquer_a(&e, -1);
        e.file.envoyer(Commande::OuvrirId(2));
        let o = finir(e);
        assert_eq!(o.ouvert, Some(2));
        assert_eq!(o.journal, ["échec -1", "ouvert 2"]);
    }

    #[test]
    fn horloge_tardive_apres_fermeture_ignoree() {
        let e = essai(Duration::from_secs(3600));
        bloquer_a(&e, 1);
        e.file.envoyer(Commande::Horloge(true));
        e.file.envoyer(Commande::Fermer);
        e.file.envoyer(Commande::Horloge(true));
        let o = finir(e);
        assert_eq!(o.ouvert, None);
        assert!(!o.horloge);
        assert_eq!(o.journal, ["ouvert 1", "horloge démarrée", "fermé"]);
    }

    #[test]
    fn arret_horloge_et_reprise_sont_ordonnes() {
        let e = essai(Duration::from_secs(3600));
        bloquer_a(&e, 1);
        e.file.envoyer(Commande::Horloge(true));
        e.file.envoyer(Commande::Horloge(false));
        e.file.envoyer(Commande::Horloge(true));
        let o = finir(e);
        assert!(o.horloge);
        assert_eq!(o.journal, ["ouvert 1", "horloge démarrée", "horloge arrêtée", "horloge démarrée"]);
    }

    #[test]
    fn releve_attend_ouverture_native_et_ne_perd_pas_b() {
        // Une période nulle impose un relevé entre deux commandes : aucune
        // attente temporelle n'est nécessaire pour provoquer ce cas.
        let e = essai(Duration::ZERO);
        bloquer_a(&e, 1);
        while e.releve.try_recv().is_ok() {}
        e.observation.lock().unwrap().branches = vec![2];
        e.file.envoyer(Commande::OuvrirId(2));
        assert!(e.releve.try_recv().is_err());
        let o = finir(e);
        assert_eq!(o.ouvert, Some(2));
        assert_eq!(o.journal, ["ouvert 1", "perdu", "ouvert 2"]);
    }

    #[test]
    fn releve_periodique_sans_commande() {
        let e = essai(Duration::from_millis(5));
        e.releve.recv_timeout(Duration::from_secs(5)).unwrap();
        // Aucune ouverture n'a été demandée : pas de récepteur continuer
        // bloqué à libérer avant de fermer la file.
        e.file.terminer();
        assert!(e.observation.lock().unwrap().journal.is_empty());
    }

    #[test]
    fn retrait_de_a_apres_ouverture_b_ne_ferme_pas_b() {
        let e = essai(Duration::from_secs(3600));
        bloquer_a(&e, 1);
        e.file.envoyer(Commande::OuvrirId(2));
        e.continuer.send(()).unwrap();
        let (fin, attente) = mpsc::channel();
        e.file.envoyer(Commande::Synchroniser(fin));
        attente.recv_timeout(Duration::from_secs(5)).unwrap();
        e.observation.lock().unwrap().branches = vec![2];
        e.file.envoyer(Commande::Relever);
        e.file.terminer();
        let o = e.observation.lock().unwrap();
        assert_eq!(o.ouvert, Some(2));
        assert_eq!(o.journal, ["ouvert 1", "ouvert 2"]);
    }
}

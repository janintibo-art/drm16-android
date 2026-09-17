//! Le vrai fichiers.rs contre le système de fichiers, sans Tauri.
//!
//! Seuls dirs (inutilisé avec DRM16_DOSSIER) et Base64 sont simulés. Base64
//! reconnaît quelques vecteurs connus : ce banc vérifie les lectures, les
//! listes et les restaurations, pas l'implémentation de cette dépendance.
//! Aucun pilote ni accès aux dossiers personnels n'intervient.
#![allow(dead_code)]

extern crate self as base64;
extern crate self as dirs;

use std::path::PathBuf;

pub fn document_dir() -> Option<PathBuf> { panic!("DRM16_DOSSIER doit être défini") }
pub fn data_dir() -> Option<PathBuf> { panic!("DRM16_DOSSIER doit être défini") }

pub mod engine {
    pub mod general_purpose {
        pub struct Standard;
        pub const STANDARD: Standard = Standard;
    }
}
pub trait Engine {
    fn encode<T: AsRef<[u8]>>(&self, octets: T) -> String {
        match octets.as_ref() {
            b"" => "",
            b"a" => "YQ==",
            b"ancien" => "YW5jaWVu",
            b"nouveau" => "bm91dmVhdQ==",
            _ => panic!("Base64 hors des vecteurs connus de ce banc"),
        }.to_string()
    }
    fn decode<T: AsRef<[u8]>>(&self, _texte: T) -> Result<Vec<u8>, ()> {
        panic!("Les écritures Base64 ne font pas partie de ce banc de lecture")
    }
}
impl Engine for engine::general_purpose::Standard {}

#[path = "../../bureau/src-tauri/src/fichiers.rs"]
mod fichiers;

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicUsize, Ordering};

    struct Dossier {
        racine: PathBuf,
        precedent: Option<std::ffi::OsString>,
    }
    impl Dossier {
        fn nouveau() -> Self {
            static COMPTEUR: AtomicUsize = AtomicUsize::new(0);
            let racine = std::env::temp_dir().join(format!(
                "drm16-fichiers-{}-{}", std::process::id(),
                COMPTEUR.fetch_add(1, Ordering::Relaxed),
            ));
            fs::create_dir(&racine).unwrap();
            let precedent = std::env::var_os("DRM16_DOSSIER");
            std::env::set_var("DRM16_DOSSIER", &racine);
            Self { racine, precedent }
        }
        fn docs(&self) -> PathBuf { fichiers::dossier_doc() }
        fn ech(&self) -> PathBuf { fichiers::dossier_ech() }
    }
    impl Drop for Dossier {
        fn drop(&mut self) {
            match &self.precedent {
                Some(p) => std::env::set_var("DRM16_DOSSIER", p),
                None => std::env::remove_var("DRM16_DOSSIER"),
            }
            fs::remove_dir_all(&self.racine).unwrap();
        }
    }

    #[test]
    fn absence_prouvee_et_listes_vides() {
        let _d = Dossier::nouveau();
        assert_eq!(fichiers::charger("absent.drm16"), Some(String::new()));
        assert_eq!(fichiers::ech_charger("absent"), Some(String::new()));
        assert_eq!(fichiers::liste(""), Some(String::new()));
        assert_eq!(fichiers::ech_liste(), Some(String::new()));
    }

    #[test]
    fn fichiers_vides_restent_presents_dans_les_listes() {
        let d = Dossier::nouveau();
        fs::write(d.docs().join("journal.json"), b"").unwrap();
        fs::write(d.ech().join("vide.wav"), b"").unwrap();
        assert_eq!(fichiers::charger("journal.json"), Some(String::new()));
        assert!(fichiers::liste("").unwrap().starts_with("journal.json\t0\t"));
        assert_eq!(fichiers::ech_charger("vide"), Some(String::new()));
        assert_eq!(fichiers::ech_liste(), Some("vide".into()));
    }

    #[test]
    fn formats_des_lectures_et_listes_conserves() {
        let d = Dossier::nouveau();
        fs::write(d.docs().join("Z.drm16"), b"a").unwrap();
        fs::write(d.docs().join("a.json"), b"ancien").unwrap();
        fs::write(d.docs().join("ignore.part-1"), b"a").unwrap();
        fs::write(d.ech().join("Z.wav"), b"nouveau").unwrap();
        fs::write(d.ech().join("a.wav"), b"a").unwrap();
        fs::write(d.ech().join("autre.json"), b"a").unwrap();
        fs::write(d.ech().join("cache.part-1.wav"), b"a").unwrap();
        assert_eq!(fichiers::charger("Z.drm16"), Some("YQ==".into()));
        assert_eq!(fichiers::ech_charger("Z"), Some("bm91dmVhdQ==".into()));
        let liste = fichiers::liste("").unwrap();
        let lignes: Vec<_> = liste.lines().collect();
        assert_eq!(lignes.len(), 2);
        assert!(lignes[0].starts_with("a.json\t6\t"));
        assert!(lignes[1].starts_with("Z.drm16\t1\t"));
        for ligne in lignes {
            let champs: Vec<_> = ligne.split('\t').collect();
            assert_eq!(champs.len(), 3);
            assert!(champs[2].parse::<u128>().unwrap() > 0);
        }
        assert!(fichiers::liste(".drm16").unwrap().starts_with("Z.drm16\t1\t"));
        assert_eq!(fichiers::liste(".inconnu"), Some(String::new()));
        assert_eq!(fichiers::ech_liste(), Some("a\nZ".into()));
    }

    #[test]
    fn lecture_recupere_les_sauvegardes_orphelines() {
        let d = Dossier::nouveau();
        let doc = d.docs().join("projet.drm16.bak");
        let ech = d.ech().join("caisse.wav.bak");
        fs::write(&doc, b"ancien").unwrap();
        fs::write(&ech, b"a").unwrap();
        assert_eq!(fichiers::charger("projet.drm16"), Some("YW5jaWVu".into()));
        assert_eq!(fichiers::ech_charger("caisse"), Some("YQ==".into()));
        assert!(!doc.exists());
        assert!(!ech.exists());
    }

    #[test]
    fn listes_recuperent_les_sauvegardes_et_gardent_la_cible_recente() {
        let d = Dossier::nouveau();
        fs::write(d.docs().join("projet.drm16.bak"), b"ancien").unwrap();
        fs::write(d.ech().join("caisse.wav.bak"), b"a").unwrap();
        assert!(fichiers::liste("").unwrap().starts_with("projet.drm16\t6\t"));
        assert_eq!(fichiers::ech_liste(), Some("caisse".into()));
        fs::write(d.docs().join("projet.drm16"), b"nouveau").unwrap();
        fs::write(d.docs().join("projet.drm16.bak"), b"ancien").unwrap();
        assert!(fichiers::liste("").is_some());
        assert_eq!(fs::read(d.docs().join("projet.drm16")).unwrap(), b"nouveau");
        assert!(!d.docs().join("projet.drm16.bak").exists());
    }

    #[test]
    fn dossiers_de_stockage_remplaces_par_des_fichiers() {
        let d = Dossier::nouveau();
        fs::write(d.racine.join("documents"), b"a").unwrap();
        fs::write(d.racine.join("ech"), b"a").unwrap();
        assert_eq!(fichiers::charger("absent"), None);
        assert_eq!(fichiers::ech_charger("absent"), None);
        assert_eq!(fichiers::liste(""), None);
        assert_eq!(fichiers::ech_liste(), None);
    }

    #[test]
    fn dossier_utilisateur_ordinaire_ne_bloque_pas_la_liste() {
        let d = Dossier::nouveau();
        fs::create_dir(d.docs().join("mes-projets")).unwrap();
        let liste = fichiers::liste("").unwrap();
        assert!(liste.starts_with("mes-projets\t"));
        assert_eq!(fichiers::charger("journal.json"), Some(String::new()));
        assert_eq!(fichiers::charger("mes-projets"), None);
    }

    #[test]
    fn dossier_au_lieu_du_fichier_ou_de_sa_sauvegarde_est_une_erreur() {
        let d = Dossier::nouveau();
        fs::create_dir(d.docs().join("projet.drm16")).unwrap();
        fs::create_dir(d.ech().join("caisse.wav")).unwrap();
        assert_eq!(fichiers::charger("projet.drm16"), None);
        assert_eq!(fichiers::ech_charger("caisse"), None);
        assert!(fichiers::liste("").unwrap().starts_with("projet.drm16\t"));
        assert_eq!(fichiers::ech_liste(), None);
        fs::remove_dir(d.docs().join("projet.drm16")).unwrap();
        fs::remove_dir(d.ech().join("caisse.wav")).unwrap();
        fs::create_dir(d.docs().join("projet.drm16.bak")).unwrap();
        fs::create_dir(d.ech().join("caisse.wav.bak")).unwrap();
        assert_eq!(fichiers::charger("projet.drm16"), None);
        assert_eq!(fichiers::ech_charger("caisse"), None);
        assert_eq!(fichiers::liste(""), None);
        assert_eq!(fichiers::ech_liste(), None);
        assert!(d.docs().join("projet.drm16.bak").is_dir());
        assert!(d.ech().join("caisse.wav.bak").is_dir());
    }

    #[test]
    fn lectures_au_dessus_du_plafond_refusees() {
        let d = Dossier::nouveau();
        for (nom, taille) in [("grand.json", 8 * 1024 * 1024),
                              ("grand.drm16", 16 * 1024 * 1024)] {
            fs::File::create(d.docs().join(nom)).unwrap().set_len(taille + 1).unwrap();
            assert_eq!(fichiers::charger(nom), None);
        }
        fs::File::create(d.ech().join("grand.wav")).unwrap()
            .set_len(32 * 1024 * 1024 + 1).unwrap();
        assert_eq!(fichiers::ech_charger("grand"), None);
    }

    #[cfg(unix)]
    mod unix {
        use super::*;
        use std::os::unix::fs::{symlink, PermissionsExt};

        struct Mode { chemin: PathBuf, avant: fs::Permissions }
        impl Mode {
            fn poser(chemin: PathBuf, mode: u32) -> Self {
                let avant = fs::metadata(&chemin).unwrap().permissions();
                fs::set_permissions(&chemin, fs::Permissions::from_mode(mode)).unwrap();
                Self { chemin, avant }
            }
        }
        impl Drop for Mode {
            fn drop(&mut self) { fs::set_permissions(&self.chemin, self.avant.clone()).unwrap(); }
        }

        #[test]
        fn lecture_refusee_ne_devient_pas_absence() {
            let d = Dossier::nouveau();
            let doc = d.docs().join("projet.drm16");
            let ech = d.ech().join("caisse.wav");
            fs::write(&doc, b"a").unwrap();
            fs::write(&ech, b"a").unwrap();
            let _doc_mode = Mode::poser(doc, 0);
            let _ech_mode = Mode::poser(ech, 0);
            assert_eq!(fichiers::charger("projet.drm16"), None,
                "lancer ce test sans privilèges root, via test-fichiers-bureau.py");
            assert_eq!(fichiers::ech_charger("caisse"), None);
        }

        #[test]
        fn liste_refusee_ne_devient_pas_vide() {
            let d = Dossier::nouveau();
            let _doc_mode = Mode::poser(d.docs(), 0o300);
            let _ech_mode = Mode::poser(d.ech(), 0o300);
            assert_eq!(fichiers::liste(""), None);
            assert_eq!(fichiers::ech_liste(), None);
        }

        #[test]
        fn sauvegarde_illisible_conservee_en_erreur() {
            let d = Dossier::nouveau();
            symlink("introuvable", d.docs().join("projet.drm16.bak")).unwrap();
            symlink("introuvable", d.ech().join("caisse.wav.bak")).unwrap();
            assert_eq!(fichiers::charger("projet.drm16"), None);
            assert_eq!(fichiers::ech_charger("caisse"), None);
            assert_eq!(fichiers::liste(""), None);
            assert_eq!(fichiers::ech_liste(), None);
            assert!(fs::symlink_metadata(d.docs().join("projet.drm16.bak")).is_ok());
            assert!(fs::symlink_metadata(d.ech().join("caisse.wav.bak")).is_ok());
        }

        #[test]
        fn restauration_refusee_conserve_la_sauvegarde_et_signale_erreur() {
            let d = Dossier::nouveau();
            let doc = d.docs().join("projet.drm16.bak");
            let ech = d.ech().join("caisse.wav.bak");
            fs::write(&doc, b"ancien").unwrap();
            fs::write(&ech, b"a").unwrap();
            let _doc_mode = Mode::poser(d.docs(), 0o500);
            let _ech_mode = Mode::poser(d.ech(), 0o500);
            assert_eq!(fichiers::charger("projet.drm16"), None);
            assert_eq!(fichiers::ech_charger("caisse"), None);
            assert_eq!(fichiers::liste(""), None);
            assert_eq!(fichiers::ech_liste(), None);
            assert_eq!(fs::read(&doc).unwrap(), b"ancien");
            assert_eq!(fs::read(&ech).unwrap(), b"a");
            assert!(!d.docs().join("projet.drm16").exists());
            assert!(!d.ech().join("caisse.wav").exists());
        }

        #[test]
        fn erreur_de_metadonnees_ne_produit_pas_une_liste_partielle() {
            let d = Dossier::nouveau();
            fs::write(d.docs().join("a.json"), b"a").unwrap();
            fs::write(d.ech().join("a.wav"), b"a").unwrap();
            symlink("z.json", d.docs().join("z.json")).unwrap();
            symlink("z.wav", d.ech().join("z.wav")).unwrap();
            assert_eq!(fichiers::charger("z.json"), None);
            assert_eq!(fichiers::ech_charger("z"), None);
            assert_eq!(fichiers::liste(""), None);
            assert_eq!(fichiers::ech_liste(), None);
        }

        #[test]
        fn lien_casse_n_est_pas_une_absence_prouvee() {
            let d = Dossier::nouveau();
            symlink("introuvable", d.docs().join("journal.json")).unwrap();
            symlink("introuvable", d.ech().join("caisse.wav")).unwrap();
            assert_eq!(fichiers::charger("journal.json"), None);
            assert_eq!(fichiers::ech_charger("caisse"), None);
            assert_eq!(fichiers::liste(""), None);
            assert_eq!(fichiers::ech_liste(), None);
        }
    }
}

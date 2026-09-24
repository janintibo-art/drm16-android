//! v300 : cas limites de sécurité des fichiers Windows, sans Tauri.
#![allow(dead_code)]

extern crate self as base64;
extern crate self as dirs;

use std::path::PathBuf;

/* Hors DRM16_DOSSIER, ce banc simule justement un Windows qui ne fournit ni
   Documents ni dossier de données. */
pub fn document_dir() -> Option<PathBuf> { None }
pub fn data_dir() -> Option<PathBuf> { None }

pub mod engine {
    pub mod general_purpose {
        pub struct Standard;
        pub const STANDARD: Standard = Standard;
    }
}
pub trait Engine {
    fn encode<T: AsRef<[u8]>>(&self, _octets: T) -> String { panic!("encodage inattendu") }
    fn decode<T: AsRef<[u8]>>(&self, _texte: T) -> Result<Vec<u8>, ()> { panic!("decodage inattendu") }
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
            static C: AtomicUsize = AtomicUsize::new(0);
            let racine = std::env::temp_dir().join(format!(
                "drm16-v300-{}-{}", std::process::id(), C.fetch_add(1, Ordering::Relaxed)
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
                Some(v) => std::env::set_var("DRM16_DOSSIER", v),
                None => std::env::remove_var("DRM16_DOSSIER"),
            }
            let _ = fs::remove_dir_all(&self.racine);
        }
    }

    #[test]
    fn noms_dangereux_ne_visent_jamais_x() {
        let d = Dossier::nouveau();
        fs::write(d.docs().join("x"), b"document x").unwrap();
        fs::write(d.ech().join("x.wav"), b"son x").unwrap();

        for n in ["", ".", ".."] {
            assert_eq!(fichiers::charger(n), Some(String::new()));
            assert_eq!(fichiers::ech_charger(n), Some(String::new()));
            assert_eq!(fichiers::ouvrir(n), String::new());
            assert!(!fichiers::supprimer(n));
            fichiers::ech_supprimer(n);
        }
        assert_eq!(fs::read(d.docs().join("x")).unwrap(), b"document x");
        assert_eq!(fs::read(d.ech().join("x.wav")).unwrap(), b"son x");
    }

    #[test]
    fn secours_resistant_bloque_la_suppression() {
        let d = Dossier::nouveau();
        let cible = d.docs().join("projet.drm16");
        fs::write(&cible, b"actuel").unwrap();
        let bak = d.docs().join("projet.drm16.bak");
        fs::create_dir(&bak).unwrap();
        fs::write(bak.join("verrou"), b"x").unwrap();

        assert!(!fichiers::supprimer("projet.drm16"));
        assert_eq!(fs::read(&cible).unwrap(), b"actuel");

        fs::remove_file(bak.join("verrou")).unwrap();
        fs::remove_dir(&bak).unwrap();
        fs::write(&bak, b"ancien").unwrap();
        assert!(fichiers::supprimer("projet.drm16"));
        assert!(!cible.exists());
        assert!(!bak.exists());
    }

    #[test]
    fn aucun_repli_vers_temp_si_windows_ne_connait_pas_ses_dossiers() {
        let precedent = std::env::var_os("DRM16_DOSSIER");
        std::env::remove_var("DRM16_DOSSIER");
        assert!(fichiers::dossier_doc().as_os_str().is_empty());
        assert!(fichiers::dossier_ech().as_os_str().is_empty());
        assert_eq!(fichiers::charger("projet.drm16"), None);
        assert_eq!(fichiers::ech_charger("kick"), None);
        assert_eq!(fichiers::liste(""), None);
        assert_eq!(fichiers::ech_liste(), None);
        assert_eq!(fichiers::ouvrir("projet.drm16"), String::new());
        match precedent {
            Some(v) => std::env::set_var("DRM16_DOSSIER", v),
            None => std::env::remove_var("DRM16_DOSSIER"),
        }
    }
}

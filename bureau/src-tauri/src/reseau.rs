//! Téléchargement pour la collection archive.org (W4, v140) : la traduction de
//! netCharger dans MainActivity.java. Mêmes règles : https seulement, y compris
//! après redirection ; 15 s pour se connecter, 30 s sans données ; plafond
//! demandé par la page, borné à 16 Mo (4 Mo si la page n'en donne pas).
//!
//! Le téléchargement tourne sur un fil à part ; le résultat revient à la page
//! par le même rappel que sur Android : window.__net(jeton, erreur, base64).

use std::io::Read;
use std::time::Duration;

use base64::{engine::general_purpose::STANDARD, Engine as _};

use crate::fenetre::{chaine_js, executer};

const MAX_RESEAU: u64 = 16 * 1024 * 1024;
const PAR_DEFAUT: u64 = 4 * 1024 * 1024;

pub fn charger(url: String, jeton: String, max: i64) {
    std::thread::spawn(move || {
        let (erreur, charge) = match telecharger(&url, max) {
            Ok(o) => (String::new(), STANDARD.encode(o)),
            Err(e) => (e, String::new()),
        };
        rendre(&jeton, &erreur, &charge);
    });
}

fn telecharger(url: &str, max: i64) -> Result<Vec<u8>, String> {
    if !url.to_ascii_lowercase().starts_with("https://") {
        return Err("https seulement".to_string());
    }
    let plafond = if max > 0 { (max as u64).min(MAX_RESEAU) } else { PAR_DEFAUT };
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(15))
        .timeout_read(Duration::from_secs(30))
        .redirects(5)
        .user_agent("DRM16-Windows")
        .build();
    let reponse = agent.get(url).call().map_err(|e| match e {
        ureq::Error::Status(code, _) => format!("reponse {}", code),
        autre => autre.to_string(),
    })?;
    if reponse.status() != 200 {
        return Err(format!("reponse {}", reponse.status()));
    }
    if !reponse.get_url().to_ascii_lowercase().starts_with("https://") {
        return Err("redirection non https refusee".to_string());
    }
    if let Some(annonce) = reponse.header("Content-Length").and_then(|v| v.trim().parse::<u64>().ok()) {
        if annonce > plafond {
            return Err(format!("trop gros : {}", annonce));
        }
    }
    let mut o = Vec::new();
    reponse
        .into_reader()
        .take(plafond + 1)
        .read_to_end(&mut o)
        .map_err(|e| e.to_string())?;
    if (o.len() as u64) > plafond {
        return Err("trop gros".to_string());
    }
    Ok(o)
}

fn rendre(jeton: &str, erreur: &str, charge: &str) {
    executer(&format!(
        "window.__net&&__net({},{},{})",
        chaine_js(jeton),
        chaine_js(erreur),
        chaine_js(charge)
    ));
}

//! Le pont entre la page et la machine (W3, v139).
//!
//! La page parle au pont Android par des appels SYNCHRONES : elle attend la
//! réponse sur place (« chemin = p.fichierSauver(...) »). Les commandes Tauri,
//! elles, sont asynchrones. Plutôt que de réécrire la page, la couche HOST de la
//! version de bureau envoie une requête XMLHttpRequest synchrone vers le
//! protocole maison drm16:// (http://drm16.localhost/ sous Windows), que ce
//! module sert :
//!
//!   POST http://drm16.localhost/<fonction>   corps : les arguments, en JSON
//!   réponse 200 : {"r": <valeur rendue>}      404 : fonction inconnue
//!
//! Les noms et les valeurs rendues sont ceux de MainActivity.java.

use serde_json::{json, Value};
use tauri::http::{Request, Response, StatusCode};

use crate::fichiers as f;
use crate::midi as m;

pub fn repondre(requete: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let nom = requete.uri().path().trim_start_matches('/').to_string();
    let args: Vec<Value> = serde_json::from_slice(requete.body()).unwrap_or_default();
    let (statut, corps) = match appeler(&nom, &args) {
        Some(v) => (StatusCode::OK, json!({ "r": v })),
        None => (StatusCode::NOT_FOUND, json!({ "erreur": nom })),
    };
    Response::builder()
        .status(statut)
        .header("Content-Type", "application/json; charset=utf-8")
        // la page est servie par http://tauri.localhost : autre origine
        .header("Access-Control-Allow-Origin", "*")
        .header("Cache-Control", "no-store")
        .body(corps.to_string().into_bytes())
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

fn texte(a: &[Value], i: usize) -> String {
    a.get(i).and_then(|v| v.as_str()).unwrap_or("").to_string()
}

fn entier(a: &[Value], i: usize) -> i64 {
    a.get(i).and_then(|v| v.as_f64()).map(|f| f as i64).unwrap_or(0)
}

fn reel(a: &[Value], i: usize) -> f64 {
    a.get(i).and_then(|v| v.as_f64()).unwrap_or(0.0)
}

fn booleen(a: &[Value], i: usize) -> bool {
    a.get(i).and_then(|v| v.as_bool()).unwrap_or(false)
}

fn appeler(nom: &str, a: &[Value]) -> Option<Value> {
    let v = match nom {
        // lecture en cours : rien à faire sur ordinateur (pas de mise en veille à empêcher ici)
        "playing" => Value::Null,

        "fichierSauver" => json!(f::sauver(&texte(a, 0), &texte(a, 1))),
        "fichierOuvrir" => json!(f::ouvrir(&texte(a, 0))),
        "fichierAjouter" => json!(f::ajouter(&texte(a, 0), &texte(a, 1))),
        "fichierFermer" => json!(f::fermer(&texte(a, 0), booleen(a, 1))),
        "fichierListe" => json!(f::liste(&texte(a, 0))),
        "fichierCharger" => json!(f::charger(&texte(a, 0))),
        "fichierSupprimer" => json!(f::supprimer(&texte(a, 0))),
        "fichierDossier" => json!(f::dossier_doc().to_string_lossy()),

        "netCharger" => {
            let max = a.get(2).and_then(|v| v.as_i64()).unwrap_or(0);
            crate::reseau::charger(texte(a, 0), texte(a, 1), max);
            Value::Null
        }

        // MIDI (v141) — voir midi.rs
        "midiDispo" => json!(m::dispo()),
        "midiListe" => json!(m::liste()),
        "midiAppareils" => json!(m::appareils()),
        "midiOuvertId" => json!(m::ouvert_id()),
        // La file MIDI (v178) conserve l'ordre ouvrir/fermer/horloge, sans
        // attendre les pilotes depuis la requête synchrone de la page.
        // L'événement arrive sur son worker par __midiEtat, comme en v142.
        "midiOuvrir" => {
            m::ouvrir(entier(a, 0));
            Value::Null
        }
        "midiOuvrirId" => {
            m::ouvrir_id(entier(a, 0));
            Value::Null
        }
        "midiFermer" => {
            m::fermer_signale();
            Value::Null
        }
        "midiEnvoyer" => {
            m::envoyer(entier(a, 0), entier(a, 1), entier(a, 2));
            Value::Null
        }
        "midiSysex" => json!(m::sysex(&texte(a, 0))),
        "midiHorloge" => {
            if booleen(a, 0) {
                m::horloge_depart(reel(a, 1));
            } else {
                m::horloge_arret();
            }
            Value::Null
        }
        "midiTempo" => {
            m::tempo(reel(a, 0));
            Value::Null
        }

        // propre à l'ordinateur (v146)
        "pleinEcran" => {
            crate::fenetre::basculer_plein_ecran();
            Value::Null
        }

        "echDossier" => json!(f::dossier_ech().to_string_lossy()),
        "echSauver" => json!(f::ech_sauver(&texte(a, 0), &texte(a, 1))),
        "echCharger" => json!(f::ech_charger(&texte(a, 0))),
        "echListe" => json!(f::ech_liste()),
        "echSupprimer" => {
            f::ech_supprimer(&texte(a, 0));
            Value::Null
        }

        // Essai automatique dans GitHub Actions : la page le demande au
        // démarrage, se teste, puis rend son rapport et l'application s'arrête.
        "autotest" => json!(std::env::var_os("DRM16_AUTOTEST").is_some()),
        "autotestFin" => {
            if let Some(chemin) = std::env::var_os("DRM16_AUTOTEST") {
                let _ = std::fs::write(chemin, texte(a, 1));
            }
            std::process::exit(if booleen(a, 0) { 0 } else { 1 })
        }

        _ => return None,
    };
    Some(v)
}

//! Envoyer du JavaScript à la page depuis n'importe quel fil (v141).
//! C'est l'équivalent de web.evaluateJavascript côté Android : les rappels
//! __net, __midi, __midiSysex et __midiEtat passent tous par ici.

use std::sync::OnceLock;

use tauri::{AppHandle, Manager};

/// Posée au démarrage (main.rs).
pub static APPLI: OnceLock<AppHandle> = OnceLock::new();

pub fn executer(script: &str) {
    if let Some(appli) = APPLI.get() {
        for fenetre in appli.webview_windows().values() {
            let _ = fenetre.eval(script);
        }
    }
}

/// Une chaîne Rust écrite comme chaîne JavaScript (guillemets et échappements).
pub fn chaine_js(s: &str) -> String {
    serde_json::Value::String(s.to_string()).to_string()
}

/// F11 (v146) : plein écran de la fenêtre, et retour. Sur un fil à part, comme
/// l'ouverture MIDI : jamais depuis l'intérieur de la requête de la page.
pub fn basculer_plein_ecran() {
    std::thread::spawn(|| {
        if let Some(appli) = APPLI.get() {
            for fenetre in appli.webview_windows().values() {
                let actuel = fenetre.is_fullscreen().unwrap_or(false);
                let _ = fenetre.set_fullscreen(!actuel);
            }
        }
    });
}

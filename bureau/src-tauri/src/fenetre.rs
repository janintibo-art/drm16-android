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

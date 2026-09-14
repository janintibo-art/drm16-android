// windows_subsystem = "windows" : pas de fenêtre de console noire au lancement.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("impossible de démarrer la fenêtre");
}

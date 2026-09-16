// windows_subsystem = "windows" : pas de fenêtre de console noire au lancement.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Coque de bureau : le même rôle que MainActivity.java côté Android.
// La page appelle ses services par le protocole drm16:// (voir hote.rs),
// exactement avec les noms du pont Android.
mod fichiers;
mod hote;
mod reseau;

fn main() {
    tauri::Builder::default()
        .setup(|appli| {
            let _ = reseau::APPLI.set(appli.handle().clone());
            Ok(())
        })
        .register_uri_scheme_protocol("drm16", |_contexte, requete| hote::repondre(requete))
        .run(tauri::generate_context!())
        .expect("impossible de démarrer la fenêtre");
}

use std::path::PathBuf;
use std::sync::Arc;
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use tauri::{Manager, RunEvent, State};

/// A handle to the sidecar process so we can kill it cleanly on exit.
struct SidecarHandle(Arc<Mutex<Option<Child>>>);

#[tauri::command]
fn sidecar_status(state: State<SidecarHandle>) -> bool {
    let handle = state.0.clone();
    tauri::async_runtime::block_on(async move {
        let mut guard = handle.lock().await;
        match guard.as_mut() {
            Some(child) => child.try_wait().ok().flatten().is_none(),
            None => false,
        }
    })
}

#[tauri::command]
async fn restart_sidecar(state: State<'_, SidecarHandle>) -> Result<(), String> {
    let handle = state.0.clone();
    let mut guard = handle.lock().await;
    if let Some(mut child) = guard.take() {
        let _ = child.kill().await;
    }
    let child = spawn_sidecar().await.map_err(|e| e.to_string())?;
    *guard = Some(child);
    Ok(())
}

/// Resolve the path to the sidecar entrypoint.
///
/// In development the sidecar runs from the workspace at
/// `../sidecar/dist/index.js` (after `pnpm --filter @tj-cortex/sidecar build`).
/// In production it is bundled as a resource and lives next to the app
/// binary under `resources/sidecar/dist/index.js`.
fn sidecar_entrypoint(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    // Try the bundled resource first.
    if let Ok(dir) = app.path().resource_dir() {
        let candidate = dir.join("sidecar").join("dist").join("index.js");
        if candidate.exists() {
            return Ok(candidate);
        }
    }
    // Fall back to the workspace path used during development.
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    for up in [".", "..", "../.."] {
        let candidate = cwd.join(up).join("sidecar").join("dist").join("index.js");
        if candidate.exists() {
            return Ok(candidate);
        }
    }
    Err("Could not locate sidecar/dist/index.js. Run `pnpm --filter @tj-cortex/sidecar build`.".into())
}

async fn spawn_sidecar() -> std::io::Result<Child> {
    // In production we ship a bundled Node. For v1 we rely on system Node 22+,
    // which the installer checks for. This keeps the desktop binary small and
    // matches the local-first, no-telemetry spirit of TJ-Cortex.
    let node = which::which("node").unwrap_or_else(|_| PathBuf::from("node"));
    let entry = {
        // The Tauri app handle is not available here; we accept an argument in
        // production via env, and use the workspace path in development.
        std::env::var("TJ_CORTEX_SIDECAR_ENTRY").unwrap_or_else(|_| {
            let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            cwd.join("..").join("sidecar").join("dist").join("index.js").to_string_lossy().to_string()
        })
    };
    let mut cmd = Command::new(node);
    cmd.arg(entry);
    cmd.env("NODE_ENV", "production");
    cmd.kill_on_drop(true);
    cmd.spawn()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sidecar = SidecarHandle(Arc::new(Mutex::new(None)));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(sidecar)
        .invoke_handler(tauri::generate_handler![sidecar_status, restart_sidecar])
        .setup(|app| {
            let handle = app.state::<SidecarHandle>().0.clone();
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Record the resolved path for the spawned process so the sidecar
                // can find its own working directory.
                if let Ok(entry) = sidecar_entrypoint(&app_handle) {
                    std::env::set_var("TJ_CORTEX_SIDECAR_ENTRY", entry.to_string_lossy().to_string());
                }
                match spawn_sidecar().await {
                    Ok(child) => {
                        let mut guard = handle.lock().await;
                        *guard = Some(child);
                    }
                    Err(e) => {
                        eprintln!("[tj-cortex] sidecar failed to start: {e}");
                    }
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error building TJ-Cortex")
        .run(|app_handle, event| {
            if let RunEvent::ExitRequested { .. } = event {
                let handle = app_handle.state::<SidecarHandle>().0.clone();
                tauri::async_runtime::block_on(async move {
                    let mut guard = handle.lock().await;
                    if let Some(mut child) = guard.take() {
                        let _ = child.kill().await;
                    }
                });
            }
        });
}
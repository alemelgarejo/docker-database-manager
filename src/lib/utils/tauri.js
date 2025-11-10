/**
 * Tauri API wrapper
 */

let tauriAPI = null;

export async function getTauriAPI() {
  if (tauriAPI) return tauriAPI;

  return new Promise((resolve) => {
    const checkTauri = () => {
      if (window.__TAURI__) {
        const invoke =
          window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
        const check = window.__TAURI__?.plugin?.updater?.check;
        const ask = window.__TAURI__?.plugin?.dialog?.ask;
        const relaunch = window.__TAURI__?.plugin?.process?.relaunch;

        if (invoke) {
          console.log('[Tauri] API loaded successfully');
          tauriAPI = { invoke, check, ask, relaunch };
          resolve(tauriAPI);
        } else {
          setTimeout(checkTauri, 50);
        }
      } else {
        setTimeout(checkTauri, 50);
      }
    };
    checkTauri();
  });
}

export async function invoke(command, args) {
  const api = await getTauriAPI();
  return api.invoke(command, args);
}

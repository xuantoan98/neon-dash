import { VERSION } from './version.js';

export function setupOffline() {
  const version = document.getElementById('versionInfo');
  const status = document.getElementById('offlineStatus');
  const update = document.getElementById('updateBtn');
  const install = document.getElementById('installBtn');
  version.textContent = `Neon Dash v${VERSION}`;
  const lifecycle = new AbortController();
  const options = { signal: lifecycle.signal };
  if (document.querySelector('meta[name="neon-dash-dev"]')) {
    status.textContent = 'Chế độ dev · tải lại để nhận thay đổi';
    if ('serviceWorker' in navigator && window.isSecureContext) {
      // The dev server provides a network-only replacement for any old PWA worker.
      void navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
    }
    return () => lifecycle.abort();
  }
  let registration;
  let installPrompt;
  let reloadRequested = false;
  let ready = false;
  const refresh = () => {
    status.textContent = ready
      ? navigator.onLine
        ? 'Sẵn sàng chơi offline'
        : 'Đang chơi offline'
      : 'Đang chuẩn bị offline…';
  };
  window.addEventListener('online', refresh, options);
  window.addEventListener('offline', refresh, options);
  window.addEventListener(
    'beforeinstallprompt',
    (event) => {
      event.preventDefault();
      installPrompt = event;
      install.hidden = false;
    },
    options,
  );
  install.addEventListener(
    'click',
    async () => {
      if (!installPrompt) return;
      await installPrompt.prompt();
      installPrompt = null;
      install.hidden = true;
    },
    options,
  );
  window.addEventListener(
    'appinstalled',
    () => {
      install.hidden = true;
    },
    options,
  );

  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker
      .register('./sw.js', { updateViaCache: 'none' })
      .then(async (result) => {
        registration = result;
        if (lifecycle.signal.aborted) return;
        const waiting = () => {
          update.hidden = !registration.waiting;
        };
        waiting();
        registration.addEventListener(
          'updatefound',
          () => {
            const worker = registration.installing;
            worker?.addEventListener('statechange', waiting, options);
          },
          options,
        );
        await navigator.serviceWorker.ready;
        if (lifecycle.signal.aborted) return;
        ready = true;
        refresh();
      })
      .catch(() => {
        status.textContent = 'Chế độ online · offline chưa khả dụng';
      });
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        if (reloadRequested) window.location.reload();
      },
      options,
    );
    update.addEventListener(
      'click',
      () => {
        if (!registration?.waiting) return;
        reloadRequested = true;
        registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
      },
      options,
    );
  } else {
    status.textContent = 'Offline cần HTTPS hoặc localhost';
  }
  return () => lifecycle.abort();
}

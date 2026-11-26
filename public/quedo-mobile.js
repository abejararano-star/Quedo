if ('serviceWorker' in navigator && window.isSecureContext) {
  const workerUrl = new URL('quedo-worker.js', document.currentScript.src);
  navigator.serviceWorker.register(workerUrl).catch(() => {});
}

let installPrompt;
const installButton = document.querySelector('[data-install-quedo]');
window.addEventListener('beforeinstallprompt', event => {
  if (!installButton) return;
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton?.addEventListener('click', async () => {
  if (!installPrompt) return;
  const prompt = installPrompt;
  installPrompt = undefined;
  installButton.hidden = true;
  await prompt.prompt();
});
window.addEventListener('appinstalled', () => {
  if (installButton) installButton.hidden = true;
});

const shareButton = document.querySelector('[data-share-listing]');
if (shareButton) {
  shareButton.addEventListener('click', async () => {
    const url = shareButton.dataset.shareListing;
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else {
        await navigator.clipboard.writeText(url);
        shareButton.textContent = 'Enlace copiado';
      }
    } catch (error) {
      if (error.name !== 'AbortError') window.prompt('Copia el enlace de esta ficha', url);
    }
  });
}

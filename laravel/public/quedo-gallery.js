const stayBack = document.querySelector('[data-stay-back]');
if (stayBack && document.referrer) {
    const previous = new URL(document.referrer);
    const destinations = {
        '/': 'inicio',
        '/estadias': 'estadías',
        '/guardados': 'guardados',
        '/admin/anuncios': 'moderación',
        '/anfitrion': 'mis anuncios',
    };
    if (previous.origin === location.origin && Object.hasOwn(destinations, previous.pathname)) {
        stayBack.href = previous.href;
        stayBack.textContent = '← Volver a ' + destinations[previous.pathname];
    }
}

const photoViewer = document.querySelector('[data-stay-photo-viewer]');
if (photoViewer && typeof photoViewer.showModal === 'function') {
    const photos = [...document.querySelectorAll('[data-stay-photo]')];
    const image = photoViewer.querySelector('[data-viewer-image]');
    const caption = photoViewer.querySelector('figcaption span');
    const previous = photoViewer.querySelector('[data-photo-prev]');
    const next = photoViewer.querySelector('[data-photo-next]');
    let current = 0;
    let opener;

    function showPhoto(index) {
        if (index < 0 || index >= photos.length) return;
        current = index;
        image.src = photos[index].href;
        image.alt = photos[index].querySelector('img').alt;
        caption.textContent = 'Foto ' + (index + 1) + ' de ' + photos.length;
        previous.disabled = index === 0;
        next.disabled = index === photos.length - 1;
    }

    photos.forEach((photo, index) => photo.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        opener = photo;
        showPhoto(index);
        photoViewer.showModal();
    }));
    previous.addEventListener('click', () => showPhoto(current - 1));
    next.addEventListener('click', () => showPhoto(current + 1));
    photoViewer.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') showPhoto(current - 1);
        if (event.key === 'ArrowRight') showPhoto(current + 1);
    });
    photoViewer.addEventListener('close', () => opener?.focus());
}

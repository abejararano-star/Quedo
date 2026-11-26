const mapSection = document.querySelector('[data-quedo-map]');

if (mapSection && window.L) {
    const canvas = mapSection.querySelector('[data-map-canvas]');
    const message = mapSection.querySelector('[data-map-message]');
    const locationMessage = mapSection.querySelector('[data-map-location]');
    const locate = mapSection.querySelector('[data-map-locate]');

    mapSection.querySelector('[data-map-stage]').hidden = false;
    const map = L.map(canvas, { scrollWheelZoom: false }).setView([5.689, -76.654], 14);
    const tiles = L.tileLayer(canvas.dataset.tiles, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
    tiles.on('tileerror', () => {
        message.textContent = 'Algunas calles del mapa no cargaron. Puedes explorar las estadías desde la lista.';
    });
    tiles.addTo(map);

    for (const zone of mapSection.querySelectorAll('[data-map-zone]')) {
        const name = zone.querySelector('strong').textContent;
        const coordinates = [Number(zone.dataset.latitude), Number(zone.dataset.longitude)];
        const icon = L.divIcon({
            className: 'quedo-map-pin',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -13],
        });
        L.marker(coordinates, { icon, title: name, alt: name })
            .bindPopup(zone.cloneNode(true))
            .addTo(map)
            .getElement().setAttribute('aria-label', name);
    }

    let currentLocation;
    locate.addEventListener('click', () => {
        if (!navigator.geolocation || !window.isSecureContext) {
            locationMessage.textContent = 'Usa una conexión segura para compartir tu ubicación.';
            return;
        }
        locate.disabled = true;
        locationMessage.textContent = 'Buscando tu ubicación…';
        navigator.geolocation.getCurrentPosition(({ coords }) => {
            const point = [coords.latitude, coords.longitude];
            currentLocation?.remove();
            currentLocation = L.circleMarker(point, { radius: 8, color: '#102c42', fillOpacity: 0.8 })
                .addTo(map)
                .bindTooltip('Mi ubicación');
            map.setView(point, 15);
            locationMessage.textContent = 'Tu ubicación se muestra en el mapa.';
            locate.disabled = false;
        }, () => {
            locationMessage.textContent = 'No pudimos obtener tu ubicación. Revisa los permisos del navegador.';
            locate.disabled = false;
        }, { timeout: 10000, maximumAge: 60000 });
    });
}

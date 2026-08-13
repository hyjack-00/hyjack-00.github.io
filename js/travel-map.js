/**
 * Lightweight travel map. Markers are rendered immediately and do not wait for tiles.
 */

let travelMap;
let mapInitializationStarted = false;

function createPopupContent(city) {
    const popup = document.createElement('div');
    popup.className = 'travel-popup';

    const title = document.createElement('strong');
    title.textContent = city.name;
    popup.appendChild(title);

    const region = city.province || city.country;
    if (region) {
        const location = document.createElement('span');
        location.textContent = region;
        popup.appendChild(location);
    }

    if (city.home) {
        const hometown = document.createElement('span');
        hometown.className = 'travel-popup-home';
        hometown.textContent = 'Hometown';
        popup.appendChild(hometown);
    }

    return popup;
}

function initTravelMap(cities) {
    const container = document.getElementById('travel-map');
    if (!container || mapInitializationStarted || !Array.isArray(cities) || cities.length === 0) return;

    mapInitializationStarted = true;
    container.setAttribute('aria-busy', 'true');

    try {
        travelMap = L.map(container, {
            scrollWheelZoom: false,
            zoomControl: true,
            attributionControl: true
        });

        const bounds = L.latLngBounds();
        cities.forEach(city => {
            const marker = L.circleMarker([city.lat, city.lng], {
                radius: city.home ? 8 : 6,
                fillColor: city.home ? '#dc2626' : '#eab308',
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.95
            }).addTo(travelMap);

            marker.bindTooltip(city.name, { direction: 'top', offset: [0, -8] });
            marker.bindPopup(createPopupContent(city));
            bounds.extend([city.lat, city.lng]);
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            subdomains: 'abcd',
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(travelMap);

        travelMap.fitBounds(bounds, { padding: [44, 44], maxZoom: 5, animate: false });
    } catch (error) {
        console.error('Failed to initialize travel map:', error);
        container.textContent = 'Travel map is temporarily unavailable.';
    } finally {
        container.removeAttribute('aria-busy');
    }
}

document.addEventListener('content:loaded', event => {
    const cities = event.detail?.travel?.cities;
    if (cities) initTravelMap(cities);
});

if (window.siteContentData?.travel?.cities) {
    initTravelMap(window.siteContentData.travel.cities);
}

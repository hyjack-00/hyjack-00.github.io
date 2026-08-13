/**
 * Travel map: one unclustered GeoJSON source and one circle layer.
 */

const MAPLIBRE_ASSETS = {
    css: '/css/vendor/maplibre-gl.css',
    js: '/js/vendor/maplibre-gl.js'
};

let travelCities = [];
let map;
let mapLoadPromise;
let mapInitializationStarted = false;

function loadMapLibre() {
    if (window.maplibregl) return Promise.resolve();
    if (mapLoadPromise) return mapLoadPromise;

    const stylesheet = new Promise((resolve, reject) => {
        const existing = document.querySelector(`link[rel="stylesheet"][href="${MAPLIBRE_ASSETS.css}"]`);
        if (existing) {
            if (existing.sheet) resolve();
            else {
                existing.addEventListener('load', resolve, { once: true });
                existing.addEventListener('error', reject, { once: true });
            }
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = MAPLIBRE_ASSETS.css;
        link.onload = resolve;
        link.onerror = () => reject(new Error('Failed to load MapLibre styles'));
        document.head.appendChild(link);
    });

    const script = new Promise((resolve, reject) => {
        const element = document.createElement('script');
        element.src = MAPLIBRE_ASSETS.js;
        element.onload = resolve;
        element.onerror = () => reject(new Error('Failed to load MapLibre'));
        document.head.appendChild(element);
    });

    mapLoadPromise = Promise.all([stylesheet, script]);
    return mapLoadPromise;
}

function createTravelGeoJSON(cities) {
    return {
        type: 'FeatureCollection',
        features: cities.map(city => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [city.lng, city.lat]
            },
            properties: {
                name: city.name,
                home: Boolean(city.home),
                region: city.province || city.country || ''
            }
        }))
    };
}

function queueTravelMap(cities) {
    travelCities = cities || [];
    const container = document.getElementById('travel-map');
    if (!container || mapInitializationStarted || travelCities.length === 0) return;

    const initialize = async () => {
        if (mapInitializationStarted) return;
        mapInitializationStarted = true;
        container.setAttribute('aria-busy', 'true');

        try {
            await loadMapLibre();
            initTravelMap(travelCities);
        } catch (error) {
            console.error('Failed to initialize travel map:', error);
            container.textContent = 'Travel map is temporarily unavailable.';
        } finally {
            container.removeAttribute('aria-busy');
        }
    };

    // Give the text one frame to paint, then start the local map runtime immediately.
    window.requestAnimationFrame(() => window.setTimeout(initialize, 0));
}

function initTravelMap(cities) {
    const geojson = createTravelGeoJSON(cities);

    map = new maplibregl.Map({
        container: 'travel-map',
        style: {
            version: 8,
            sources: {
                'carto-light': {
                    type: 'raster',
                    tiles: [
                        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                },
                'travel-cities': {
                    type: 'geojson',
                    data: geojson,
                    cluster: false
                }
            },
            layers: [
                {
                    id: 'carto-light-layer',
                    type: 'raster',
                    source: 'carto-light',
                    minzoom: 0,
                    maxzoom: 22
                },
                {
                    id: 'travel-cities-circles',
                    type: 'circle',
                    source: 'travel-cities',
                    paint: {
                        'circle-radius': [
                            'case',
                            ['boolean', ['get', 'home'], false],
                            8,
                            6
                        ],
                        'circle-color': [
                            'case',
                            ['boolean', ['get', 'home'], false],
                            '#dc2626',
                            '#eab308'
                        ],
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff',
                        'circle-opacity': 0.95
                    }
                }
            ]
        },
        center: [30, 31],
        zoom: 1.4,
        scrollZoom: true,
        attributionControl: true
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    fitMapToBounds();

    map.on('mouseenter', 'travel-cities-circles', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'travel-cities-circles', () => {
        map.getCanvas().style.cursor = '';
    });

    map.on('click', 'travel-cities-circles', event => {
        const feature = event.features && event.features[0];
        if (!feature) return;

        const coordinates = feature.geometry.coordinates.slice();
        const { name, region, home } = feature.properties;
        const popup = document.createElement('div');
        popup.className = 'travel-popup';

        const title = document.createElement('strong');
        title.textContent = name;
        popup.appendChild(title);

        if (region) {
            const location = document.createElement('span');
            location.textContent = region;
            popup.appendChild(location);
        }

        if (home) {
            const hometown = document.createElement('span');
            hometown.className = 'travel-popup-home';
            hometown.textContent = 'Hometown';
            popup.appendChild(hometown);
        }

        new maplibregl.Popup()
            .setLngLat(coordinates)
            .setDOMContent(popup)
            .addTo(map);
    });
}

function fitMapToBounds() {
    if (!map || travelCities.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    travelCities.forEach(city => bounds.extend([city.lng, city.lat]));
    map.fitBounds(bounds, {
        padding: { top: 44, bottom: 44, left: 44, right: 44 },
        maxZoom: 5,
        duration: 0
    });
}

document.addEventListener('content:loaded', event => {
    if (event.detail && event.detail.travel) {
        queueTravelMap(event.detail.travel.cities);
    }
});

if (window.siteContentData && window.siteContentData.travel) {
    queueTravelMap(window.siteContentData.travel.cities);
}

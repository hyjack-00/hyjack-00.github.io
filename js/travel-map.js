/**
 * Travel Map with MapLibre GL JS
 * Hierarchical zoom: World → China Provinces → Cities → Districts
 */

let travelCities = [];

const MAPLIBRE_ASSETS = {
    css: 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css',
    js: 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js'
};

// GeoJSON data URLs
const GEOJSON_SOURCES = {
    // China provinces (zoom 0-6)
    chinaProvinces: 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
    // World countries for context
    worldCountries: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
};

let map;
let mapLoadPromise;
let mapInitializationStarted = false;

function loadMapLibre() {
    if (window.maplibregl) return Promise.resolve();
    if (mapLoadPromise) return mapLoadPromise;

    const stylesheet = new Promise((resolve, reject) => {
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

function queueTravelMap(cities) {
    travelCities = cities || [];
    const container = document.getElementById('travel-map');
    if (!container || mapInitializationStarted) return;

    const initialize = async () => {
        if (mapInitializationStarted) return;
        mapInitializationStarted = true;
        container.setAttribute('aria-busy', 'true');

        try {
            await loadMapLibre();
            await initTravelMap(travelCities);
        } catch (error) {
            console.error('Failed to initialize travel map:', error);
            container.textContent = 'Travel map is temporarily unavailable.';
        } finally {
            container.removeAttribute('aria-busy');
        }
    };

    if (!('IntersectionObserver' in window)) {
        initialize();
        return;
    }

    const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
            observer.disconnect();
            initialize();
        }
    }, { rootMargin: '300px 0px' });

    observer.observe(container);
}

/**
 * Initialize the map
 */
async function initTravelMap(cities) {
    travelCities = cities || [];

    // Create map instance
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
                }
            },
            layers: [
                {
                    id: 'carto-light-layer',
                    type: 'raster',
                    source: 'carto-light',
                    minzoom: 0,
                    maxzoom: 22
                }
            ]
        },
        center: [110, 30],
        zoom: 3.5,
        scrollZoom: true,
        attributionControl: true
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Load data when map is ready
    map.on('load', () => {
        loadChinaBoundaries();
        addTravelMarkers();
        fitMapToBounds();
    });
}

/**
 * Load China province boundaries with hierarchical display
 */
async function loadChinaBoundaries() {
    try {
        const response = await fetch(GEOJSON_SOURCES.chinaProvinces);
        const data = await response.json();

        // Add source
        map.addSource('china-provinces', {
            type: 'geojson',
            data: data
        });

        // Add province fill layer (visible at lower zoom levels)
        map.addLayer({
            id: 'china-provinces-fill',
            type: 'fill',
            source: 'china-provinces',
            paint: {
                'fill-color': '#e0f2fe',
                'fill-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    3, 0.15,  // At zoom 3, 15% opacity
                    6, 0.1,   // At zoom 6, 10% opacity
                    8, 0      // At zoom 8+, invisible (cities take over)
                ]
            },
            minzoom: 3,
            maxzoom: 22
        });

        // Add province border layer
        map.addLayer({
            id: 'china-provinces-border',
            type: 'line',
            source: 'china-provinces',
            paint: {
                'line-color': '#0284c7',
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    3, 1,     // At zoom 3, 1px width
                    6, 1.5,   // At zoom 6, 1.5px width
                    8, 0.5    // At zoom 8+, thinner (less prominent)
                ],
                'line-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    3, 0.6,   // At zoom 3, 60% opacity
                    6, 0.5,   // At zoom 6, 50% opacity
                    8, 0.2    // At zoom 8+, 20% opacity (cities take over)
                ]
            },
            minzoom: 3,
            maxzoom: 22
        });

        // Load city-level boundaries for specific provinces
        loadDetailedCityBoundaries();

    } catch (error) {
        console.error('Error loading China boundaries:', error);
    }
}

/**
 * Load detailed city boundaries for provinces with visited cities
 * This shows more detail when zoomed in
 */
async function loadDetailedCityBoundaries() {
    // Get unique provinces from visited cities
    const visitedProvinces = new Set(
        travelCities
            .filter(c => c.province)
            .map(c => c.province)
    );

    // Province name to code mapping (DataV GeoAtlas codes)
    const provinceCodeMap = {
        'Guangdong': '440000',
        'Beijing': '110000',
        'Shanghai': '310000',
        'Hubei': '420000',
        'Jiangxi': '360000',
        'Guangxi': '450000',
        'Fujian': '350000',
        'Hunan': '430000',
        'Anhui': '340000',
        'Shandong': '370000',
        'Tibet': '540000',
        'Qinghai': '630000',
        'Sichuan': '510000',
        'Gansu': '620000',
        'Zhejiang': '330000',
        'Hong Kong': '810000',
        'Macau': '820000'
    };

    // Load city boundaries for visited provinces
    for (const province of visitedProvinces) {
        const code = provinceCodeMap[province];
        if (code) {
            try {
                const url = `https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json`;
                const response = await fetch(url);
                const data = await response.json();

                const sourceId = `cities-${province}`;

                map.addSource(sourceId, {
                    type: 'geojson',
                    data: data
                });

                // City fill layer (visible at higher zoom)
                map.addLayer({
                    id: `${sourceId}-fill`,
                    type: 'fill',
                    source: sourceId,
                    paint: {
                        'fill-color': '#fef3c7',
                        'fill-opacity': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            6, 0,      // Invisible below zoom 6
                            7, 0.15,   // Fade in at zoom 7
                            10, 0.1    // Slight transparency at high zoom
                        ]
                    },
                    minzoom: 6,
                    maxzoom: 22
                });

                // City border layer
                map.addLayer({
                    id: `${sourceId}-border`,
                    type: 'line',
                    source: sourceId,
                    paint: {
                        'line-color': '#d97706',
                        'line-width': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            6, 0.5,    // Thin at zoom 6
                            8, 1,      // Medium at zoom 8
                            10, 1.5    // Thicker at high zoom
                        ],
                        'line-opacity': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            6, 0,      // Invisible below zoom 6
                            7, 0.4,    // Fade in
                            10, 0.6    // More visible at high zoom
                        ]
                    },
                    minzoom: 6,
                    maxzoom: 22
                });
            } catch (error) {
                console.warn(`Could not load cities for ${province}:`, error);
            }
        }
    }
}

/**
 * Add travel city markers
 */
function addTravelMarkers() {
    // Convert cities to GeoJSON
    const geojson = {
        type: 'FeatureCollection',
        features: travelCities.map(city => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [city.lng, city.lat]
            },
            properties: {
                name: city.name,
                home: city.home || false,
                province: city.province || '',
                country: city.country || '',
                city: city.city || city.name
            }
        }))
    };

    // Add source
    map.addSource('travel-cities', {
        type: 'geojson',
        data: geojson
    });

    // Add circle markers
    map.addLayer({
        id: 'travel-cities-circles',
        type: 'circle',
        source: 'travel-cities',
        paint: {
            'circle-radius': [
                'case',
                ['get', 'home'],
                8,  // Hometown: bigger
                6   // Visited: smaller
            ],
            'circle-color': [
                'case',
                ['get', 'home'],
                '#dc2626',  // Hometown: red
                '#eab308'   // Visited: yellow
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9
        }
    });

    // Add labels (visible at higher zoom)
    map.addLayer({
        id: 'travel-cities-labels',
        type: 'symbol',
        source: 'travel-cities',
        layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Regular'],
            'text-size': 12,
            'text-offset': [0, 1.2],
            'text-anchor': 'top'
        },
        paint: {
            'text-color': '#1f2937',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
            'text-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                4, 0,    // Invisible at low zoom
                5, 0.7,  // Fade in
                6, 1     // Full opacity at zoom 6+
            ]
        },
        minzoom: 4
    });

    // Add hover effect
    map.on('mouseenter', 'travel-cities-circles', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'travel-cities-circles', () => {
        map.getCanvas().style.cursor = '';
    });

    // Add click popup
    map.on('click', 'travel-cities-circles', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const { name, province, country, home } = e.features[0].properties;
        const region = province || country || '';

        const description = `
            <div style="font-family: 'Lato', sans-serif;">
                <strong style="font-size: 14px;">${name}</strong>
                ${region ? `<br><span style="color: #6b7280; font-size: 12px;">${region}</span>` : ''}
                ${home ? '<br><span style="color: #dc2626; font-size: 12px;">🏠 Hometown</span>' : ''}
            </div>
        `;

        new maplibregl.Popup()
            .setLngLat(coordinates)
            .setHTML(description)
            .addTo(map);
    });
}

/**
 * Fit map to show all travel cities
 */
function fitMapToBounds() {
    const bounds = new maplibregl.LngLatBounds();

    travelCities.forEach(city => {
        bounds.extend([city.lng, city.lat]);
    });

    map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 5
    });
}

// Initialize the map once content data is ready (single fetch via content-renderer)
document.addEventListener('content:loaded', (e) => {
    if (e.detail && e.detail.travel) {
        queueTravelMap(e.detail.travel.cities);
    }
});

if (window.siteContentData && window.siteContentData.travel) {
    queueTravelMap(window.siteContentData.travel.cities);
}

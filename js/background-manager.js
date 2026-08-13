const BACKGROUND_MANIFEST_URL = '/data/backgrounds.json';
const BACKGROUND_TRANSITION_MS = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600;

let backgroundScrollPosition = 0;
let backgroundTransitionTimer;

function parseBackgroundFilename(filename) {
    const basename = filename.replace(/\.[^.]+$/, '');
    const parts = basename.split('__');
    if (parts.length !== 4 || !/^\d+$/.test(parts[0])) return null;

    const [order, title, artist, encodedLink] = parts;
    const href = `https://${encodedLink.replace(/-/g, '/')}`;

    try {
        const url = new URL(href);
        return {
            order: Number(order),
            title,
            artist,
            href: url.href,
            displayLink: `${url.host}${url.pathname === '/' ? '' : url.pathname}`
        };
    } catch (error) {
        console.warn(`Invalid background link in ${filename}`, error);
        return null;
    }
}

function renderBackgroundCredit(background) {
    const credit = document.querySelector('.background-credit');
    if (!credit) return;

    const details = parseBackgroundFilename(background.file);
    if (!details) {
        credit.textContent = 'Artwork information unavailable.';
        return;
    }

    credit.replaceChildren();
    credit.append(`Artwork #${details.order}: "${details.title}" by ${details.artist} · `);

    const link = document.createElement('a');
    link.href = details.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = details.displayLink;
    credit.appendChild(link);
}

async function loadActiveBackground() {
    try {
        const response = await fetch(BACKGROUND_MANIFEST_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const manifest = await response.json();
        const [background] = manifest.backgrounds || [];
        if (!background) throw new Error('Background manifest is empty');

        const imageUrl = `/images/backgrounds/${encodeURIComponent(background.file)}`;
        document.documentElement.style.setProperty('--active-background-image', `url("${imageUrl}")`);
        renderBackgroundCredit(background);
    } catch (error) {
        console.error('Failed to load the active background:', error);
        const credit = document.querySelector('.background-credit');
        if (credit) credit.textContent = 'Artwork information unavailable.';
    }
}

function lockBackgroundControl(button, overlay) {
    const rect = button.getBoundingClientRect();
    const top = `${rect.top}px`;
    const left = `${rect.left}px`;

    button.style.setProperty('--control-top', top);
    button.style.setProperty('--control-left', left);
    overlay.style.setProperty('--control-top', top);
    overlay.style.setProperty('--control-left', left);
    document.body.appendChild(button);
    button.classList.add('is-locked');
}

function showFullBackground() {
    const openButton = document.querySelector('.background-open-button');
    const closeButton = document.querySelector('.background-close-button');
    const overlay = document.getElementById('backgroundOverlay');
    const main = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');
    if (!openButton || !closeButton || !overlay || !main || !sidebar) return;

    window.clearTimeout(backgroundTransitionTimer);
    backgroundScrollPosition = window.scrollY;
    lockBackgroundControl(openButton, overlay);
    document.body.classList.add('is-background-view');
    openButton.setAttribute('aria-expanded', 'true');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');

    window.requestAnimationFrame(() => {
        main.classList.add('is-background-hidden');
        sidebar.classList.add('is-background-hidden');
    });

    backgroundTransitionTimer = window.setTimeout(() => {
        openButton.classList.add('is-replaced');
        overlay.classList.add('controls-ready');
        closeButton.focus({ preventScroll: true });
    }, BACKGROUND_TRANSITION_MS);
}

function hideFullBackground() {
    const openButton = document.querySelector('.background-open-button');
    const overlay = document.getElementById('backgroundOverlay');
    const main = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');
    if (!openButton || !overlay || !main || !sidebar) return;

    window.clearTimeout(backgroundTransitionTimer);
    overlay.classList.remove('controls-ready');
    openButton.classList.remove('is-replaced');
    main.classList.remove('is-background-hidden');
    sidebar.classList.remove('is-background-hidden');
    window.scrollTo({ top: backgroundScrollPosition, behavior: 'auto' });

    backgroundTransitionTimer = window.setTimeout(() => {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        document.querySelector('.background-control-slot')?.appendChild(openButton);
        openButton.classList.remove('is-locked');
        openButton.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('is-background-view');
        openButton.focus({ preventScroll: true });
    }, BACKGROUND_TRANSITION_MS);
}

document.querySelector('.background-open-button')?.addEventListener('click', showFullBackground);
document.querySelector('.background-close-button')?.addEventListener('click', hideFullBackground);

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.getElementById('backgroundOverlay')?.classList.contains('active')) {
        hideFullBackground();
    }
});

loadActiveBackground();

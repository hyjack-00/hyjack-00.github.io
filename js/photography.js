(() => {
    const gallery = document.getElementById('photoGallery');
    const lightbox = document.getElementById('photoLightbox');
    const albumGrid = document.querySelector('.photo-gallery-grid');
    const albumCards = document.querySelector('#photography .photo-grid');
    if (!gallery || !lightbox || !albumGrid || !albumCards) return;

    const title = document.querySelector('.photo-gallery-heading h2');
    const description = document.querySelector('.photo-gallery-description');
    const lightboxImage = document.querySelector('.photo-lightbox-image');
    const lightboxTitle = document.querySelector('.photo-lightbox-title');
    const lightboxMeta = document.querySelector('.photo-lightbox-meta');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let albums = [];
    let activeAlbum = null;
    let activePhotoIndex = -1;
    let lastAlbumFocus = null;
    let lastLightboxFocus = null;

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function safeImageUrl(value) {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        return /^(?:https?:\/\/|\/)/i.test(trimmed) ? trimmed : '';
    }

    function imageAttributes(photo) {
        const dimensions = Number.isInteger(photo.width) && Number.isInteger(photo.height) &&
            photo.width > 0 && photo.height > 0
            ? ` width="${photo.width}" height="${photo.height}"`
            : '';
        return dimensions;
    }

    function albumCover(album) {
        return safeImageUrl(album.cover) || safeImageUrl(album.photos?.[0]?.thumbnail || album.photos?.[0]?.src);
    }

    function renderAlbumCards() {
        if (!albums.length) {
            albumCards.innerHTML = '<div class="photo-empty"><i class="fas fa-images" aria-hidden="true"></i><span>No albums yet.</span></div>';
            return;
        }

        albumCards.innerHTML = albums.map(album => {
            const cover = albumCover(album);
            const coverMarkup = cover
                ? `<img src="${escapeHtml(cover)}" alt="" loading="lazy" decoding="async">`
                : '<span class="photo-album-placeholder"><i class="fas fa-images" aria-hidden="true"></i></span>';
            const count = album.photos.length;
            return `
                <button class="photo-album-card" type="button" data-album-id="${escapeHtml(album.id)}" aria-label="Open ${escapeHtml(album.title)} album">
                    <span class="photo-album-cover">${coverMarkup}</span>
                    <span class="photo-album-copy">
                        <strong>${escapeHtml(album.title)}</strong>
                        <span>${escapeHtml(album.description)}</span>
                        <small>${count} ${count === 1 ? 'photograph' : 'photographs'}</small>
                    </span>
                    <i class="fas fa-arrow-up-right-from-square photo-album-arrow" aria-hidden="true"></i>
                </button>
            `;
        }).join('');
    }

    function renderPhotoGrid() {
        const photos = activeAlbum?.photos || [];
        if (!photos.length) {
            albumGrid.innerHTML = '<div class="photo-empty photo-empty--gallery"><i class="fas fa-images" aria-hidden="true"></i><span>No photographs yet.</span></div>';
            return;
        }

        albumGrid.innerHTML = photos.map((photo, index) => {
            const thumbnail = safeImageUrl(photo.thumbnail) || safeImageUrl(photo.src);
            if (!thumbnail) return '';
            const label = photo.alt || photo.title || `Photograph ${index + 1}`;
            const dimensions = imageAttributes(photo);
            return `
                <button class="photo-thumb" type="button" data-photo-index="${index}" aria-label="Open ${escapeHtml(label)}">
                    <img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(label)}"${dimensions} loading="lazy" decoding="async">
                </button>
            `;
        }).join('');
    }

    function setPhotoHash(albumId) {
        history.pushState({}, '', `${window.location.pathname}${window.location.search}#photography/${encodeURIComponent(albumId)}`);
    }

    function clearPhotoHash() {
        history.replaceState({}, '', `${window.location.pathname}${window.location.search}#photography`);
    }

    function openAlbum(albumId, { updateHash = true, focus = true } = {}) {
        const nextAlbum = albums.find(item => item.id === albumId);
        if (!nextAlbum) return;

        activeAlbum = nextAlbum;
        activePhotoIndex = -1;
        title.textContent = nextAlbum.title;
        description.textContent = nextAlbum.description;
        renderPhotoGrid();
        gallery.classList.add('active');
        gallery.setAttribute('aria-hidden', 'false');
        document.body.classList.add('is-photo-gallery-open');
        if (updateHash) setPhotoHash(nextAlbum.id);
        if (focus) window.setTimeout(() => document.querySelector('.photo-gallery-back')?.focus(), reducedMotion ? 0 : 160);
    }

    function closeLightbox({ restoreFocus = true } = {}) {
        if (!lightbox.classList.contains('active')) return;
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');
        lightboxImage.removeAttribute('src');
        activePhotoIndex = -1;
        if (restoreFocus) lastLightboxFocus?.focus({ preventScroll: true });
    }

    function openLightbox(index) {
        const photo = activeAlbum?.photos?.[index];
        const source = safeImageUrl(photo?.src);
        if (!photo || !source) return;

        activePhotoIndex = index;
        lastLightboxFocus = document.activeElement;
        lightboxImage.src = source;
        lightboxImage.alt = photo.alt || photo.title || '';
        lightboxTitle.textContent = photo.title || 'Untitled';
        lightboxMeta.textContent = [photo.location, photo.date].filter(Boolean).join(' · ');
        document.querySelector('.photo-lightbox-prev').disabled = index === 0;
        document.querySelector('.photo-lightbox-next').disabled = index === activeAlbum.photos.length - 1;
        lightbox.classList.add('active');
        lightbox.setAttribute('aria-hidden', 'false');
        window.setTimeout(() => document.querySelector('.photo-lightbox-close')?.focus(), reducedMotion ? 0 : 80);
    }

    function closeAlbum({ clearHash = true, restoreFocus = true } = {}) {
        closeLightbox({ restoreFocus: false });
        gallery.classList.remove('active');
        gallery.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('is-photo-gallery-open');
        if (clearHash) clearPhotoHash();
        if (restoreFocus) lastAlbumFocus?.focus({ preventScroll: true });
        activeAlbum = null;
    }

    function movePhoto(step) {
        if (!activeAlbum) return;
        const nextIndex = activePhotoIndex + step;
        if (nextIndex >= 0 && nextIndex < activeAlbum.photos.length) openLightbox(nextIndex);
    }

    function handleRoute() {
        const match = window.location.hash.match(/^#photography\/([^/]+)$/);
        if (match) {
            openAlbum(decodeURIComponent(match[1]), { updateHash: false, focus: false });
        } else if (gallery.classList.contains('active')) {
            closeAlbum({ clearHash: false });
        }
    }

    albumCards.addEventListener('click', event => {
        const button = event.target.closest('[data-album-id]');
        if (!button) return;
        lastAlbumFocus = button;
        openAlbum(button.dataset.albumId);
    });

    albumGrid.addEventListener('click', event => {
        const button = event.target.closest('[data-photo-index]');
        if (button) openLightbox(Number(button.dataset.photoIndex));
    });

    document.querySelector('.photo-gallery-back')?.addEventListener('click', () => closeAlbum());
    document.querySelector('.photo-gallery-close')?.addEventListener('click', () => closeAlbum());
    document.querySelector('.photo-lightbox-close')?.addEventListener('click', () => closeLightbox());
    document.querySelector('.photo-lightbox-prev')?.addEventListener('click', () => movePhoto(-1));
    document.querySelector('.photo-lightbox-next')?.addEventListener('click', () => movePhoto(1));
    gallery.addEventListener('click', event => {
        if (event.target === gallery) closeAlbum();
    });
    lightbox.addEventListener('click', event => {
        if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        } else if (event.key === 'Escape' && gallery.classList.contains('active')) {
            closeAlbum();
        } else if (lightbox.classList.contains('active') && event.key === 'ArrowLeft') {
            movePhoto(-1);
        } else if (lightbox.classList.contains('active') && event.key === 'ArrowRight') {
            movePhoto(1);
        }
    });
    window.addEventListener('popstate', handleRoute);
    window.addEventListener('hashchange', handleRoute);

    window.photoGallery = {
        render(nextAlbums) {
            albums = Array.isArray(nextAlbums) ? nextAlbums : [];
            renderAlbumCards();
            handleRoute();
        }
    };
})();

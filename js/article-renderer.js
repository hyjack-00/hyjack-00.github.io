function normalizeArticlePath(value) {
    const pathname = new URL(value, window.location.origin).pathname;
    return decodeURIComponent(pathname).replace(/\/+$/, '');
}

function showArticleError(message) {
    const card = document.querySelector('.article-card');
    const error = document.querySelector('.article-error');
    if (card) card.setAttribute('aria-busy', 'false');
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
}

function prepareLegacyArticle(sourceBody) {
    const articleBody = sourceBody.cloneNode(true);

    articleBody.querySelectorAll('script, style, .headerlink').forEach(element => element.remove());
    articleBody.querySelectorAll('img').forEach(image => {
        if (image.dataset.src) image.src = image.dataset.src;
        image.removeAttribute('data-src');
        image.removeAttribute('lazyload');
        image.loading = 'lazy';
        image.decoding = 'async';
    });
    articleBody.querySelectorAll('a[target="_blank"]').forEach(link => {
        link.rel = 'noopener noreferrer';
    });
    articleBody.querySelectorAll('.fa-regular').forEach(icon => {
        icon.classList.replace('fa-regular', 'fas');
    });

    return articleBody;
}

function renderArticleNavigation(posts, currentIndex) {
    const navigation = document.querySelector('.article-navigation');
    const newerLink = document.querySelector('.article-navigation-newer');
    const olderLink = document.querySelector('.article-navigation-older');
    const newer = posts[currentIndex - 1];
    const older = posts[currentIndex + 1];
    if (!navigation || !newerLink || !olderLink) return;

    if (newer) {
        newerLink.href = newer.url;
        newerLink.innerHTML = `<span>Newer</span><strong><i class="fas fa-arrow-left" aria-hidden="true"></i>${newer.title}</strong>`;
        newerLink.hidden = false;
    } else {
        newerLink.hidden = true;
    }

    if (older) {
        olderLink.href = older.url;
        olderLink.innerHTML = `<span>Older</span><strong>${older.title}<i class="fas fa-arrow-right" aria-hidden="true"></i></strong>`;
        olderLink.hidden = false;
    } else {
        olderLink.hidden = true;
    }

    navigation.hidden = !newer && !older;
}

async function renderArticle(content) {
    const currentPath = normalizeArticlePath(window.location.pathname);
    const posts = content.blog || [];
    const currentIndex = posts.findIndex(post => normalizeArticlePath(post.url) === currentPath);
    const post = posts[currentIndex];

    if (!post) {
        showArticleError('Article metadata was not found.');
        return;
    }

    document.title = `${post.title} - Yujie Huang`;
    document.querySelector('.article-category').textContent = post.category || 'Blog';
    document.querySelector('.article-title-heading').textContent = post.title;
    const published = document.querySelector('.article-published');
    published.dateTime = post.date;
    published.innerHTML = `<i class="fas fa-calendar-days" aria-hidden="true"></i>${post.date}`;

    try {
        const response = await fetch(post.source);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const legacyDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
        const sourceBody = legacyDocument.querySelector('.article-content.markdown-body');
        if (!sourceBody) throw new Error('Article body is missing');

        const articleBody = document.querySelector('.article-body');
        articleBody.replaceChildren(...prepareLegacyArticle(sourceBody).childNodes);
        document.querySelector('.article-card').setAttribute('aria-busy', 'false');
        renderArticleNavigation(posts, currentIndex);
    } catch (error) {
        console.error('Failed to render article:', error);
        showArticleError('The article could not be loaded. Please return to the blog and try again.');
    }
}

if (window.siteContentData) {
    renderArticle(window.siteContentData);
} else {
    document.addEventListener('content:loaded', event => renderArticle(event.detail), { once: true });
    document.addEventListener('content:error', () => {
        showArticleError('The site content could not be loaded. Please refresh the page.');
    }, { once: true });
}

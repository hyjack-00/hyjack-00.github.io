/**
 * Content Renderer - Load and render page content from JSON
 */

let contentData = null;

/**
 * Load content data from JSON
 */
async function loadContent() {
    try {
        const response = await fetch('/data/content.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        contentData = await response.json();
        renderAllContent();
        // Hand travel data to the map (single fetch, no race)
        if (typeof initTravelMap === 'function') {
            initTravelMap(contentData.travel.cities);
        }
    } catch (error) {
        console.error('Failed to load content:', error);
        renderFallback();
    }
}

/**
 * Show a visible error when content fails to load
 */
function renderFallback() {
    const message = '⚠️ Failed to load content — please refresh the page.';
    document.querySelectorAll('section.content-card').forEach(section => {
        section.querySelectorAll('p, .news-item').forEach(el => {
            if (el.textContent.trim() === 'Loading...') {
                el.textContent = message;
            }
        });
    });
}

/**
 * Render all content sections
 */
function renderAllContent() {
    renderProfile();
    renderAbout();
    renderEducation();
    renderHonors();
    renderStats();
    renderNews();
    renderPublications();
    renderService();
    renderPhotography();
    renderFooter();
}

/**
 * Render profile section (sidebar)
 */
function renderProfile() {
    const { profile } = contentData;

    // Profile image
    document.querySelector('.profile-img').src = profile.avatar;
    document.querySelector('.profile-img').alt = profile.name.en;

    // Profile name
    document.querySelector('.profile-name').innerHTML =
        `${profile.name.en}<br><span lang="zh" style="font-size:1.1rem;font-weight:400">${profile.name.zh}</span>`;

    // Title and affiliation
    document.querySelector('.profile-title').textContent = profile.title;
    document.querySelector('.profile-affiliation').textContent = profile.affiliation;

    // Links
    const linksContainer = document.querySelector('.profile-links');
    linksContainer.innerHTML = `
        <a href="mailto:${profile.email}" title="Email"><i class="fas fa-envelope"></i></a>
        <a href="https://github.com/${profile.github}" target="_blank" rel="noopener noreferrer" title="GitHub"><i class="fab fa-github"></i></a>
        <a href="${profile.scholar}" target="_blank" rel="noopener noreferrer" title="Google Scholar"><i class="fas fa-graduation-cap"></i></a>
    `;
}

/**
 * Render about section
 */
function renderAbout() {
    const aboutSection = document.querySelector('section.content-card');
    aboutSection.querySelector('p').innerHTML = contentData.about.text;
}

/**
 * Render education section
 */
function renderEducation() {
    const eduContainer = document.querySelector('.sidebar-section');
    const eduHTML = contentData.education.map(edu => `
        <div class="sidebar-edu">
            <strong>${edu.institution}</strong><br>
            <span>${edu.degree}, ${edu.period}</span>
        </div>
    `).join('');

    eduContainer.innerHTML = `
        <h3><i class="fas fa-graduation-cap"></i> Education</h3>
        ${eduHTML}
    `;
}

/**
 * Render honors section
 */
function renderHonors() {
    const honorSection = document.querySelectorAll('.sidebar-section')[1];
    const honorsHTML = contentData.honors.map(honor => `
        <div class="sidebar-award"><strong>${honor.year}</strong> ${honor.title}</div>
    `).join('');

    honorSection.innerHTML = `
        <h3><i class="fas fa-award"></i> Honors</h3>
        ${honorsHTML}
    `;
}

/**
 * Render stats section
 */
function renderStats() {
    const statsContainer = document.querySelector('.sidebar-stats');
    statsContainer.innerHTML = `
        <div class="stat-item">
            <span class="stat-number">${contentData.stats.papers}</span>
            <span class="stat-label">Papers</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">${contentData.stats.cities}</span>
            <span class="stat-label">Cities</span>
        </div>
    `;
}

/**
 * Render news section
 */
function renderNews() {
    const newsSection = document.querySelectorAll('section.content-card')[1];
    const newsHTML = contentData.news.map(item => `
        <li class="news-item">
            <span class="news-date">${item.date}</span> ${item.icon} ${item.text}
        </li>
    `).join('');

    newsSection.innerHTML = `
        <h2><i class="fas fa-bullhorn"></i> News</h2>
        <ul class="news-list">${newsHTML}</ul>
    `;
}

/**
 * Render publications section
 */
function renderPublications() {
    const pubSection = document.querySelectorAll('section.content-card')[2];

    // Group publications by year
    const pubsByYear = {};
    contentData.publications.forEach(pub => {
        if (!pubsByYear[pub.year]) {
            pubsByYear[pub.year] = [];
        }
        pubsByYear[pub.year].push(pub);
    });

    // Sort years descending
    const years = Object.keys(pubsByYear).sort((a, b) => b - a);

    // Generate HTML
    const pubHTML = years.map(year => {
        const yearPubs = pubsByYear[year].map(pub => {
            // Generate links
            const links = Object.entries(pub.links).map(([key, url]) => {
                const icons = {
                    paper: 'fas fa-file-pdf',
                    arxiv: 'fas fa-link',
                    code: 'fab fa-github',
                    slides: 'fas fa-presentation',
                    video: 'fas fa-video'
                };
                const icon = icons[key] || 'fas fa-link';
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                return `<a href="${url}" class="pub-btn" target="_blank" rel="noopener noreferrer"><i class="${icon}"></i> ${label}</a>`;
            }).join('');

            // Venue style
            const venueStyle = pub.venueStyle ?
                `style="background:${pub.venueStyle.background};color:${pub.venueStyle.color};border-color:${pub.venueStyle.borderColor}"` :
                '';

            // Venue full name
            const venueFullName = pub.venueFull || '';
            const venueFullHTML = venueFullName ? `<p class="pub-venue">${venueFullName}</p>` : '';

            // Location (optional)
            const location = pub.location ?
                `<span class="pub-location"><i class="fas fa-map-marker-alt"></i> ${pub.location}<br>${pub.date}</span>` :
                '';

            return `
                <div class="pub-item">
                    <div class="pub-main">
                        <h3 class="pub-title">${pub.title}</h3>
                        <p class="pub-authors">${pub.authors.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
                        ${venueFullHTML}
                        <div class="pub-links">${links}</div>
                    </div>
                    <div class="pub-side">
                        <div class="pub-conference" ${venueStyle}><i class="fas fa-calendar"></i> ${pub.venue}</div>
                        ${location}
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="pub-year">${year}</div>${yearPubs}`;
    }).join('');

    pubSection.innerHTML = `
        <h2><i class="fas fa-book"></i> Publications</h2>
        ${pubHTML}
    `;
}

/**
 * Render academic service section
 */
function renderService() {
    const serviceSection = document.querySelectorAll('section.content-card')[3];
    const { service } = contentData;
    serviceSection.innerHTML = `
        <h2><i class="fas fa-users"></i> Academic Service</h2>
        <p><strong>${service.title}:</strong> ${service.detail}</p>
    `;
}

/**
 * Render photography section
 */
function renderPhotography() {
    const photoSection = document.querySelectorAll('section.content-card')[5];
    const photoHTML = contentData.photography.map(item => `
        <div class="photo-card ${item.class}">
            <i class="fas ${item.icon} fa-2x"></i>
            <div class="card-title">${item.title}</div>
            <div class="card-count">${item.description}</div>
        </div>
    `).join('');

    photoSection.innerHTML = `
        <h2><i class="fas fa-camera"></i> Photography</h2>
        <div class="photo-grid">${photoHTML}</div>
    `;
}

/**
 * Render footer
 */
function renderFooter() {
    const footer = document.querySelector('.sidebar-footer');
    footer.innerHTML = `
        <p>${contentData.footer.copyright}</p>
        <p>Last updated: ${contentData.footer.lastUpdated}</p>
    `;
}

// Load content when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadContent);
} else {
    loadContent();
}

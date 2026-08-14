import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = path.join(root, 'templates/article.html');
const manifestPath = path.join(root, 'data/blogs.json');
const checkOnly = process.argv.includes('--check');
const requiredMetadata = ['title', 'date', 'category', 'excerpt'];

const markdown = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false
});

const defaultImageRenderer = markdown.renderer.rules.image
    ?? ((tokens, index, options, environment, renderer) => renderer.renderToken(tokens, index, options));

function imageDisplayScale(token) {
    return token.attrGet('title')?.match(/^display:zoom-(\d{1,3})$/)?.[1] || null;
}

markdown.renderer.rules.image = (tokens, index, options, environment, renderer) => {
    const displayScale = imageDisplayScale(tokens[index]);
    if (displayScale) {
        tokens[index].attrSet('style', `zoom:${displayScale}%`);
        const titleIndex = tokens[index].attrIndex('title');
        if (titleIndex >= 0) tokens[index].attrs.splice(titleIndex, 1);
    }
    tokens[index].attrSet('loading', 'lazy');
    tokens[index].attrSet('decoding', 'async');
    return defaultImageRenderer(tokens, index, options, environment, renderer);
};

const defaultLinkRenderer = markdown.renderer.rules.link_open
    ?? ((tokens, index, options, environment, renderer) => renderer.renderToken(tokens, index, options));

markdown.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
    const href = tokens[index].attrGet('href') || '';
    if (/^https?:\/\//i.test(href)) {
        tokens[index].attrSet('target', '_blank');
        tokens[index].attrSet('rel', 'noopener noreferrer');
        tokens[index].attrJoin('class', 'link');
        const closingToken = tokens.slice(index + 1).find(token => token.type === 'link_close');
        if (closingToken) closingToken.meta = { ...closingToken.meta, externalLink: true };
    }
    return defaultLinkRenderer(tokens, index, options, environment, renderer);
};

markdown.renderer.rules.link_close = (tokens, index, options, environment, renderer) => {
    const icon = tokens[index].meta?.externalLink
        ? ' <i class="fas fa-arrow-up-right-from-square fa-sm" aria-hidden="true"></i>'
        : '';
    return `${icon}${renderer.renderToken(tokens, index, options)}`;
};

markdown.core.ruler.push('stable_heading_ids', state => {
    const seen = new Map();
    for (let index = 0; index < state.tokens.length; index += 1) {
        const token = state.tokens[index];
        if (token.type !== 'heading_open') continue;
        const heading = state.tokens[index + 1]?.content?.trim() || 'section';
        const base = heading.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]/gu, '') || 'section';
        const occurrence = seen.get(base) || 0;
        seen.set(base, occurrence + 1);
        token.attrSet('id', occurrence ? `${base}-${occurrence}` : base);
    }
});

markdown.core.ruler.push('standalone_scaled_images', state => {
    for (let index = 1; index < state.tokens.length - 1; index += 1) {
        const inline = state.tokens[index];
        if (inline.type !== 'inline' || inline.children?.length !== 1 ||
            inline.children[0].type !== 'image' || !imageDisplayScale(inline.children[0])) continue;
        if (state.tokens[index - 1].type === 'paragraph_open' &&
            state.tokens[index + 1].type === 'paragraph_close') {
            state.tokens[index - 1].hidden = true;
            state.tokens[index + 1].hidden = true;
        }
    }
});

function renderCodeBlock(token) {
    const language = token.info.trim() || 'plaintext';
    const label = language === 'cpp'
        ? 'Cpp'
        : language === 'sh'
            ? 'Sh'
            : language === 'yaml'
                ? 'Yaml'
                : language.charAt(0).toUpperCase() + language.slice(1);
    const code = token.content.replace(/\n$/, '');
    const lineNumbers = code.split('\n').map((_line, index) => index + 1).join('\n');

    return `<div class="highlight-container" data-rel="${escapeHtml(label)}"><figure class="article-highlight highlight ${escapeHtml(language)}"><table><tbody><tr><td class="gutter"><pre><code>${lineNumbers}</code></pre></td><td class="code"><pre><code class="language-${escapeHtml(language)}">${escapeHtml(code)}</code></pre></td></tr></tbody></table></figure></div>\n`;
}

markdown.renderer.rules.fence = (tokens, index) => renderCodeBlock(tokens[index]);
markdown.renderer.rules.code_block = (tokens, index) => renderCodeBlock(tokens[index]);

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function articleUrl(sourcePath) {
    const relativeDirectory = path.relative(root, path.dirname(sourcePath));
    return `/${relativeDirectory.split(path.sep).map(encodeURIComponent).join('/')}/`;
}

async function findMarkdownSources(directory) {
    const sources = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            sources.push(...await findMarkdownSources(entryPath));
        } else if (entry.isFile() && entry.name === 'index.md') {
            sources.push(entryPath);
        }
    }
    return sources;
}

async function findGeneratedArticlePages(directory) {
    const pages = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            pages.push(...await findGeneratedArticlePages(entryPath));
        } else if (entry.isFile() && entry.name === 'index.html') {
            pages.push(entryPath);
        }
    }
    return pages;
}

async function loadPosts() {
    const yearDirectories = (await fs.readdir(root, { withFileTypes: true }))
        .filter(entry => entry.isDirectory() && /^\d{4}$/.test(entry.name))
        .map(entry => path.join(root, entry.name));
    const sourcePaths = (await Promise.all(yearDirectories.map(findMarkdownSources))).flat();
    const sourceDirectories = new Set(sourcePaths.map(sourcePath => path.dirname(sourcePath)));
    const generatedPages = (await Promise.all(yearDirectories.map(findGeneratedArticlePages))).flat();
    for (const generatedPage of generatedPages) {
        if (!sourceDirectories.has(path.dirname(generatedPage))) {
            throw new Error(`Orphaned generated article: ${path.relative(root, generatedPage)}; remove its complete article directory`);
        }
    }

    const posts = await Promise.all(sourcePaths.map(async sourcePath => {
        const source = await fs.readFile(sourcePath, 'utf8');
        const parsed = matter(source);
        const relativeSource = path.relative(root, sourcePath);
        const directoryParts = path.relative(root, path.dirname(sourcePath)).split(path.sep);
        if (directoryParts.length !== 4 || !/^\d{4}$/.test(directoryParts[0]) ||
            !/^\d{2}$/.test(directoryParts[1]) || !/^\d{2}$/.test(directoryParts[2]) ||
            !directoryParts[3]) {
            throw new Error(`${relativeSource} must use YYYY/MM/DD/slug/index.md`);
        }
        const unknownMetadata = Object.keys(parsed.data).filter(key => !requiredMetadata.includes(key));
        if (unknownMetadata.length) {
            throw new Error(`${relativeSource} has unknown metadata: ${unknownMetadata.join(', ')}`);
        }
        for (const key of requiredMetadata) {
            if (typeof parsed.data[key] !== 'string' || !parsed.data[key].trim()) {
                throw new Error(`${relativeSource} is missing string metadata: ${key}`);
            }
            parsed.data[key] = parsed.data[key].trim();
        }
        const parsedDate = new Date(`${parsed.data.date}T00:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.date) || Number.isNaN(parsedDate.valueOf()) ||
            parsedDate.toISOString().slice(0, 10) !== parsed.data.date) {
            throw new Error(`${relativeSource} has an invalid date`);
        }

        const directoryDate = directoryParts.slice(0, 3).join('-');
        if (directoryDate !== parsed.data.date) {
            throw new Error(`${relativeSource} date does not match its directory`);
        }
        if (!parsed.content.trim()) {
            throw new Error(`${relativeSource} has an empty article body`);
        }

        const tokens = markdown.parse(parsed.content, {});
        const imageSources = tokens
            .filter(token => token.type === 'inline')
            .flatMap(token => token.children || [])
            .filter(token => token.type === 'image')
            .map(token => token.attrGet('src'))
            .filter(source => source && !/^(?:https?:|data:|#)/i.test(source));
        for (const imageSource of imageSources) {
            if (imageSource.startsWith('/')) {
                throw new Error(`${relativeSource} must use a co-located relative image: ${imageSource}`);
            }
            let cleanSource;
            try {
                cleanSource = decodeURIComponent(imageSource.split(/[?#]/, 1)[0]);
            } catch {
                throw new Error(`${relativeSource} has a malformed image path: ${imageSource}`);
            }
            const articleDirectory = path.dirname(sourcePath);
            const imagePath = path.resolve(articleDirectory, cleanSource);
            if (imagePath !== articleDirectory && !imagePath.startsWith(`${articleDirectory}${path.sep}`)) {
                throw new Error(`${relativeSource} image escapes its article directory: ${imageSource}`);
            }
            try {
                const imageStat = await fs.stat(imagePath);
                if (!imageStat.isFile()) throw new Error('not a file');
            } catch {
                throw new Error(`${relativeSource} references a missing image: ${imageSource}`);
            }
        }

        return {
            ...Object.fromEntries(requiredMetadata.map(key => [key, parsed.data[key]])),
            url: articleUrl(sourcePath),
            sourcePath,
            body: markdown.render(parsed.content)
        };
    }));

    const urls = new Set();
    for (const post of posts) {
        if (urls.has(post.url)) throw new Error(`Duplicate article URL: ${post.url}`);
        urls.add(post.url);
    }

    return posts.sort((left, right) =>
        right.date.localeCompare(left.date) || left.url.localeCompare(right.url, 'en'));
}

function renderNavigation(posts, index) {
    const newer = posts[index - 1];
    const older = posts[index + 1];
    if (!newer && !older) return '';

    const newerLink = newer
        ? `<a class="article-navigation-link article-navigation-newer" href="${newer.url}"><span>Newer</span><strong><i class="fas fa-arrow-left" aria-hidden="true"></i>${escapeHtml(newer.title)}</strong></a>`
        : '';
    const olderLink = older
        ? `<a class="article-navigation-link article-navigation-older" href="${older.url}"><span>Older</span><strong>${escapeHtml(older.title)}<i class="fas fa-arrow-right" aria-hidden="true"></i></strong></a>`
        : '';

    return `<nav class="article-navigation" aria-label="Blog post navigation">${newerLink}${olderLink}</nav>`;
}

function renderArticle(template, posts, index) {
    const post = posts[index];
    const replacements = {
        '{{ARTICLE_TITLE}}': escapeHtml(post.title),
        '{{ARTICLE_DESCRIPTION}}': escapeHtml(post.excerpt),
        '{{ARTICLE_CATEGORY}}': escapeHtml(post.category),
        '{{ARTICLE_DATE}}': escapeHtml(post.date),
        '{{ARTICLE_NAVIGATION}}': renderNavigation(posts, index)
    };

    let output = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
        output = output.split(placeholder).join(value);
    }
    return output.replace('{{ARTICLE_BODY}}', post.body.trim());
}

async function ensureFile(filePath, expected) {
    let current = null;
    try {
        current = await fs.readFile(filePath, 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    if (current === expected) return false;
    if (checkOnly) throw new Error(`Generated file is stale: ${path.relative(root, filePath)}`);
    await fs.writeFile(filePath, expected);
    return true;
}

const template = await fs.readFile(templatePath, 'utf8');
const posts = await loadPosts();
if (!posts.length) throw new Error('No blog index.md files were found');

let changed = 0;
for (const [index, post] of posts.entries()) {
    const outputPath = path.join(path.dirname(post.sourcePath), 'index.html');
    const articleHtml = renderArticle(template, posts, index);
    if (await ensureFile(outputPath, articleHtml)) changed += 1;
}

const manifest = {
    posts: posts.map(({ title, date, category, excerpt, url }) => ({
        date,
        title,
        excerpt,
        category,
        url
    }))
};
if (await ensureFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)) changed += 1;

console.log(checkOnly
    ? `Verified ${posts.length} Markdown article pages and the blog manifest.`
    : `Generated ${posts.length} Markdown article pages (${changed} files updated).`);

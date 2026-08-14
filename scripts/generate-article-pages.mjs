import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const content = JSON.parse(await fs.readFile(path.join(root, 'data/content.json'), 'utf8'));
const template = await fs.readFile(path.join(root, 'templates/article.html'), 'utf8');

for (const post of content.blog || []) {
    const relativeUrl = decodeURIComponent(new URL(post.url, 'https://local.test').pathname).replace(/^\/+/, '');
    const outputDirectory = path.resolve(root, relativeUrl);

    if (!outputDirectory.startsWith(`${root}${path.sep}`)) {
        throw new Error(`Article path escapes the repository: ${post.url}`);
    }

    await fs.mkdir(outputDirectory, { recursive: true });
    await fs.writeFile(path.join(outputDirectory, 'index.html'), template);
}

console.log(`Generated ${content.blog.length} article pages.`);

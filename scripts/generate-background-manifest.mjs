import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const backgroundDirectory = path.join(root, 'images', 'backgrounds');
const outputFile = path.join(root, 'data', 'backgrounds.json');
const imagePattern = /\.(?:avif|gif|jpe?g|png|webp)$/i;
const files = (await readdir(backgroundDirectory)).filter(file => imagePattern.test(file));
const backgrounds = files.map(file => {
    const extension = path.extname(file);
    const parts = file.slice(0, -extension.length).split('__');
    if (parts.length !== 4 || !/^\d+$/.test(parts[0]) || parts.slice(1).some(part => !part)) {
        throw new Error(`Invalid background filename: ${file}\nExpected: number__title__artist__domain-path.ext`);
    }
    return { file, order: Number(parts[0]) };
}).sort((a, b) => a.order - b.order || a.file.localeCompare(b.file, 'en', { numeric: true }));

if (backgrounds.length === 0) throw new Error('No background images found');

await writeFile(outputFile, `${JSON.stringify({ backgrounds }, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outputFile)} with ${backgrounds.length} backgrounds.`);

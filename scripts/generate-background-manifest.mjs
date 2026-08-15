import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const backgroundDirectory = path.join(root, 'images', 'backgrounds');
const outputFile = path.join(root, 'data', 'backgrounds.json');
const imagePattern = /\.(?:avif|gif|jpe?g|png|webp)$/i;
const checkOnly = process.argv.includes('--check');

const manifest = JSON.parse(await readFile(outputFile, 'utf8'));
if (typeof manifest.use !== 'string' || !manifest.use) {
    throw new Error('Background manifest must define a non-empty "use" filename');
}
if (!Array.isArray(manifest.others) || manifest.others.some(file => typeof file !== 'string' || !file)) {
    throw new Error('Background manifest must define an array of non-empty "others" filenames');
}

const orderedFiles = [manifest.use, ...manifest.others];
const uniqueFiles = new Set(orderedFiles);
if (uniqueFiles.size !== orderedFiles.length) {
    throw new Error('Background manifest contains duplicate filenames');
}

const diskFiles = (await readdir(backgroundDirectory)).filter(file => imagePattern.test(file));
if (diskFiles.length === 0) throw new Error('No background images found');

const missingFiles = orderedFiles.filter(file => !diskFiles.includes(file));
const unlistedFiles = diskFiles.filter(file => !uniqueFiles.has(file));
if (missingFiles.length || unlistedFiles.length) {
    const missingMessage = missingFiles.length ? ` Missing files: ${missingFiles.join(', ')}.` : '';
    const unlistedMessage = unlistedFiles.length ? ` Unlisted files: ${unlistedFiles.join(', ')}.` : '';
    throw new Error(`Background manifest does not match images/backgrounds.${missingMessage}${unlistedMessage}`);
}

for (const file of diskFiles) {
    const extension = path.extname(file);
    const parts = file.slice(0, -extension.length).split('__');
    if (parts.length !== 3 || /^\d+__/.test(file) || parts.some(part => !part)) {
        throw new Error(`Invalid background filename: ${file}\nExpected: title__artist__domain-path.ext`);
    }
}

if (!checkOnly) {
    await writeFile(outputFile, `${JSON.stringify({ use: manifest.use, others: manifest.others }, null, 2)}\n`);
}

console.log(`${checkOnly ? 'Validated' : 'Saved'} ${path.relative(root, outputFile)} with ${orderedFiles.length} backgrounds.`);

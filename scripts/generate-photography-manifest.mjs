import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imageRoot = path.join(root, 'images', 'photography');
const uploadRoot = path.join(imageRoot, 'upload');
const manifestPath = path.join(root, 'data', 'photography.json');
const checkOnly = process.argv.includes('--check');
const imageExtensions = /\.(?:avif|gif|jpe?g|png|webp)$/i;
const originalLimit = 500_000;
const thumbnailLimit = 100_000;
const albumDefaults = [
    { id: 'faraway', title: 'Faraway', description: 'Landscapes and fragments from farther away.' },
    { id: 'local', title: 'Local', description: 'Small scenes, familiar streets, and nearby days.' }
];

function publicPath(...parts) {
    return `/${parts.map(part => encodeURIComponent(part)).join('/')}`;
}

function photoId(filename) {
    return filename.replace(/\.[^.]+$/, '');
}

function isThumbnail(filename) {
    return /-thumb\.[^.]+$/i.test(filename);
}

function basePhotoId(filename) {
    return photoId(filename).replace(/-thumb$/i, '');
}

async function readManifest() {
    return JSON.parse(await fs.readFile(manifestPath, 'utf8'));
}

async function readImageEntries(directory, { excludeThumbnails = false } = {}) {
    try {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        return entries.filter(entry => entry.isFile() && imageExtensions.test(entry.name) &&
            (!excludeThumbnails || !isThumbnail(entry.name)));
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

async function readUploadEntries(directory) {
    const entries = [];

    async function visit(currentDirectory, folderName = path.basename(directory)) {
        let children;
        try {
            children = await fs.readdir(currentDirectory, { withFileTypes: true });
        } catch (error) {
            if (error.code === 'ENOENT') return;
            throw error;
        }

        for (const child of children) {
            const childPath = path.join(currentDirectory, child.name);
            if (child.isDirectory()) {
                await visit(childPath, child.name);
            } else if (child.isFile() && imageExtensions.test(child.name) && !isThumbnail(child.name)) {
                entries.push({ name: child.name, path: childPath, folderName });
            }
        }
    }

    await visit(directory);
    return entries;
}

function assertUniquePhotoIds(entries, directory) {
    const ids = new Set();
    for (const entry of entries) {
        const id = basePhotoId(entry.name);
        if (ids.has(id)) {
            throw new Error(`Duplicate source photo ID in ${path.relative(root, directory)}: ${id}`);
        }
        ids.add(id);
    }
}

async function encodeWebp(inputPath, maxWidth, quality) {
    return sharp(inputPath, { failOn: 'none' })
        .rotate()
        .resize({ width: maxWidth, height: maxWidth, fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toBuffer();
}

async function encodeUnderLimit(inputPath, limit, widths) {
    const qualities = [82, 74, 66, 58, 50, 42, 34, 26, 20];
    for (const width of widths) {
        for (const quality of qualities) {
            const buffer = await encodeWebp(inputPath, width, quality);
            if (buffer.length <= limit) return buffer;
        }
    }
    throw new Error(`Unable to compress image below ${limit} bytes: ${path.relative(root, inputPath)}`);
}

async function writeBufferAtomically(outputPath, buffer) {
    const temporaryPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
    try {
        await fs.writeFile(temporaryPath, buffer);
        await fs.rename(temporaryPath, outputPath);
    } finally {
        await fs.rm(temporaryPath, { force: true });
    }
}

async function compressSource(entry) {
    const inputPath = entry.path;
    const outputName = `${basePhotoId(entry.name)}.webp`;
    const outputPath = path.join(path.dirname(inputPath), outputName);
    const buffer = await encodeUnderLimit(inputPath, originalLimit, [3200, 2800, 2400, 2000, 1600, 1200, 1000, 800, 640]);
    await writeBufferAtomically(outputPath, buffer);
    if (inputPath !== outputPath) await fs.rm(inputPath, { force: true });
    console.log(`Compressed ${path.relative(root, inputPath)} -> ${path.relative(root, outputPath)} (${buffer.length} bytes)`);
}

async function generateThumbnail(sourcePath, thumbnailPath) {
    const buffer = await encodeUnderLimit(sourcePath, thumbnailLimit, [1600, 1400, 1200, 1000, 800, 640, 480]);
    await writeBufferAtomically(thumbnailPath, buffer);
    console.log(`Generated ${path.relative(root, thumbnailPath)} (${buffer.length} bytes)`);
}

async function prepareUpload(albumDirectory, uploadDirectory) {
    let uploadEntries = await readUploadEntries(uploadDirectory);
    assertUniquePhotoIds(uploadEntries, uploadDirectory);

    for (const entry of uploadEntries) {
        const sourcePath = entry.path;
        const sourceStat = await fs.stat(sourcePath);
        if (sourceStat.size > originalLimit) {
            if (checkOnly) {
                throw new Error(`Source photo exceeds 500 KB: ${path.relative(root, sourcePath)}; run npm run build:photography`);
            }
            await compressSource(entry);
        }
    }

    uploadEntries = await readUploadEntries(uploadDirectory);
    assertUniquePhotoIds(uploadEntries, uploadDirectory);
    await fs.mkdir(albumDirectory, { recursive: true });
    const albumImages = await readImageEntries(albumDirectory);
    const thumbnails = new Set(albumImages.filter(entry => isThumbnail(entry.name)).map(entry => basePhotoId(entry.name)));

    for (const entry of uploadEntries) {
        const id = basePhotoId(entry.name);
        if (thumbnails.has(id)) continue;

        const sourcePath = entry.path;
        const thumbnailPath = path.join(albumDirectory, `${id}-thumb.webp`);
        if (checkOnly) {
            throw new Error(`Missing thumbnail for ${path.relative(root, sourcePath)}; run npm run build:photography`);
        }
        await generateThumbnail(sourcePath, thumbnailPath);
    }
}

async function scanAlbum(album) {
    const albumDirectory = path.join(imageRoot, album.id);
    const uploadDirectory = path.join(uploadRoot, album.id);
    await prepareUpload(albumDirectory, uploadDirectory);

    const imageEntries = await readImageEntries(albumDirectory);
    const thumbnails = new Map(imageEntries.filter(entry => isThumbnail(entry.name))
        .map(entry => [basePhotoId(entry.name), entry.name]));
    const uploadEntries = await readUploadEntries(uploadDirectory);
    const photos = [];

    for (const [id, thumbnailName] of thumbnails) {
        const thumbnailPath = path.join(albumDirectory, thumbnailName);
        const thumbnailStat = await fs.stat(thumbnailPath);
        if (thumbnailStat.size > thumbnailLimit) {
            throw new Error(`Thumbnail exceeds 100 KB: ${path.relative(root, thumbnailPath)} (${thumbnailStat.size} bytes)`);
        }

        const original = uploadEntries.find(entry => basePhotoId(entry.name) === id);
        if (original) {
            const originalPath = original.path;
            const originalStat = await fs.stat(originalPath);
            if (originalStat.size > originalLimit) {
                throw new Error(`Original photo exceeds 500 KB: ${path.relative(root, originalPath)} (${originalStat.size} bytes)`);
            }
        }

        photos.push({
            id,
            thumbnailName,
            src: null,
            thumbnail: publicPath('images', 'photography', album.id, thumbnailName),
            title: id,
            alt: original?.folderName || album.title
        });
    }

    for (const original of uploadEntries) {
        const id = basePhotoId(original.name);
        const originalPath = original.path;
        const originalStat = await fs.stat(originalPath);
        if (originalStat.size > originalLimit) {
            throw new Error(`Original photo exceeds 500 KB: ${path.relative(root, originalPath)} (${originalStat.size} bytes)`);
        }
        if (!thumbnails.has(id)) {
            throw new Error(`Upload has no matching thumbnail: ${path.relative(root, originalPath)}`);
        }
    }

    return photos.sort((left, right) => left.thumbnailName.localeCompare(right.thumbnailName, 'en', { numeric: true }));
}

function mergePhoto(existing, scanned, fallbackTitle) {
    const { thumbnailName, src, ...localPaths } = scanned;
    const merged = {
        ...existing,
        ...localPaths,
        id: scanned.id,
        title: existing.title || scanned.title || fallbackTitle,
        alt: existing.alt || scanned.alt || existing.title || fallbackTitle
    };
    if (!Object.prototype.hasOwnProperty.call(existing, 'src')) merged.src = src;
    return merged;
}

const current = await readManifest();
const currentAlbums = new Map((current.albums || []).map(album => [album.id, album]));
const albums = [];

for (const defaults of albumDefaults) {
    const existing = currentAlbums.get(defaults.id) || {};
    const scannedPhotos = await scanAlbum(defaults);
    const existingPhotos = new Map((existing.photos || []).map(photo => [photo.id, photo]));
    const localIds = new Set(scannedPhotos.map(photo => photo.id));
    const localPhotos = scannedPhotos.map((photo, index) => mergePhoto(
        existingPhotos.get(photo.id) || {},
        photo,
        `${defaults.title} ${String(index + 1).padStart(2, '0')}`
    ));
    const remoteOnlyPhotos = (existing.photos || []).filter(photo => !localIds.has(photo.id));
    const photos = [...localPhotos, ...remoteOnlyPhotos];

    albums.push({
        ...existing,
        ...defaults,
        cover: existing.cover ?? (photos[0]?.thumbnail || null),
        photos
    });
}

const next = `${JSON.stringify({ albums }, null, 2)}\n`;
const currentText = await fs.readFile(manifestPath, 'utf8');
if (currentText !== next) {
    if (checkOnly) throw new Error('Photography manifest is stale; run npm run build:photography');
    await fs.writeFile(manifestPath, next);
}

console.log(`${checkOnly ? 'Verified' : 'Generated'} photography manifest (${albums.reduce((total, album) => total + album.photos.length, 0)} photos).`);

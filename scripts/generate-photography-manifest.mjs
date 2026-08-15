import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function scanAlbum(album) {
    const albumDirectory = path.join(imageRoot, album.id);
    const uploadDirectory = path.join(uploadRoot, album.id);
    let entries;
    try {
        entries = await fs.readdir(albumDirectory, { withFileTypes: true });
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }

    const imageEntries = entries.filter(entry => entry.isFile() && imageExtensions.test(entry.name));
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
            const originalPath = path.join(uploadDirectory, original.name);
            const originalStat = await fs.stat(originalPath);
            if (originalStat.size > originalLimit) {
                throw new Error(`Original photo exceeds 500 KB: ${path.relative(root, originalPath)} (${originalStat.size} bytes)`);
            }
        }

        photos.push({
            id,
            thumbnailName,
            src: null,
            thumbnail: publicPath('images', 'photography', album.id, thumbnailName)
        });
    }

    for (const original of uploadEntries) {
        const id = basePhotoId(original.name);
        const originalPath = path.join(uploadDirectory, original.name);
        const originalStat = await fs.stat(originalPath);
        if (originalStat.size > originalLimit) {
            throw new Error(`Original photo exceeds 500 KB: ${path.relative(root, originalPath)} (${originalStat.size} bytes)`);
        }
        if (!thumbnails.has(id)) {
            throw new Error(`Upload has no matching thumbnail: ${path.relative(root, originalPath)}; expected ${id}-thumb.*`);
        }
    }

    return photos.sort((left, right) => left.thumbnailName.localeCompare(right.thumbnailName, 'en', { numeric: true }));
}

async function readUploadEntries(directory) {
    try {
        return (await fs.readdir(directory, { withFileTypes: true }))
            .filter(entry => entry.isFile() && imageExtensions.test(entry.name));
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

function mergePhoto(existing, scanned, fallbackTitle) {
    const { thumbnailName, ...localPaths } = scanned;
    return {
        ...existing,
        ...localPaths,
        id: scanned.id,
        title: existing.title || fallbackTitle,
        alt: existing.alt || existing.title || fallbackTitle
    };
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

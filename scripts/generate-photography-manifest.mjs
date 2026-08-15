import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import exifr from 'exifr';
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

async function pathExists(inputPath) {
    try {
        await fs.access(inputPath);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
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

    async function visit(currentDirectory, folderName = null) {
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
            throw new Error(
                `Duplicate source photo ID in ${path.relative(root, directory)}: ${id}; ` +
                'keep only one source extension for each ID'
            );
        }
        ids.add(id);
    }
}

async function encodeWebp(inputPath, maxWidth, quality, { preserveMetadata = false } = {}) {
    let pipeline = sharp(inputPath, { failOn: 'none' })
        .rotate()
        .resize({ width: maxWidth, height: maxWidth, fit: 'inside', withoutEnlargement: true });
    if (preserveMetadata) pipeline = pipeline.withMetadata();
    return pipeline.webp({ quality, effort: 4 }).toBuffer();
}

async function readCaptureTime(inputPath) {
    const metadata = await exifr.parse(inputPath, {
        pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate'],
        reviveValues: false
    }).catch(() => null);
    const value = metadata?.DateTimeOriginal || metadata?.CreateDate || metadata?.ModifyDate;
    if (typeof value === 'string') {
        const match = value.match(/^(\d{4})[:/-](\d{2})[:/-](\d{2})/);
        if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return null;
}

async function encodeUnderLimit(inputPath, limit, widths, options = {}) {
    const qualities = [82, 74, 66, 58, 50, 42, 34, 26, 20];
    for (const width of widths) {
        for (const quality of qualities) {
            const buffer = await encodeWebp(inputPath, width, quality, options);
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
    const buffer = await encodeUnderLimit(
        inputPath,
        originalLimit,
        [3200, 2800, 2400, 2000, 1600, 1200, 1000, 800, 640],
        { preserveMetadata: true }
    );
    await writeBufferAtomically(outputPath, buffer);
    if (inputPath !== outputPath) await fs.rm(inputPath, { force: true });
    console.log(`Compressed ${path.relative(root, inputPath)} -> ${path.relative(root, outputPath)} (${buffer.length} bytes)`);
}

async function generateThumbnail(sourcePath, thumbnailPath) {
    const buffer = await encodeUnderLimit(sourcePath, thumbnailLimit, [1600, 1400, 1200, 1000, 800, 640, 480]);
    await writeBufferAtomically(thumbnailPath, buffer);
    console.log(`Generated ${path.relative(root, thumbnailPath)} (${buffer.length} bytes)`);
}

async function fingerprintFile(inputPath) {
    const buffer = await fs.readFile(inputPath);
    return createHash('sha256').update(buffer).digest('hex').slice(0, 16);
}

async function hasEmbeddedSourceMetadata(inputPath) {
    const metadata = await sharp(inputPath, { failOn: 'none' }).metadata();
    return Boolean(metadata.exif || metadata.xmp || metadata.iptc);
}

async function prepareUpload(albumDirectory, uploadDirectory, existingPhotos) {
    let uploadEntries = await readUploadEntries(uploadDirectory);
    assertUniquePhotoIds(uploadEntries, uploadDirectory);
    const captureTimes = new Map();

    for (const entry of uploadEntries) {
        const sourcePath = entry.path;
        const captureTime = await readCaptureTime(sourcePath);
        if (captureTime) captureTimes.set(basePhotoId(entry.name), captureTime);
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
    const sourceFingerprints = new Map();
    await fs.mkdir(albumDirectory, { recursive: true });
    const albumImages = await readImageEntries(albumDirectory);
    const thumbnails = new Map(albumImages.filter(entry => isThumbnail(entry.name))
        .map(entry => [basePhotoId(entry.name), entry]));

    for (const entry of uploadEntries) {
        const id = basePhotoId(entry.name);
        const sourcePath = entry.path;
        const thumbnailPath = path.join(albumDirectory, `${id}-thumb.webp`);
        const thumbnail = thumbnails.get(id);
        const sourceStat = await fs.stat(sourcePath);
        const thumbnailStat = thumbnail ? await fs.stat(path.join(albumDirectory, thumbnail.name)) : null;
        const sourceFingerprint = await fingerprintFile(sourcePath);
        sourceFingerprints.set(id, sourceFingerprint);
        const previousFingerprint = existingPhotos.get(id)?.sourceFingerprint;
        const sourceChanged = previousFingerprint
            ? previousFingerprint !== sourceFingerprint
            : Boolean(thumbnailStat && sourceStat.mtimeMs > thumbnailStat.mtimeMs);
        const thumbnailHasMetadata = thumbnailStat
            ? await hasEmbeddedSourceMetadata(path.join(albumDirectory, thumbnail.name))
            : false;
        if (thumbnailStat && !sourceChanged && !thumbnailHasMetadata) continue;

        if (checkOnly) {
            throw new Error(`Missing or stale thumbnail for ${path.relative(root, sourcePath)}; run npm run build:photography`);
        }
        await generateThumbnail(sourcePath, thumbnailPath);
    }

    return { uploadEntries, captureTimes, sourceFingerprints };
}

async function scanAlbum(album, existingPhotos) {
    const albumDirectory = path.join(imageRoot, album.id);
    const uploadDirectory = path.join(uploadRoot, album.id);
    const { uploadEntries, captureTimes, sourceFingerprints } = await prepareUpload(
        albumDirectory,
        uploadDirectory,
        existingPhotos
    );

    const imageEntries = await readImageEntries(albumDirectory);
    const thumbnails = new Map(imageEntries.filter(entry => isThumbnail(entry.name))
        .map(entry => [basePhotoId(entry.name), entry.name]));
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
            alt: original?.folderName || null,
            time: original ? captureTimes.get(id) || await readCaptureTime(original.path) : null,
            sourceFingerprint: original ? sourceFingerprints.get(id) : null
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
    const { thumbnailName, src, time, ...localPaths } = scanned;
    const merged = {
        ...existing,
        ...localPaths,
        id: scanned.id,
        title: existing.title || scanned.title || fallbackTitle,
        alt: scanned.alt || existing.alt || existing.title || fallbackTitle,
        time: time || existing.time || existing.date || null
    };
    if (!Object.prototype.hasOwnProperty.call(existing, 'src')) merged.src = src;
    return merged;
}

function comparePhotosDescending(left, right) {
    for (const key of ['alt', 'time', 'id']) {
        const result = String(right[key] || '').localeCompare(String(left[key] || ''), 'en', {
            numeric: true,
            sensitivity: 'base'
        });
        if (result) return result;
    }
    return 0;
}

const current = await readManifest();
const currentAlbums = new Map((current.albums || []).map(album => [album.id, album]));
const albums = [];

for (const defaults of albumDefaults) {
    const existing = currentAlbums.get(defaults.id) || {};
    const existingPhotos = new Map((existing.photos || []).map(photo => [photo.id, photo]));
    const scannedPhotos = await scanAlbum(defaults, existingPhotos);
    const localIds = new Set(scannedPhotos.map(photo => photo.id));
    const localPhotos = scannedPhotos.map((photo, index) => mergePhoto(
        existingPhotos.get(photo.id) || {},
        photo,
        `${defaults.title} ${String(index + 1).padStart(2, '0')}`
    ));
    const remoteOnlyPhotos = [];
    for (const photo of (existing.photos || []).filter(item => !localIds.has(item.id))) {
        const hasRemoteThumbnail = /^https:\/\//i.test(photo.oss?.thumbnail || '');
        const localThumbnailPath = typeof photo.thumbnail === 'string' && photo.thumbnail.startsWith('/')
            ? path.join(root, decodeURIComponent(photo.thumbnail).replace(/^\/+/, ''))
            : null;
        if (!hasRemoteThumbnail && (!localThumbnailPath || !await pathExists(localThumbnailPath))) {
            throw new Error(`Photography entry has no local or OSS thumbnail: ${defaults.id}/${photo.id}`);
        }
        remoteOnlyPhotos.push(photo);
    }
    const photos = [...localPhotos, ...remoteOnlyPhotos].sort(comparePhotosDescending);

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

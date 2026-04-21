const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// ────────────────────────────────────────────────
// Local fallback upload directory
// ────────────────────────────────────────────────
const LOCAL_UPLOAD_DIR = path.resolve(
  __dirname,
  '..',
  process.env.UPLOAD_DIR || 'uploads'
);

// Ensure the directory exists on module load
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

// ────────────────────────────────────────────────
// S3 helpers (optional — only used when S3 is configured AND reachable)
// ────────────────────────────────────────────────
let cachedClient;
let cachedSdk;

const getS3Sdk = () => {
  if (cachedSdk) {
    return cachedSdk;
  }

  try {
    cachedSdk = require('@aws-sdk/client-s3');
    return cachedSdk;
  } catch (sdkError) {
    return null; // SDK not installed → use local fallback
  }
};

const isS3Configured = () => {
  return !!(
    process.env.S3_REGION &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET &&
    process.env.CDN_DOMAIN
  );
};

const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`Missing required object storage configuration: ${name}`);
    error.statusCode = 500;
    throw error;
  }
  return value;
};

const normalizeBaseUrl = (value) => {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.endsWith('/') ? withProtocol : `${withProtocol}/`;
};

const encodeObjectKey = (objectKey) =>
  objectKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const buildObjectKey = (file) => {
  const prefix = (process.env.S3_UPLOAD_PREFIX || 'uploads').replace(/^\/+|\/+$/g, '');
  const extension = path.extname(file.originalname || '').toLowerCase();
  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;

  return prefix ? `${prefix}/${filename}` : filename;
};

const getS3Client = () => {
  if (cachedClient) {
    return cachedClient;
  }

  const sdk = getS3Sdk();
  if (!sdk) return null;

  const { S3Client } = sdk;

  cachedClient = new S3Client({
    region: getRequiredEnv('S3_REGION'),
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: getRequiredEnv('S3_ACCESS_KEY_ID'),
      secretAccessKey: getRequiredEnv('S3_SECRET_ACCESS_KEY'),
    },
  });

  return cachedClient;
};

const buildPublicFileUrl = (objectKey) => {
  const cdnDomain = getRequiredEnv('CDN_DOMAIN');
  return new URL(encodeObjectKey(objectKey), normalizeBaseUrl(cdnDomain)).toString();
};

// ────────────────────────────────────────────────
// Local fallback upload
// ────────────────────────────────────────────────
const uploadToLocal = (file) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const filePath = path.join(LOCAL_UPLOAD_DIR, filename);
  fs.writeFileSync(filePath, file.buffer);

  // Build a URL that the Express static middleware will serve
  const relativeUrl = `/uploads/${filename}`;
  const rawBaseUrl = (process.env.UPLOAD_BASE_URL || '').trim();
  const baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : '';

  return {
    key: `uploads/${filename}`,
    url: baseUrl ? `${baseUrl}${relativeUrl}` : relativeUrl,
  };
};

// ────────────────────────────────────────────────
// Main upload function – tries S3 first, falls back to local
// ────────────────────────────────────────────────
const uploadBufferToObjectStorage = async (file) => {
  if (!file || !file.buffer) {
    const error = new Error('Upload payload is missing file buffer data.');
    error.statusCode = 400;
    throw error;
  }

  // ── Try S3 when fully configured ──
  if (isS3Configured()) {
    const sdk = getS3Sdk();
    const client = getS3Client();

    if (sdk && client) {
      try {
        const { PutObjectCommand } = sdk;
        const bucket = getRequiredEnv('S3_BUCKET');
        const key = buildObjectKey(file);

        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        );

        return {
          key,
          url: buildPublicFileUrl(key),
        };
      } catch (s3Error) {
        console.warn('[ObjectStorage] S3 upload failed, falling back to local storage:', s3Error.message);
        // Fall through to local upload
      }
    }
  }

  // ── Fallback: save to local disk ──
  console.log('[ObjectStorage] Using local file storage fallback.');
  return uploadToLocal(file);
};

module.exports = {
  buildPublicFileUrl,
  uploadBufferToObjectStorage,
  LOCAL_UPLOAD_DIR,
};

const crypto = require('crypto');
const path = require('path');

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
    const error = new Error('Missing @aws-sdk/client-s3 dependency. Run npm install in smart-ja-web/server.');
    error.statusCode = 500;
    error.cause = sdkError;
    throw error;
  }
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

  const { S3Client } = getS3Sdk();

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

const uploadBufferToObjectStorage = async (file) => {
  if (!file || !file.buffer) {
    const error = new Error('Upload payload is missing file buffer data.');
    error.statusCode = 400;
    throw error;
  }

  const { PutObjectCommand } = getS3Sdk();
  const client = getS3Client();
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
};

module.exports = {
  buildPublicFileUrl,
  uploadBufferToObjectStorage,
};

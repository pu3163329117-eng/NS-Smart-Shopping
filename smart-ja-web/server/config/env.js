const DEFAULT_BODY_LIMIT = '1mb';
const DEFAULT_LOG_FORMAT = 'dev';
const SUPPORTED_LOG_FORMATS = new Set(['combined', 'common', 'dev', 'short', 'tiny', 'request-id']);

const parseCsv = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const parsePort = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    return fallback;
  }
  return parsed;
};

const parseTrustProxy = (value, isProduction) => {
  const raw = String(value ?? (isProduction ? '1' : '')).trim();

  if (!raw) return false;
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 0) {
    return numeric;
  }

  // Allow subnet names supported by Express, e.g. "loopback,linklocal,uniquelocal"
  return raw;
};

const looksLikePlaceholder = (value) => {
  const normalized = String(value || '').toLowerCase();
  return (
    !normalized ||
    normalized.includes('change_this') ||
    normalized.includes('your_super_secret') ||
    normalized.includes('your_secret') ||
    normalized.includes('replace_me')
  );
};

const resolveEnableSwagger = (isProduction) =>
  process.env.ENABLE_SWAGGER === 'true' ||
  (!isProduction && process.env.ENABLE_SWAGGER !== 'false');

const normalizeLogFormat = (value, isProduction) => {
  const candidate = String(value || '').trim();
  if (!candidate) {
    return isProduction ? 'combined' : DEFAULT_LOG_FORMAT;
  }
  if (SUPPORTED_LOG_FORMATS.has(candidate)) {
    return candidate;
  }
  return isProduction ? 'combined' : DEFAULT_LOG_FORMAT;
};

const loadEnv = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const corsAllowOrigins = parseCsv(process.env.CORS_ALLOW_ORIGINS);
  const allowAllCors = !isProduction && corsAllowOrigins.length === 0;
  const errors = [];

  const jwtSecret = process.env.JWT_SECRET || '';
  if (isProduction) {
    if (corsAllowOrigins.length === 0) {
      errors.push('CORS_ALLOW_ORIGINS is required in production.');
    }

    if (looksLikePlaceholder(jwtSecret) || jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be a strong random secret with at least 32 chars in production.');
    }
  }

  if (errors.length > 0) {
    const combined = errors.map((item) => `- ${item}`).join('\n');
    throw new Error(`[Config] Invalid environment configuration:\n${combined}`);
  }

  return {
    nodeEnv,
    isProduction,
    port: parsePort(process.env.PORT, 3002),
    bodyLimit: process.env.BODY_LIMIT || DEFAULT_BODY_LIMIT,
    logFormat: normalizeLogFormat(process.env.LOG_FORMAT, isProduction),
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY, isProduction),
    corsAllowOrigins,
    allowAllCors,
    enableSwagger: resolveEnableSwagger(isProduction),
  };
};

module.exports = loadEnv();

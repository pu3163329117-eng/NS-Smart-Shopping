let sentryInstance = null;
let sentryEnabled = false;
let sentryInitWarned = false;

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const loadSentry = () => {
  try {
    // Optional dependency: backend still runs if Sentry package is not installed.
    return require('@sentry/node');
  } catch (error) {
    if (!sentryInitWarned) {
      console.warn(
        '[Observability] SENTRY_DSN is configured but @sentry/node is missing. Install it to enable Sentry reporting.'
      );
      sentryInitWarned = true;
    }
    return null;
  }
};

const initObservability = () => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return { sentryEnabled: false };
  }

  const Sentry = loadSentry();
  if (!Sentry) {
    return { sentryEnabled: false };
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: toNumber(process.env.SENTRY_TRACES_SAMPLE_RATE, 0),
  });

  sentryInstance = Sentry;
  sentryEnabled = true;
  console.log('[Observability] Sentry enabled.');
  return { sentryEnabled: true };
};

const applyScopeData = (scope, context = {}) => {
  const { tags, extras, user } = context;
  if (tags && typeof tags === 'object') {
    Object.entries(tags).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        scope.setTag(key, String(value));
      }
    });
  }
  if (extras && typeof extras === 'object') {
    Object.entries(extras).forEach(([key, value]) => {
      if (value !== undefined) {
        scope.setExtra(key, value);
      }
    });
  }
  if (user && typeof user === 'object') {
    scope.setUser(user);
  }
};

const captureException = (error, context = {}) => {
  if (!sentryEnabled || !sentryInstance || !error) return;
  sentryInstance.withScope((scope) => {
    applyScopeData(scope, context);
    sentryInstance.captureException(error);
  });
};

const captureMessage = (message, level = 'info', context = {}) => {
  if (!sentryEnabled || !sentryInstance || !message) return;
  sentryInstance.withScope((scope) => {
    applyScopeData(scope, context);
    sentryInstance.captureMessage(message, level);
  });
};

module.exports = {
  initObservability,
  captureException,
  captureMessage,
  isSentryEnabled: () => sentryEnabled,
};

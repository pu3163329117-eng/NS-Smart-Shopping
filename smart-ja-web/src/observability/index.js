const API_URL = import.meta.env.VITE_API_URL || '/api';
const CLIENT_TELEMETRY_ENABLED = import.meta.env.VITE_CLIENT_TELEMETRY !== 'false';
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
const SENTRY_SAMPLE_RATE = Number(import.meta.env.VITE_SENTRY_SAMPLE_RATE || 0);
const telemetryEndpoint = `${API_URL.replace(/\/$/, '')}/monitor/client-error`;
let telemetryInitialized = false;

const trimText = (value, maxLength) => {
  const text = String(value || '');
  return text.length <= maxLength ? text : text.slice(0, maxLength);
};

const postTelemetry = (payload) => {
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon && body.length < 60_000) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(telemetryEndpoint, blob);
    return;
  }

  fetch(telemetryEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
};

const buildBasePayload = () => ({
  href: window.location.href,
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString(),
  locale: localStorage.getItem('locale') || 'zh',
});

const reportWindowError = (event) => {
  const message =
    event?.message ||
    event?.error?.message ||
    'Unknown client error';

  postTelemetry({
    source: 'window.error',
    message: trimText(message, 1000),
    stack: trimText(event?.error?.stack || '', 8000),
    ...buildBasePayload(),
  });
};

const reportUnhandledRejection = (event) => {
  const reason = event?.reason;
  const message =
    (reason && reason.message) ||
    (typeof reason === 'string' ? reason : JSON.stringify(reason || {})) ||
    'Unhandled rejection';

  postTelemetry({
    source: 'window.unhandledrejection',
    message: trimText(message, 1000),
    stack: trimText(reason?.stack || '', 8000),
    ...buildBasePayload(),
  });
};

const initClientTelemetry = () => {
  if (!CLIENT_TELEMETRY_ENABLED || telemetryInitialized) return;
  telemetryInitialized = true;
  window.addEventListener('error', reportWindowError);
  window.addEventListener('unhandledrejection', reportUnhandledRejection);
};

const initFrontendSentry = async (app, router) => {
  if (!SENTRY_DSN) return;

  try {
    const moduleName = '@sentry/vue';
    const sentryModule = await import(/* @vite-ignore */ moduleName);
    const Sentry = sentryModule?.default || sentryModule;
    if (!Sentry || typeof Sentry.init !== 'function') return;

    Sentry.init({
      app,
      dsn: SENTRY_DSN,
      environment: import.meta.env.MODE || 'development',
      tracesSampleRate: Number.isFinite(SENTRY_SAMPLE_RATE) ? SENTRY_SAMPLE_RATE : 0,
      integrations: [],
    });

    if (router && typeof router.afterEach === 'function' && typeof Sentry.addBreadcrumb === 'function') {
      router.afterEach((to) => {
        Sentry.addBreadcrumb({
          category: 'navigation',
          message: to.fullPath,
          level: 'info',
        });
      });
    }
  } catch (error) {
    console.warn('[Observability] Frontend Sentry initialization skipped:', error?.message || error);
  }
};

export const initFrontendObservability = (app, router) => {
  initClientTelemetry();
  void initFrontendSentry(app, router);
};

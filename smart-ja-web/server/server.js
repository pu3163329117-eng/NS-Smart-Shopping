require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./config/env');
const initDB = require('./utils/initDB');
const prisma = require('./utils/prisma');
const { uploadBufferToObjectStorage, LOCAL_UPLOAD_DIR } = require('./utils/objectStorage');
const { initObservability, captureException } = require('./utils/observability');

// Import routes
const authRoutes = require('./routes/auth');
const makerRoutes = require('./routes/maker');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/user');
const marketRoutes = require('./routes/market');
const aiRoutes = require('./routes/ai');
const gushiRoutes = require('./routes/gushi');
const notificationRoutes = require('./routes/notifications');
const authenticateToken = require('./middleware/auth');
const errorHandler = require('./middleware/error');

const app = express();
const PORT = env.port;
initObservability();

const buildCorsOptions = () => ({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (env.allowAllCors || env.corsAllowOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Locale'],
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    const error = new Error('Invalid file type. Only images are allowed.');
    error.statusCode = 400;
    cb(error, false);
  },
});

morgan.token('request-id', (req) => req.requestId || '-');
const requestLogFormat =
  env.logFormat === 'request-id'
    ? ':date[iso] :remote-addr :method :url :status :res[content-length] - :response-time ms req_id=:request-id'
    : env.logFormat;

// Middleware
app.disable('x-powered-by');
if (env.trustProxy !== false) {
  app.set('trust proxy', env.trustProxy);
}
app.use((req, res, next) => {
  const incomingRequestId = req.header('x-request-id');
  const requestId =
    typeof incomingRequestId === 'string' && incomingRequestId.trim()
      ? incomingRequestId.trim()
      : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (env.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(cors(buildCorsOptions()));
app.use(morgan(requestLogFormat));
app.use(bodyParser.json({ limit: env.bodyLimit }));
app.use(bodyParser.urlencoded({ extended: true, limit: env.bodyLimit }));

// Serve locally uploaded files (avatars, backgrounds, product images)
app.use('/uploads', express.static(LOCAL_UPLOAD_DIR));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart JA API',
      version: '1.0.0',
      description: 'API Documentation for Smart JA Platform',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'],
};

if (env.enableSwagger) {
  const swaggerDocs = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}

app.get('/healthz', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSec: Math.floor(process.uptime()),
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
});

const readyHandler = async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'ok',
      db: 'up',
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      status: 'degraded',
      db: 'down',
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }
};

app.get('/readyz', readyHandler);
// Keep backward compatibility for existing probes/scripts.
app.get('/health', readyHandler);
// API-prefixed aliases for reverse-proxy environments that only expose /api.
app.get('/api/healthz', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSec: Math.floor(process.uptime()),
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
});
app.get('/api/readyz', readyHandler);
app.get('/api/health', readyHandler);

// Root route
app.get('/', (req, res) => {
  if (env.enableSwagger) {
    return res.redirect('/api-docs');
  }
  return res.json({ name: 'Smart JA API', status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/maker', makerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/user', userRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/gushi', gushiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/zeroclaw', require('./routes/zeroclaw'));
app.use('/api/ailab', require('./routes/ailab'));
app.use('/api/investor', require('./routes/investor'));
app.use('/api/social', require('./routes/social'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/crowdfunding', require('./routes/crowdfunding'));
app.use('/api/monitor', require('./routes/monitor'));

// Upload route (keep here for simplicity with upload middleware)
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('No file uploaded');
      error.statusCode = 400;
      throw error;
    }

    const { url } = await uploadBufferToObjectStorage(req.file);
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: 'Not Found',
    requestId: req.requestId,
  });
});

app.use(errorHandler);

let server;
let shuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Lifecycle] ${signal} received. Shutting down...`);

  const hardTimeout = setTimeout(() => {
    console.error('[Lifecycle] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
  hardTimeout.unref();

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
    console.log('[Lifecycle] Shutdown complete.');
    process.exit(exitCode);
  } catch (error) {
    console.error('[Lifecycle] Shutdown failed:', error);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('[Bootstrap] Running initDB...');
    await initDB();
    console.log('[Bootstrap] initDB completed.');

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Bootstrap] Server running on http://0.0.0.0:${PORT}`);
    });

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('unhandledRejection', (reason) => {
      console.error('[Process] Unhandled rejection:', reason);
      const rejectionError = reason instanceof Error ? reason : new Error(String(reason));
      captureException(rejectionError, {
        tags: { kind: 'unhandled_rejection' },
      });
    });
    process.on('uncaughtException', (error) => {
      console.error('[Process] Uncaught exception:', error);
      captureException(error, {
        tags: { kind: 'uncaught_exception' },
      });
      shutdown('uncaughtException', 1);
    });
  } catch (err) {
    console.error('[Bootstrap] Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

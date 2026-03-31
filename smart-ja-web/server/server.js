require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const initDB = require('./utils/initDB');
const prisma = require('./utils/prisma');
const { uploadBufferToObjectStorage, LOCAL_UPLOAD_DIR } = require('./utils/objectStorage');

// Import Routes
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
const PORT = process.env.PORT || 3002;
const isProduction = process.env.NODE_ENV === 'production';
const enableSwagger =
  process.env.ENABLE_SWAGGER === 'true' ||
  (!isProduction && process.env.ENABLE_SWAGGER !== 'false');

const parseCsvEnv = (...keys) => {
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const corsAllowOrigins = parseCsvEnv('CORS_ALLOW_ORIGINS');
const allowAllCors = !isProduction && corsAllowOrigins.length === 0;
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowAllCors || corsAllowOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

// Configure Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max
  },
  fileFilter: (req, file, cb) => {
    // Only allow specific image formats
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error('Invalid file type. Only images are allowed.');
      error.statusCode = 400;
      cb(error, false);
    }
  }
});

// Middleware
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(morgan('dev')); // Logging
app.use(bodyParser.json());

// Serve locally uploaded files (avatars, backgrounds, product images)
app.use('/uploads', express.static(LOCAL_UPLOAD_DIR));

// Swagger Configuration
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
  apis: ['./routes/*.js'], // Path to the API docs
};

if (enableSwagger) {
  const swaggerDocs = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ok' });
  } catch (error) {
    return res.status(503).json({ status: 'degraded' });
  }
});

// Root Route
app.get('/', (req, res) => {
  if (enableSwagger) {
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

// Upload Route (Keep here for simplicity with upload middleware)
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

// Initialize DB and Start Server
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Running initDB...');
    await initDB();
    console.log('initDB completed.');

    app.use(errorHandler);

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });

    // Prevent exit
    process.on('SIGINT', () => {
      console.log('SIGINT received. Closing server...');
      server.close(() => {
        prisma
          .$disconnect()
          .catch((disconnectError) => {
            console.error('Failed to disconnect Prisma cleanly:', disconnectError);
          })
          .finally(() => {
            console.log('Server closed.');
            process.exit(0);
          });
      });
    });

    setInterval(() => { }, 60000); // Keep alive

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

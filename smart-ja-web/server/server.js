require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const initDB = require('./utils/initDB');

// Import Routes
const authRoutes = require('./routes/auth');
const makerRoutes = require('./routes/maker');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/user');
const marketRoutes = require('./routes/market');
const aiRoutes = require('./routes/ai');
const authenticateToken = require('./middleware/auth');
const errorHandler = require('./middleware/error');

const app = express();
const PORT = process.env.PORT || 3002;

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
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
app.use(cors());
app.use(morgan('dev')); // Logging
app.use(bodyParser.json());
app.use('/uploads', express.static(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads')));

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

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Root Route
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/maker', makerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/user', userRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/zeroclaw', require('./routes/zeroclaw'));

// Upload Route (Keep here for simplicity with upload middleware)
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res, next) => {
  if (!req.file) {
    const error = new Error('No file uploaded');
    error.statusCode = 400;
    return next(error);
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Initialize DB and Start Server
const startServer = async () => {
  try {
    console.log('Running initDB...');
    await initDB();
    console.log('initDB completed.');

    app.use(errorHandler);

    if (!process.env.VERCEL) {
      const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      });

      // Prevent exit
      process.on('SIGINT', () => {
        console.log('SIGINT received. Closing server...');
        server.close(() => {
          console.log('Server closed.');
          process.exit(0);
        });
      });
    }

  } catch (err) {
    console.error('Failed to start server:', err);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

startServer();

module.exports = app;

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import sequelize from './src/config/database.js';
import authRoutes from './src/routes/auth.js';
import serviceRoutes from './src/routes/services.js';
import orderRoutes from './src/routes/orders.js';

import swaggerUi from 'swagger-ui-express';
import swaggerSpecs from './src/config/swagger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);

// Database Connection & Sync
sequelize.authenticate()
  .then(() => {
    console.log('Database connected...');
    return sequelize.sync(); // Auto-create tables (Dev only)
  })
  .catch(err => {
    console.error('Database Connection Error (Starting Server in degraded mode):', err.message);
  })
  .finally(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  });

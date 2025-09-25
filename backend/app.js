import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/config.js';
import { testConnection } from './config/database.js';
import models from './models/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import seedData from './data/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(morgan('combined'));

// Body parsing middleware with better limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting middleware
app.use((req, res, next) => {
  // Simple rate limiting by IP (you might want to use a proper rate limiting library)
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  // This is a basic implementation - consider using express-rate-limit for production
  next();
});

// API routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: dbStatus ? 'Connected' : 'Disconnected',
    environment: config.nodeEnv
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Database synchronization and server startup
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Sync database models
    await models.sequelize.sync({ force: false });
    console.log('Database synchronized successfully');

    // Seed initial data
    await seedData();

    // Start server
    app.listen(config.port, () => {
      console.log(`IBD System server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Health check: http://localhost:${config.port}/health`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await models.sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await models.sequelize.close();
  process.exit(0);
});

// Start the application
startServer();
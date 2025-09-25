import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'ibd_system',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10, // Increased connection pool
      min: 2,
      acquire: 30000,
      idle: 10000,
      evict: 1000 // Remove idle connections faster
    },
    retry: {
      max: 3, // Retry connection attempts
    },
    dialectOptions: {
      connectTimeout: 60000 // Increase connection timeout
    }
  }
);

export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};

export { Sequelize };
export default sequelize;
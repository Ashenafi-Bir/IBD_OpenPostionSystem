import dotenv from 'dotenv';

dotenv.config();

export default {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'ibd_system_secret_key',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Exchange rate API (you can use any free API)
  exchangeRateApi: {
    baseUrl: process.env.EXCHANGE_RATE_API || 'https://api.exchangerate-api.com/v4/latest',
    apiKey: process.env.EXCHANGE_API_KEY || ''
  },
  
  // Email configuration for alerts
  email: {
    host: process.env.EMAIL_HOST || '',
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  },
  
  // System settings
  system: {
    paidUpCapital: parseFloat(process.env.PAID_UP_CAPITAL) || 2979527,
    alertThreshold: parseFloat(process.env.ALERT_THRESHOLD) || 0.8 // 80%
  }
};
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Gemini (LLM)
  geminiApiKey: process.env.GEMINI_API_KEY || '',

  // Email
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'noreply@healthclinic.com',

  // Google Calendar
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/v1/calendar/callback',
  },

  // Admin Seed
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@healthclinic.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    name: process.env.ADMIN_NAME || 'System Admin',
  },

  // Frontend
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  // Slot hold TTL in minutes
  slotHoldTtlMinutes: 5,
};

import joi from 'joi';
import dotenv from 'dotenv';

dotenv.config();

// Parse WHITELIST_ORIGINS as JSON array if it's a string
const whitelistOrigins = process.env.WHITELIST_ORIGINS ? JSON.parse(process.env.WHITELIST_ORIGINS) : [];

const configSchema = joi.object({
  NODE_ENV: joi.string().valid('development', 'production', 'test').required(),
  PORT: joi.number().required(),
  MONGO_URL: joi.string().required(),
  SECRET_HEX: joi.string().hex().required(),
  ACCESS_TOKEN_LIFETIME_MIN: joi.number().required(),
  BCRYPT_N_ROUNDS: joi.number().required(),
  WHITELIST_ORIGINS: joi.array().items(joi.string().required()).required(),
  SMTP_USER: joi.string().required(),
  SMTP_PASS: joi.string().required(),
  SMTP_PORT: joi.number().required(),
  SMTP_HOST: joi.string().required(),
  SMTP_FROM_EMAIL: joi.string().required(),
  GEMINI_API_KEY: joi.string().required(),
  RESEND_API_KEY: joi.string().required(),
  REDIS_HOST: joi.string().required(),
  REDIS_PORT: joi.number().required(),
});

const { error, value: config } = configSchema.validate(
  { ...process.env, WHITELIST_ORIGINS: whitelistOrigins, isDevelopment: process.env.NODE_ENV === 'development' },
  {
    abortEarly: false,
    allowUnknown: true,
  },
);

if (error) {
  console.error('Configuration validation error:', error.details);
  process.exit(1);
}

export interface Config {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  MONGO_URL: string;
  SECRET_HEX: string;
  ACCESS_TOKEN_LIFETIME_MIN: number;
  BCRYPT_N_ROUNDS: number;
  WHITELIST_ORIGINS: string[];
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_PORT: number;
  SMTP_HOST: string;
  SMTP_FROM_EMAIL: string;
  isDevelopment: boolean;
  GEMINI_API_KEY: string;
  RESEND_API_KEY: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
}

export default config;
